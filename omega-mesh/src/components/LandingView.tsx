import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Network, Key, Shield, Zap, ArrowRight, Copy, Check, Lock, Radio } from 'lucide-react';

interface Props {
  onLogin: (secretKey: string) => void;
}

// Generates a secure random 64-character hex string
const generateSecretKey = () => {
  const array = new Uint8Array(32);
  window.crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

// Validates a 64-character hex string
const isValidHexKey = (key: string) => /^[0-9a-fA-F]{64}$/.test(key);

export default function LandingView({ onLogin }: Props) {
  const [authMode, setAuthMode] = useState<'select' | 'login' | 'create'>('select');
  const [inputKey, setInputKey] = useState('');
  const [error, setError] = useState('');
  const [newKey, setNewKey] = useState('');
  const [copied, setCopied] = useState(false);

  const handleLogin = () => {
    const key = inputKey.trim().toLowerCase();
    if (!isValidHexKey(key)) {
      setError('Invalid key format. Must be a 64-character hex string.');
      return;
    }
    setError('');
    onLogin(key);
  };

  const handleCreate = () => {
    const key = generateSecretKey();
    setNewKey(key);
    setAuthMode('create');
  };

  const copyKey = () => {
    navigator.clipboard.writeText(newKey).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const proceedWithNewKey = () => {
    if (!copied) {
      setError('Please copy your key before proceeding. It cannot be recovered!');
      return;
    }
    onLogin(newKey);
  };

  return (
    <div className="min-h-screen bg-[#030305] text-gray-200 overflow-y-auto overflow-x-hidden selection:bg-primary/30 relative flex flex-col items-center">
      
      {/* Centralized Background Glows */}
      <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-[100%] bg-primary/10 blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-1/2 -translate-x-1/2 w-[600px] h-[500px] rounded-[100%] bg-neon/5 blur-[150px] pointer-events-none" />

      {/* Subtle Grid */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
          backgroundPosition: 'center top',
        }}
      />

      {/* Top Navbar */}
      <nav className="w-full max-w-6xl mx-auto p-6 flex justify-center items-center mt-4 relative z-20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shadow-[0_0_20px_rgba(99,102,241,0.2)]">
            <Network className="w-6 h-6 text-primary" />
          </div>
          <span className="text-xl font-bold text-white tracking-widest uppercase">Omega Mesh</span>
        </div>
      </nav>

      {/* Hero & Auth Section */}
      <main className="w-full max-w-6xl mx-auto px-6 pt-12 pb-24 flex flex-col items-center relative z-20 flex-1">
        
        {/* Centralized Hero Text */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-4xl mb-12"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-mono text-gray-400 mb-8">
            <span className="w-2 h-2 rounded-full bg-neon animate-pulse" />
            V2.1.3 DEPLOYMENT READY
          </div>
          <h1 className="text-5xl md:text-7xl font-bold text-white leading-[1.1] mb-6 tracking-tight">
            Off-Grid. <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-[#e879f9]">Zero-Trust.</span> <br />
            Decentralized.
          </h1>
          <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
            The military-grade peer-to-peer communication platform. Connect securely without cellular networks, internet, or centralized servers.
          </p>
        </motion.div>

        {/* Central Auth Card */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="w-full max-w-[440px] relative"
        >
          <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent rounded-3xl blur-xl" />
          
          <div className="relative rounded-3xl overflow-hidden p-8"
            style={{
              background: 'linear-gradient(180deg, rgba(20,20,28,0.95) 0%, rgba(10,10,15,0.95) 100%)',
              border: '1px solid rgba(255,255,255,0.08)',
              boxShadow: '0 40px 80px -20px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)',
            }}
          >
            <AnimatePresence mode="wait">
              
              {/* Select Mode */}
              {authMode === 'select' && (
                <motion.div
                  key="select"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="w-full"
                >
                  <div className="text-center mb-8">
                    <h3 className="text-xl font-bold text-white mb-2">Initialize Node</h3>
                    <p className="text-sm text-gray-400">Authenticate locally to access the mesh.</p>
                  </div>

                  <div className="space-y-3">
                    <button
                      onClick={() => setAuthMode('login')}
                      className="w-full group flex items-center gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-primary/40 hover:bg-primary/5 transition-all"
                    >
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:shadow-[0_0_20px_rgba(99,102,241,0.2)] transition-shadow">
                        <Key className="w-5 h-5" />
                      </div>
                      <div className="flex-1 text-left">
                        <h4 className="text-white font-bold text-sm">Enter Secret Key</h4>
                        <p className="text-xs text-gray-500 mt-0.5">Access existing identity</p>
                      </div>
                      <ArrowRight className="w-5 h-5 text-gray-600 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                    </button>

                    <button
                      onClick={handleCreate}
                      className="w-full group flex items-center gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-neon/40 hover:bg-neon/5 transition-all"
                    >
                      <div className="w-12 h-12 rounded-xl bg-neon/10 flex items-center justify-center text-neon group-hover:shadow-[0_0_20px_rgba(45,212,191,0.2)] transition-shadow">
                        <Zap className="w-5 h-5" />
                      </div>
                      <div className="flex-1 text-left">
                        <h4 className="text-white font-bold text-sm">Generate Identity</h4>
                        <p className="text-xs text-gray-500 mt-0.5">Create a new local node</p>
                      </div>
                      <ArrowRight className="w-5 h-5 text-gray-600 group-hover:text-neon group-hover:translate-x-1 transition-all" />
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Login Mode */}
              {authMode === 'login' && (
                <motion.div
                  key="login"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="w-full flex flex-col h-full"
                >
                  <button
                    onClick={() => { setAuthMode('select'); setError(''); setInputKey(''); }}
                    className="text-xs font-bold text-gray-500 hover:text-white mb-6 transition-colors uppercase tracking-wider self-start flex items-center gap-1"
                  >
                    ← Back
                  </button>

                  <div className="text-center mb-6">
                    <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3">
                      <Lock className="w-5 h-5" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Access Node</h3>
                    <p className="text-sm text-gray-400">Enter your 64-character hex secret key.</p>
                  </div>

                  <div className="space-y-4">
                    <textarea
                      autoFocus
                      value={inputKey}
                      onChange={e => { setInputKey(e.target.value); setError(''); }}
                      placeholder="e.g. 8f2a9c..."
                      rows={3}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-center text-primary placeholder:text-gray-700 outline-none focus:border-primary/50 focus:bg-primary/5 transition-colors font-mono resize-none break-all"
                    />

                    {error && (
                      <p className="text-xs text-danger bg-danger/10 border border-danger/20 rounded-lg px-3 py-2 text-center">{error}</p>
                    )}

                    <button
                      onClick={handleLogin}
                      disabled={inputKey.length === 0}
                      className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-primary hover:bg-primary/90 text-white text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(99,102,241,0.2)]"
                    >
                      <Shield className="w-4 h-4" />
                      Decrypt & Connect
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Create Mode */}
              {authMode === 'create' && (
                <motion.div
                  key="create"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="w-full"
                >
                  <button
                    onClick={() => { setAuthMode('select'); setError(''); }}
                    className="text-xs font-bold text-gray-500 hover:text-white mb-6 transition-colors uppercase tracking-wider self-start flex items-center gap-1"
                  >
                    ← Back
                  </button>

                  <div className="text-center mb-6">
                    <div className="w-12 h-12 rounded-full bg-neon/10 text-neon flex items-center justify-center mx-auto mb-3">
                      <Key className="w-5 h-5" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Identity Generated</h3>
                    <p className="text-xs text-danger font-semibold bg-danger/10 py-1.5 px-3 rounded-md inline-block">Copy this key! It cannot be recovered.</p>
                  </div>

                  <div className="space-y-4">
                    <div className="relative group">
                      <div className="w-full bg-black/40 border border-neon/30 rounded-xl p-4 pr-12 text-sm text-neon font-mono break-all text-center leading-relaxed shadow-[inset_0_0_20px_rgba(45,212,191,0.05)]">
                        {newKey}
                      </div>
                      <button
                        onClick={copyKey}
                        className={`absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${copied ? 'bg-neon/20 text-neon' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'}`}
                      >
                        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>

                    {error && (
                      <p className="text-xs text-danger bg-danger/10 border border-danger/20 rounded-lg px-3 py-2 text-center">{error}</p>
                    )}

                    <button
                      onClick={proceedWithNewKey}
                      className="w-full flex items-center justify-center gap-2 py-3.5 mt-2 rounded-xl bg-neon hover:bg-neon/90 text-black text-sm font-bold transition-all shadow-[0_0_20px_rgba(45,212,191,0.3)]"
                    >
                      <Network className="w-4 h-4" />
                      Connect to Mesh
                    </button>
                  </div>
                </motion.div>
              )}

            </AnimatePresence>
          </div>
        </motion.div>
      </main>

      {/* How It Works Grid */}
      <section className="w-full bg-[#050508] border-t border-white/5 relative z-20">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-white mb-4">How Omega Mesh Works</h2>
            <p className="text-gray-400 max-w-2xl mx-auto">A seamless, decentralized architecture designed to keep you connected when standard infrastructure fails.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="p-8 rounded-3xl bg-white/[0.02] border border-white/5 hover:border-primary/20 transition-colors flex flex-col items-center text-center group">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Key className="w-8 h-8" />
              </div>
              <h4 className="text-lg text-white font-bold mb-3">1. Generate Local Identity</h4>
              <p className="text-sm text-gray-400 leading-relaxed">
                Create a mathematically secure 64-character secret key. No email, no password, no database. Your key never leaves your local device.
              </p>
            </div>

            {/* Step 2 */}
            <div className="p-8 rounded-3xl bg-white/[0.02] border border-white/5 hover:border-neon/20 transition-colors flex flex-col items-center text-center group">
              <div className="w-16 h-16 rounded-2xl bg-neon/10 text-neon flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Radio className="w-8 h-8" />
              </div>
              <h4 className="text-lg text-white font-bold mb-3">2. Cascading Connection</h4>
              <p className="text-sm text-gray-400 leading-relaxed">
                The app automatically searches for peers via Wi-Fi Direct, BLE Mesh, or local LAN to establish an off-grid routing network instantly.
              </p>
            </div>

            {/* Step 3 */}
            <div className="p-8 rounded-3xl bg-white/[0.02] border border-white/5 hover:border-[#e879f9]/20 transition-colors flex flex-col items-center text-center group">
              <div className="w-16 h-16 rounded-2xl bg-[#e879f9]/10 text-[#e879f9] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Shield className="w-8 h-8" />
              </div>
              <h4 className="text-lg text-white font-bold mb-3">3. E2E Encrypted Comms</h4>
              <p className="text-sm text-gray-400 leading-relaxed">
                Create or join private channels. All messages and files are AES-256 encrypted and routed securely through the P2P mesh network.
              </p>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
