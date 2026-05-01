import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Lock, Radio, Hash, Plus, Shield, Globe, Info, BookOpen, Download, Upload, UserPlus, CheckCircle, XCircle } from 'lucide-react';
import Peer, { type DataConnection } from 'peerjs';
import CryptoJS from 'crypto-js';

import ChannelModal from './ChannelModal';
import type { ChannelDef } from './ChannelModal';

/* ─── Default channels ────────────────────────────── */
const DEFAULT_CHANNELS: ChannelDef[] = [
  { id: 'all',     name: 'Mesh Broadcast', description: 'Unencrypted · all nodes', icon: Radio,  color: '#818cf8', isPrivate: false },
];

type Message = {
  id: string;
  from: string;
  content: string;
  time: string;
  self: boolean;
  status: 'sent' | 'delivered' | 'acked';
  channel: string;
};

const INITIAL_MESSAGES: Message[] = [];

const STATUS: Record<string, string> = { sent: '✓', delivered: '✓✓', acked: '✓✓' };

export default function MessagesView({ nodeId = 'Local-Node' }: { nodeId?: string }) {
  const [channels, setChannels] = useState<ChannelDef[]>(DEFAULT_CHANNELS);
  const [activeChannel, setActiveChannel] = useState('all');
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [draft, setDraft] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showCodeTooltip, setShowCodeTooltip] = useState<string | null>(null);
  const [livePeers, setLivePeers] = useState<Record<string, boolean>>({});
  const [pendingPeers, setPendingPeers] = useState<DataConnection[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const peerRef = useRef<Peer | null>(null);
  const connsRef = useRef<Record<string, DataConnection>>({});
  const channelsRef = useRef(channels);

  useEffect(() => {
    channelsRef.current = channels;
  }, [channels]);

  useEffect(() => {
    if (!nodeId) return;
    const peer = new Peer(nodeId);
    peerRef.current = peer;

    peer.on('connection', (conn) => {
      // New peer wants to connect (Require approval)
      setPendingPeers(prev => [...prev, conn]);
    });

    return () => {
      peer.destroy();
    };
  }, [nodeId]);

  const approvePeer = (conn: DataConnection) => {
    setPendingPeers(prev => prev.filter(c => c.peer !== conn.peer));
    connsRef.current[conn.peer] = conn;
    setLivePeers(prev => ({ ...prev, [conn.peer]: true }));

    // Send channel metadata to the approved joiner
    const adminChannel = channelsRef.current.find(c => c.code === nodeId);
    if (adminChannel) {
      conn.send({ type: 'channel-info', name: adminChannel.name, rules: adminChannel.rules, description: adminChannel.description, channelId: adminChannel.id });
    }

    conn.on('data', (data: any) => {
      if (data.type === 'msg') {
        const ch = channelsRef.current.find(c => c.id === data.message.channel);
        const secret = ch?.code || 'omega-public-broadcast';
        let decryptedText = '🔒 [Decryption Failed - Invalid Key]';
        try {
          const bytes = CryptoJS.AES.decrypt(data.message.content, secret);
          const decrypted = bytes.toString(CryptoJS.enc.Utf8);
          if (decrypted) decryptedText = decrypted;
        } catch (_e) { /* decryption failed */ }

        setMessages(prev => [...prev, { ...data.message, content: decryptedText }]);
        // Forward to other peers (mesh relay)
        Object.values(connsRef.current).forEach(c => {
          if (c.peer !== conn.peer && c.peer !== data.message.from) c.send(data);
        });
      }
    });

    conn.on('close', () => {
      delete connsRef.current[conn.peer];
      setLivePeers(prev => { const n = { ...prev }; delete n[conn.peer]; return n; });
    });
  };

  const rejectPeer = (conn: DataConnection) => {
    setPendingPeers(prev => prev.filter(c => c.peer !== conn.peer));
    conn.close();
  };

  const handleExport = () => {
    const data = JSON.stringify({ channels, messages }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `omega-mesh-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (json.channels && json.messages) {
          setChannels(json.channels);
          setMessages(json.messages);
        }
      } catch (err) {
        console.error('Failed to parse state file', err);
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset
  };

  const channel = channels.find(c => c.id === activeChannel) ?? channels[0];
  const visible = messages.filter(m => m.channel === activeChannel);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [visible.length, activeChannel]);

  const send = () => {
    if (!draft.trim()) return;
    const msg: Message = {
      id: Date.now().toString(),
      from: 'You',
      content: draft.trim(),
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
      self: true,
      status: 'sent',
      channel: activeChannel,
    };
    const ch = channels.find(c => c.id === activeChannel);
    const secret = ch?.code || 'omega-public-broadcast';
    const encryptedContent = CryptoJS.AES.encrypt(draft.trim(), secret).toString();

    setMessages(prev => [...prev, msg]);
    setDraft('');
    setTimeout(() =>
      setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, status: 'delivered' } : m)), 300);

    // Broadcast WebRTC
    Object.values(connsRef.current).forEach(conn => {
      conn.send({ type: 'msg', message: { ...msg, content: encryptedContent, from: nodeId, self: false } });
    });
  };

  const handleCreated = (ch: ChannelDef) => {
    setChannels(prev => [...prev, ch]);
    setActiveChannel(ch.id);
  };

  const handleJoined = (ch: ChannelDef) => {
    setChannels(prev => {
      const exists = prev.find(c => c.id === ch.id);
      return exists ? prev : [...prev, ch];
    });
    setActiveChannel(ch.id);

    if (peerRef.current && ch.code) {
      const conn = peerRef.current.connect(ch.code);
      conn.on('open', () => {
        connsRef.current[conn.peer] = conn;
        setLivePeers(prev => ({ ...prev, [conn.peer]: true }));
      });
      conn.on('data', (data: any) => {
        if (data.type === 'channel-info') {
          // Admin sent us the real channel name
          setChannels(prev => prev.map(c =>
            c.code === ch.code
              ? { ...c, name: data.name, rules: data.rules, description: data.description || 'E2EE · Private Channel' }
              : c
          ));
        }
        if (data.type === 'msg') {
          const cDef = channelsRef.current.find(c => c.id === data.message.channel);
          const secret = cDef?.code || 'omega-public-broadcast';
          let decryptedText = '🔒 [Decryption Failed - Invalid Key]';
          try {
            const bytes = CryptoJS.AES.decrypt(data.message.content, secret);
            const decrypted = bytes.toString(CryptoJS.enc.Utf8);
            if (decrypted) decryptedText = decrypted;
          } catch (_e) { /* decryption failed */ }
          setMessages(prev => [...prev, { ...data.message, content: decryptedText }]);
        }
      });
      conn.on('close', () => {
        delete connsRef.current[conn.peer];
        setLivePeers(prev => { const n = { ...prev }; delete n[conn.peer]; return n; });
      });
    }
  };

  return (
    <div className="flex-1 flex flex-col gap-0 h-full">
      {/* Header */}
      <header className="mb-5 flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white via-gray-100 to-gray-400 tracking-tight">
            Mesh Messages
          </h1>
          <p className="text-gray-400 mt-1.5 text-sm">Encrypted peer-to-peer and broadcast channels</p>
        </div>
        
        <div className="flex gap-2">
          <input 
            type="file" 
            accept=".json" 
            ref={fileInputRef} 
            onChange={handleImport} 
            className="hidden" 
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-xs text-gray-400 hover:text-white"
            title="Import Backup"
          >
            <Upload className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Restore</span>
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-xs text-gray-400 hover:text-white"
            title="Export Backup"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Backup</span>
          </button>
        </div>
      </header>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-4 min-h-0">

        {/* ── Channel sidebar ─────────────────────────── */}
        <div className="glass-panel rounded-2xl p-4 flex flex-col gap-2 overflow-y-auto">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Channels</p>
            <button
              id="new-channel-btn"
              onClick={() => setShowModal(true)}
              title="New channel"
              className="w-6 h-6 rounded-lg bg-primary/15 border border-primary/25 flex items-center justify-center hover:bg-primary/25 transition-colors"
            >
              <Plus className="w-3 h-3 text-primary" />
            </button>
          </div>

          {channels.map(ch => {
            const Icon = ch.icon;
            const unread = messages.filter(m => m.channel === ch.id && !m.self).length;
            const isActive = activeChannel === ch.id;
            return (
              <button
                key={ch.id}
                id={`channel-${ch.id}`}
                onClick={() => setActiveChannel(ch.id)}
                className={`w-full text-left flex items-center gap-3 p-2.5 rounded-xl border transition-all group ${
                  isActive ? 'bg-primary/10 border-primary/30 text-white' : 'border-transparent text-gray-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-shadow"
                  style={{ background: `${ch.color}18`, border: `1px solid ${ch.color}30` }}
                >
                  <Icon className="w-4 h-4" style={{ color: ch.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate flex items-center gap-1">
                    {ch.name}
                    {ch.isPrivate
                      ? <Lock className="w-2.5 h-2.5 opacity-50 flex-shrink-0" />
                      : <Globe className="w-2.5 h-2.5 opacity-50 flex-shrink-0" />}
                  </p>
                  <p className="text-[10px] text-gray-600 truncate">{ch.description}</p>
                </div>
                {unread > 0 && (
                  <span className="w-4 h-4 rounded-full bg-primary text-white text-[9px] font-bold flex items-center justify-center flex-shrink-0">
                    {unread}
                  </span>
                )}
              </button>
            );
          })}

          {/* Invite strip */}
          <button
            id="open-channel-hub"
            onClick={() => setShowModal(true)}
            className="mt-auto w-full flex items-center gap-2 p-2.5 rounded-xl border border-dashed border-white/10 text-gray-600 hover:text-gray-400 hover:border-white/20 transition-all text-xs"
          >
            <Plus className="w-3 h-3" />
            <span>Create or join channel</span>
          </button>
        </div>

        {/* ── Chat window ─────────────────────────────── */}
        <div className="lg:col-span-3 glass-panel rounded-2xl flex flex-col min-h-0 overflow-hidden">

          {/* Chat header */}
          <div className="px-5 py-4 border-b border-border flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: `${channel.color}18`, border: `1px solid ${channel.color}30` }}
            >
              <channel.icon className="w-4 h-4" style={{ color: channel.color }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white flex items-center gap-1.5">
                {channel.name}
                {channel.isPrivate
                  ? <Lock className="w-3 h-3 text-neon opacity-70" />
                  : <Globe className="w-3 h-3 text-gray-500" />}
              </p>
              <p className="text-[10px] text-gray-500 truncate">{channel.description}</p>
            </div>

            {/* Code badge for private channels */}
            {channel.isPrivate && channel.code && (
              <div className="relative">
                <button
                  id={`show-code-${channel.id}`}
                  onClick={() => setShowCodeTooltip(prev => prev === channel.id ? null : channel.id)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neon/10 border border-neon/20 hover:bg-neon/15 transition-colors"
                >
                  <Info className="w-3 h-3 text-neon" />
                  <span className="text-[10px] text-neon font-medium">Code</span>
                </button>
                <AnimatePresence>
                  {showCodeTooltip === channel.id && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9, y: 6 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9, y: 6 }}
                      className="absolute right-0 top-full mt-2 z-20 w-48 p-3 rounded-xl border border-neon/25 shadow-xl"
                      style={{ background: 'rgba(10,14,24,0.98)' }}
                    >
                      <p className="text-[10px] text-gray-500 mb-1">Invite Code</p>
                      <p className="font-mono text-sm font-bold text-neon tracking-[0.3em]">{channel.code}</p>
                      <p className="text-[10px] text-gray-600 mt-1.5">Share this with people you want to invite.</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {channel.rules && (
              <div className="relative group">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 cursor-help hover:bg-white/10 transition-colors">
                  <BookOpen className="w-3 h-3 text-gray-400 group-hover:text-white" />
                  <span className="text-[10px] text-gray-400 font-medium group-hover:text-white transition-colors">Rules</span>
                </div>
                <div className="absolute right-0 top-full mt-2 w-56 p-3 rounded-xl border border-white/10 shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20" style={{ background: 'rgba(10,14,24,0.98)' }}>
                  <p className="text-[10px] text-gray-500 mb-1 uppercase tracking-wider">Channel Rules</p>
                  <p className="text-xs text-gray-300 leading-relaxed">{channel.rules}</p>
                </div>
              </div>
            )}

            {channel.isPrivate ? (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neon/10 border border-neon/20">
                <Shield className="w-3 h-3 text-neon" />
                <span className="text-[10px] text-neon font-medium">E2EE</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-500/10 border border-gray-500/20">
                <Globe className="w-3 h-3 text-gray-400" />
                <span className="text-[10px] text-gray-400 font-medium">Public</span>
              </div>
            )}
          </div>

          {/* Pending Approvals */}
          {pendingPeers.length > 0 && channel.code === nodeId && (
            <div className="px-5 py-3 bg-neon/10 border-b border-neon/20 flex flex-col gap-2">
              <p className="text-xs text-neon font-bold uppercase tracking-wider flex items-center gap-1">
                <UserPlus className="w-3 h-3" /> Connection Requests
              </p>
              {pendingPeers.map(p => (
                <div key={p.peer} className="flex items-center justify-between bg-black/40 p-2 rounded-lg border border-neon/10">
                  <span className="text-xs text-gray-300 font-mono">{p.peer} wants to join</span>
                  <div className="flex gap-2">
                    <button onClick={() => approvePeer(p)} className="p-1 rounded bg-neon/20 text-neon hover:bg-neon/30"><CheckCircle className="w-4 h-4" /></button>
                    <button onClick={() => rejectPeer(p)} className="p-1 rounded bg-danger/20 text-danger hover:bg-danger/30"><XCircle className="w-4 h-4" /></button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Active Peers indicator */}
          <div className="px-5 py-2 border-b border-border bg-white/5 flex gap-2 overflow-x-auto custom-scrollbar">
            <span className="text-[10px] text-gray-500 uppercase flex items-center h-6">Live Peers:</span>
            {Object.keys(livePeers).length === 0 && <span className="text-[10px] text-gray-600 flex items-center h-6">None</span>}
            {Object.keys(livePeers).map(p => (
              <span key={p} className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                {p}
              </span>
            ))}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-5 space-y-3 min-h-0">
            <AnimatePresence initial={false}>
              {visible.length === 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-16 text-gray-600 text-sm"
                >
                  <Hash className="w-8 h-8 mx-auto mb-3 opacity-30" />
                  <p>No messages yet in <span className="text-gray-400 font-medium">{channel.name}</span></p>
                  <p className="text-xs mt-1 text-gray-700">Be the first to broadcast</p>
                </motion.div>
              )}
              {visible.map(msg => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.self ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[75%] ${msg.self ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                    {!msg.self && (
                      <p className="text-[10px] text-gray-500 ml-1 font-medium">{msg.from}</p>
                    )}
                    <div
                      className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                        msg.self
                          ? 'bg-primary/20 border border-primary/30 text-white rounded-br-sm'
                          : 'bg-white/5 border border-border text-gray-200 rounded-bl-sm'
                      }`}
                    >
                      {msg.content}
                    </div>
                    <p className="text-[10px] text-gray-600 px-1">
                      {msg.time}
                      {msg.self && <span className="ml-1 text-primary/60">{STATUS[msg.status]}</span>}
                    </p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-4 py-3 border-t border-border flex items-center gap-3">
            <input
              id="message-input"
              type="text"
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && send()}
              placeholder={`Message ${channel.name}…`}
              className="flex-1 bg-white/5 border border-border rounded-xl px-4 py-2 text-sm text-white placeholder:text-gray-600 outline-none focus:border-primary/50 focus:bg-primary/5 transition-colors"
            />
            <button
              id="send-msg-btn"
              onClick={send}
              disabled={!draft.trim()}
              className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center hover:bg-primary/80 transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0"
            >
              <Send className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Channel Modal ───────────────────────────── */}
      <AnimatePresence>
        {showModal && (
          <ChannelModal
            nodeId={nodeId}
            onClose={() => setShowModal(false)}
            onCreated={handleCreated}
            onJoined={handleJoined}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
