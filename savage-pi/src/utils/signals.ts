/**
 * Signal Handlers for Graceful Shutdown
 * Handles SIGINT, SIGTERM, and other signals
 */

import { EventEmitter } from 'events';

export class SignalHandler extends EventEmitter {
  private static instance: SignalHandler;
  private isShuttingDown = false;

  private constructor() {
    super();
    this.setupHandlers();
  }

  static getInstance(): SignalHandler {
    if (!SignalHandler.instance) {
      SignalHandler.instance = new SignalHandler();
    }
    return SignalHandler.instance;
  }

  private setupHandlers(): void {
    // SIGINT (Ctrl+C)
    process.on('SIGINT', () => this.handleShutdown('SIGINT'));

    // SIGTERM (systemd stop)
    process.on('SIGTERM', () => this.handleShutdown('SIGTERM'));

    // Uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.error('[SignalHandler] Uncaught Exception:', error);
      this.handleShutdown('uncaughtException');
    });

    // Unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      console.error('[SignalHandler] Unhandled Rejection at:', promise, 'reason:', reason);
      this.handleShutdown('unhandledRejection');
    });

    // Exit
    process.on('exit', (code) => {
      console.log(`[SignalHandler] Exiting with code: ${code}`);
    });
  }

  private handleShutdown(signal: string): void {
    if (this.isShuttingDown) {
      console.warn('[SignalHandler] Already shutting down, forcing exit...');
      process.exit(1);
    }

    this.isShuttingDown = true;
    console.log(`[SignalHandler] Received ${signal}, initiating graceful shutdown...`);

    // Emit shutdown event
    this.emit('shutdown', signal);

    // Force exit after timeout
    setTimeout(() => {
      console.error('[SignalHandler] Shutdown timeout, forcing exit...');
      process.exit(1);
    }, 10000); // 10 second timeout
  }

  isShutdown(): boolean {
    return this.isShuttingDown;
  }
}

export const signalHandler = SignalHandler.getInstance();