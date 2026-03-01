/**
 * Display Driver
 * Direct framebuffer rendering for ELEGOO 2.8" TFT (320x240)
 */

import fs from 'fs';
import { HARDWARE_CONFIG } from '../config/hardware';
import { logger } from '../utils/logger';

export interface DisplayConfig {
  width: number;
  height: number;
  bitsPerPixel: number;
  framebuffer: string;
}

export interface Color {
  r: number;
  g: number;
  b: number;
}

export class DisplayDriver {
  private static instance: DisplayDriver;
  private config: DisplayConfig;
  private framebuffer: number | null = null;
  private initialized = false;
  private currentBuffer: Buffer | null = null;

  private constructor() {
    this.config = {
      width: HARDWARE_CONFIG.display.width,
      height: HARDWARE_CONFIG.display.height,
      bitsPerPixel: 16, // RGB565
      framebuffer: '/dev/fb0',
    };
  }

  static getInstance(): DisplayDriver {
    if (!DisplayDriver.instance) {
      DisplayDriver.instance = new DisplayDriver();
    }
    return DisplayDriver.instance;
  }

  /**
   * Initialize display
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      logger.warn('Display already initialized');
      return;
    }

    logger.info('Initializing display...');
    logger.info(`Resolution: ${this.config.width}x${this.config.height}`);
    logger.info(`Bits per pixel: ${this.config.bitsPerPixel}`);

    try {
      // Check if framebuffer exists
      if (fs.existsSync(this.config.framebuffer)) {
        logger.info(`Framebuffer found: ${this.config.framebuffer}`);
        
        // In production, this would open the framebuffer device
        // For now, we simulate the display
        this.currentBuffer = Buffer.alloc(
          this.config.width * this.config.height * (this.config.bitsPerPixel / 8)
        );
        
        this.initialized = true;
        logger.info('Display initialized');
      } else {
        logger.warn(`Framebuffer not found: ${this.config.framebuffer}`);
        logger.info('Running in headless mode (no display)');
        this.initialized = true;
      }
    } catch (error) {
      logger.error('Failed to initialize display', error);
      throw error;
    }
  }

  /**
   * Clear display
   */
  clear(color: Color = { r: 0, g: 0, b: 0 }): void {
    if (!this.initialized || !this.currentBuffer) {
      return;
    }

    const colorValue = this.colorToRGB565(color);
    
    // Fill buffer with color
    for (let i = 0; i < this.currentBuffer.length; i += 2) {
      this.currentBuffer.writeUInt16LE(colorValue, i);
    }

    logger.debug('Display cleared');
  }

  /**
   * Draw pixel
   */
  drawPixel(x: number, y: number, color: Color): void {
    if (!this.initialized || !this.currentBuffer) {
      return;
    }

    if (x < 0 || x >= this.config.width || y < 0 || y >= this.config.height) {
      return;
    }

    const offset = (y * this.config.width + x) * 2;
    const colorValue = this.colorToRGB565(color);
    
    this.currentBuffer.writeUInt16LE(colorValue, offset);
  }

  /**
   * Draw rectangle
   */
  drawRectangle(x: number, y: number, width: number, height: number, color: Color, fill: boolean = false): void {
    if (!this.initialized) {
      return;
    }

    if (fill) {
      for (let py = y; py < y + height; py++) {
        for (let px = x; px < x + width; px++) {
          this.drawPixel(px, py, color);
        }
      }
    } else {
      // Draw outline
      for (let px = x; px < x + width; px++) {
        this.drawPixel(px, y, color);
        this.drawPixel(px, y + height - 1, color);
      }
      for (let py = y; py < y + height; py++) {
        this.drawPixel(x, py, color);
        this.drawPixel(x + width - 1, py, color);
      }
    }
  }

  /**
   * Draw text (simplified)
   */
  drawText(x: number, y: number, text: string, color: Color = { r: 255, g: 255, b: 255 }): void {
    if (!this.initialized) {
      return;
    }

    // Simplified text rendering (8x8 pixels per character)
    const charWidth = 8;
    const charHeight = 8;
    
    for (let i = 0; i < text.length; i++) {
      const charX = x + i * charWidth;
      if (charX + charWidth > this.config.width) {
        break;
      }
      
      // Draw character placeholder
      this.drawRectangle(charX, y, charWidth - 1, charHeight - 1, color, false);
    }
  }

  /**
   * Refresh display
   */
  refresh(): void {
    if (!this.initialized || !this.currentBuffer) {
      return;
    }

    // In production, this would write to the framebuffer device
    // For now, we simulate the refresh
    logger.debug('Display refreshed');
  }

  /**
   * Convert RGB to RGB565
   */
  private colorToRGB565(color: Color): number {
    const r = (color.r >> 3) & 0x1F;
    const g = (color.g >> 2) & 0x3F;
    const b = (color.b >> 3) & 0x1F;
    return (r << 11) | (g << 5) | b;
  }

  /**
   * Get display config
   */
  getConfig(): DisplayConfig {
    return { ...this.config };
  }

  /**
   * Check if display is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Shutdown display
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down display...');
    
    if (this.currentBuffer) {
      this.currentBuffer = null;
    }
    
    this.initialized = false;
    logger.info('Display shutdown complete');
  }
}

export const displayDriver = DisplayDriver.getInstance();