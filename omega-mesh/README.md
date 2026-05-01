<p align="center">
  <img src="https://img.shields.io/badge/Platform-Off--Grid%20Mesh-blueviolet?style=for-the-badge" />
  <img src="https://img.shields.io/badge/Encryption-AES--256%20E2EE-00c9a7?style=for-the-badge" />
  <img src="https://img.shields.io/badge/Stack-React%20%2B%20TypeScript%20%2B%20PeerJS-blue?style=for-the-badge" />
  <img src="https://img.shields.io/badge/Architecture-Zero--Trust-red?style=for-the-badge" />
</p>

# 🛰️ Omega Mesh

**A decentralized, zero-trust off-grid communication platform designed for resilience when cellular grids and internet infrastructure are destroyed.**

Omega Mesh ensures communication remains possible in disaster zones, conflict areas, and infrastructure-collapsed regions by cascading through multiple network tiers — from internet WebRTC all the way down to LoRa radio beacons.

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🔐 **Zero-Trust Auth** | Login with a locally-generated 64-char hex key. No databases, no cloud accounts, no tracking. |
| 🌐 **Multi-Tier Cascade** | Automatically falls back: WebRTC → Wi-Fi Direct → BLE Mesh → LoRa Radio |
| 🔒 **AES-256 E2EE** | Every private channel message is encrypted end-to-end using the Web Crypto API. Invalid keys show `🔒 Decryption Failed`. |
| 👑 **Admin Approval** | Channel creators control who joins. Pending peers must be approved before they can read or send messages. |
| 📡 **Live Peer Tracking** | Real-time pulsing indicators show connected peers. Peers disappear when they go offline. |
| 🆘 **Emergency SOS** | One-tap broadcast to all mesh peers, bypassing channel locks. |
| 💾 **Export / Restore** | Backup all channels + messages to JSON. Re-import on any device to resume. |
| 📡 **Active Radar** | Animated radar scanning for BLE, Wi-Fi Direct, and LoRa beacons (hardware-ready). |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────┐
│                  OMEGA MESH                     │
├─────────────┬───────────────┬───────────────────┤
│  Tier 1     │  Tier 2       │  Tier 3 & 4       │
│  WebRTC     │  Wi-Fi Direct │  BLE + LoRa       │
│  (PeerJS)   │  (Web API)    │  (Serial/BT API)  │
├─────────────┴───────────────┴───────────────────┤
│           AES-256 Encrypted Payloads            │
├─────────────────────────────────────────────────┤
│           React + TypeScript Frontend           │
└─────────────────────────────────────────────────┘
```

**Data Flow:**
1. User types message → plaintext encrypted with `CryptoJS.AES.encrypt(msg, channelCode)`
2. Encrypted cipher sent via PeerJS WebRTC data channel (DTLS transport layer)
3. Receiver decrypts with `CryptoJS.AES.decrypt(cipher, channelCode)`
4. If key mismatch → `🔒 [Decryption Failed - Invalid Key]`

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm

### Install & Run

```bash
# Clone the repo
git clone https://github.com/techiekamal21/sahayak.git
cd omega-mesh

# Install dependencies
npm install

# Development mode (hot reload)
npm run dev

# Production build + preview
npm run build
npm run preview -- --host
```

Open `http://localhost:4173` on your device.  
Open `http://<your-ip>:4173` on another device (same Wi-Fi) to test cross-device chat.

---

## 🧪 How to Test P2P Chat

1. Open the app in **two browser tabs** (or two devices on the same network)
2. **Tab 1:** Generate key → Login → Create a Private channel → Note the invite code
3. **Tab 2:** Generate key → Login → Join → Paste the invite code → Click "Secure Join"
4. **Tab 1:** Approve the connection request
5. **Both tabs:** Send messages — they appear in real-time, AES-256 encrypted

---

## 🛡️ Security Model

| Layer | Mechanism |
|-------|-----------|
| **Identity** | 64-char hex key (locally generated, never transmitted) |
| **Transport** | DTLS via WebRTC (mandatory encryption) |
| **Payload** | AES-256 symmetric encryption using channel invite code as key |
| **Storage** | Zero — no central server, no database, no cloud persistence |
| **Privacy** | No user accounts, no tracking, no analytics |

---

## 📁 Project Structure

```
omega-mesh/
├── src/
│   ├── App.tsx              # Main app shell, routing, sidebar
│   ├── index.css            # Global styles (Tailwind v4)
│   └── components/
│       ├── LandingView.tsx   # Crypto key authentication
│       ├── RadarView.tsx     # Animated radar scanner
│       ├── PeersView.tsx     # Connected peers display
│       ├── MessagesView.tsx  # Chat UI + PeerJS + AES encryption
│       ├── ChannelModal.tsx  # Create/Join channel modal
│       ├── HardwareView.tsx  # Hardware configuration
│       ├── SOSModal.tsx      # Emergency SOS broadcast
│       └── GuideView.tsx     # Help & documentation
├── CHANGELOG.md
├── package.json
├── vite.config.ts
└── tailwind.config.js
```

---

## 🛠️ Tech Stack

- **Frontend:** React 19, TypeScript, Vite
- **Styling:** Tailwind CSS v4
- **Animations:** Framer Motion
- **Icons:** Lucide React
- **P2P Networking:** PeerJS (WebRTC)
- **Encryption:** CryptoJS (AES-256)

---

## 📋 Changelog

See [CHANGELOG.md](./CHANGELOG.md) for full version history.

---

## 📜 License

This project is open source and available under the [MIT License](LICENSE).

---

<p align="center">
  <strong>Built for when the grid goes dark. 🌑</strong>
</p>
