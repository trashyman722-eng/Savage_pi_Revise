/**
 * Main Entry Point
 * SAVAGE Framework - Raspberry Pi Zero 2 W Embedded Edition
 */

import { config } from './config/app';
import { logger } from './utils/logger';
import { signalHandler } from './utils/signals';
import { cleanupHandler } from './utils/cleanup';
import { stateManager } from './core/state';
import { orchestrator } from './core/orchestrator';
import { hardwareManager } from './hardware/manager';
import { displayDriver } from './hardware/display';
import { MainMenuBuilder } from './ui/menu';

/**
 * Main Application Class
 */
class SavageApplication {
  private isRunning = false;
  private mainMenu = MainMenuBuilder.build();

  /**
   * Initialize application
   */
  async initialize(): Promise<void> {
    logger.info('========================================');
    logger.info(`SAVAGE Framework v${config.version}`);
    logger.info('Raspberry Pi Zero 2 W Embedded Edition');
    logger.info('========================================');

    try {
      // Register cleanup tasks
      this.registerCleanupTasks();

      // Initialize hardware
      await hardwareManager.initialize();

      // Initialize display
      await displayDriver.initialize();

      // Show main menu
      this.mainMenu.show();

      // Setup signal handlers
      signalHandler.on('shutdown', async (signal) => {
        logger.info(`Shutdown signal received: ${signal}`);
        await this.shutdown();
      });

      this.isRunning = true;
      logger.info('Application initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize application', error);
      throw error;
    }
  }

  /**
   * Register cleanup tasks
   */
  private registerCleanupTasks(): void {
    // Shutdown hardware (priority 10)
    cleanupHandler.register('Shutdown hardware', async () => {
      await hardwareManager.shutdown();
    }, 10);

    // Shutdown display (priority 20)
    cleanupHandler.register('Shutdown display', async () => {
      await displayDriver.shutdown();
    }, 20);

    // Close logger (priority 100)
    cleanupHandler.register('Close logger', async () => {
      await logger.close();
    }, 100);
  }

  /**
   * Run application
   */
  async run(): Promise<void> {
    if (!this.isRunning) {
      throw new Error('Application not initialized');
    }

    logger.info('Application running...');

    // Main loop
    while (this.isRunning && !signalHandler.isShutdown()) {
      try {
        // Update system metrics
        await this.updateMetrics();

        // Render menu
        this.mainMenu.render();

        // Sleep for polling interval
        await this.sleep(config.pollingInterval);
      } catch (error) {
        logger.error('Error in main loop', error);
        await this.sleep(1000);
      }
    }
  }

  /**
   * Update system metrics
   */
  private async updateMetrics(): Promise<void> {
    try {
      // Get CPU usage (simplified)
      const cpuUsage = process.cpuUsage().user / 1000000;
      
      // Get memory usage
      const memoryUsage = process.memoryUsage();
      const memoryPercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;

      // Get temperature (simulated)
      const temperature = 40 + Math.random() * 10;

      // Update state
      stateManager.updateSystemMetrics(cpuUsage, memoryPercent);
      stateManager.updateTemperature(temperature);

      logger.debug('Metrics updated', {
        cpu: cpuUsage.toFixed(2),
        memory: memoryPercent.toFixed(2),
        temperature: temperature.toFixed(1),
      });
    } catch (error) {
      logger.error('Failed to update metrics', error);
    }
  }

  /**
   * Shutdown application
   */
  async shutdown(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    logger.info('Shutting down application...');
    this.isRunning = false;

    try {
      // Run cleanup tasks
      await cleanupHandler.cleanup();

      logger.info('Application shutdown complete');
    } catch (error) {
      logger.error('Error during shutdown', error);
    }
  }

  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  const app = new SavageApplication();

  try {
    await app.initialize();
    await app.run();
  } catch (error) {
    logger.critical('Application crashed', error);
    process.exit(1);
  }
}

// Run main function
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});