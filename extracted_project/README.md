# SAVAGE Framework - Autonomous Cybersecurity Platform

**SAVAGE** is a unified, autonomous cybersecurity platform that fuses external Wi-Fi exploitation capabilities with internal network auditing power into a single, cohesive device. Built to run on a Raspberry Pi Zero 2 W with a custom e-ink display, SAVAGE operates in two distinct but interconnected phases: **Hunting** mode for wireless reconnaissance and handshake capture, and **Raid** mode for internal network exploitation and vulnerability assessment.

## Overview

SAVAGE represents a paradigm shift in portable penetration testing. Rather than requiring multiple tools and devices, SAVAGE consolidates the entire attack surface into a single "cyber Viking" that can breach a network's perimeter and then pillage its internal infrastructure without ever needing a laptop.

### Key Features

**Hunting Phase** captures WPA handshakes through bettercap-powered de-authentication attacks, stores them locally, and automatically uploads them to wpa-sec for remote cracking. The AI-powered target selection intelligently prioritizes high-value networks based on signal strength, encryption type, and client density.

**Raid Phase** seamlessly transitions from wireless exploitation to internal reconnaissance. Once a network is compromised, SAVAGE automatically connects via nmcli and deploys a comprehensive suite of reconnaissance tools including Nmap for network mapping, a modular brute-forcer for SSH/FTP/SMB services, and a CVE-based vulnerability scanner to identify misconfigured systems.

**Dual-State Interface** features a cyberpunk-aesthetic web dashboard with two operational modes. Hunting mode displays real-time handshake captures, signal strengths, and hunting statistics. Raid mode shows live network scan results, discovered hosts, open ports, service enumeration, and vulnerability findings.

**Credential Management** maintains a secure vault for storing and managing cracked passwords, SSH keys, and service credentials discovered during raids. All credentials are encrypted and searchable for quick reference during penetration testing engagements.

**Real-Time Monitoring** provides live system metrics including CPU usage, memory consumption, temperature, battery level, and operational mode. Historical trend visualization enables performance analysis and optimization.

## Hardware Requirements

SAVAGE is designed to run on the following hardware stack:

| Component | Model | Purpose |
|-----------|-------|---------|
| **Processor** | Raspberry Pi Zero 2 W | Main computing platform |
| **Display** | ELEGOO 2.8" TFT Touch Screen (320x240) | User interface and status display |
| **Power** | UPS HAT (C) with Pogo Pin Connector | Uninterruptible power supply |
| **RFID (NFC)** | HiLetgo PN532 NFC/RFID Module V3 | Near-field communication scanning |
| **RFID (125kHz)** | RDM6300 125kHz RFID Module | Legacy RFID card reading |
| **Storage** | 32GB+ microSD card | Operating system and data storage |
| **Cooling** | Aluminum heatsink | Thermal management |
| **Connectivity** | USB OTG cable, Mini HDMI adapter | External device connection |

### Hardware Connections

**ELEGOO 2.8" TFT Display (SPI)**
- CS: GPIO8 (CE0)
- MOSI: GPIO10
- MISO: GPIO9
- SCK: GPIO11
- Reset: GPIO17
- Backlight: GPIO18
- Touch: I2C or GPIO-based

**UPS HAT (C) (I2C)**
- SDA: GPIO2 (I2C1)
- SCL: GPIO3 (I2C1)
- I2C Address: 0x36
- Pogo pins for power connection

**HiLetgo PN532 (I2C/SPI)**
- I2C: SDA=GPIO2, SCL=GPIO3, Address=0x24
- Alternative: SPI mode with CS, MOSI, MISO, SCK
- IRQ: GPIO24 (optional)

**RDM6300 (UART)**
- TX: GPIO14 (UART0 RX)
- RX: GPIO15 (UART0 TX)
- Baudrate: 9600
- Format: 0x02 + 10 hex digits + 2 checksum + 0x03

## Installation

### Prerequisites

- Raspberry Pi Zero 2 W with Raspbian Lite (Bullseye or later)
- Python 3.9+
- Node.js 18+
- Internet connectivity for initial setup

### Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/savage-framework.git
   cd savage-framework
   ```

2. **Install system dependencies**
   ```bash
   sudo apt-get update
   sudo apt-get install -y \
     build-essential \
     python3-dev \
     python3-pip \
     git \
     i2c-tools \
     libffi-dev \
     libssl-dev \
     libjpeg-dev \
     zlib1g-dev \
     libharfbuzz0b \
     libwebp6 \
     libtiff5 \
     libjasper1 \
     libjasper-dev \
     libatlas-base-dev \
     libjasper1 \
     libharfbuzz0b \
     libwebp6 \
     libtiff5 \
     libopenjp2-7 \
     libtiffxx5 \
     libopenjp2-7-dev \
     libjasper-dev \
     libharfbuzz0b \
     libwebp6 \
     libtiff5
   ```

3. **Enable I2C and SPI**
   ```bash
   sudo raspi-config
   # Navigate to: Interfacing Options > I2C > Enable
   # Navigate to: Interfacing Options > SPI > Enable
   # Navigate to: Interfacing Options > Serial > Enable
   ```

4. **Install Python dependencies**
   ```bash
   pip3 install -r requirements.txt
   ```

5. **Install Node.js dependencies**
   ```bash
   npm install
   # or
   pnpm install
   ```

6. **Build the project**
   ```bash
   npm run build
   # or
   pnpm build
   ```

7. **Start the server**
   ```bash
   npm run start
   # or
   pnpm start
   ```

The dashboard will be available at `http://localhost:3000` or via the device's IP address.

## Configuration

### Environment Variables

Create a `.env` file in the project root with the following variables:

```bash
# Database
DATABASE_URL=mysql://user:password@localhost:3306/savage

# OAuth (Manus)
VITE_APP_ID=your_app_id
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://portal.manus.im

# JWT
JWT_SECRET=your_jwt_secret_key

# API Keys
BUILT_IN_FORGE_API_KEY=your_forge_api_key
VITE_FRONTEND_FORGE_API_KEY=your_frontend_api_key

# WPA-Sec Integration
WPASEC_API_KEY=your_wpasec_api_key
WPASEC_API_URL=https://wpa-sec.stanev.net/api

# Hardware
RFID_PN532_ENABLED=true
RFID_PN532_INTERFACE=i2c
RFID_RDM6300_ENABLED=true
RFID_RDM6300_PORT=/dev/ttyUSB0
```

### Hardware Configuration

Edit `server/hardware/hardware-manager.ts` to customize hardware settings:

```typescript
export const ELEGOO_TFT_CONFIG: DisplayConfig = {
  width: 320,
  height: 240,
  spiDevice: "/dev/spidev0.0",
  gpioReset: 17,
  gpioBacklight: 18,
  touchEnabled: true,
};

export const UPS_HAT_CONFIG: PowerConfig = {
  i2cBus: 1,
  i2cAddress: 0x36,
  checkInterval: 5000,
};
```

### RFID Configuration

Edit `server/rfid/rfid-manager.ts` to configure RFID modules:

```typescript
export const DEFAULT_RFID_CONFIG: RFIDConfig = {
  pn532Enabled: true,
  pn532Interface: "i2c",
  pn532I2CAddress: 0x24,
  pn532I2CBus: 1,
  rdm6300Enabled: true,
  rdm6300Port: "/dev/ttyUSB0",
  rdm6300Baudrate: 9600,
};
```

## Usage

### Dashboard Access

Access the SAVAGE dashboard via web browser at `http://<device-ip>:3000`. The interface features a persistent sidebar navigation with the following sections:

**Hunting Phase**
- Dashboard: Real-time hunting status and statistics
- Hunting: Start/pause/resume hunting operations
- Handshakes: Manage captured WPA handshakes, upload to wpa-sec

**Raid Phase**
- Raid: Initiate network scans and exploitation
- Credentials: View and manage discovered credentials
- Targets: Visualize discovered hosts and attack surface

**System**
- Device Status: Monitor CPU, memory, temperature, battery
- Activity Log: Timeline of all hunting/raid events

**Management**
- Configuration: Adjust hunting/raid parameters
- Reports: Generate penetration test reports
- RFID: Manage RFID card detections and logging

### Starting a Hunt

1. Navigate to **Hunting** section
2. Click **Start Hunting** to begin Wi-Fi reconnaissance
3. Monitor **Dashboard** for captured handshakes
4. Once handshakes are captured, upload to **wpa-sec** for cracking
5. Check **Handshakes** section for crack status

### Starting a Raid

1. Ensure a network is compromised (handshake cracked)
2. Navigate to **Raid** section
3. Select target network and click **Start Raid**
4. Monitor **Dashboard** for scan progress
5. View discovered hosts, ports, and vulnerabilities in **Targets**
6. Check **Credentials** for discovered passwords

### RFID Card Detection

1. Enable RFID modules in **Configuration**
2. Navigate to **RFID** section
3. Present NFC/RFID cards to modules
4. Detected cards appear in real-time with UID and timestamp
5. Cards are automatically logged for audit trails

## API Documentation

### Hunting Router (`/api/trpc/hunting`)

**Start Hunting**
```typescript
trpc.hunting.startHunting.mutate({
  channels: [1, 6, 11],
  dwellTime: 5,
  aiAggression: "medium",
  targetArea: "downtown",
})
```

**Stop Hunting**
```typescript
trpc.hunting.stopHunting.mutate()
```

**Get Hunting Status**
```typescript
const status = await trpc.hunting.getStatus.query()
```

**Upload Handshake to WPA-Sec**
```typescript
trpc.hunting.uploadHandshake.mutate({
  handshakeId: 123,
  ssid: "NetworkName",
})
```

### Raid Router (`/api/trpc/raid`)

**Start Raid**
```typescript
trpc.raid.startRaid.mutate({
  networkId: 456,
  scanType: "aggressive",
  bruteForceEnabled: true,
})
```

**Get Raid Results**
```typescript
const results = await trpc.raid.getRaidResults.query({ raidId: 789 })
```

### Metrics Router (`/api/trpc/metrics`)

**Get Current Metrics**
```typescript
const metrics = await trpc.metrics.getCurrent.query()
```

**Get Metrics History**
```typescript
const history = await trpc.metrics.getHistory.query({ hours: 24 })
```

### RFID Router (`/api/trpc/rfid`)

**Start RFID Scanning**
```typescript
trpc.rfid.startScanning.mutate()
```

**Get Card History**
```typescript
const cards = await trpc.rfid.getHistory.query()
```

## WebSocket Events

SAVAGE uses WebSocket for real-time event streaming. Connect to `ws://<device-ip>:3000/ws` to receive live updates:

**Hunting Events**
- `hunting:started` - Hunting session started
- `hunting:handshake-captured` - New handshake captured
- `hunting:stopped` - Hunting session stopped

**Raid Events**
- `raid:started` - Raid session started
- `raid:host-discovered` - New host found
- `raid:vulnerability-found` - Vulnerability detected
- `raid:credential-discovered` - Credential found
- `raid:stopped` - Raid session stopped

**Metrics Events**
- `metrics:updated` - System metrics updated
- `metrics:alert` - Alert threshold exceeded

**RFID Events**
- `rfid:card-detected` - RFID/NFC card detected
- `rfid:scanning-started` - RFID scanning started
- `rfid:scanning-stopped` - RFID scanning stopped

## Troubleshooting

### Display Not Working

1. Verify SPI is enabled: `sudo raspi-config` > Interfacing Options > SPI
2. Check GPIO connections with: `gpio readall`
3. Test SPI communication: `sudo i2cdetect -y 1`
4. Review logs: `tail -f ~/.manus-logs/devserver.log`

### RFID Modules Not Detected

1. Enable I2C: `sudo raspi-config` > Interfacing Options > I2C
2. Scan I2C devices: `sudo i2cdetect -y 1`
3. Check serial ports: `ls -la /dev/ttyUSB*`
4. Verify baud rate matches configuration (9600 for RDM6300)

### Battery Not Charging

1. Check UPS HAT power connection via Pogo pins
2. Verify I2C communication: `sudo i2cget -y 1 0x36 0x02`
3. Ensure power supply provides sufficient current (2A minimum)

### Network Connectivity Issues

1. Check Wi-Fi adapter: `iwconfig`
2. Verify bettercap installation: `bettercap --version`
3. Review hunting logs for errors
4. Ensure sufficient permissions for network operations

## Performance Optimization

### Reduce Memory Usage

- Disable unused RFID modules in configuration
- Limit metrics history retention to 7 days
- Use lightweight scan profiles for raids

### Improve Battery Life

- Reduce display brightness in configuration
- Disable backlight during idle periods
- Use lower AI aggression levels for hunting
- Implement sleep mode during inactivity

### Accelerate Handshake Cracking

- Enable GPU acceleration with Hashcat (requires CUDA)
- Use optimized wordlists for target region
- Implement distributed cracking via wpa-sec API

## Security Considerations

**Ethical Usage**: SAVAGE is designed for authorized penetration testing only. Unauthorized access to computer networks is illegal. Always obtain written permission before testing.

**Credential Storage**: All credentials are encrypted using AES-256. Encryption keys are stored securely in the database.

**Network Security**: The web dashboard requires OAuth authentication. All API communications use HTTPS/WSS over TLS 1.3.

**Physical Security**: Protect the device from unauthorized access. The UPS HAT enables secure shutdown even during power loss.

## Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## License

SAVAGE Framework is licensed under the MIT License. See LICENSE file for details.

## Support

For issues, questions, or suggestions:

- **GitHub Issues**: Report bugs and request features
- **Documentation**: Check QUICKSTART.md and driver guides
- **Community**: Join our Discord for discussions

## References

- [Raspberry Pi Zero 2 W Documentation](https://www.raspberrypi.com/products/raspberry-pi-zero-2-w/)
- [ELEGOO TFT Display Guide](https://www.elegoo.com/)
- [HiLetgo PN532 Documentation](https://www.hiletgo.com/)
- [RDM6300 RFID Module](https://www.amazon.com/RDM6300-125khz-Module-Arduino-Raspberry/dp/B07YNWX5NK)
- [Bettercap Documentation](https://www.bettercap.org/)
- [WPA-Sec API](https://wpa-sec.stanev.net/)

---

**SAVAGE Framework** - Built for penetration testers, by penetration testers. Ethical hacking starts here.
