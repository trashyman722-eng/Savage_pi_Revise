/**
 * Hardware Configuration for Raspberry Pi Zero 2 W
 * Optimized for embedded deployment
 */

export interface DisplayConfig {
  width: number;
  height: number;
  spiDevice: string;
  gpioReset: number;
  gpioBacklight: number;
  gpioDC: number;
  gpioCS: number;
  touchEnabled: boolean;
  touchDevice: string;
}

export interface PowerConfig {
  i2cBus: number;
  i2cAddress: number;
  checkInterval: number;
  lowBatteryThreshold: number;
  criticalBatteryThreshold: number;
}

export interface NFCConfig {
  i2cBus: number;
  i2cAddress: number;
  pollInterval: number;
  timeout: number;
}

export interface RFIDConfig {
  uartDevice: string;
  baudRate: number;
  timeout: number;
}

export interface HardwareConfig {
  display: DisplayConfig;
  power: PowerConfig;
  nfc: NFCConfig;
  rfid: RFIDConfig;
}

/**
 * ELEGOO 2.8" TFT Display Configuration
 * SPI Interface: CS=GPIO8, MOSI=GPIO10, MISO=GPIO9, SCK=GPIO11
 * Control: Reset=GPIO17, DC=GPIO25, Backlight=GPIO18
 */
export const DISPLAY_CONFIG: DisplayConfig = {
  width: 320,
  height: 240,
  spiDevice: '/dev/spidev0.0',
  gpioReset: 17,
  gpioBacklight: 18,
  gpioDC: 25,
  gpioCS: 8,
  touchEnabled: true,
  touchDevice: '/dev/input/touchscreen',
};

/**
 * UPS HAT (C) Configuration
 * I2C Interface: Bus 1, Address 0x36
 */
export const POWER_CONFIG: PowerConfig = {
  i2cBus: 1,
  i2cAddress: 0x36,
  checkInterval: 5000,
  lowBatteryThreshold: 20,
  criticalBatteryThreshold: 10,
};

/**
 * PN532 NFC Configuration
 * I2C Interface: Bus 1, Address 0x24
 */
export const NFC_CONFIG: NFCConfig = {
  i2cBus: 1,
  i2cAddress: 0x24,
  pollInterval: 500,
  timeout: 3000,
};

/**
 * RDM6300 RFID Configuration
 * UART Interface: /dev/serial0
 */
export const RFID_CONFIG: RFIDConfig = {
  uartDevice: '/dev/serial0',
  baudRate: 9600,
  timeout: 5000,
};

/**
 * Complete Hardware Configuration
 */
export const HARDWARE_CONFIG: HardwareConfig = {
  display: DISPLAY_CONFIG,
  power: POWER_CONFIG,
  nfc: NFC_CONFIG,
  rfid: RFID_CONFIG,
};