/**
 * State Management
 * Simple, lightweight state management for embedded deployment
 */

import { EventEmitter } from 'events';
import { logger } from '../utils/logger';

export type OperationalMode = 'idle' | 'hunting' | 'raid' | 'charging';

export interface SystemState {
  mode: OperationalMode;
  huntingActive: boolean;
  raidActive: boolean;
  batteryLevel: number;
  isCharging: boolean;
  temperature: number;
  cpuUsage: number;
  memoryUsage: number;
  uptime: number;
  lastUpdate: Date;
}

export class StateManager extends EventEmitter {
  private static instance: StateManager;
  private state: SystemState;
  private startTime: Date;

  private constructor() {
    super();
    this.startTime = new Date();
    this.state = this.getInitialState();
  }

  static getInstance(): StateManager {
    if (!StateManager.instance) {
      StateManager.instance = new StateManager();
    }
    return StateManager.instance;
  }

  private getInitialState(): SystemState {
    return {
      mode: 'idle',
      huntingActive: false,
      raidActive: false,
      batteryLevel: 100,
      isCharging: false,
      temperature: 0,
      cpuUsage: 0,
      memoryUsage: 0,
      uptime: 0,
      lastUpdate: new Date(),
    };
  }

  getState(): SystemState {
    return { ...this.state };
  }

  setMode(mode: OperationalMode): void {
    if (this.state.mode !== mode) {
      logger.info(`Mode changed: ${this.state.mode} -> ${mode}`);
      this.state.mode = mode;
      this.state.lastUpdate = new Date();
      this.emit('modeChanged', mode);
    }
  }

  setHuntingActive(active: boolean): void {
    if (this.state.huntingActive !== active) {
      logger.info(`Hunting ${active ? 'started' : 'stopped'}`);
      this.state.huntingActive = active;
      this.state.lastUpdate = new Date();
      this.emit('huntingChanged', active);
    }
  }

  setRaidActive(active: boolean): void {
    if (this.state.raidActive !== active) {
      logger.info(`Raid ${active ? 'started' : 'stopped'}`);
      this.state.raidActive = active;
      this.state.lastUpdate = new Date();
      this.emit('raidChanged', active);
    }
  }

  updateBattery(level: number, charging: boolean): void {
    this.state.batteryLevel = Math.max(0, Math.min(100, level));
    this.state.isCharging = charging;
    this.state.lastUpdate = new Date();
    
    if (level < 20) {
      logger.warn(`Low battery: ${level}%`);
      this.emit('batteryWarning', level);
    }
    
    this.emit('batteryUpdated', { level, charging });
  }

  updateTemperature(temp: number): void {
    this.state.temperature = temp;
    this.state.lastUpdate = new Date();
    
    if (temp > 80) {
      logger.warn(`High temperature: ${temp}°C`);
      this.emit('temperatureWarning', temp);
    }
    
    this.emit('temperatureUpdated', temp);
  }

  updateSystemMetrics(cpu: number, memory: number): void {
    this.state.cpuUsage = cpu;
    this.state.memoryUsage = memory;
    this.state.uptime = Date.now() - this.startTime.getTime();
    this.state.lastUpdate = new Date();
    this.emit('metricsUpdated', { cpu, memory, uptime: this.state.uptime });
  }

  reset(): void {
    logger.info('State reset');
    this.state = this.getInitialState();
    this.startTime = new Date();
    this.emit('stateReset');
  }
}

export const stateManager = StateManager.getInstance();