# SAVAGE Framework Research & Architecture

## Phase 1: Research Findings

### Penetration Testing Report Structure
Based on industry standards (PTES, OWASP, NIST), a comprehensive pentest report includes:

1. **Executive Summary** - High-level objectives, scope, timeline, critical findings, business impact
2. **Scope & Methodology** - Tools used, testing windows, rules of engagement, techniques (pre-engagement → threat modeling → vulnerability analysis → exploitation)
3. **Findings & Evidence** - Vulnerabilities with CVSS scores, proof of concept, affected assets, exploitability
4. **Risk Ratings & Prioritization** - CVSS-based triage grid, severity levels, action urgency
5. **Remediation & Retesting Plan** - Actionable steps, ownership, timelines, "verified fixed" vs "risk accepted"
6. **Appendices** - Diagrams, changelogs, tool versions, screenshots, payloads

### Real-Time Dashboard Architecture

**WebSocket Patterns for Live Updates:**
- WebSockets maintain persistent bidirectional connections for real-time data streaming
- Ideal for financial dashboards, chat apps, and monitoring systems
- Low overhead protocol enables instant updates without polling overhead
- Publish-subscribe pattern scales well for multi-client scenarios

**Network Visualization Best Practices:**
- Node-based graphs showing hosts, services, and connections
- Real-time topology mapping with live discovery updates
- Port scanning visualization with status indicators
- Vulnerability severity color-coding (CVSS-based)

### Cyberpunk HUD Design System

**Visual Characteristics:**
- Deep black backgrounds (#000000 or near-black)
- Vibrant neon colors: hot pink (#FF00FF), electric cyan (#00FFFF), lime green (#00FF00)
- Bold geometric sans-serif fonts (e.g., Orbitron, Space Mono, Courier New)
- Outer glow effects (CSS text-shadow, box-shadow with blur)
- Minimalist HUD elements: thin technical lines, corner brackets, scanlines
- Flat design with digital/holographic aesthetic
- High contrast for readability in security contexts

### Database Schema Design Considerations

**Core Entities:**
1. **Hunting Sessions** - Timestamp, duration, target area, handshakes captured
2. **Handshakes** - SSID, BSSID, signal strength, WPA version, capture time, crack status
3. **Network Targets** - IP, hostname, MAC address, discovery time, last seen
4. **Services** - Host ID, port, protocol, service name, version, vulnerability status
5. **Vulnerabilities** - Service ID, CVE/CWE, CVSS score, description, remediation
6. **Credentials** - Service ID, username, password (encrypted), discovery method, timestamp
7. **Raid Sessions** - Network target, scan time, duration, findings count
8. **Activity Log** - Event type, timestamp, details, severity level
9. **Device Status** - CPU, memory, temperature, battery, operational mode

**Relationships:**
- Hunting Sessions → Handshakes (1:N)
- Raid Sessions → Network Targets (1:N)
- Network Targets → Services (1:N)
- Services → Vulnerabilities (1:N)
- Services → Credentials (1:N)
- All entities → Activity Log (N:1)

### Raspberry Pi Hardware Integration

**Components:**
- Raspberry Pi Zero 2 W (1.6 GHz ARM Cortex-A53, 512 MB RAM)
- UPS HAT (C) - Pogo Pin power backup
- HiLetgo PN532 NFC/RFID Module - I2C/SPI/HSU interface
- Waveshare 1.44" LCD Display HAT (128x128 pixels, SPI)
- Standard accessories: heatsink, USB OTG, Mini HDMI adapter

**Constraints:**
- Limited RAM (512 MB) → lightweight Python orchestration
- SPI-based display → non-blocking rendering
- Multiple I2C/SPI devices → careful bus management
- Battery-powered → optimize for low power consumption

### Technology Stack

**Backend:**
- Express.js with tRPC for type-safe API
- MySQL/TiDB for persistent storage
- WebSockets for real-time updates
- Python orchestration engine (separate process)

**Frontend:**
- React 19 with Tailwind CSS 4
- Cyberpunk theme with neon colors
- Real-time charts (Recharts) for metrics
- Network visualization (D3.js or similar)

**Pi-side:**
- Python 3 with asyncio for orchestration
- bettercap for Wi-Fi exploitation
- nmcli for network management
- Nmap for port scanning
- Hashcat-utils for offline cracking
- Pillow/PIL for e-ink display rendering

---

## Next Steps: Phase 2

1. Define complete database schema in Drizzle ORM
2. Create TypeScript types for all entities
3. Design API procedures for CRUD operations
4. Plan WebSocket event structure for real-time updates
5. Create cyberpunk CSS theme system
