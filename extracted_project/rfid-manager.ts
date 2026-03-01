/**
 * RFID Module Manager
 * Handles HiLetgo PN532 NFC/RFID and RDM6300 125kHz modules
 */

import { EventEmitter } from "events";

export interface RFIDCard {
  uid: string;
  type: "nfc" | "rfid";
  timestamp: Date;
  module: "pn532" | "rdm6300";
  data?: string;
}

export interface RFIDConfig {
  pn532Enabled: boolean;
  pn532Interface: "i2c" | "spi" | "uart";
  pn532I2CAddress: number;
  pn532I2CBus: number;
  rdm6300Enabled: boolean;
  rdm6300Port: string;
  rdm6300Baudrate: number;
}

/**
 * HiLetgo PN532 NFC/RFID Module Driver
 * Supports I2C, SPI, and UART interfaces
 */
export class PN532Driver extends EventEmitter {
  private config: RFIDConfig;
  private isInitialized: boolean = false;
  private scanActive: boolean = false;

  constructor(config: RFIDConfig) {
    super();
    this.config = config;
  }

  /**
   * Initialize PN532 module
   */
  async initialize(): Promise<void> {
    if (!this.config.pn532Enabled) {
      console.log("[PN532] Module disabled in configuration");
      return;
    }

    try {
      console.log("[PN532] Initializing HiLetgo PN532 NFC/RFID module");
      console.log(`[PN532] Interface: ${this.config.pn532Interface.toUpperCase()}`);

      if (this.config.pn532Interface === "i2c") {
        await this.initializeI2C();
      } else if (this.config.pn532Interface === "spi") {
        await this.initializeSPI();
      } else if (this.config.pn532Interface === "uart") {
        await this.initializeUART();
      }

      this.isInitialized = true;
      console.log("[PN532] Initialization successful");
    } catch (error) {
      console.error("[PN532] Initialization failed:", error);
      throw error;
    }
  }

  /**
   * Initialize I2C interface (default)
   */
  private async initializeI2C(): Promise<void> {
    console.log(`[PN532] Configuring I2C interface`);
    console.log(`[PN532] Bus: ${this.config.pn532I2CBus}, Address: 0x${this.config.pn532I2CAddress.toString(16)}`);
    // In production: Initialize I2C communication via i2c-dev
  }

  /**
   * Initialize SPI interface
   */
  private async initializeSPI(): Promise<void> {
    console.log(`[PN532] Configuring SPI interface`);
    console.log(`[PN532] Device: /dev/spidev0.0`);
    // In production: Initialize SPI communication
  }

  /**
   * Initialize UART interface
   */
  private async initializeUART(): Promise<void> {
    console.log(`[PN532] Configuring UART interface`);
    // In production: Initialize UART communication
  }

  /**
   * Start scanning for NFC/RFID cards
   */
  async startScanning(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error("PN532 not initialized");
    }

    this.scanActive = true;
    console.log("[PN532] Starting card scan...");

    // In production: Poll for card detection
    // This would read from PN532 registers and parse card data
  }

  /**
   * Stop scanning
   */
  stopScanning(): void {
    this.scanActive = false;
    console.log("[PN532] Stopping card scan");
  }

  /**
   * Emit card detected event
   */
  emitCardDetected(card: RFIDCard): void {
    this.emit("card-detected", card);
  }

  /**
   * Shutdown PN532
   */
  async shutdown(): Promise<void> {
    this.stopScanning();
    this.isInitialized = false;
    console.log("[PN532] Shutdown complete");
  }
}

/**
 * RDM6300 125kHz RFID Module Driver
 * UART-based serial communication
 */
export class RDM6300Driver extends EventEmitter {
  private config: RFIDConfig;
  private isInitialized: boolean = false;
  private scanActive: boolean = false;
  private serialPort: any = null;

  constructor(config: RFIDConfig) {
    super();
    this.config = config;
  }

  /**
   * Initialize RDM6300 module
   */
  async initialize(): Promise<void> {
    if (!this.config.rdm6300Enabled) {
      console.log("[RDM6300] Module disabled in configuration");
      return;
    }

    try {
      console.log("[RDM6300] Initializing RDM6300 125kHz RFID module");
      console.log(`[RDM6300] Serial Port: ${this.config.rdm6300Port}`);
      console.log(`[RDM6300] Baudrate: ${this.config.rdm6300Baudrate}`);

      // In production: Initialize serial port communication
      // const SerialPort = require('serialport');
      // this.serialPort = new SerialPort(this.config.rdm6300Port, {
      //   baudRate: this.config.rdm6300Baudrate,
      //   dataBits: 8,
      //   stopBits: 1,
      //   parity: 'none'
      // });

      this.isInitialized = true;
      console.log("[RDM6300] Initialization successful");
    } catch (error) {
      console.error("[RDM6300] Initialization failed:", error);
      throw error;
    }
  }

  /**
   * Start scanning for RFID cards
   */
  async startScanning(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error("RDM6300 not initialized");
    }

    this.scanActive = true;
    console.log("[RDM6300] Starting card scan...");

    // In production: Listen for serial data
    // Format: 0x02 + 10 hex digits + 2 checksum + 0x03
    // Example: 0x02 + "0123456789" + "AB" + 0x03
  }

  /**
   * Stop scanning
   */
  stopScanning(): void {
    this.scanActive = false;
    console.log("[RDM6300] Stopping card scan");
  }

  /**
   * Parse RDM6300 serial data
   */
  private parseSerialData(data: Buffer): RFIDCard | null {
    try {
      // RDM6300 format: 0x02 + 10 hex digits + 2 checksum + 0x03
      if (data.length < 14) return null;
      if (data[0] !== 0x02 || data[13] !== 0x03) return null;

      const uid = data.slice(1, 11).toString("utf8");

      return {
        uid,
        type: "rfid",
        timestamp: new Date(),
        module: "rdm6300",
      };
    } catch (error) {
      console.error("[RDM6300] Failed to parse serial data:", error);
      return null;
    }
  }

  /**
   * Emit card detected event
   */
  emitCardDetected(card: RFIDCard): void {
    this.emit("card-detected", card);
  }

  /**
   * Shutdown RDM6300
   */
  async shutdown(): Promise<void> {
    this.stopScanning();
    if (this.serialPort) {
      // In production: Close serial port
      // this.serialPort.close();
    }
    this.isInitialized = false;
    console.log("[RDM6300] Shutdown complete");
  }
}

/**
 * RFID Manager - Coordinates both PN532 and RDM6300 modules
 */
export class RFIDManager extends EventEmitter {
  private config: RFIDConfig;
  private pn532: PN532Driver | null = null;
  private rdm6300: RDM6300Driver | null = null;
  private cardHistory: RFIDCard[] = [];
  private maxHistorySize: number = 1000;

  constructor(config: RFIDConfig) {
    super();
    this.config = config;
  }

  /**
   * Initialize all RFID modules
   */
  async initialize(): Promise<void> {
    console.log("[RFID Manager] Initializing RFID modules...");

    try {
      if (this.config.pn532Enabled) {
        this.pn532 = new PN532Driver(this.config);
        await this.pn532.initialize();

        this.pn532.on("card-detected", (card: RFIDCard) => {
          this.handleCardDetected(card);
        });
      }

      if (this.config.rdm6300Enabled) {
        this.rdm6300 = new RDM6300Driver(this.config);
        await this.rdm6300.initialize();

        this.rdm6300.on("card-detected", (card: RFIDCard) => {
          this.handleCardDetected(card);
        });
      }

      console.log("[RFID Manager] Initialization complete");
    } catch (error) {
      console.error("[RFID Manager] Initialization failed:", error);
      throw error;
    }
  }

  /**
   * Start scanning on all enabled modules
   */
  async startScanning(): Promise<void> {
    try {
      if (this.pn532) {
        await this.pn532.startScanning();
      }
      if (this.rdm6300) {
        await this.rdm6300.startScanning();
      }
      console.log("[RFID Manager] Scanning started");
    } catch (error) {
      console.error("[RFID Manager] Failed to start scanning:", error);
      throw error;
    }
  }

  /**
   * Stop scanning on all modules
   */
  stopScanning(): void {
    if (this.pn532) {
      this.pn532.stopScanning();
    }
    if (this.rdm6300) {
      this.rdm6300.stopScanning();
    }
    console.log("[RFID Manager] Scanning stopped");
  }

  /**
   * Handle card detection from any module
   */
  private handleCardDetected(card: RFIDCard): void {
    console.log(`[RFID Manager] Card detected: ${card.uid} (${card.module})`);

    // Add to history
    this.cardHistory.push(card);
    if (this.cardHistory.length > this.maxHistorySize) {
      this.cardHistory.shift();
    }

    // Emit event for dashboard
    this.emit("card-detected", card);
  }

  /**
   * Get card history
   */
  getCardHistory(): RFIDCard[] {
    return [...this.cardHistory];
  }

  /**
   * Clear card history
   */
  clearCardHistory(): void {
    this.cardHistory = [];
  }

  /**
   * Get card by UID
   */
  getCardByUID(uid: string): RFIDCard | undefined {
    return this.cardHistory.find((card) => card.uid === uid);
  }

  /**
   * Shutdown all modules
   */
  async shutdown(): Promise<void> {
    console.log("[RFID Manager] Shutting down...");

    this.stopScanning();

    if (this.pn532) {
      await this.pn532.shutdown();
    }
    if (this.rdm6300) {
      await this.rdm6300.shutdown();
    }

    console.log("[RFID Manager] Shutdown complete");
  }
}

// Default RFID configuration
export const DEFAULT_RFID_CONFIG: RFIDConfig = {
  pn532Enabled: true,
  pn532Interface: "i2c",
  pn532I2CAddress: 0x24,
  pn532I2CBus: 1,
  rdm6300Enabled: true,
  rdm6300Port: "/dev/ttyUSB0",
  rdm6300Baudrate: 9600,
};

// Export singleton
let rfidManager: RFIDManager | null = null;

export function getRFIDManager(config: RFIDConfig = DEFAULT_RFID_CONFIG): RFIDManager {
  if (!rfidManager) {
    rfidManager = new RFIDManager(config);
  }
  return rfidManager;
}
