# SAVAGE Framework - Driver Documentation

Complete driver documentation for all hardware modules integrated with SAVAGE framework.

## Table of Contents

1. [ELEGOO 2.8" TFT Display](#elegoo-28-tft-display)
2. [UPS HAT (C) Power Management](#ups-hat-c-power-management)
3. [HiLetgo PN532 NFC/RFID Module](#hiletgo-pn532-nfcrfid-module)
4. [RDM6300 125kHz RFID Module](#rdm6300-125khz-rfid-module)
5. [Troubleshooting](#troubleshooting)

---

## ELEGOO 2.8" TFT Display

### Overview

The ELEGOO 2.8" TFT Touch Screen is a 320x240 pixel color display with integrated touch support. It communicates via SPI interface and provides a responsive user interface for SAVAGE operations.

### Technical Specifications

| Parameter | Value |
|-----------|-------|
| **Resolution** | 320 × 240 pixels |
| **Color Depth** | 16-bit (RGB565) |
| **Interface** | SPI |
| **Touch Panel** | Resistive touch screen |
| **Voltage** | 3.3V / 5V tolerant |
| **SPI Speed** | Up to 50MHz |
| **Backlight** | LED (PWM dimmable) |

### Pin Configuration

| Signal | GPIO | Pin | Description |
|--------|------|-----|-------------|
| **CS** | GPIO8 | CE0 | Chip Select |
| **MOSI** | GPIO10 | MOSI | Master Out Slave In |
| **MISO** | GPIO9 | MISO | Master In Slave Out |
| **SCK** | GPIO11 | SCK | Serial Clock |
| **Reset** | GPIO17 | 11 | Display Reset |
| **Backlight** | GPIO18 | 12 | PWM Backlight Control |
| **VCC** | - | 2/4 | 5V Power |
| **GND** | - | 6/9/14/20/25 | Ground |

### Wiring Diagram

```
Raspberry Pi Zero 2W          ELEGOO 2.8" TFT
────────────────────────────────────────────
GPIO8 (CE0)         ────────→ CS
GPIO10 (MOSI)       ────────→ DIN
GPIO9 (MISO)        ←────── DOUT
GPIO11 (SCK)        ────────→ CLK
GPIO17              ────────→ RST
GPIO18              ────────→ LED
5V                  ────────→ VCC
GND                 ────────→ GND
```

### Driver Implementation

The ELEGOO display driver is implemented in `server/hardware/hardware-manager.ts`:

```typescript
export const ELEGOO_TFT_CONFIG: DisplayConfig = {
  width: 320,
  height: 240,
  spiDevice: "/dev/spidev0.0",
  gpioReset: 17,
  gpioBacklight: 18,
  touchEnabled: true,
};
```

### Initialization

```bash
# Enable SPI
sudo raspi-config
# Navigate to: Interfacing Options > SPI > Enable

# Verify SPI is working
ls -la /dev/spidev*
# Output: /dev/spidev0.0, /dev/spidev0.1

# Test SPI communication
sudo spidev-test -D /dev/spidev0.0
```

### Backlight Control

The backlight is controlled via PWM on GPIO18:

```bash
# Set backlight to 50% brightness
echo 128 > /sys/class/pwm/pwmchip0/pwm0/duty_cycle

# Set backlight to 100% brightness
echo 255 > /sys/class/pwm/pwmchip0/pwm0/duty_cycle
```

### Touch Screen Calibration

For resistive touch screens, calibration improves accuracy:

```bash
# Install calibration tool
sudo apt-get install xinput-calibrator

# Run calibration
xinput_calibrator --device "EETI eGalax Touch Screen"
```

### Troubleshooting

**Display is blank or not responding**
- Verify SPI is enabled: `sudo raspi-config`
- Check GPIO connections with: `gpio readall`
- Test SPI with: `sudo spidev-test -D /dev/spidev0.0`
- Review logs: `tail -f ~/.manus-logs/devserver.log`

**Touch screen not working**
- Verify touch coordinates: `evtest /dev/input/event0`
- Recalibrate touch screen
- Check for GPIO conflicts

**Backlight not dimming**
- Verify PWM is enabled on GPIO18
- Check PWM frequency: `cat /sys/class/pwm/pwmchip0/pwm0/period`

---

## UPS HAT (C) Power Management

### Overview

The UPS HAT (C) provides uninterruptible power supply for Raspberry Pi Zero 2W via Pogo pin connector. It includes integrated battery management, charging control, and power monitoring.

### Technical Specifications

| Parameter | Value |
|-----------|-------|
| **Battery Capacity** | 1200mAh (typical) |
| **Chemistry** | Lithium Polymer (LiPo) |
| **Voltage** | 3.7V nominal, 4.2V max |
| **Interface** | I2C |
| **I2C Address** | 0x36 |
| **Charging Current** | 500mA |
| **Discharge Current** | 1A continuous, 2A peak |
| **Pogo Pins** | 3-pin connector |

### Pin Configuration

| Signal | GPIO | Bus | Description |
|--------|------|-----|-------------|
| **SDA** | GPIO2 | I2C1 | Serial Data |
| **SCL** | GPIO3 | I2C1 | Serial Clock |
| **GND** | - | - | Ground |
| **Pogo 1** | - | - | +5V Output |
| **Pogo 2** | - | - | +5V Input (charging) |
| **Pogo 3** | - | - | GND |

### I2C Registers

The UPS HAT exposes the following I2C registers at address 0x36:

| Register | Address | Size | Description |
|----------|---------|------|-------------|
| **Voltage** | 0x02 | 2 bytes | Battery voltage (mV) |
| **Percentage** | 0x04 | 1 byte | Battery percentage (0-100) |
| **Status** | 0x05 | 1 byte | Charging status |
| **Temperature** | 0x06 | 2 bytes | Battery temperature (°C) |
| **Current** | 0x08 | 2 bytes | Discharge current (mA) |

### Reading Battery Status

```bash
# Scan I2C devices
sudo i2cdetect -y 1
# Output should show 0x36

# Read battery voltage (register 0x02)
sudo i2cget -y 1 0x36 0x02 w

# Read battery percentage (register 0x04)
sudo i2cget -y 1 0x36 0x04

# Read charging status (register 0x05)
sudo i2cget -y 1 0x36 0x05
```

### Driver Implementation

The UPS HAT driver is implemented in `server/hardware/hardware-manager.ts`:

```typescript
export const UPS_HAT_CONFIG: PowerConfig = {
  i2cBus: 1,
  i2cAddress: 0x36,
  checkInterval: 5000, // milliseconds
};
```

### Charging Procedure

1. Connect 5V power supply to Pogo pin 2 (input)
2. Device automatically charges battery to 4.2V
3. Charging LED indicates status (red = charging, green = full)
4. Typical charge time: 2-3 hours

### Power Management

```typescript
// Get current battery status
const status = hardwareManager.getStatus();
console.log(`Battery: ${status.batteryLevel}%`);
console.log(`Charging: ${status.isCharging}`);

// Set battery level (simulated)
hardwareManager.setBatteryLevel(85);

// Set charging status
hardwareManager.setCharging(true);
```

### Troubleshooting

**Battery not charging**
- Verify 5V power supply is connected to Pogo pin 2
- Check power supply provides minimum 500mA current
- Inspect Pogo pins for dirt or corrosion
- Clean pins with isopropyl alcohol

**Battery percentage not updating**
- Verify I2C communication: `sudo i2cdetect -y 1`
- Read battery register: `sudo i2cget -y 1 0x36 0x04`
- Check for I2C conflicts with other devices

**Device shuts down unexpectedly**
- Verify battery capacity is sufficient
- Check discharge current: `sudo i2cget -y 1 0x36 0x08 w`
- Reduce CPU load or disable power-hungry modules

---

## HiLetgo PN532 NFC/RFID Module

### Overview

The HiLetgo PN532 is a high-performance NFC/RFID reader supporting ISO14443 Type A/B, FeliCa, and Mifare cards. It supports three communication interfaces: I2C, SPI, and UART.

### Technical Specifications

| Parameter | Value |
|-----------|-------|
| **Supported Standards** | ISO14443 Type A/B, FeliCa, Mifare |
| **Operating Frequency** | 13.56 MHz |
| **Read Distance** | 5-10 cm (typical) |
| **Interfaces** | I2C, SPI, UART |
| **I2C Address** | 0x24 (default) |
| **SPI Speed** | Up to 10 MHz |
| **UART Baudrate** | 115200 (default) |
| **Voltage** | 3.3V |

### Pin Configuration (I2C Mode)

| Signal | GPIO | Description |
|--------|------|-------------|
| **SDA** | GPIO2 | Serial Data |
| **SCL** | GPIO3 | Serial Clock |
| **IRQ** | GPIO24 | Interrupt (optional) |
| **VCC** | - | 3.3V Power |
| **GND** | - | Ground |

### Pin Configuration (SPI Mode)

| Signal | GPIO | Pin | Description |
|--------|------|-----|-------------|
| **CS** | GPIO8 | CE0 | Chip Select |
| **MOSI** | GPIO10 | MOSI | Master Out Slave In |
| **MISO** | GPIO9 | MISO | Master In Slave Out |
| **SCK** | GPIO11 | SCK | Serial Clock |
| **IRQ** | GPIO24 | 18 | Interrupt (optional) |
| **VCC** | - | 2/4 | 3.3V Power |
| **GND** | - | 6/9/14/20/25 | Ground |

### Pin Configuration (UART Mode)

| Signal | GPIO | Pin | Description |
|--------|------|-----|-------------|
| **TX** | GPIO14 | 8 | Transmit |
| **RX** | GPIO15 | 10 | Receive |
| **VCC** | - | 2/4 | 3.3V Power |
| **GND** | - | 6/9/14/20/25 | Ground |

### Driver Implementation

The PN532 driver is implemented in `server/rfid/rfid-manager.ts`:

```typescript
export class PN532Driver extends EventEmitter {
  private config: RFIDConfig;
  private isInitialized: boolean = false;

  constructor(config: RFIDConfig) {
    super();
    this.config = config;
  }

  async initialize(): Promise<void> {
    if (this.config.pn532Interface === "i2c") {
      await this.initializeI2C();
    } else if (this.config.pn532Interface === "spi") {
      await this.initializeSPI();
    } else if (this.config.pn532Interface === "uart") {
      await this.initializeUART();
    }
  }
}
```

### Configuration

```typescript
export const DEFAULT_RFID_CONFIG: RFIDConfig = {
  pn532Enabled: true,
  pn532Interface: "i2c",  // or "spi" or "uart"
  pn532I2CAddress: 0x24,
  pn532I2CBus: 1,
  // ... other config
};
```

### Initialization (I2C)

```bash
# Enable I2C
sudo raspi-config
# Navigate to: Interfacing Options > I2C > Enable

# Scan I2C devices
sudo i2cdetect -y 1
# Output should show 0x24

# Test I2C communication
sudo i2cget -y 1 0x24 0x00
```

### Card Detection

Once initialized, the PN532 automatically detects NFC/RFID cards:

```typescript
const rfidManager = getRFIDManager();
await rfidManager.initialize();
await rfidManager.startScanning();

rfidManager.on("card-detected", (card: RFIDCard) => {
  console.log(`Card detected: ${card.uid}`);
  console.log(`Type: ${card.type}`);
  console.log(`Timestamp: ${card.timestamp}`);
});
```

### Supported Card Types

- **Mifare Classic 1K**: 13.56 MHz, 1024 bytes
- **Mifare Classic 4K**: 13.56 MHz, 4096 bytes
- **Mifare DESFire**: 13.56 MHz, encrypted
- **ISO14443 Type A**: Generic NFC cards
- **ISO14443 Type B**: Generic NFC cards
- **FeliCa**: Japanese NFC standard

### Troubleshooting

**PN532 not detected**
- Verify I2C is enabled: `sudo raspi-config`
- Scan I2C devices: `sudo i2cdetect -y 1`
- Check wiring and power supply (3.3V)
- Verify I2C address matches configuration (0x24)

**Cards not being detected**
- Ensure card is within 5-10 cm of module
- Verify card is compatible (Mifare, ISO14443, FeliCa)
- Check for interference from other RF devices
- Review logs: `tail -f ~/.manus-logs/devserver.log`

**I2C communication errors**
- Check for I2C conflicts: `sudo i2cdetect -y 1`
- Verify pull-up resistors on SDA/SCL (4.7kΩ typical)
- Use shorter I2C cables to reduce noise
- Reduce I2C speed if necessary

---

## RDM6300 125kHz RFID Module

### Overview

The RDM6300 is a low-frequency RFID reader operating at 125 kHz. It communicates via UART serial interface and is compatible with EM4100 and similar RFID cards.

### Technical Specifications

| Parameter | Value |
|-----------|-------|
| **Operating Frequency** | 125 kHz |
| **Card Type** | EM4100 compatible |
| **Interface** | UART (Serial) |
| **Baudrate** | 9600 bps (default) |
| **Data Bits** | 8 |
| **Stop Bits** | 1 |
| **Parity** | None |
| **Read Distance** | 3-5 cm (typical) |
| **Voltage** | 5V |

### Pin Configuration

| Signal | GPIO | Pin | Description |
|--------|------|-----|-------------|
| **TX** | GPIO14 | 8 | Transmit (RDM6300 RX) |
| **RX** | GPIO15 | 10 | Receive (RDM6300 TX) |
| **VCC** | - | 2/4 | 5V Power |
| **GND** | - | 6/9/14/20/25 | Ground |

### Serial Protocol

The RDM6300 transmits card data in the following format:

```
[START] [UID 10 bytes] [CHECKSUM 2 bytes] [END]
0x02    + 10 hex chars + 2 hex chars      + 0x03
```

Example transmission:
```
0x02 + "0123456789" + "AB" + 0x03
```

### Driver Implementation

The RDM6300 driver is implemented in `server/rfid/rfid-manager.ts`:

```typescript
export class RDM6300Driver extends EventEmitter {
  private config: RFIDConfig;
  private serialPort: any = null;

  constructor(config: RFIDConfig) {
    super();
    this.config = config;
  }

  async initialize(): Promise<void> {
    // Initialize serial port communication
    // Port: /dev/ttyUSB0 (or configured port)
    // Baudrate: 9600
  }

  private parseSerialData(data: Buffer): RFIDCard | null {
    // Parse RDM6300 format: 0x02 + 10 hex + 2 checksum + 0x03
    if (data.length < 14) return null;
    if (data[0] !== 0x02 || data[13] !== 0x03) return null;

    const uid = data.slice(1, 11).toString("utf8");
    return {
      uid,
      type: "rfid",
      timestamp: new Date(),
      module: "rdm6300",
    };
  }
}
```

### Configuration

```typescript
export const DEFAULT_RFID_CONFIG: RFIDConfig = {
  rdm6300Enabled: true,
  rdm6300Port: "/dev/ttyUSB0",
  rdm6300Baudrate: 9600,
  // ... other config
};
```

### Initialization

```bash
# Enable UART
sudo raspi-config
# Navigate to: Interfacing Options > Serial > Enable

# Check serial ports
ls -la /dev/ttyUSB*
ls -la /dev/ttyAMA0

# Test serial communication
sudo cat /dev/ttyUSB0
# Present RFID card to module
# Should output: 0x02 + 10 hex chars + 2 checksum + 0x03
```

### Card Detection

Once initialized, the RDM6300 automatically detects RFID cards:

```typescript
const rfidManager = getRFIDManager();
await rfidManager.initialize();
await rfidManager.startScanning();

rfidManager.on("card-detected", (card: RFIDCard) => {
  console.log(`Card detected: ${card.uid}`);
  console.log(`Module: ${card.module}`);
  console.log(`Timestamp: ${card.timestamp}`);
});
```

### Supported Card Types

- **EM4100**: Most common 125 kHz card
- **EM4102**: Similar to EM4100
- **T5577**: Writable 125 kHz card
- **HID Prox**: Access control cards
- **Indala**: Legacy RFID cards

### Troubleshooting

**RDM6300 not detecting cards**
- Verify UART is enabled: `sudo raspi-config`
- Check serial port: `ls -la /dev/ttyUSB*`
- Verify card is within 3-5 cm of module
- Check card is EM4100 compatible
- Review logs: `tail -f ~/.manus-logs/devserver.log`

**Serial port permission denied**
- Add user to dialout group: `sudo usermod -a -G dialout pi`
- Reboot: `sudo reboot`
- Verify: `groups pi`

**Incorrect card data**
- Verify baudrate is 9600: `stty -F /dev/ttyUSB0`
- Check for serial noise: `sudo cat /dev/ttyUSB0 | hexdump -C`
- Verify checksum calculation
- Use shorter USB cables to reduce interference

**Multiple serial devices**
- Identify correct device: `dmesg | grep tty`
- Update configuration with correct port
- Use device symlink for consistency: `/dev/rfid-rdm6300`

---

## Troubleshooting

### Common Issues

#### I2C Communication Errors

**Error**: `I2C: No such device`

**Solution**:
```bash
# Enable I2C
sudo raspi-config
# Navigate to: Interfacing Options > I2C > Enable

# Verify I2C is working
sudo i2cdetect -y 1

# Check I2C devices
ls -la /dev/i2c*
```

#### SPI Communication Errors

**Error**: `SPI: Permission denied`

**Solution**:
```bash
# Add user to spi group
sudo usermod -a -G spi pi

# Reboot
sudo reboot

# Verify
groups pi
```

#### UART Communication Errors

**Error**: `UART: Device not found`

**Solution**:
```bash
# Enable UART
sudo raspi-config
# Navigate to: Interfacing Options > Serial > Enable

# Check serial ports
ls -la /dev/ttyUSB*
ls -la /dev/ttyAMA0

# Verify permissions
sudo chmod 666 /dev/ttyUSB0
```

#### GPIO Permission Errors

**Error**: `GPIO: Permission denied`

**Solution**:
```bash
# Add user to gpio group
sudo usermod -a -G gpio pi

# Reboot
sudo reboot

# Verify
groups pi
```

### Debugging Tools

```bash
# Check GPIO status
gpio readall

# Monitor I2C traffic
sudo i2ctransfer -y 1 r 0x36 2

# Monitor serial data
sudo cat /dev/ttyUSB0 | hexdump -C

# Check system logs
journalctl -u savage-framework -f

# Monitor device logs
tail -f ~/.manus-logs/devserver.log
```

---

## References

- [Raspberry Pi GPIO Documentation](https://www.raspberrypi.com/documentation/computers/raspberry-pi.html)
- [ELEGOO TFT Display Guide](https://www.elegoo.com/)
- [HiLetgo PN532 Datasheet](https://www.hiletgo.com/)
- [RDM6300 Datasheet](https://www.amazon.com/RDM6300-125khz-Module-Arduino-Raspberry/dp/B07YNWX5NK)
- [UPS HAT Documentation](https://www.waveshare.com/wiki/UPS_HAT)

---

**Last Updated**: February 2026
**Version**: 1.0
