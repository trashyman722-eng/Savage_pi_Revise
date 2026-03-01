#!/bin/bash

# SAVAGE Framework Installation Script
# Raspberry Pi Zero 2 W

set -e

echo "========================================"
echo "SAVAGE Framework Installation"
echo "Raspberry Pi Zero 2 W"
echo "========================================"

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "Please run as root"
    exit 1
fi

# Install dependencies
echo "Installing dependencies..."
apt-get update
apt-get install -y nodejs npm git build-essential

# Enable SPI, I2C, UART
echo "Enabling hardware interfaces..."
raspi-config nonint do_spi 0
raspi-config nonint do_i2c 0
raspi-config nonint do_serial_hw 0

# Disable GUI (headless)
echo "Configuring headless mode..."
systemctl set-default multi-user.target

# Disable unnecessary services
echo "Optimizing system services..."
systemctl disable bluetooth
systemctl disable hciuart

# Optimize kernel parameters
echo "Optimizing kernel parameters..."
echo "vm.swappiness=10" >> /etc/sysctl.conf
echo "vm.vfs_cache_pressure=50" >> /etc/sysctl.conf
sysctl -p

# Create application directory
echo "Creating application directory..."
mkdir -p /opt/savage-pi
cd /opt/savage-pi

# Install Node.js dependencies
echo "Installing Node.js dependencies..."
npm install --production

# Build TypeScript
echo "Building TypeScript..."
npm run build

# Create data directory
echo "Creating data directory..."
mkdir -p data/logs

# Install systemd service
echo "Installing systemd service..."
cp systemd/savage-framework.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable savage-framework.service

# Set permissions
echo "Setting permissions..."
chown -R root:root /opt/savage-pi
chmod -R 755 /opt/savage-pi

echo "========================================"
echo "Installation complete!"
echo "========================================"
echo "Start service: sudo systemctl start savage-framework.service"
echo "View logs: sudo journalctl -u savage-framework.service -f"
echo "========================================"