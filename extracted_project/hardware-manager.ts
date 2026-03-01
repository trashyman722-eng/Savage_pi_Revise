/**
 * SAVAGE Hardware Abstraction Layer
 * Manages Raspberry Pi Zero 2W peripherals including display, power, and sensors
 */

export interface DisplayConfig {
  width: number;
  height: number;
  spiDevice: string;
  gpioReset: number;
  gpioBacklight: number;
  touchEnabled: boolean;
}

export interface PowerConfig {
  i2cBus: number;
  i2cAddress: number;
  checkInterval: number; // milliseconds
}

export interface HardwareStatus {
  displayConnected: boolean;
  powerConnected: boolean;
  batteryLevel: number;
  isCharging: boolean;
  temperature: number;
  cpuUsage: number;
}

/**
 * ELEGOO 2.8" TFT Display Configuration
 * SPI Interface: CS=CE0, MOSI=GPIO10, MISO=GPIO9, SCK=GPIO11
 * Reset: GPIO17, Backlight: GPIO18
 */
export const ELEGOO_TFT_CONFIG: DisplayConfig = {
  width: 320,
  height: 240,
  spiDevice: "/dev/spidev0.0",
  gpioReset: 17,
  gpioBacklight: 18,
  touchEnabled: true,
};

/**
 * UPS HAT (C) Configuration
 * I2C Interface: Bus 1, Address 0x36
 */
export const UPS_HAT_CONFIG: PowerConfig = {
  i2cBus: 1,
  i2cAddress: 0x36,
  checkInterval: 5000,
};

/**
 * Hardware Manager - Singleton for managing all hardware peripherals
 */
export class HardwareManager {
  private static instance: HardwareManager;
  private displayConfig: DisplayConfig;
  private powerConfig: PowerConfig;
  private status: HardwareStatus;
  private powerCheckInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.displayConfig = ELEGOO_TFT_CONFIG;
    this.powerConfig = UPS_HAT_CONFIG;
    this.status = {
      displayConnected: false,
      powerConnected: false,
      batteryLevel: 100,
      isCharging: false,
      temperature: 0,
      cpuUsage: 0,
    };
  }

  /**
   * Get singleton instance
   */
  static getInstance(): HardwareManager {
    if (!HardwareManager.instance) {
      HardwareManager.instance = new HardwareManager();
    }
    return HardwareManager.instance;
  }

  /**
   * Initialize all hardware components
   */
  async initialize(): Promise<void> {
    console.log("[Hardware] Initializing SAVAGE hardware...");

    try {
      // Initialize display
      await this.initializeDisplay();

      // Initialize power management
      await this.initializePower();

      console.log("[Hardware] Hardware initialization complete");
    } catch (error) {
      console.error("[Hardware] Initialization failed:", error);
      throw error;
    }
  }

  /**
   * Initialize ELEGOO TFT display
   */
  private async initializeDisplay(): Promise<void> {
    try {
      // In production, this would use GPIO and SPI libraries
      // For now, we simulate the display initialization
      console.log("[Display] Initializing ELEGOO 2.8\" TFT display");
      console.log(`[Display] Resolution: ${this.displayConfig.width}x${this.displayConfig.height}`);
      console.log(`[Display] SPI Device: ${this.displayConfig.spiDevice}`);
      console.log(`[Display] Reset GPIO: ${this.displayConfig.gpioReset}`);
      console.log(`[Display] Backlight GPIO: ${this.displayConfig.gpioBacklight}`);

      this.status.displayConnected = true;
    } catch (error) {
      console.error("[Display] Failed to initialize:", error);
      this.status.displayConnected = false;
    }
  }

  /**
   * Initialize UPS HAT power management
   */
  private async initializePower(): Promise<void> {
    try {
      console.log("[Power] Initializing UPS HAT (C)");
      console.log(`[Power] I2C Bus: ${this.powerConfig.i2cBus}`);
      console.log(`[Power] I2C Address: 0x${this.powerConfig.i2cAddress.toString(16)}`);

      this.status.powerConnected = true;

      // Start periodic power monitoring
      this.startPowerMonitoring();
    } catch (error) {
      console.error("[Power] Failed to initialize:", error);
      this.status.powerConnected = false;
    }
  }

  /**
   * Start periodic power status monitoring
   */
  private startPowerMonitoring(): void {
    if (this.powerCheckInterval) {
      clearInterval(this.powerCheckInterval);
    }

    this.powerCheckInterval = setInterval(async () => {
      try {
        await this.updatePowerStatus();
      } catch (error) {
        console.error("[Power] Failed to update status:", error);
      }
    }, this.powerConfig.checkInterval);
  }

  /**
   * Update power status from UPS HAT
   * In production, this reads from I2C registers
   */
  private async updatePowerStatus(): Promise<void> {
    // Simulated power status update
    // In production, this would read from I2C device at 0x36
    // Register 0x02: Battery voltage (2 bytes)
    // Register 0x04: Battery percentage
    // Register 0x05: Charging status
  }

  /**
   * Get current hardware status
   */
  getStatus(): HardwareStatus {
    return { ...this.status };
  }

  /**
   * Get display configuration
   */
  getDisplayConfig(): DisplayConfig {
    return { ...this.displayConfig };
  }

  /**
   * Get power configuration
   */
  getPowerConfig(): PowerConfig {
    return { ...this.powerConfig };
  }

  /**
   * Update battery level
   */
  setBatteryLevel(level: number): void {
    this.status.batteryLevel = Math.max(0, Math.min(100, level));
  }

  /**
   * Update charging status
   */
  setCharging(isCharging: boolean): void {
    this.status.isCharging = isCharging;
  }

  /**
   * Update temperature
   */
  setTemperature(temp: number): void {
    this.status.temperature = temp;
  }

  /**
   * Update CPU usage
   */
  setCpuUsage(usage: number): void {
    this.status.cpuUsage = Math.max(0, Math.min(100, usage));
  }

  /**
   * Shutdown hardware gracefully
   */
  async shutdown(): Promise<void> {
    console.log("[Hardware] Shutting down...");

    if (this.powerCheckInterval) {
      clearInterval(this.powerCheckInterval);
      this.powerCheckInterval = null;
    }

    console.log("[Hardware] Hardware shutdown complete");
  }
}

// Export singleton instance
export const hardwareManager = HardwareManager.getInstance();
