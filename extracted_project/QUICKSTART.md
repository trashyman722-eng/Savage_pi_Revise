# SAVAGE Framework - Quick Start Guide

Get SAVAGE up and running on your Raspberry Pi Zero 2 W in 30 minutes.

## Prerequisites Checklist

Before starting, ensure you have:

- [ ] Raspberry Pi Zero 2 W with Raspbian Lite (Bullseye or later) installed
- [ ] 32GB+ microSD card
- [ ] ELEGOO 2.8" TFT display with touch support
- [ ] UPS HAT (C) with Pogo pin connector
- [ ] HiLetgo PN532 NFC/RFID module (optional)
- [ ] RDM6300 125kHz RFID module (optional)
- [ ] USB power adapter (2A minimum)
- [ ] USB OTG cable for external device connection
- [ ] Ethernet cable or Wi-Fi connectivity

## Step 1: Prepare Raspberry Pi (5 minutes)

### 1.1 Flash Raspbian Lite

1. Download [Raspberry Pi Imager](https://www.raspberrypi.com/software/)
2. Insert microSD card into your computer
3. Open Raspberry Pi Imager and select:
   - OS: Raspberry Pi OS (other) > Raspberry Pi OS Lite (Bullseye)
   - Storage: Your microSD card
4. Click Write and wait for completion
5. Eject microSD card and insert into Raspberry Pi Zero 2 W

### 1.2 Enable Interfaces

1. Connect Raspberry Pi to power and network
2. SSH into the device: `ssh pi@raspberrypi.local`
3. Run configuration: `sudo raspi-config`
4. Navigate to **Interfacing Options** and enable:
   - I2C (for UPS HAT and PN532)
   - SPI (for ELEGOO display)
   - Serial (for RDM6300)
5. Select **Finish** and reboot: `sudo reboot`

## Step 2: Install Dependencies (10 minutes)

### 2.1 Update System

```bash
sudo apt-get update
sudo apt-get upgrade -y
```

### 2.2 Install Build Tools

```bash
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
  libatlas-base-dev \
  libjasper-dev \
  libopenjp2-7 \
  libjasper-dev
```

### 2.3 Install Node.js

```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### 2.4 Verify Installations

```bash
python3 --version  # Should be 3.9+
node --version     # Should be 18+
npm --version      # Should be 9+
```

## Step 3: Clone and Setup SAVAGE (5 minutes)

### 3.1 Clone Repository

```bash
cd ~
git clone https://github.com/yourusername/savage-framework.git
cd savage-framework
```

### 3.2 Install Python Dependencies

```bash
pip3 install -r requirements.txt
```

### 3.3 Install Node Dependencies

```bash
npm install
# or
pnpm install
```

## Step 4: Configure Hardware (5 minutes)

### 4.1 Verify I2C Devices

```bash
sudo i2cdetect -y 1
```

Expected output should show addresses for:
- UPS HAT: 0x36
- PN532 (if enabled): 0x24

### 4.2 Verify SPI

```bash
ls -la /dev/spidev*
```

Should show `/dev/spidev0.0` and `/dev/spidev0.1`

### 4.3 Create Environment File

```bash
cp .env.example .env
nano .env
```

Update the following variables:

```bash
# Database
DATABASE_URL=mysql://root:password@localhost:3306/savage

# OAuth (use default Manus values)
VITE_APP_ID=savage-framework
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://portal.manus.im

# RFID Configuration
RFID_PN532_ENABLED=true
RFID_PN532_INTERFACE=i2c
RFID_RDM6300_ENABLED=true
RFID_RDM6300_PORT=/dev/ttyUSB0
```

### 4.4 Configure Hardware Settings

Edit `server/hardware/hardware-manager.ts` if needed:

```typescript
// ELEGOO Display Configuration
export const ELEGOO_TFT_CONFIG: DisplayConfig = {
  width: 320,
  height: 240,
  spiDevice: "/dev/spidev0.0",
  gpioReset: 17,
  gpioBacklight: 18,
  touchEnabled: true,
};

// UPS HAT Configuration
export const UPS_HAT_CONFIG: PowerConfig = {
  i2cBus: 1,
  i2cAddress: 0x36,
  checkInterval: 5000,
};
```

## Step 5: Build and Run (5 minutes)

### 5.1 Build Project

```bash
npm run build
```

### 5.2 Start Development Server

```bash
npm run dev
```

Or for production:

```bash
npm run start
```

### 5.3 Access Dashboard

Open web browser and navigate to:
- Local: `http://localhost:3000`
- Remote: `http://<raspberry-pi-ip>:3000`

Login with your Manus OAuth credentials.

## Step 6: Verify Hardware (5 minutes)

### 6.1 Test Display

1. Navigate to **Device Status** in dashboard
2. Verify system metrics are displaying
3. Check display brightness and touch responsiveness

### 6.2 Test UPS HAT

1. Check battery level in **Device Status**
2. Verify charging status
3. Disconnect power and verify device continues running

### 6.3 Test RFID Modules (if enabled)

1. Navigate to **RFID** section
2. Click **Start Scanning**
3. Present NFC/RFID card to module
4. Verify card UID appears in detection log

## First Hunt

Ready to capture your first handshake? Follow these steps:

### 1. Start Hunting

1. Navigate to **Hunting** section
2. Click **Start Hunting**
3. Configure parameters:
   - Channels: 1, 6, 11 (or auto-scan all)
   - Dwell Time: 5 seconds
   - AI Aggression: Medium
4. Click **Begin Hunt**

### 2. Monitor Progress

1. Go to **Dashboard**
2. Watch for **Handshake Captured** events
3. Monitor signal strengths and client activity

### 3. Upload Handshake

1. Navigate to **Handshakes**
2. Select captured handshake
3. Click **Upload to WPA-Sec**
4. Monitor crack progress in **Crack Status** column

### 4. Start Raid (when handshake is cracked)

1. Navigate to **Raid**
2. Select target network
3. Configure raid parameters
4. Click **Start Raid**
5. Monitor **Targets** for discovered hosts and services

## Troubleshooting

### Display Not Showing

**Problem**: ELEGOO display is blank or not responding

**Solution**:
```bash
# Check SPI is enabled
sudo raspi-config  # Enable SPI

# Test SPI communication
ls -la /dev/spidev*

# Check GPIO pins
gpio readall

# Review logs
tail -f ~/.manus-logs/devserver.log
```

### RFID Not Detecting Cards

**Problem**: RFID modules not detecting cards

**Solution**:
```bash
# Check I2C devices
sudo i2cdetect -y 1

# Check serial ports
ls -la /dev/ttyUSB*

# Verify configuration
cat server/rfid/rfid-manager.ts | grep -A 5 "DEFAULT_RFID_CONFIG"

# Test RDM6300 serial
sudo cat /dev/ttyUSB0
```

### Battery Not Charging

**Problem**: UPS HAT not charging or showing incorrect battery level

**Solution**:
```bash
# Check I2C communication
sudo i2cget -y 1 0x36 0x02

# Verify power supply
# Ensure 2A minimum current

# Check Pogo pin connection
# Ensure pins are clean and making contact
```

### Network Connectivity Issues

**Problem**: Cannot connect to target networks or bettercap fails

**Solution**:
```bash
# Check Wi-Fi adapter
iwconfig

# Verify bettercap
bettercap --version

# Check network permissions
sudo usermod -a -G netdev pi

# Reboot to apply permissions
sudo reboot
```

## Next Steps

1. **Configure Hunting Parameters**: Adjust channels, dwell time, and AI aggression in **Configuration**
2. **Setup Wordlists**: Upload custom wordlists for brute-forcing in **Configuration**
3. **Create Reports**: Generate penetration test reports in **Reports** section
4. **Enable Logging**: Configure activity logging and export settings
5. **Optimize Performance**: Adjust metrics retention and display settings for battery life

## Performance Tips

- **Reduce Memory Usage**: Disable unused RFID modules
- **Improve Battery Life**: Lower display brightness and disable backlight during idle
- **Accelerate Cracking**: Use optimized wordlists and enable GPU acceleration if available
- **Optimize Scanning**: Use targeted channel lists instead of full spectrum scans

## Security Reminders

- **Ethical Use Only**: Always obtain written permission before testing networks
- **Secure Credentials**: Regularly backup and encrypt credential vault
- **Network Security**: Use VPN when accessing dashboard remotely
- **Physical Security**: Protect device from unauthorized access
- **Data Privacy**: Sanitize reports before sharing with clients

## Getting Help

- **Documentation**: See README.md for detailed information
- **Driver Guides**: Check `docs/drivers/` for hardware-specific guides
- **GitHub Issues**: Report bugs and request features
- **Community**: Join our Discord for discussions and support

---

**Ready to hunt?** Start with the **Hunting** section and capture your first handshake!
