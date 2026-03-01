/**
 * Simplified Orchestrator
 * Manages system operations without complex state machines
 */

import { EventEmitter } from 'events';
import { stateManager, OperationalMode } from './state';
import { logger } from '../utils/logger';

export interface OrchestratorConfig {
  maxConcurrentOperations: number;
  operationTimeout: number;
}

export class Orchestrator extends EventEmitter {
  private static instance: Orchestrator;
  private config: OrchestratorConfig;
  private currentOperation: string | null = null;
  private operationStartTime: Date | null = null;

  private constructor(config: OrchestratorConfig) {
    super();
    this.config = config;
  }

  static getInstance(config?: OrchestratorConfig): Orchestrator {
    if (!Orchestrator.instance) {
      Orchestrator.instance = new Orchestrator(config || {
        maxConcurrentOperations: 1,
        operationTimeout: 300000, // 5 minutes
      });
    }
    return Orchestrator.instance;
  }

  /**
   * Start hunting mode
   */
  async startHunting(): Promise<void> {
    if (this.currentOperation) {
      throw new Error(`Operation already in progress: ${this.currentOperation}`);
    }

    logger.info('Starting hunting mode');
    this.currentOperation = 'hunting';
    this.operationStartTime = new Date();
    
    stateManager.setMode('hunting');
    stateManager.setHuntingActive(true);
    
    this.emit('huntingStarted');
  }

  /**
   * Stop hunting mode
   */
  async stopHunting(): Promise<void> {
    if (this.currentOperation !== 'hunting') {
      throw new Error('Not in hunting mode');
    }

    logger.info('Stopping hunting mode');
    this.currentOperation = null;
    this.operationStartTime = null;
    
    stateManager.setHuntingActive(false);
    stateManager.setMode('idle');
    
    this.emit('huntingStopped');
  }

  /**
   * Start raid mode
   */
  async startRaid(): Promise<void> {
    if (this.currentOperation) {
      throw new Error(`Operation already in progress: ${this.currentOperation}`);
    }

    logger.info('Starting raid mode');
    this.currentOperation = 'raid';
    this.operationStartTime = new Date();
    
    stateManager.setMode('raid');
    stateManager.setRaidActive(true);
    
    this.emit('raidStarted');
  }

  /**
   * Stop raid mode
   */
  async stopRaid(): Promise<void> {
    if (this.currentOperation !== 'raid') {
      throw new Error('Not in raid mode');
    }

    logger.info('Stopping raid mode');
    this.currentOperation = null;
    this.operationStartTime = null;
    
    stateManager.setRaidActive(false);
    stateManager.setMode('idle');
    
    this.emit('raidStopped');
  }

  /**
   * Go to idle mode
   */
  async goIdle(): Promise<void> {
    logger.info('Going to idle mode');
    
    if (this.currentOperation === 'hunting') {
      await this.stopHunting();
    } else if (this.currentOperation === 'raid') {
      await this.stopRaid();
    }
    
    stateManager.setMode('idle');
    this.emit('idle');
  }

  /**
   * Report event
   */
  reportEvent(type: string, data: any): void {
    logger.debug(`Event reported: ${type}`, data);
    this.emit('event', { type, data, timestamp: new Date() });
  }

  /**
   * Report error
   */
  reportError(message: string, details?: any): void {
    logger.error(message, details);
    this.emit('error', { message, details, timestamp: new Date() });
  }

  /**
   * Get current operation
   */
  getCurrentOperation(): string | null {
    return this.currentOperation;
  }

  /**
   * Get operation duration
   */
  getOperationDuration(): number | null {
    if (!this.operationStartTime) {
      return null;
    }
    return Date.now() - this.operationStartTime.getTime();
  }

  /**
   * Check if operation is running
   */
  isOperationRunning(): boolean {
    return this.currentOperation !== null;
  }
}

export const orchestrator = Orchestrator.getInstance();