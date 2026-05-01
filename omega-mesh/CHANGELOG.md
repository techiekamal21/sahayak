# Changelog
All notable changes to the Omega Mesh project will be documented in this file.

## [1.1.0] - 2026-05-01
### Fixed
- **Critical:** nodeId now uses pure alphanumeric format (`OMxxxxxxxx`) so invite codes survive the join input filter — PeerJS connections now work cross-device.
- **Critical:** Private channel IDs now use `private-{code}` on both creator and joiner sides — messages route to the same channel.
- **Channel naming:** Joiner no longer sees invite code as channel name. Shows "Connecting..." then auto-updates to admin's real channel name via metadata exchange.
- **Description leak:** Channel description no longer exposes the invite code.
- **Admin approval:** When admin approves a peer, channel metadata (name, rules) is sent to the joiner automatically.

### Removed
- All mock/fake data from PeersView (5 hardcoded peers) and RadarView (4 hardcoded beacons).
- Replaced with proper empty states that guide users to the Messages tab.

### Added
- `channel-info` protocol message: admin sends channel name, rules, and description to approved joiners.
- Comprehensive end-to-end test plan in `skills/test-plan.md` (9 test groups, 40+ test steps).
- Join input now accepts up to 16 alphanumeric characters (was limited to 8).

## [1.0.0] - 2026-05-01
### Added
- Created the decentralized Landing Gateway with local 64-hex key generation.
- Implemented the tabbed Channel Hub (Create, Join, Guide).
- Added an interactive "How to Use" Guide explaining the multi-tier cascading connectivity model and security guarantees.
- Integrated an Emergency SOS broadcast system, placed securely in the sidebar to prevent accidental clicks.
- Built Local Radar for discovering BLE/LoRa/Wi-Fi beacons without capturing sensitive payload data.
- Added Export and Import (Backup/Restore) functionalities in the Messages view to allow local state persistence.
- Added optional Channel Rules feature for private and public channels.
- Added Disconnect Node (Logout) functionality.

### Changed
- Re-architected project to use Tailwind CSS v4 and Vite.
- Ensured strict TypeScript compliance across all components.
