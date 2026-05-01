import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, Activity, Wifi, Bluetooth, Radio } from 'lucide-react';

const SIGNAL_TYPES = {
  ble: { color: '#2dd4bf', label: 'BLE', icon: Bluetooth },
  wifi: { color: '#818cf8', label: 'Wi-Fi', icon: Wifi },
  lora: { color: '#fb923c', label: 'LoRa', icon: Radio },
};

export default function RadarView() {
  const [scanning, setScanning] = useState(true);
  const [sweepAngle, setSweepAngle] = useState(0);
  const [scanCount, setScanCount] = useState(0);
  const rafRef = useRef<number>(0);
  const lastTime = useRef<number>(0);

  useEffect(() => {
    if (!scanning) return;
    const animate = (time: number) => {
      const delta = time - lastTime.current;
      lastTime.current = time;
      setSweepAngle(prev => (prev + delta * 0.06) % 360);
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [scanning]);

  const handleRescan = () => {
    setSweepAngle(0);
    setScanCount(c => c + 1);
    setScanning(true);
  };

  return (
    <div className="flex-1 flex flex-col gap-6">
      <header className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white via-gray-100 to-gray-400 tracking-tight">
            Active Mesh Radar
          </h1>
          <p className="text-gray-400 mt-1.5 text-sm">
            Scanning for Bluetooth LE · Wi-Fi Direct · LoRa beacons
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            id="rescan-btn"
            onClick={handleRescan}
            className="glass-button px-4 py-2 rounded-xl flex items-center gap-2 text-sm text-gray-300 hover:text-white"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Re-scan</span>
          </button>
          <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium border ${scanning ? 'bg-neon/10 text-neon border-neon/30 animate-blink' : 'bg-white/5 text-gray-400 border-border'}`}>
            <span className={`w-2 h-2 rounded-full ${scanning ? 'bg-neon shadow-[0_0_8px_#2dd4bf]' : 'bg-gray-500'}`} />
            {scanning ? 'Scanning...' : 'Idle'}
          </div>
        </div>
      </header>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Radar Canvas */}
        <div className="lg:col-span-2 glass-panel rounded-2xl p-6 flex flex-col items-center justify-center relative overflow-hidden min-h-[400px]">
          <div className="absolute top-4 left-6 font-mono text-[10px] text-gray-500">
            <p>LAT: ---.----° N</p>
            <p>LNG: ---.----° E</p>
            <p className="mt-1 text-primary/60">Awaiting GPS lock</p>
          </div>
          <div className="absolute top-4 right-6 font-mono text-[10px] text-gray-500 text-right">
            <p>915 MHz</p>
            <p>CH: 7/125</p>
          </div>

          {/* Radar */}
          <div className="relative w-72 h-72">
            {[0, 1, 2, 3].map(i => (
              <div
                key={i}
                className="absolute rounded-full border border-primary/15"
                style={{ inset: `${i * 18}px` }}
              />
            ))}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-full h-px bg-primary/10" />
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-full w-px bg-primary/10" />
            </div>

            {/* Sweep */}
            <div
              className="absolute inset-0 origin-center rounded-full overflow-hidden"
              style={{ transform: `rotate(${sweepAngle}deg)` }}
            >
              <div
                className="absolute inset-0"
                style={{
                  background: `conic-gradient(from 0deg, transparent 330deg, rgba(99,102,241,0.35) 355deg, transparent 360deg)`,
                }}
              />
            </div>

            {/* Center node */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-10 h-10 rounded-full bg-primary/20 border border-primary/50 flex items-center justify-center shadow-[0_0_30px_rgba(99,102,241,0.4)]">
                <Activity className="w-5 h-5 text-primary" />
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="flex gap-4 mt-8">
            {Object.entries(SIGNAL_TYPES).map(([key, val]) => (
              <div key={key} className="flex items-center gap-1.5 text-xs text-gray-400">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: val.color }} />
                {val.label}
              </div>
            ))}
          </div>
        </div>

        {/* Right side: stats */}
        <div className="flex flex-col gap-4">
          <div className="glass-panel rounded-2xl p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Network Stats</h2>
            {[
              { label: 'Peers Found', value: '0', unit: '', color: 'text-primary' },
              { label: 'Avg RSSI', value: '--', unit: 'dBm', color: 'text-neon' },
              { label: 'Scan Cycle', value: String(scanCount + 1), unit: 'th', color: 'text-gray-300' },
            ].map(m => (
              <div key={m.label} className="flex justify-between items-center">
                <span className="text-xs text-gray-500">{m.label}</span>
                <span className={`font-mono font-semibold text-sm ${m.color}`}>
                  {m.value}<span className="text-gray-500 text-xs ml-0.5">{m.unit}</span>
                </span>
              </div>
            ))}
          </div>

          <div className="glass-panel rounded-2xl p-5 flex-1">
            <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">Discovered Peers</h2>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-8 flex flex-col items-center gap-3"
            >
              <div className="w-12 h-12 rounded-full bg-white/5 border border-border flex items-center justify-center">
                <Radio className="w-5 h-5 text-gray-600" />
              </div>
              <p className="text-gray-500 text-sm">No beacons detected</p>
              <p className="text-[10px] text-gray-600 max-w-[200px]">
                Hardware modules (BLE/LoRa) required for local peer discovery. Use Messages tab for WebRTC connections.
              </p>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
