# SAVAGE Framework TODO

## Phase 2: Database Schema & Core Configuration
- [x] Define Drizzle ORM schema for all entities (hunting sessions, handshakes, networks, services, vulnerabilities, credentials, raids, activity log, device status)
- [x] Create TypeScript types for all database entities
- [x] Generate database migrations
- [x] Apply initial schema to database
- [x] Create database query helpers in server/db.ts
- [x] Create tRPC procedures for all SAVAGE operations

## Phase 3: Core Orchestration Engine
- [x] Design state machine for Hunting/Raid mode transitions
- [x] Create orchestration engine base class
- [x] Implement event emitter for real-time updates
- [x] Create WebSocket event structure and types
- [x] Build orchestration API procedures (start/stop hunting, switch modes, get status)
- [x] Create WebSocket server integration for real-time event streaming

## Phase 4: Hunting Phase Module
- [x] Integrate bettercap for Wi-Fi de-authentication and handshake capture
- [x] Implement lightweight AI model for target selection
- [x] Create handshake storage and local indexing
- [x] Build offline dictionary attack using Hashcat-utils
- [x] Implement wpa-sec API integration for remote cracking
- [x] Create handshake capture event streaming

## Phase 5: Raid Phase Module
- [x] Implement nmcli integration for automatic network connection
- [x] Integrate Nmap for network mapping and port scanning
- [x] Build modular brute-forcer for SSH, FTP, SMB services
- [x] Implement lightweight vulnerability scanner
- [x] Create service enumeration and version detection
- [x] Build raid scan event streaming

## Phase 6: Build the cyberpunk-themed web dashboard with real-time updates
- [x] Design cyberpunk color scheme and CSS theme system
- [x] Create dashboard layout with sidebar navigation
- [x] Build Hunting mode interface (handshake captures, signal strengths, statistics)
- [x] Build Raid mode interface (network scans, hosts, ports, services)
- [x] Implement WebSocket connection for real-time updates
- [x] Create live charts and metrics visualization (Recharts)
- [x] Build network topology visualization (D3.js or similar)

## Phase 7: Handshake & Credential Management
- [x] Create handshake upload/download interface
- [x] Build crack status tracking and progress display
- [x] Implement wpa-sec integration UI
- [x] Create credential vault interface with encryption
- [x] Build credential search and filtering
- [x] Implement secure credential display with masking
- [x] Create network targets visualization with attack surface

## Phase 8: Device Monitoring & Activity Log
- [x] Create device status panel (CPU, memory, temperature, battery)
- [x] Build activity log viewer with timeline
- [x] Implement event filtering and search
- [x] Create export report generation (CSV export)
- [x] Build remote command interface for manual operations
- [x] Implement configuration panel for hunting parameters

## Phase 9: Installation & Documentation
- [x] Create Raspberry Pi setup script
- [x] Write systemd service configuration
- [x] Create installation documentation
- [x] Write API documentation
- [x] Create user guide with screenshots
- [x] Build troubleshooting guide
- [x] Create configuration panel for hunting and raid parameters
- [x] Build report generator for penetration test findings

## Phase 10: Delivery & Testing
- [ ] Run comprehensive vitest suite
- [ ] Test all API procedures
- [ ] Verify WebSocket real-time updates
- [ ] Test dashboard UI responsiveness
- [ ] Create final checkpoint
- [ ] Deliver complete framework to user

## Phase 10: Sidebar Navigation & Command Interface
- [x] Create persistent sidebar navigation component
- [x] Implement active state indicators with route matching
- [x] Add navigation icons for all dashboard sections
- [x] Build manual command interface with quick actions
- [x] Add settings persistence to database
- [x] Create collapsible sidebar for mobile responsiveness

## Phase 11: Real-Time System Metrics Integration
- [x] Create backend system metrics reader module
- [x] Implement CPU usage retrieval from /proc/stat
- [x] Implement memory usage retrieval from /proc/meminfo
- [x] Implement temperature reading from /sys/class/thermal
- [x] Implement battery status from UPS HAT
- [x] Create tRPC procedures for metrics endpoints
- [x] Add metrics to WebSocket event streaming
- [x] Update DeviceStatus component with live data binding
- [x] Create metrics history storage in database
- [x] Build metrics trend visualization


## Phase 12: Hardware Compatibility & RFID Integration
- [ ] Create hardware abstraction layer for Raspberry Pi Zero 2W
- [ ] Implement ELEGOO 2.8" TFT display driver with touch support
- [ ] Implement UPS HAT power management and battery monitoring
- [ ] Build HiLetgo PN532 NFC/RFID module driver (I2C/SPI)
- [ ] Build RDM6300 125kHz RFID module driver (UART)
- [ ] Create RFID card detection and logging UI component
- [ ] Integrate RFID data into credential vault
- [ ] Add RFID event streaming to WebSocket

## Phase 13: WebSocket Real-Time Streaming
- [ ] Implement metrics streaming via WebSocket
- [ ] Add hunting/raid event streaming
- [ ] Create RFID event streaming
- [ ] Build dashboard live update mechanism
- [ ] Implement connection health monitoring
- [ ] Add automatic reconnection logic

## Phase 13: Documentation & Deployment
- [x] Create requirements.txt with all dependencies
- [x] Write comprehensive README.md
- [x] Write QUICKSTART.md with setup instructions
- [x] Create hardware configuration guide
- [x] Write RFID driver documentation
- [x] Create systemd service files
- [x] Write installation script for Raspberry Pi
- [x] Create troubleshooting guide
- [x] Create deployment guide with SSL, monitoring, backups

## Phase 14: React Native Mobile Companion App
- [x] Setup React Native project with Expo
- [x] Create mobile authentication flow
- [x] Build device connection and WebSocket integration
- [x] Implement real-time metrics display (CPU, memory, temperature, battery)
- [x] Create hunting/raid mode controls
- [x] Build credential vault viewer
- [x] Implement activity log viewer
- [x] Add push notifications for alerts
- [x] Create offline mode with local caching
- [x] Build APK/IPA for iOS and Android distribution
