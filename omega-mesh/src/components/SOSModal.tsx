import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Radio, X, MapPin } from 'lucide-react';

type SOSModalProps = {
  onClose: () => void;
};

const SOS_TYPES = [
  { id: 'medical', label: 'Medical Emergency', color: '#fb7185' },
  { id: 'rescue', label: 'Search & Rescue', color: '#fb923c' },
  { id: 'comms', label: 'Communications Failure', color: '#818cf8' },
  { id: 'general', label: 'General Distress', color: '#e879f9' },
];

export default function SOSModal({ onClose }: SOSModalProps) {
  const [step, setStep] = useState<'confirm' | 'broadcasting' | 'done'>('confirm');
  const [type, setType] = useState('medical');
  const [message, setMessage] = useState('');
  const [broadcastCount, setBroadcastCount] = useState(0);

  useEffect(() => {
    if (step !== 'broadcasting') return;
    const interval = setInterval(() => {
      setBroadcastCount(prev => {
        if (prev >= 5) {
          clearInterval(interval);
          setStep('done');
          return prev;
        }
        return prev + 1;
      });
    }, 700);
    return () => clearInterval(interval);
  }, [step]);

  const handleBroadcast = () => {
    setStep('broadcasting');
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-md bg-[#0a0a0d] border border-danger/30 rounded-3xl overflow-hidden shadow-[0_0_80px_rgba(251,113,133,0.2)]"
      >
        {/* Header */}
        <div className="p-6 border-b border-danger/20 flex items-center gap-3 relative">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${step === 'broadcasting' ? 'animate-pulse' : ''} bg-danger/15 border border-danger/30`}>
            <AlertTriangle className="w-6 h-6 text-danger" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-white">Broadcast SOS Signal</h2>
            <p className="text-xs text-gray-400">Emergency alert to all mesh peers</p>
          </div>
          <button id="sos-close" onClick={onClose} className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center hover:bg-white/10 text-gray-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6">
          {step === 'confirm' && (
            <div className="space-y-5">
              {/* Type selection */}
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Emergency Type</p>
                <div className="grid grid-cols-2 gap-2">
                  {SOS_TYPES.map(t => (
                    <button
                      key={t.id}
                      id={`sos-type-${t.id}`}
                      onClick={() => setType(t.id)}
                      className="p-2.5 rounded-xl border text-left text-xs font-medium transition-all"
                      style={type === t.id ? {
                        background: `${t.color}18`,
                        borderColor: `${t.color}50`,
                        color: t.color,
                      } : {
                        background: 'rgba(255,255,255,0.03)',
                        borderColor: 'rgba(255,255,255,0.08)',
                        color: '#9ca3af',
                      }}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Location */}
              <div className="flex items-center gap-2 p-3 rounded-xl bg-white/5 border border-border text-xs text-gray-400">
                <MapPin className="w-4 h-4 text-neon flex-shrink-0" />
                <span className="font-mono">28.6139° N · 77.2090° E (approx 50m)</span>
              </div>

              {/* Custom message */}
              <textarea
                id="sos-message"
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Optional: additional context for rescuers…"
                rows={3}
                className="w-full bg-white/5 border border-border rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-600 outline-none focus:border-danger/50 resize-none"
              />

              <div className="flex gap-3 pt-1">
                <button id="sos-cancel" onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-white/5 border border-border text-sm text-gray-400 hover:text-white transition-colors">
                  Cancel
                </button>
                <button
                  id="sos-confirm"
                  onClick={handleBroadcast}
                  className="flex-1 py-2.5 rounded-xl bg-danger/20 border border-danger/40 text-danger text-sm font-semibold hover:bg-danger/30 transition-colors flex items-center justify-center gap-2"
                >
                  <Radio className="w-4 h-4" /> Broadcast SOS
                </button>
              </div>
            </div>
          )}

          {step === 'broadcasting' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="py-8 flex flex-col items-center gap-6 text-center"
            >
              <div className="relative">
                <motion.div
                  animate={{ scale: [1, 2], opacity: [0.6, 0] }}
                  transition={{ duration: 1.2, repeat: Infinity }}
                  className="absolute inset-0 rounded-full bg-danger/20"
                />
                <div className="w-16 h-16 rounded-full bg-danger/20 border border-danger/40 flex items-center justify-center">
                  <Radio className="w-7 h-7 text-danger" />
                </div>
              </div>
              <div>
                <p className="text-white font-semibold text-lg">Broadcasting SOS…</p>
                <p className="text-gray-400 text-sm mt-1">{broadcastCount} of 5 mesh hops transmitted</p>
              </div>
              <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                <motion.div
                  animate={{ width: `${(broadcastCount / 5) * 100}%` }}
                  className="h-full bg-danger rounded-full"
                />
              </div>
            </motion.div>
          )}

          {step === 'done' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="py-8 flex flex-col items-center gap-5 text-center"
            >
              <div className="w-16 h-16 rounded-full bg-neon/15 border border-neon/30 flex items-center justify-center">
                <Radio className="w-7 h-7 text-neon" />
              </div>
              <div>
                <p className="text-neon font-semibold text-lg">SOS Broadcast Sent</p>
                <p className="text-gray-400 text-sm mt-1">Reached 5 peers across 3 hops.<br />Emergency beacon active for 30 minutes.</p>
              </div>
              <button id="sos-dismiss" onClick={onClose} className="px-8 py-2.5 rounded-xl bg-neon/15 border border-neon/30 text-neon text-sm font-medium hover:bg-neon/25 transition-colors">
                Done
              </button>
            </motion.div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
