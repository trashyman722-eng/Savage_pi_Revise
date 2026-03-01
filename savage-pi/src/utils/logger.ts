/**
 * Capped Logger
 * Prevents unbounded memory growth from logs
 */

import fs from 'fs';
import path from 'path';
import { config } from '../config/app';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  CRITICAL = 4,
}

export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  message: string;
  data?: any;
}

export class Logger {
  private static instance: Logger;
  private logs: LogEntry[] = [];
  private maxEntries: number;
  private logFile: string | null = null;
  private fileStream: fs.WriteStream | null = null;

  private constructor() {
    this.maxEntries = config.maxLogEntries;
    
    if (config.environment === 'production') {
      this.setupFileLogging();
    }
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private setupFileLogging(): void {
    try {
      const logDir = config.logPath;
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }

      const logFile = path.join(logDir, `savage-${Date.now()}.log`);
      this.logFile = logFile;
      this.fileStream = fs.createWriteStream(logFile, { flags: 'a' });
      
      console.log(`[Logger] Logging to file: ${logFile}`);
    } catch (error) {
      console.error('[Logger] Failed to setup file logging:', error);
    }
  }

  private addLog(level: LogLevel, message: string, data?: any): void {
    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      message,
      data,
    };

    // Add to memory buffer
    this.logs.push(entry);

    // Cap the buffer
    if (this.logs.length > this.maxEntries) {
      this.logs.shift(); // Remove oldest
    }

    // Output to console
    const levelName = LogLevel[level];
    const timestamp = entry.timestamp.toISOString();
    const logLine = `[${timestamp}] [${levelName}] ${message}`;
    
    if (data) {
      console.log(logLine, data);
    } else {
      console.log(logLine);
    }

    // Output to file
    if (this.fileStream && !this.fileStream.destroyed) {
      const fileLine = data ? `${logLine} ${JSON.stringify(data)}\n` : `${logLine}\n`;
      this.fileStream.write(fileLine);
    }
  }

  debug(message: string, data?: any): void {
    if (config.debug) {
      this.addLog(LogLevel.DEBUG, message, data);
    }
  }

  info(message: string, data?: any): void {
    this.addLog(LogLevel.INFO, message, data);
  }

  warn(message: string, data?: any): void {
    this.addLog(LogLevel.WARN, message, data);
  }

  error(message: string, data?: any): void {
    this.addLog(LogLevel.ERROR, message, data);
  }

  critical(message: string, data?: any): void {
    this.addLog(LogLevel.CRITICAL, message, data);
  }

  /**
   * Get recent logs
   */
  getLogs(count: number = 100): LogEntry[] {
    return this.logs.slice(-count);
  }

  /**
   * Get logs by level
   */
  getLogsByLevel(level: LogLevel): LogEntry[] {
    return this.logs.filter(log => log.level === level);
  }

  /**
   * Clear all logs
   */
  clear(): void {
    this.logs = [];
  }

  /**
   * Close file stream
   */
  async close(): Promise<void> {
    if (this.fileStream && !this.fileStream.destroyed) {
      return new Promise((resolve) => {
        this.fileStream!.end(() => {
          console.log('[Logger] File stream closed');
          resolve();
        });
      });
    }
  }
}

export const logger = Logger.getInstance();