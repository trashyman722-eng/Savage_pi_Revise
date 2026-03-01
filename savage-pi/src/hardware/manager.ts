/**
 * Hardware Manager
 * Coordinates all hardware peripherals
 */

import { EventEmitter } from 'events';
import { HARDWARE_CONFIG } from '../config/hardware';
import { logger } from '../utils/logger';
import { stateManager } from '../core/state';

export interface HardwareStatus {
  displayConnected: boolean;
  powerConnected: boolean;
  nfcConnected: boolean;
  rfidConnected: boolean;
  batteryLevel: number;
  isCharging: boolean;
  temperature: number;
}

export class HardwareManager extends EventEmitter {
  private static instance: HardwareManager;
  private status: HardwareStatus;
  private powerCheckInterval: NodeJS.Timeout | null = null;
  private initialized = false;

  private constructor() {
    super();
    this.status = {
      displayConnected: false,
      powerConnected: false,
      nfcConnected: false,
      rfidConnected: false,
      batteryLevel: 100,
      isCharging: false,
      temperature: 0,
    };
  }

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
    if (this.initialized) {
      logger.warn('Hardware already initialized');
      return;
    }

    logger.info('Initializing hardware...');

    try {
      // Initialize power management (UPS HAT)
      await this.initializePower();

      // Start power monitoring
      this.startPowerMonitoring();

      this.initialized = true;
      logger.info('Hardware initialization complete');
      this.emit('initialized');
    } catch (error) {
      logger.error('Hardware initialization failed', error);
      throw error;
    }
  }

  /**
   * Initialize power management (UPS HAT)
   */
  private async initializePower(): Promise<void> {
    try {
      logger.info('Initializing UPS HAT');
      logger.info(`I2C Bus: ${HARDWARE_CONFIG.power.i2cBus}`);
      logger.info(`I2C Address: 0x${HARDWARE_CONFIG.power.i2cAddress.toString(16)}`);

      // In production, this would initialize I2C communication
      // For now, we simulate the connection
      this.status.powerConnected = true;
      this.status.batteryLevel = 100;
      this.status.isCharging = false;

      logger.info('UPS HAT initialized');
    } catch (error) {
      logger.error('Failed to initialize UPS HAT', error);
      this.status.powerConnected = false;
      throw error;
    }
  }

  /**
   * Start periodic power monitoring
   */
  private startPowerMonitoring(): void {
    if (this.powerCheckInterval) {
      clearInterval(this.powerCheckInterval);
    }

    this.powerCheckInterval = setInterval(async () => {
      try {
        await this.updatePowerStatus();
      } catch (error) {
        logger.error('Failed to update power status', error);
      }
    }, HARDWARE_CONFIG.power.checkInterval);

    logger.info(`Power monitoring started (interval: ${HARDWARE_CONFIG.power.checkInterval}ms)`);
  }

  /**
   * Update power status from UPS HAT
   */
  private async updatePowerStatus(): Promise<void> {
    // In production, this would read from I2C device at 0x36
    // For now, we simulate the status update
    
    // Simulate battery drain
    if (!this.status.isCharging && this.status.batteryLevel > 0) {
      this.status.batteryLevel = Math.max(0, this.status.batteryLevel - 0.1);
    }

    // Simulate charging
    if (this.status.isCharging && this.status.batteryLevel < 100) {
      this.status.batteryLevel = Math.min(100, this.status.batteryLevel + 0.5);
    }

    // Update state manager
    stateManager.updateBattery(this.status.batteryLevel, this.status.isCharging);

    this.emit('powerUpdated', {
      batteryLevel: this.status.batteryLevel,
      isCharging: this.status.isCharging,
    });
  }

  /**
   * Get current hardware status
   */
  getStatus(): HardwareStatus {
    return { ...this.status };
  }

  /**
   * Set battery level (for testing)
   */
  setBatteryLevel(level: number): void {
    this.status.batteryLevel = Math.max(0, Math.min(100, level));
    stateManager.updateBattery(this.status.batteryLevel, this.status.isCharging);
  }

  /**
   * Set charging status (for testing)
   */
  setCharging(isCharging: boolean): void {
    this.status.isCharging = isCharging;
    stateManager.updateBattery(this.status.batteryLevel, this.status.isCharging);
  }

  /**
   * Shutdown hardware gracefully
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down hardware...');

    if (this.powerCheckInterval) {
      clearInterval(this.powerCheckInterval);
      this.powerCheckInterval = null;
    }

    logger.info('Hardware shutdown complete');
    this.emit('shutdown');
  }
}

export const hardwareManager = HardwareManager.getInstance();