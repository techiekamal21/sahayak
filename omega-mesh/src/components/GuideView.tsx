import { BookOpen, Shield, Network, Radio, AlertTriangle, Key } from 'lucide-react';

export default function GuideView() {
  return (
    <div className="flex flex-col h-full bg-[#070709]/50 rounded-2xl border border-white/5 overflow-y-auto custom-scrollbar">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#0a0a14]/80 backdrop-blur-md p-6 border-b border-white/5 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
          <BookOpen className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Help & Documentation</h2>
          <p className="text-xs text-gray-500 mt-0.5">Learn how to master Omega Mesh</p>
        </div>
      </div>

      <div className="p-6 md:p-8 space-y-12">
        {/* Intro & Screenshot Section */}
        <section className="space-y-6">
          <div className="prose prose-invert max-w-none">
            <h3 className="text-2xl font-bold text-white flex items-center gap-2 mb-4">
              <Network className="w-6 h-6 text-neon" />
              Overview
            </h3>
            <p className="text-sm text-gray-400 leading-relaxed max-w-3xl">
              Omega Mesh is a zero-trust, off-grid communication platform. It utilizes a combination of Wi-Fi Direct, Bluetooth Low Energy (BLE), and LoRa radios to keep you connected when standard infrastructure like cellular towers and internet service providers are destroyed or unavailable.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 overflow-hidden shadow-[0_20px_40px_rgba(0,0,0,0.5)]">
            <img 
              src="/app-screenshot.png" 
              alt="Omega Mesh Interface" 
              className="w-full h-auto object-cover opacity-90 hover:opacity-100 transition-opacity"
            />
            <div className="bg-[#0a0a14] p-3 text-center border-t border-white/10">
              <p className="text-xs text-gray-500 font-mono">Fig 1. The Omega Mesh Interface in action</p>
            </div>
          </div>
        </section>

        {/* Core Features Grid */}
        <section>
          <h3 className="text-xl font-bold text-white mb-6 border-b border-white/10 pb-4">Core Concepts</h3>
          
          <div className="grid md:grid-cols-2 gap-6">
            
            {/* Navigating the UI */}
            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-colors">
              <Radio className="w-6 h-6 text-primary mb-4" />
              <h4 className="font-bold text-white mb-2">1. Local Radar</h4>
              <p className="text-xs text-gray-400 leading-relaxed">
                The Radar view scans your immediate physical area for other Omega Mesh nodes. It will automatically attempt to handshake with them using BLE or Wi-Fi to establish a routing path.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-colors">
              <Key className="w-6 h-6 text-neon mb-4" />
              <h4 className="font-bold text-white mb-2">2. Secure Channels</h4>
              <p className="text-xs text-gray-400 leading-relaxed">
                All communications happen inside <strong>Channels</strong>. Public channels are broadcasted to the entire local mesh. Private channels require an 8-character invite code and utilize AES-256 E2EE.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-colors">
              <Shield className="w-6 h-6 text-[#e879f9] mb-4" />
              <h4 className="font-bold text-white mb-2">3. Forward Secrecy</h4>
              <p className="text-xs text-gray-400 leading-relaxed">
                Private channels have a 3-hour dormant persistence. If no messages are sent for 3 hours, the channel automatically shreds its encryption keys on all devices to prevent forensic recovery.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-danger/5 border border-danger/20 hover:bg-danger/10 transition-colors">
              <AlertTriangle className="w-6 h-6 text-danger mb-4" />
              <h4 className="font-bold text-white mb-2">4. SOS Broadcast</h4>
              <p className="text-xs text-gray-400 leading-relaxed">
                The red "Broadcast SOS" button in the top right will override all private channels and flood the mesh network with your GPS coordinates and a distress signal. Use only in emergencies.
              </p>
            </div>
            
          </div>
        </section>

        {/* Step by Step Setup */}
        <section className="pb-8">
          <h3 className="text-xl font-bold text-white mb-6 border-b border-white/10 pb-4">Quick Start Guide</h3>
          
          <ul className="space-y-6 relative before:absolute before:inset-y-0 before:left-[15px] before:w-px before:bg-white/10">
            <li className="relative pl-10">
              <span className="absolute left-0 top-0.5 w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs border border-primary/30 z-10">1</span>
              <h4 className="font-bold text-white text-sm mb-1">Verify Hardware</h4>
              <p className="text-xs text-gray-400">Go to the Hardware tab and ensure your Wi-Fi and Bluetooth antennas are toggled "Active".</p>
            </li>
            
            <li className="relative pl-10">
              <span className="absolute left-0 top-0.5 w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs border border-primary/30 z-10">2</span>
              <h4 className="font-bold text-white text-sm mb-1">Join the Mesh</h4>
              <p className="text-xs text-gray-400">Navigate to the Radar tab. You should see local nodes appearing. The system handles routing automatically.</p>
            </li>

            <li className="relative pl-10">
              <span className="absolute left-0 top-0.5 w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs border border-primary/30 z-10">3</span>
              <h4 className="font-bold text-white text-sm mb-1">Connect with Peers</h4>
              <p className="text-xs text-gray-400">Click the Omega Channels logo (Network icon) in the top left or use the Messages tab to Create or Join a secure channel.</p>
            </li>
          </ul>
        </section>

      </div>
    </div>
  );
}
