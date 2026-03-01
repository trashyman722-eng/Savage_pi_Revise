/**
 * Cleanup Handler
 * Ensures proper cleanup of resources on shutdown
 */

import { EventEmitter } from 'events';

export interface CleanupTask {
  name: string;
  priority: number;
  handler: () => Promise<void> | void;
}

export class CleanupHandler extends EventEmitter {
  private static instance: CleanupHandler;
  private tasks: CleanupTask[] = [];
  private isCleaningUp = false;

  private constructor() {
    super();
  }

  static getInstance(): CleanupHandler {
    if (!CleanupHandler.instance) {
      CleanupHandler.instance = new CleanupHandler();
    }
    return CleanupHandler.instance;
  }

  /**
   * Register a cleanup task
   * Lower priority runs first
   */
  register(name: string, handler: () => Promise<void> | void, priority: number = 100): void {
    this.tasks.push({ name, handler, priority });
    this.tasks.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Execute all cleanup tasks
   */
  async cleanup(): Promise<void> {
    if (this.isCleaningUp) {
      console.warn('[CleanupHandler] Already cleaning up...');
      return;
    }

    this.isCleaningUp = true;
    console.log('[CleanupHandler] Starting cleanup...');

    for (const task of this.tasks) {
      try {
        console.log(`[CleanupHandler] Running: ${task.name}`);
        await Promise.race([
          task.handler(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), 5000)
          )
        ]);
        console.log(`[CleanupHandler] Completed: ${task.name}`);
      } catch (error) {
        console.error(`[CleanupHandler] Failed: ${task.name}`, error);
      }
    }

    console.log('[CleanupHandler] Cleanup complete');
    this.emit('complete');
  }

  /**
   * Clear all cleanup tasks
   */
  clear(): void {
    this.tasks = [];
  }
}

export const cleanupHandler = CleanupHandler.getInstance();