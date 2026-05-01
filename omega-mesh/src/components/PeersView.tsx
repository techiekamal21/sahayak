import { motion } from 'framer-motion';
import { Users, Radio, Search } from 'lucide-react';

export default function PeersView() {
  return (
    <div className="flex-1 flex flex-col gap-6">
      <header>
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white via-gray-100 to-gray-400 tracking-tight">
          Connected Peers
        </h1>
        <p className="text-gray-400 mt-1.5 text-sm">
          Real-time view of connected mesh nodes
        </p>
      </header>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex-1 glass-panel rounded-2xl flex flex-col items-center justify-center text-center p-12 gap-6"
      >
        <div className="relative">
          <div className="w-20 h-20 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Users className="w-8 h-8 text-primary/60" />
          </div>
          <motion.div
            animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 2.5, repeat: Infinity }}
            className="absolute -inset-3 rounded-full border border-primary/20"
          />
        </div>

        <div>
          <h2 className="text-lg font-semibold text-gray-300 mb-2">No Peers Connected</h2>
          <p className="text-sm text-gray-500 leading-relaxed max-w-sm">
            Peers will appear here when they connect to your mesh channels.
            Go to <span className="text-primary font-medium">Messages</span> → create or join a channel to start.
          </p>
        </div>

        <div className="flex gap-3 mt-2">
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-border text-xs text-gray-500">
            <Radio className="w-3 h-3" /> Listening on all tiers
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-border text-xs text-gray-500">
            <Search className="w-3 h-3" /> Auto-discovery active
          </div>
        </div>
      </motion.div>
    </div>
  );
}
