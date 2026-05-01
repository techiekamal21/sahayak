import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Cpu, Radio, Bluetooth, Wifi, Mic, Thermometer,
  Zap, HardDrive, ToggleLeft, ToggleRight, ChevronRight,
  AlertCircle, CheckCircle, Activity
} from 'lucide-react';

const HARDWARE_MODULES = [
  {
    id: 'lora',
    name: 'LoRa Radio Module',
    model: 'SX1276 @ 915 MHz',
    icon: Radio,
    color: '#fb923c',
    status: 'disconnected',
    enabled: false,
    description: 'Long-range, low-power radio. Ideal for Tier 1–2 disaster comms over 10–40 km.',
    stats: null,
    pinNote: 'Connect via UART / USB-Serial adapter. Awaiting Web Serial API handshake.',
  },
  {
    id: 'ble',
    name: 'Bluetooth LE Adapter',
    model: 'BLE 5.2 (System)',
    icon: Bluetooth,
    color: '#2dd4bf',
    status: 'active',
    enabled: true,
    description: 'Short-range encrypted mesh. Used for Tier 3 local area peer discovery and relay.',
    stats: { txPower: '0 dBm', channels: '37, 38, 39', advInterval: '100 ms' },
    pinNote: null,
  },
  {
    id: 'wifi',
    name: 'Wi-Fi Direct (mDNS)',
    model: '802.11ax (Wi-Fi 6)',
    icon: Wifi,
    color: '#818cf8',
    status: 'active',
    enabled: true,
    description: 'WebRTC mDNS routing over local Wi-Fi Direct. Tier 3 mesh backbone with ~90m range.',
    stats: { band: '5 GHz', channel: '7', txRate: '540 Mbps' },
    pinNote: null,
  },
  {
    id: 'acoustic',
    name: 'Acoustic Modem',
    model: 'Microphone Input',
    icon: Mic,
    color: '#e879f9',
    status: 'standby',
    enabled: false,
    description: 'Last-resort audio FSK modem using device microphone. Tier 5 — 20 bps, audible range only.',
    stats: null,
    pinNote: 'Grant browser microphone permissions to activate. Works offline as final fallback.',
  },
];

const STATUS_META: Record<string, { color: string; label: string; icon: typeof CheckCircle }> = {
  active: { color: '#2dd4bf', label: 'Active', icon: CheckCircle },
  disconnected: { color: '#6b7280', label: 'Disconnected', icon: AlertCircle },
  standby: { color: '#818cf8', label: 'Standby', icon: Activity },
};

export default function HardwareView() {
  const [modules, setModules] = useState(HARDWARE_MODULES);
  const [selected, setSelected] = useState<string | null>(null);

  const toggle = (id: string) => {
    setModules(prev => prev.map(m => m.id === id ? { ...m, enabled: !m.enabled } : m));
  };

  const selectedModule = modules.find(m => m.id === selected);

  return (
    <div className="flex-1 flex flex-col gap-6">
      {/* Header */}
      <header>
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white via-gray-100 to-gray-400 tracking-tight">
          Hardware Configuration
        </h1>
        <p className="text-gray-400 mt-1.5 text-sm">
          Manage radio interfaces and hardware modules for the mesh node
        </p>
      </header>

      {/* System health strip */}
      <div className="glass-panel rounded-2xl p-4 flex flex-wrap gap-6">
        {[
          { icon: Cpu, label: 'Node CPU', value: '12%', color: '#2dd4bf' },
          { icon: Thermometer, label: 'Temp', value: '38°C', color: '#fb923c' },
          { icon: HardDrive, label: 'Storage', value: '2.1 GB', color: '#818cf8' },
          { icon: Zap, label: 'Power Mode', value: 'Balanced', color: '#a3e635' },
        ].map(item => (
          <div key={item.label} className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center"
              style={{ background: `${item.color}18`, border: `1px solid ${item.color}30` }}>
              <item.icon className="w-4 h-4" style={{ color: item.color }} />
            </div>
            <div>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider">{item.label}</p>
              <p className="text-sm font-mono font-semibold text-white">{item.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Modules list + detail */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Module list */}
        <div className="lg:col-span-2 flex flex-col gap-3">
          {modules.map((mod, i) => {
            const statusMeta = STATUS_META[mod.status];
            const Icon = mod.icon;
            const StatusIcon = statusMeta.icon;
            const isSelected = selected === mod.id;

            return (
              <motion.div
                key={mod.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.07 }}
                className={`glass-panel rounded-2xl p-5 flex items-center gap-4 cursor-pointer transition-all ${isSelected ? 'ring-1 ring-primary/40' : 'hover:ring-1 hover:ring-white/10'}`}
                onClick={() => setSelected(isSelected ? null : mod.id)}
              >
                {/* Icon */}
                <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `${mod.color}18`, border: `1px solid ${mod.color}30` }}>
                  <Icon className="w-5 h-5" style={{ color: mod.color }} />
                </div>

                {/* Name */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white">{mod.name}</p>
                  <p className="text-xs text-gray-500 font-mono mt-0.5">{mod.model}</p>
                  <div className="flex items-center gap-1.5 mt-2">
                    <StatusIcon className="w-3 h-3" style={{ color: statusMeta.color }} />
                    <span className="text-[10px] font-medium" style={{ color: statusMeta.color }}>
                      {statusMeta.label}
                    </span>
                  </div>
                </div>

                {/* Toggle */}
                <button
                  id={`toggle-${mod.id}`}
                  onClick={e => { e.stopPropagation(); toggle(mod.id); }}
                  className="flex-shrink-0"
                  title={mod.enabled ? 'Disable' : 'Enable'}
                >
                  {mod.enabled
                    ? <ToggleRight className="w-8 h-8 text-primary" />
                    : <ToggleLeft className="w-8 h-8 text-gray-600" />
                  }
                </button>

                <ChevronRight className={`w-4 h-4 text-gray-600 transition-transform ${isSelected ? 'rotate-90' : ''}`} />
              </motion.div>
            );
          })}
        </div>

        {/* Module detail pane */}
        <div className="flex flex-col gap-4">
          {selectedModule ? (
            <motion.div
              key={selectedModule.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-panel rounded-2xl p-6 flex flex-col gap-5 ring-1 ring-primary/20"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: `${selectedModule.color}20`, border: `1px solid ${selectedModule.color}35` }}>
                  <selectedModule.icon className="w-5 h-5" style={{ color: selectedModule.color }} />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white">{selectedModule.name}</h2>
                  <p className="text-xs font-mono text-gray-500">{selectedModule.model}</p>
                </div>
              </div>

              <p className="text-sm text-gray-400 leading-relaxed">{selectedModule.description}</p>

              {/* Live stats */}
              {selectedModule.stats && (
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-wider text-gray-500 font-semibold">Live Parameters</p>
                  {Object.entries(selectedModule.stats).map(([k, v]) => (
                    <div key={k} className="flex justify-between py-1.5 border-b border-border last:border-0">
                      <span className="text-xs text-gray-500 capitalize">{k.replace(/([A-Z])/g, ' $1')}</span>
                      <span className="text-xs font-mono text-white">{v}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Pin note */}
              {selectedModule.pinNote && (
                <div className="flex gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-300/80 leading-relaxed">{selectedModule.pinNote}</p>
                </div>
              )}

              <button
                id={`config-btn-${selectedModule.id}`}
                className="w-full py-2.5 rounded-xl border text-sm font-medium transition-colors"
                style={{
                  background: `${selectedModule.color}15`,
                  borderColor: `${selectedModule.color}30`,
                  color: selectedModule.color
                }}
              >
                Advanced Configuration
              </button>
            </motion.div>
          ) : (
            <div className="glass-panel rounded-2xl p-6 flex flex-col items-center justify-center text-center min-h-[200px]">
              <Cpu className="w-8 h-8 text-gray-600 mb-3" />
              <p className="text-sm text-gray-500">Select a module to view its<br />configuration and live stats</p>
            </div>
          )}

          {/* Tier diagram */}
          <div className="glass-panel rounded-2xl p-5">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Fallback Tier Chain</h3>
            {[
              { tier: 1, label: 'Internet (TCP/IP)', color: '#818cf8' },
              { tier: 2, label: 'Wi-Fi Direct / mDNS', color: '#4ade80' },
              { tier: 3, label: 'Bluetooth LE Mesh', color: '#2dd4bf' },
              { tier: 4, label: 'LoRa Radio (915 MHz)', color: '#fb923c' },
              { tier: 5, label: 'Acoustic FSK Modem', color: '#e879f9' },
            ].map((t, i, arr) => (
              <div key={t.tier} className="flex items-start gap-3">
                <div className="flex flex-col items-center">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold"
                    style={{ background: `${t.color}25`, color: t.color, border: `1px solid ${t.color}40` }}>
                    {t.tier}
                  </div>
                  {i < arr.length - 1 && <div className="w-px h-5 bg-border" />}
                </div>
                <p className="text-xs text-gray-400 pt-1 leading-tight">{t.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
