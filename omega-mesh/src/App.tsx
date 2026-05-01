import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Network, Radio, Users, Settings, MessageSquare,
  AlertTriangle, ShieldCheck, ChevronRight, Wifi, BookOpen, LogOut
} from 'lucide-react';

import RadarView from './components/RadarView';
import PeersView from './components/PeersView';
import HardwareView from './components/HardwareView';
import MessagesView from './components/MessagesView';
import SOSModal from './components/SOSModal';
import LandingView from './components/LandingView';
import GuideView from './components/GuideView';

import './index.css';

type Tab = 'radar' | 'peers' | 'messages' | 'hardware' | 'guide';

const TABS: { id: Tab; label: string; icon: typeof Radio | typeof BookOpen | typeof Settings | typeof MessageSquare | typeof Users }[] = [
  { id: 'radar', label: 'Local Radar', icon: Radio },
  { id: 'peers', label: 'Connected Peers', icon: Users },
  { id: 'messages', label: 'Messages', icon: MessageSquare },
  { id: 'hardware', label: 'Hardware', icon: Settings },
  { id: 'guide', label: 'Help & Guide', icon: BookOpen },
];

const TIER_COLORS = ['#818cf8', '#4ade80', '#2dd4bf', '#fb923c', '#e879f9'];

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [nodeId, setNodeId] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('radar');
  const [showSOS, setShowSOS] = useState(false);

  const renderView = () => {
    switch (activeTab) {
      case 'radar': return <RadarView />;
      case 'peers': return <PeersView />;
      case 'messages': return <MessagesView nodeId={nodeId} />;
      case 'hardware': return <HardwareView />;
      case 'guide': return <GuideView />;
    }
  };

  if (!isAuthenticated) {
    return (
      <LandingView 
        onLogin={(key) => {
          setIsAuthenticated(true);
          setNodeId(`OM${key.slice(0, 8).toUpperCase()}`);
        }} 
      />
    );
  }

  return (
    <div className="flex h-screen bg-[#070709] text-gray-200 overflow-hidden">
      {/* ========= Sidebar ========= */}
      <nav className="w-[72px] md:w-60 border-r border-border bg-[#080810]/60 backdrop-blur-2xl flex flex-col py-5 px-3 z-20">
        {/* Logo */}
        <div className="flex items-center gap-3 px-2 mb-8">
          <div className="w-10 h-10 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center flex-shrink-0 shadow-[0_0_20px_rgba(99,102,241,0.3)]">
            <Network className="w-5 h-5 text-primary" />
          </div>
          <div className="hidden md:block">
            <p className="text-sm font-bold text-white tracking-wide">{nodeId}</p>
            <p className="text-[10px] text-gray-500 font-mono">v2.1.3 · mesh.local</p>
          </div>
        </div>

        {/* Nav Items */}
        <ul className="space-y-1 flex-1">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <li key={tab.id}>
                <button
                  id={`nav-${tab.id}`}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all relative ${
                    isActive
                      ? 'bg-primary/15 text-primary border border-primary/25'
                      : 'text-gray-500 hover:text-gray-200 hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <span className="hidden md:block text-sm font-medium">{tab.label}</span>
                  {isActive && (
                    <ChevronRight className="hidden md:block w-3 h-3 ml-auto text-primary/50" />
                  )}
                </button>
              </li>
            );
          })}
        </ul>

        {/* Bottom: Tier + status */}
        <div className="space-y-3 pt-4 border-t border-border">
          {/* Tier chain mini viz */}
          <div className="hidden md:flex items-center gap-1 px-2">
            {TIER_COLORS.map((c, i) => (
              <div key={i} className="flex items-center gap-1">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ background: i < 3 ? c : 'rgba(255,255,255,0.1)', boxShadow: i < 3 ? `0 0 6px ${c}` : 'none' }}
                />
                {i < 4 && <div className="w-2 h-px bg-border" />}
              </div>
            ))}
            <span className="text-[10px] text-gray-600 ml-1">T3 Active</span>
          </div>

          {/* Status badge */}
          <button
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-neon/10 border border-neon/25 text-neon hover:bg-neon/15 transition-colors"
          >
            <ShieldCheck className="w-4 h-4 flex-shrink-0" />
            <div className="hidden md:block text-left">
              <p className="text-xs font-semibold">Tier 2 Active</p>
              <p className="text-[10px] text-neon/60">BLE + Wi-Fi Mesh</p>
            </div>
          </button>

          {/* Wi-Fi online indicator */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-border">
            <Wifi className="w-3 h-3 text-gray-500" />
            <span className="text-[10px] text-gray-500 font-mono">192.168.4.1</span>
            <span className="ml-auto w-1.5 h-1.5 bg-neon rounded-full animate-pulse" />
          </div>

          {/* SOS button (Safe Location) */}
          <button
            id="sos-btn"
            onClick={() => setShowSOS(true)}
            className="w-full flex items-center justify-center gap-2 px-3 py-3 mt-2 rounded-xl bg-danger/10 border border-danger/30 text-danger text-xs font-semibold hover:bg-danger/20 transition-all shadow-[0_0_15px_rgba(251,113,133,0.15)] uppercase tracking-wider group"
          >
            <AlertTriangle className="w-4 h-4 group-hover:scale-110 transition-transform" />
            <span className="hidden md:inline">Broadcast SOS</span>
          </button>

          {/* Disconnect Node / Logout */}
          <button
            onClick={() => {
              setIsAuthenticated(false);
              setNodeId('');
            }}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 mt-1 rounded-xl text-gray-500 hover:text-gray-300 hover:bg-white/5 transition-all text-xs font-medium group"
          >
            <LogOut className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
            <span className="hidden md:inline">Disconnect Node</span>
          </button>
        </div>
      </nav>

      {/* ========= Main content ========= */}
      <main className="flex-1 relative overflow-hidden bg-[radial-gradient(ellipse_80%_60%_at_70%_0%,rgba(99,102,241,0.06),transparent)]">
        {/* Subtle grid */}
        <div
          className="absolute inset-0 opacity-[0.018] pointer-events-none"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />

        {/* Top bar */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

        {/* Content area */}
        <div className="h-full overflow-y-auto">
          <div className="p-6 md:p-8 pt-5 min-h-full flex flex-col">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
                className="flex-1 flex flex-col"
              >
                {renderView()}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </main>

      {/* ========= SOS Modal ========= */}
      <AnimatePresence>
        {showSOS && <SOSModal onClose={() => setShowSOS(false)} />}
      </AnimatePresence>
    </div>
  );
}

export default App;
