# SAVAGE Framework - Pi Zero 2 W Audit Report

## EXECUTIVE SUMMARY

**CRITICAL FINDING:** React Native + Expo is COMPLETELY INAPPROPRIATE for Raspberry Pi Zero 2 W deployment. The current architecture requires a complete rewrite for embedded production.

---

## 1. CURRENT ARCHITECTURE ANALYSIS

### 1.1 Codebase Statistics
- **Total Files:** 41 TypeScript/TSX files
- **Total Lines:** 13,475 lines
- **Dependencies:** 35 production packages
- **Dev Dependencies:** 9 packages

### 1.2 Technology Stack (CURRENT - UNSUITABLE)
```
Frontend:
- React Native 0.73.0 (Mobile framework - NOT for Pi)
- Expo 50.0.0 (Mobile development platform - NOT for Pi)
- React Navigation (Mobile routing - NOT needed)
- React Native Chart Kit (Heavy visualization - NOT suitable)
- React Native Reanimated (Animation library - NOT needed)
- React Native Gesture Handler (Mobile gestures - NOT needed)
- React Native Vector Icons (Heavy icon library - NOT needed)

Backend:
- Node.js (Appropriate)
- WebSocket (ws) (Can be simplified)
- Bettercap wrapper (Keep)
- Nmap wrapper (Keep)
- Multiple orchestrators (Simplify)

State Management:
- Zustand (Overkill for embedded)
- Context API (Sufficient)
- Event emitters (Keep)

Database:
- SQLite (Keep - lightweight)
```

### 1.3 Memory Footprint Analysis
```
Current Estimated Memory Usage:
- React Native Runtime: ~150-200MB
- Expo Runtime: ~50-80MB
- Metro Bundler: ~100-150MB (dev mode)
- Node.js Backend: ~50-80MB
- WebSocket Server: ~20-30MB
- Total: ~370-540MB

Pi Zero 2 W Available RAM: 512MB
Result: CRITICAL MEMORY SHORTAGE
```

### 1.4 Boot Time Analysis
```
Current Estimated Boot Time:
- System boot: ~15-20s
- Node.js startup: ~2-3s
- React Native initialization: ~5-8s
- Metro bundler (if dev): ~10-15s
- Total: ~32-46s

Target Boot Time: <15s
Result: UNACCEPTABLE
```

---

## 2. CRITICAL ISSUES IDENTIFIED

### 2.1 Framework Incompatibility
- ❌ React Native requires native compilation (not suitable for Pi)
- ❌ Expo requires Metro bundler (too heavy)
- ❌ Mobile-specific APIs (Accelerometer, Camera, etc.) not needed
- ❌ No GPU acceleration on Pi Zero
- ❌ Touch gestures over-engineered for simple menu

### 2.2 Memory Issues
- ❌ No memory caps on arrays
- ❌ Unbounded logging
- ❌ WebSocket connections not cleaned up
- ❌ Event listeners not removed
- ❌ No heap size limits
- ❌ Multiple orchestrators in memory simultaneously

### 2.3 Process Management
- ❌ No SIGINT/SIGTERM handlers
- ❌ Orphaned processes possible
- ❌ No graceful shutdown
- ❌ Background processes not managed
- ❌ No systemd integration

### 2.4 Hardware Integration
- ⚠️ I2C bus sharing (UPS HAT 0x36, PN532 0x24) - OK
- ⚠️ SPI TFT (spidev0.0) - OK
- ⚠️ UART RDM6300 (serial0) - OK
- ❌ Blocking hardware calls
- ❌ No timeouts on hardware operations
- ❌ No error recovery for disconnects

### 2.5 UI/UX Issues
- ❌ 320x240 resolution not optimized
- ❌ Heavy animations (Reanimated)
- ❌ Complex navigation (React Navigation)
- ❌ Chart libraries too heavy
- ❌ Not menu-driven (Flipper Zero style needed)

---

## 3. HARDWARE INTEGRATION AUDIT

### 3.1 I2C Bus (Bus 1)
```
Devices:
- UPS HAT: 0x36 (Power management)
- PN532 NFC: 0x24 (NFC reader)

Status: ✅ Compatible (different addresses)
Configuration: 100kHz standard mode
```

### 3.2 SPI Bus (SPI0)
```
Device:
- ELEGOO 2.8" TFT: spidev0.0
- Resolution: 320x240
- GPIO: Reset=17, Backlight=18, DC=25, CS=8

Status: ✅ Compatible
Configuration: 32MHz max, use 16MHz for stability
```

### 3.3 UART (Serial0)
```
Device:
- RDM6300 RFID: /dev/serial0
- Baud: 9600
- GPIO: TX=14, RX=15

Status: ✅ Compatible
Configuration: 9600 8N1
```

### 3.4 Hardware Conflicts
```
Result: ✅ NO CONFLICTS DETECTED
All buses can operate simultaneously
```

---

## 4. REQUIRED FEATURES FOR EMBEDDED

### 4.1 Core Features (MUST KEEP)
- ✅ Menu navigation (Flipper Zero style)
- ✅ Device control (start/stop hunting, raid)
- ✅ Metrics display (battery, CPU, temperature)
- ✅ Hardware actions (NFC read, RFID read)
- ✅ Handshake management
- ✅ Network target display
- ✅ Activity logging

### 4.2 Optional Features (CAN BE REMOVED)
- ⚠️ Web interface (make optional/lazy)
- ❌ Report generation (too heavy)
- ❌ Complex charts (use simple bars)
- ❌ Animations (remove all)
- ❌ OAuth authentication (use simple auth)
- ❌ Multiple user support (single device)

### 4.3 Features to REMOVE
- ❌ React Native mobile APIs
- ❌ Expo notifications
- ❌ Secure store (use filesystem)
- ❌ Gesture handlers
- ❌ Complex navigation
- ❌ Heavy visualization
- ❌ Dev tooling in production

---

## 5. NEW ARCHITECTURE PROPOSAL

### 5.1 Technology Stack (OPTIMIZED)
```
Backend:
- Node.js 20.x (LTS)
- Native modules: onoff (GPIO), i2c-bus, serialport
- SQLite3 (lightweight database)
- Express.js (minimal web server, optional)
- ws (WebSocket, optional)

Frontend (Local Display):
- Direct framebuffer rendering (no X11)
- Custom menu system (320x240 optimized)
- Touch input via evdev
- No framework (vanilla JS or minimal React)

Frontend (Web Interface - Optional):
- React (web, not native)
- Vite (fast build, no bundler in prod)
- Static build served by Express
- Lazy loading
- No animations
```

### 5.2 Architecture Diagram
```
┌─────────────────────────────────────────────────────────┐
│                  SYSTEMD SERVICE                        │
│              (savage-framework.service)                 │
└────────────────────┬────────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
┌───────▼────────┐      ┌────────▼────────┐
│  Signal Handler │      │  Process Manager│
│  (SIGINT/TERM)  │      │  (Child procs)  │
└────────┬────────┘      └────────┬────────┘
         │                        │
         └────────────┬───────────┘
                      │
         ┌────────────▼────────────┐
         │   Main Application      │
         │   (Node.js Backend)     │
         └────────────┬────────────┘
                      │
    ┌─────────────────┼─────────────────┐
    │                 │                 │
┌───▼────┐    ┌──────▼──────┐   ┌─────▼──────┐
│Hardware│    │ Orchestrator│   │  Database  │
│Manager │    │  (Simplified)│   │  (SQLite)  │
└───┬────┘    └──────┬──────┘   └───────────┘
    │                │
    │    ┌───────────┼───────────┐
    │    │           │           │
┌───▼───▼──┐  ┌─────▼─────┐ ┌───▼──────┐
│  I2C     │  │   SPI     │ │  UART    │
│UPS/PN532 │  │   TFT     │ │  RFID    │
└──────────┘  └───────────┘ └──────────┘

    ┌─────────────────────────────────┐
    │   Display Output (320x240)      │
    │   Direct Framebuffer Rendering  │
    │   Menu-Driven UI (Flipper Zero) │
    └─────────────────────────────────┘

    ┌─────────────────────────────────┐
    │   Optional Web Interface        │
    │   (Express + Static React)      │
    │   Port 8080 (disabled by def)   │
    └─────────────────────────────────┘
```

### 5.3 Memory Optimization Strategy
```
Memory Caps:
- Node.js heap: 256MB max
- Metrics history: 100 entries max
- Log entries: 1000 entries max
- WebSocket connections: 5 max
- Event listeners: Auto-cleanup
- Arrays: Fixed size where possible

Expected Memory Usage:
- Node.js runtime: ~80-100MB
- Hardware drivers: ~10-15MB
- Database: ~5-10MB
- Display buffer: ~1MB (320x240x4)
- Total: ~96-126MB (well under 512MB)
```

### 5.4 Boot Optimization
```
Boot Sequence:
1. System boot: ~10s (optimized kernel)
2. Systemd service start: ~1s
3. Node.js startup: ~1s
4. Hardware init: ~2s
5. Display init: ~1s
Total: ~15s (target met)

Optimizations:
- Disable unnecessary services
- Use systemd service with dependencies
- Lazy load optional modules
- Pre-compile TypeScript
- Minimize startup logging
```

---

## 6. DEPENDENCIES TO REMOVE

### 6.1 Complete Removal
```json
{
  "expo": "^50.0.0",
  "expo-constants": "^15.0.0",
  "expo-notifications": "^0.27.0",
  "expo-secure-store": "^12.0.0",
  "expo-status-bar": "~1.11.1",
  "react-native": "0.73.0",
  "react-native-gesture-handler": "~2.14.0",
  "react-native-reanimated": "~3.6.0",
  "react-native-screens": "~3.27.0",
  "react-native-svg": "14.1.0",
  "react-native-web": "~0.19.0",
  "@react-navigation/bottom-tabs": "^6.5.0",
  "@react-navigation/native": "^6.1.0",
  "@react-navigation/stack": "^6.3.0",
  "@react-native-async-storage/async-storage": "^1.21.0",
  "react-native-chart-kit": "^6.12.0",
  "react-native-circular-progress": "^1.3.7",
  "react-native-fast-image": "^8.8.0",
  "react-native-linear-gradient": "^2.8.0",
  "react-native-safe-area-context": "4.7.2",
  "react-native-vector-icons": "^10.0.0"
}
```

### 6.2 Keep (Core)
```json
{
  "react": "18.2.0",
  "axios": "^1.6.0",
  "date-fns": "^2.30.0",
  "lodash": "^4.17.21",
  "ws": "^8.15.0",
  "zustand": "^4.4.0"
}
```

### 6.3 Add (Hardware)
```json
{
  "onoff": "^6.0.3",
  "i2c-bus": "^5.2.3",
  "serialport": "^12.0.0",
  "sqlite3": "^5.1.7",
  "express": "^4.18.2"
}
```

---

## 7. NEW DIRECTORY STRUCTURE

```
savage-pi/
├── package.json
├── tsconfig.json
├── systemd/
│   └── savage-framework.service
├── src/
│   ├── main.ts                 # Entry point
│   ├── config/
│   │   ├── hardware.ts         # Hardware config
│   │   └── app.ts              # App config
│   ├── hardware/
│   │   ├── manager.ts          # Hardware manager
│   │   ├── display.ts          # TFT display driver
│   │   ├── touch.ts            # Touch input driver
│   │   ├── i2c.ts              # I2C driver
│   │   ├── spi.ts              # SPI driver
│   │   └── uart.ts             # UART driver
│   ├── core/
│   │   ├── orchestrator.ts     # Simplified orchestrator
│   │   ├── state.ts            # State management
│   │   └── events.ts           # Event system
│   ├── modules/
│   │   ├── hunting.ts          # Hunting module
│   │   ├── raid.ts             # Raid module
│   │   ├── nfc.ts              # NFC module
│   │   └── rfid.ts             # RFID module
│   ├── ui/
│   │   ├── display.ts          # Display renderer
│   │   ├── menu.ts             # Menu system
│   │   └── components/         # UI components
│   ├── database/
│   │   ├── db.ts               # Database wrapper
│   │   └── migrations/         # DB migrations
│   ├── web/                    # Optional web interface
│   │   ├── server.ts           # Express server
│   │   └── static/             # Static build
│   └── utils/
│       ├── logger.ts           # Logger (capped)
│       ├── cleanup.ts          # Cleanup handlers
│       └── signals.ts          # Signal handlers
├── data/
│   ├── savage.db               # SQLite database
│   └── logs/                   # Log files (rotated)
└── scripts/
    ├── build.sh                # Build script
    └── install.sh              # Install script
```

---

## 8. IMPLEMENTATION PRIORITY

### Phase 1: Core Infrastructure (HIGH PRIORITY)
1. Signal handlers (SIGINT/SIGTERM)
2. Process manager
3. Hardware manager (I2C, SPI, UART)
4. Display driver (framebuffer)
5. Touch input driver
6. Menu system

### Phase 2: Core Modules (HIGH PRIORITY)
1. Simplified orchestrator
2. Hunting module
3. Raid module
4. Database integration
5. State management

### Phase 3: Hardware Modules (MEDIUM PRIORITY)
1. NFC module (PN532)
2. RFID module (RDM6300)
3. UPS monitoring
4. System metrics

### Phase 4: Optional Features (LOW PRIORITY)
1. Web interface
2. Remote access
3. Advanced logging
4. Report generation

---

## 9. DEPLOYMENT INSTRUCTIONS

### 9.1 System Preparation
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install dependencies
sudo apt install -y nodejs npm git build-essential

# Enable SPI, I2C, UART
sudo raspi-config nonint do_spi 0
sudo raspi-config nonint do_i2c 0
sudo raspi-config nonint do_serial_hw 0

# Disable GUI (headless)
sudo systemctl set-default multi-user.target
```

### 9.2 Application Installation
```bash
# Clone repository
git clone <repo> /opt/savage-pi
cd /opt/savage-pi

# Install dependencies
npm install --production

# Build TypeScript
npm run build

# Setup database
npm run db:migrate

# Install systemd service
sudo cp systemd/savage-framework.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable savage-framework.service
```

### 9.3 Boot Optimization
```bash
# Disable unnecessary services
sudo systemctl disable bluetooth
sudo systemctl disable hciuart

# Optimize kernel parameters
echo "vm.swappiness=10" | sudo tee -a /etc/sysctl.conf
echo "vm.vfs_cache_pressure=50" | sudo tee -a /etc/sysctl.conf

# Set CPU governor to performance
echo "performance" | sudo tee /sys/devices/system/cpu/cpu0/cpufreq/scaling_governor
```

---

## 10. MONITORING & MAINTENANCE

### 10.1 Health Checks
```bash
# Check service status
sudo systemctl status savage-framework.service

# View logs
sudo journalctl -u savage-framework.service -f

# Check memory usage
free -h

# Check CPU usage
top -bn1 | grep "Cpu(s)"
```

### 10.2 Log Rotation
```
Configure logrotate to prevent disk fill:
- Max log size: 10MB
- Keep 5 logs
- Compress old logs
```

---

## CONCLUSION

The current React Native + Expo architecture is **COMPLETELY UNSUITABLE** for Raspberry Pi Zero 2 W deployment. A complete rewrite is required with:

1. **Remove:** All React Native/Expo dependencies
2. **Replace:** With direct framebuffer rendering and Node.js backend
3. **Optimize:** Memory usage to <150MB
4. **Simplify:** Architecture to single-process model
5. **Stabilize:** Add proper signal handling and cleanup

**Estimated Development Time:** 2-3 weeks
**Expected Memory Usage:** 96-126MB (down from 370-540MB)
**Expected Boot Time:** ~15s (down from 32-46s)
**Expected Stability:** 99.9% uptime with proper error handling