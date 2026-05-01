import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Lock, Globe, Hash, Copy, Check, RefreshCw,
  Radio, ShieldCheck, BookOpen, Network, Wifi, RadioTower, Zap
} from 'lucide-react';

/* ─── Types ─────────────────────────────────── */
export interface ChannelDef {
  id: string;
  name: string;
  description: string;
  icon: typeof Radio;
  color: string;
  isPrivate: boolean;
  code?: string;
  rules?: string;
}

interface Props {
  nodeId: string;
  onClose: () => void;
  onCreated: (ch: ChannelDef) => void;
  onJoined: (ch: ChannelDef) => void;
}

/* ─── Helpers ────────────────────────────────── */
const PALETTE = ['#818cf8', '#2dd4bf', '#fb923c', '#e879f9', '#34d399', '#f472b6', '#60a5fa'];
const randomColor = () => PALETTE[Math.floor(Math.random() * PALETTE.length)];
const slugify = (s: string) => s.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 24) || `ch-${Date.now()}`;

/* ─── Component ──────────────────────────────── */
type View = 'create' | 'join' | 'guide';

export default function ChannelModal({ nodeId, onClose, onCreated, onJoined }: Props) {
  const [view, setView] = useState<View>('create');
  const [channelName, setChannelName] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [generatedCode, setGeneratedCode] = useState(nodeId);
  const [joinCode, setJoinCode] = useState('');
  const [channelRules, setChannelRules] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [color] = useState(randomColor);

  const regenerateCode = useCallback(() => setGeneratedCode(nodeId), [nodeId]);

  const copyCode = () => {
    navigator.clipboard.writeText(generatedCode).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCreate = () => {
    if (!channelName.trim()) { setError('Channel name is required.'); return; }
    setError('');
    const ch: ChannelDef = {
      id: isPrivate ? `private-${generatedCode}` : slugify(channelName),
      name: channelName.trim(),
      description: isPrivate ? 'E2EE · Private Channel' : 'Public · mesh broadcast',
      icon: isPrivate ? Lock : Globe,
      color,
      isPrivate,
      code: isPrivate ? generatedCode : undefined,
      rules: channelRules.trim() || undefined,
    };
    onCreated(ch);
    onClose();
  };

  const handleJoin = () => {
    const code = joinCode.trim().toUpperCase();
    if (code.length < 6) { setError('Enter the full invite code.'); return; }
    setError('');
    const ch: ChannelDef = {
      id: `private-${code}`,
      name: 'Connecting...',
      description: 'E2EE · Awaiting approval',
      icon: Lock,
      color,
      isPrivate: true,
      code,
    };
    onJoined(ch);
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(7,7,9,0.85)', backdropFilter: 'blur(12px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 10 }}
        transition={{ type: 'spring', stiffness: 350, damping: 30 }}
        className="relative w-full max-w-[480px] rounded-2xl overflow-hidden flex flex-col max-h-[85vh]"
        style={{
          background: 'linear-gradient(135deg, rgba(20,20,36,0.98) 0%, rgba(10,10,20,0.98) 100%)',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 40px 80px -20px rgba(0,0,0,0.8), 0 0 0 1px rgba(99,102,241,0.1)',
        }}
      >
        {/* Ambient glow top */}
        <div
          className="absolute top-0 left-0 right-0 h-px"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(99,102,241,0.6), transparent)' }}
        />

        {/* Header & Tabs */}
        <div className="px-6 pt-6 pb-4 flex-shrink-0 bg-[#0a0a14]/80 backdrop-blur-md z-10 border-b border-white/5">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <Network className="w-5 h-5 text-primary" />
              Omega Channels
            </h2>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors text-gray-400"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex gap-2 p-1 bg-white/5 rounded-xl border border-white/10">
            {[
              { id: 'create', icon: Hash, label: 'Create' },
              { id: 'join', icon: Lock, label: 'Join' },
              { id: 'guide', icon: BookOpen, label: 'Guide' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => { setView(tab.id as View); setError(''); }}
                className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-lg transition-all ${
                  view === tab.id
                    ? 'bg-white/10 text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="px-6 py-5 overflow-y-auto custom-scrollbar flex-1">
          <AnimatePresence mode="wait">

            {/* ── Create ──────────────────────── */}
            {view === 'create' && (
              <motion.div
                key="create"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.15 }}
                className="space-y-5"
              >
                <div>
                  <label className="text-xs font-semibold text-gray-400 mb-1.5 block uppercase tracking-wider">Channel Name</label>
                  <input
                    autoFocus
                    type="text"
                    value={channelName}
                    onChange={e => { setChannelName(e.target.value); setError(''); }}
                    onKeyDown={e => e.key === 'Enter' && handleCreate()}
                    placeholder="e.g. Team Bravo, Camp Alpha…"
                    maxLength={40}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-600 outline-none focus:border-primary/50 focus:bg-primary/5 transition-colors mb-4"
                  />
                  <label className="text-xs font-semibold text-gray-400 mb-1.5 block uppercase tracking-wider flex items-center justify-between">
                    <span>Channel Rules</span>
                    <span className="text-[10px] text-gray-600 normal-case">Optional</span>
                  </label>
                  <textarea
                    value={channelRules}
                    onChange={e => setChannelRules(e.target.value)}
                    placeholder="e.g. Keep chatter to a minimum. Report SITREPs only."
                    rows={2}
                    maxLength={150}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-600 outline-none focus:border-primary/50 focus:bg-primary/5 transition-colors resize-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-400 mb-2 block uppercase tracking-wider">Channel Type</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setIsPrivate(false)}
                      className={`flex items-center gap-3 p-3.5 rounded-xl border transition-all ${!isPrivate ? 'bg-primary/10 border-primary/40 text-white shadow-[0_0_15px_rgba(99,102,241,0.15)]' : 'border-white/8 text-gray-500 hover:bg-white/5 hover:text-gray-300'}`}
                    >
                      <Globe className={`w-5 h-5 flex-shrink-0 ${!isPrivate ? 'text-primary' : ''}`} />
                      <div className="text-left">
                        <p className="text-sm font-semibold">Public</p>
                        <p className="text-[10px] opacity-60">Open mesh</p>
                      </div>
                    </button>
                    <button
                      onClick={() => setIsPrivate(true)}
                      className={`flex items-center gap-3 p-3.5 rounded-xl border transition-all ${isPrivate ? 'bg-neon/10 border-neon/40 text-white shadow-[0_0_15px_rgba(45,212,191,0.15)]' : 'border-white/8 text-gray-500 hover:bg-white/5 hover:text-gray-300'}`}
                    >
                      <Lock className={`w-5 h-5 flex-shrink-0 ${isPrivate ? 'text-neon' : ''}`} />
                      <div className="text-left">
                        <p className="text-sm font-semibold">Private</p>
                        <p className="text-[10px] opacity-60">Invite only</p>
                      </div>
                    </button>
                  </div>
                </div>

                <AnimatePresence>
                  {isPrivate && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="pt-1">
                        <label className="text-xs font-semibold text-gray-400 mb-1.5 block uppercase tracking-wider">
                          Invite Code <span className="text-neon normal-case tracking-normal font-normal">— Share securely</span>
                        </label>
                        <div className="flex items-center gap-2 p-3 rounded-xl bg-neon/5 border border-neon/20">
                          <ShieldCheck className="w-4 h-4 text-neon flex-shrink-0" />
                          <span className="flex-1 font-mono text-sm font-bold text-neon tracking-[0.3em] pl-1">{generatedCode}</span>
                          <button
                            onClick={regenerateCode}
                            title="Regenerate"
                            className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={copyCode}
                            title="Copy code"
                            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${copied ? 'bg-neon/20 text-neon' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'}`}
                          >
                            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {error && (
                  <p className="text-xs text-danger bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">{error}</p>
                )}

                <button
                  onClick={handleCreate}
                  className="w-full flex items-center justify-center gap-2 py-3.5 mt-2 rounded-xl bg-primary hover:bg-primary/80 text-white text-sm font-semibold transition-all active:scale-[0.98] shadow-[0_0_20px_rgba(99,102,241,0.3)]"
                >
                  <Hash className="w-4 h-4" />
                  Launch Channel
                </button>
              </motion.div>
            )}

            {/* ── Join ────────────────────────── */}
            {view === 'join' && (
              <motion.div
                key="join"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.15 }}
                className="space-y-5"
              >
                <div className="p-5 rounded-xl border border-neon/20 bg-neon/5 flex flex-col items-center text-center">
                  <div className="w-12 h-12 rounded-full bg-neon/10 flex items-center justify-center mb-3">
                    <Lock className="w-6 h-6 text-neon" />
                  </div>
                  <h3 className="text-sm font-bold text-white mb-1">Private Encrypted Access</h3>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    Enter the invite code shared by the channel admin to securely connect.
                  </p>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-400 mb-1.5 block uppercase tracking-wider">Invite Code</label>
                  <input
                    autoFocus
                    type="text"
                    value={joinCode}
                    onChange={e => { setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 16)); setError(''); }}
                    onKeyDown={e => e.key === 'Enter' && handleJoin()}
                    placeholder="e.g. OMA1B2C3D4"
                    maxLength={16}
                    className="w-full bg-neon/5 border border-neon/20 rounded-xl px-4 py-4 text-sm text-neon placeholder:text-neon/30 outline-none focus:border-neon/50 transition-colors font-mono text-center tracking-[0.25em] uppercase text-lg"
                  />
                  <div className="flex justify-between items-center mt-2 px-1">
                    <p className="text-[10px] text-gray-500 font-mono">E2EE Handshake</p>
                    <p className="text-[10px] text-neon font-mono">{joinCode.length} chars</p>
                  </div>
                </div>

                {error && (
                  <p className="text-xs text-danger bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">{error}</p>
                )}

                <button
                  onClick={handleJoin}
                  disabled={joinCode.length < 6}
                  className="w-full flex items-center justify-center gap-2 py-3.5 mt-2 rounded-xl bg-neon hover:bg-neon/80 text-black text-sm font-bold transition-all active:scale-[0.98] shadow-[0_0_20px_rgba(45,212,191,0.3)] disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ShieldCheck className="w-4 h-4" />
                  Secure Join
                </button>
              </motion.div>
            )}

            {/* ── Guide / Info ────────────────── */}
            {view === 'guide' && (
              <motion.div
                key="guide"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.15 }}
                className="space-y-6 text-sm"
              >
                {/* Intro */}
                <div className="p-4 rounded-xl border border-primary/20 bg-primary/5">
                  <h3 className="font-bold text-white flex items-center gap-2 mb-2">
                    <Zap className="w-4 h-4 text-primary" />
                    What is Omega Mesh?
                  </h3>
                  <p className="text-gray-400 text-xs leading-relaxed">
                    Omega Mesh is a zero-trust, off-grid communication platform. It ensures your messages go through even if cellular grids and internet subsea cables are destroyed.
                  </p>
                </div>

                {/* Security */}
                <div className="space-y-2">
                  <h4 className="font-bold text-gray-200 text-xs uppercase tracking-wider flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-neon" />
                    Security & Data Capture
                  </h4>
                  <ul className="space-y-2 text-xs text-gray-400 pl-6 list-disc marker:text-neon/50">
                    <li><strong className="text-gray-300">No Central Servers:</strong> All data is stored purely peer-to-peer on devices. There is no cloud database tracking your messages.</li>
                    <li><strong className="text-gray-300">E2EE:</strong> Every private channel uses AES-256 End-to-End Encryption. Only nodes with the specific invite code can decrypt the traffic.</li>
                    <li><strong className="text-gray-300">Forward Secrecy:</strong> Dormant rooms automatically shred their keys after 3 hours of total inactivity.</li>
                  </ul>
                </div>

                {/* Global Architecture */}
                <div className="space-y-2">
                  <h4 className="font-bold text-gray-200 text-xs uppercase tracking-wider flex items-center gap-2 mt-4">
                    <Globe className="w-4 h-4 text-[#e879f9]" />
                    Global Cascading Connection
                  </h4>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    The network dynamically cascades to the best available transmission layer to guarantee connectivity anywhere on Earth:
                  </p>
                  <div className="grid gap-2 mt-2">
                    <div className="flex items-center gap-3 p-2.5 rounded-lg bg-white/5 border border-white/5">
                      <Network className="w-4 h-4 text-primary flex-shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-gray-200">Tier 1: Internet / WebRTC</p>
                        <p className="text-[10px] text-gray-500">Global connection when cell/fiber is active.</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-2.5 rounded-lg bg-white/5 border border-white/5">
                      <Wifi className="w-4 h-4 text-neon flex-shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-gray-200">Tier 2: Wi-Fi Direct</p>
                        <p className="text-[10px] text-gray-500">Local sub-network when ISPs go dark.</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-2.5 rounded-lg bg-white/5 border border-white/5">
                      <Radio className="w-4 h-4 text-[#e879f9] flex-shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-gray-200">Tier 3: BLE Mesh</p>
                        <p className="text-[10px] text-gray-500">Device-to-device short range hopping.</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-2.5 rounded-lg bg-white/5 border border-white/5">
                      <RadioTower className="w-4 h-4 text-[#fb923c] flex-shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-gray-200">Tier 4: LoRa Radio</p>
                        <p className="text-[10px] text-gray-500">10km+ range for deep off-grid text routing.</p>
                      </div>
                    </div>
                  </div>
                </div>

              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}
