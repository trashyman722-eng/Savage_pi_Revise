/**
 * Menu System
 * Flipper Zero-style menu navigation for 320x240 display
 */

import { EventEmitter } from 'events';
import { displayDriver, Color } from '../hardware/display';
import { stateManager } from '../core/state';
import { logger } from '../utils/logger';

export interface MenuItem {
  id: string;
  label: string;
  icon?: string;
  action?: () => void | Promise<void>;
  submenu?: MenuItem[];
  enabled?: boolean;
}

export interface MenuConfig {
  title: string;
  items: MenuItem[];
  selectedIndex: number;
  parentMenu?: Menu;
}

export class Menu extends EventEmitter {
  private config: MenuConfig;
  private visible = false;

  constructor(config: MenuConfig) {
    super();
    this.config = config;
  }

  /**
   * Render menu to display
   */
  render(): void {
    if (!this.visible) {
      return;
    }

    const display = displayDriver;
    if (!display.isInitialized()) {
      return;
    }

    // Clear display
    display.clear({ r: 0, g: 0, b: 0 });

    // Draw title bar
    display.drawRectangle(0, 0, 320, 30, { r: 0, g: 255, b: 0 }, true);
    display.drawText(10, 10, this.config.title, { r: 0, g: 0, b: 0 });

    // Draw menu items
    const startY = 40;
    const itemHeight = 30;
    const maxVisibleItems = 6;

    for (let i = 0; i < this.config.items.length && i < maxVisibleItems; i++) {
      const item = this.config.items[i];
      const y = startY + i * itemHeight;
      const isSelected = i === this.config.selectedIndex;

      // Draw item background
      if (isSelected) {
        display.drawRectangle(0, y, 320, itemHeight - 2, { r: 0, g: 100, b: 255 }, true);
      }

      // Draw item label
      const textColor = isSelected ? { r: 255, g: 255, b: 255 } : { r: 255, g: 255, b: 255 };
      display.drawText(10, y + 10, item.label, textColor);

      // Draw arrow if submenu
      if (item.submenu) {
        display.drawText(290, y + 10, '>', textColor);
      }
    }

    // Draw status bar
    this.renderStatusBar();

    // Refresh display
    display.refresh();
  }

  /**
   * Render status bar
   */
  private renderStatusBar(): void {
    const display = displayDriver;
    const state = stateManager.getState();

    // Draw status bar background
    display.drawRectangle(0, 210, 320, 30, { r: 50, g: 50, b: 50 }, true);

    // Draw battery
    const batteryColor = state.batteryLevel > 20 ? { r: 0, g: 255, b: 0 } : { r: 255, g: 0, b: 0 };
    display.drawText(10, 220, `BAT: ${Math.round(state.batteryLevel)}%`, batteryColor);

    // Draw mode
    display.drawText(100, 220, state.mode.toUpperCase(), { r: 255, g: 255, b: 255 });

    // Draw temperature
    display.drawText(200, 220, `${Math.round(state.temperature)}°C`, { r: 255, g: 255, b: 255 });
  }

  /**
   * Show menu
   */
  show(): void {
    this.visible = true;
    this.render();
    this.emit('shown');
  }

  /**
   * Hide menu
   */
  hide(): void {
    this.visible = false;
    this.emit('hidden');
  }

  /**
   * Navigate up
   */
  navigateUp(): void {
    if (this.config.selectedIndex > 0) {
      this.config.selectedIndex--;
      this.render();
      this.emit('navigate', { direction: 'up', index: this.config.selectedIndex });
    }
  }

  /**
   * Navigate down
   */
  navigateDown(): void {
    if (this.config.selectedIndex < this.config.items.length - 1) {
      this.config.selectedIndex++;
      this.render();
      this.emit('navigate', { direction: 'down', index: this.config.selectedIndex });
    }
  }

  /**
   * Select current item
   */
  select(): void {
    const item = this.config.items[this.config.selectedIndex];
    
    if (!item || (item.enabled !== undefined && !item.enabled)) {
      return;
    }

    if (item.submenu) {
      // Open submenu
      const submenu = new Menu({
        title: item.label,
        items: item.submenu,
        selectedIndex: 0,
        parentMenu: this,
      });
      this.emit('submenu', submenu);
    } else if (item.action) {
      // Execute action
      item.action();
      this.emit('selected', item);
    }
  }

  /**
   * Go back to parent menu
   */
  back(): void {
    if (this.config.parentMenu) {
      this.emit('back', this.config.parentMenu);
    }
  }

  /**
   * Get current menu item
   */
  getCurrentItem(): MenuItem | undefined {
    return this.config.items[this.config.selectedIndex];
  }

  /**
   * Update menu items
   */
  updateItems(items: MenuItem[]): void {
    this.config.items = items;
    if (this.visible) {
      this.render();
    }
  }
}

/**
 * Main Menu Builder
 */
export class MainMenuBuilder {
  /**
   * Build main menu
   */
  static build(): Menu {
    const items: MenuItem[] = [
      {
        id: 'hunting',
        label: 'Hunting',
        icon: '📡',
        action: () => {
          logger.info('Hunting selected');
        },
      },
      {
        id: 'raid',
        label: 'Raid',
        icon: '⚔️',
        action: () => {
          logger.info('Raid selected');
        },
      },
      {
        id: 'handshakes',
        label: 'Handshakes',
        icon: '🔑',
        action: () => {
          logger.info('Handshakes selected');
        },
      },
      {
        id: 'targets',
        label: 'Targets',
        icon: '🎯',
        action: () => {
          logger.info('Targets selected');
        },
      },
      {
        id: 'nfc',
        label: 'NFC',
        icon: '📱',
        action: () => {
          logger.info('NFC selected');
        },
      },
      {
        id: 'rfid',
        label: 'RFID',
        icon: '💳',
        action: () => {
          logger.info('RFID selected');
        },
      },
      {
        id: 'device',
        label: 'Device',
        icon: '📟',
        submenu: [
          {
            id: 'status',
            label: 'Status',
            action: () => {
              logger.info('Device status selected');
            },
          },
          {
            id: 'config',
            label: 'Configuration',
            action: () => {
              logger.info('Configuration selected');
            },
          },
        ],
      },
      {
        id: 'system',
        label: 'System',
        icon: '⚙️',
        submenu: [
          {
            id: 'logs',
            label: 'Logs',
            action: () => {
              logger.info('Logs selected');
            },
          },
          {
            id: 'shutdown',
            label: 'Shutdown',
            action: () => {
              logger.info('Shutdown selected');
            },
          },
        ],
      },
    ];

    return new Menu({
      title: 'SAVAGE',
      items,
      selectedIndex: 0,
    });
  }
}