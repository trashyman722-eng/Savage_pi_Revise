#!/bin/bash

################################################################################
# SAVAGE Framework Installation Script
# Automated setup for Raspberry Pi Zero 2W
# 
# Usage: sudo bash install.sh
# 
# This script will:
# 1. Update system packages
# 2. Install all system dependencies
# 3. Enable required interfaces (I2C, SPI, UART)
# 4. Install Python and Node.js dependencies
# 5. Configure systemd service
# 6. Initialize database
# 7. Build and start SAVAGE framework
################################################################################

set -e  # Exit on error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_NAME="savage-framework"
SERVICE_NAME="savage"
INSTALL_USER="${SUDO_USER:-pi}"
INSTALL_HOME="/home/${INSTALL_USER}"

################################################################################
# Helper Functions
################################################################################

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_root() {
    if [[ $EUID -ne 0 ]]; then
        log_error "This script must be run as root"
        echo "Usage: sudo bash install.sh"
        exit 1
    fi
}

check_raspberry_pi() {
    if ! grep -q "Raspberry Pi" /proc/device-tree/model 2>/dev/null; then
        log_warning "This script is optimized for Raspberry Pi. Continuing anyway..."
    fi
}

check_internet() {
    if ! ping -c 1 8.8.8.8 &> /dev/null; then
        log_error "No internet connection detected"
        exit 1
    fi
}

################################################################################
# System Setup
################################################################################

update_system() {
    log_info "Updating system packages..."
    apt-get update
    apt-get upgrade -y
    log_success "System packages updated"
}

install_system_dependencies() {
    log_info "Installing system dependencies..."
    
    apt-get install -y \
        build-essential \
        python3-dev \
        python3-pip \
        git \
        curl \
        wget \
        i2c-tools \
        libffi-dev \
        libssl-dev \
        libjpeg-dev \
        zlib1g-dev \
        libharfbuzz0b \
        libwebp6 \
        libtiff5 \
        libjasper1 \
        libatlas-base-dev \
        libjasper-dev \
        libopenjp2-7 \
        libjasper-dev \
        libopenjp2-7-dev \
        libtiffxx5 \
        libopenjp2-7-dev \
        sqlite3 \
        mysql-client \
        libmysqlclient-dev \
        supervisor \
        nginx \
        ufw
    
    log_success "System dependencies installed"
}

install_nodejs() {
    log_info "Installing Node.js 18..."
    
    if ! command -v node &> /dev/null; then
        curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
        apt-get install -y nodejs
        log_success "Node.js installed"
    else
        log_warning "Node.js already installed: $(node --version)"
    fi
}

install_pnpm() {
    log_info "Installing pnpm..."
    
    npm install -g pnpm
    log_success "pnpm installed: $(pnpm --version)"
}

################################################################################
# Interface Configuration
################################################################################

enable_i2c() {
    log_info "Enabling I2C interface..."
    
    if ! grep -q "^dtparam=i2c_arm=on" /boot/config.txt; then
        echo "dtparam=i2c_arm=on" >> /boot/config.txt
        log_success "I2C enabled in /boot/config.txt"
    else
        log_warning "I2C already enabled"
    fi
    
    # Load I2C module
    if ! lsmod | grep -q i2c_bcm2835; then
        modprobe i2c_bcm2835
        echo "i2c_bcm2835" >> /etc/modules
        log_success "I2C module loaded"
    fi
}

enable_spi() {
    log_info "Enabling SPI interface..."
    
    if ! grep -q "^dtparam=spi=on" /boot/config.txt; then
        echo "dtparam=spi=on" >> /boot/config.txt
        log_success "SPI enabled in /boot/config.txt"
    else
        log_warning "SPI already enabled"
    fi
    
    # Load SPI module
    if ! lsmod | grep -q spi_bcm2835; then
        modprobe spi_bcm2835
        echo "spi_bcm2835" >> /etc/modules
        log_success "SPI module loaded"
    fi
}

enable_uart() {
    log_info "Enabling UART interface..."
    
    if ! grep -q "^enable_uart=1" /boot/config.txt; then
        echo "enable_uart=1" >> /boot/config.txt
        log_success "UART enabled in /boot/config.txt"
    else
        log_warning "UART already enabled"
    fi
}

configure_gpio_permissions() {
    log_info "Configuring GPIO permissions..."
    
    # Add user to gpio group
    usermod -a -G gpio "${INSTALL_USER}" 2>/dev/null || true
    usermod -a -G spi "${INSTALL_USER}" 2>/dev/null || true
    usermod -a -G i2c "${INSTALL_USER}" 2>/dev/null || true
    usermod -a -G dialout "${INSTALL_USER}" 2>/dev/null || true
    
    log_success "GPIO permissions configured"
}

################################################################################
# Python Setup
################################################################################

install_python_dependencies() {
    log_info "Installing Python dependencies..."
    
    pip3 install --upgrade pip setuptools wheel
    pip3 install -r "${SCRIPT_DIR}/requirements.txt"
    
    log_success "Python dependencies installed"
}

################################################################################
# Node.js Setup
################################################################################

install_node_dependencies() {
    log_info "Installing Node.js dependencies..."
    
    cd "${SCRIPT_DIR}"
    pnpm install
    
    log_success "Node.js dependencies installed"
}

################################################################################
# Build
################################################################################

build_project() {
    log_info "Building SAVAGE framework..."
    
    cd "${SCRIPT_DIR}"
    pnpm run build
    
    log_success "SAVAGE framework built successfully"
}

################################################################################
# Service Configuration
################################################################################

create_systemd_service() {
    log_info "Creating systemd service..."
    
    cat > "/etc/systemd/system/${SERVICE_NAME}.service" << 'EOF'
[Unit]
Description=SAVAGE Cybersecurity Framework
After=network.target mysql.service

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/savage-framework
Environment="NODE_ENV=production"
Environment="PORT=3000"
ExecStart=/usr/bin/node /home/pi/savage-framework/dist/index.js
Restart=on-failure
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=savage

[Install]
WantedBy=multi-user.target
EOF
    
    systemctl daemon-reload
    log_success "Systemd service created"
}

create_nginx_config() {
    log_info "Creating Nginx configuration..."
    
    cat > "/etc/nginx/sites-available/${PROJECT_NAME}" << 'EOF'
upstream savage_backend {
    server 127.0.0.1:3000;
}

server {
    listen 80;
    listen [::]:80;
    server_name _;

    client_max_body_size 100M;

    location / {
        proxy_pass http://savage_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_buffering off;
    }

    location /ws {
        proxy_pass http://savage_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 86400;
    }
}
EOF
    
    # Enable site
    ln -sf /etc/nginx/sites-available/${PROJECT_NAME} /etc/nginx/sites-enabled/ 2>/dev/null || true
    
    # Disable default site
    rm -f /etc/nginx/sites-enabled/default
    
    # Test and reload
    nginx -t && systemctl reload nginx
    log_success "Nginx configuration created"
}

################################################################################
# Database Setup
################################################################################

setup_database() {
    log_info "Setting up database..."
    
    # Check if MySQL is running
    if ! systemctl is-active --quiet mysql; then
        log_warning "MySQL is not running. Skipping database setup."
        log_info "Please start MySQL and run: pnpm run db:push"
        return
    fi
    
    # Create database and user
    mysql -u root << EOF
CREATE DATABASE IF NOT EXISTS savage;
CREATE USER IF NOT EXISTS 'savage'@'localhost' IDENTIFIED BY 'savage_password';
GRANT ALL PRIVILEGES ON savage.* TO 'savage'@'localhost';
FLUSH PRIVILEGES;
EOF
    
    log_success "Database created"
}

################################################################################
# Firewall Configuration
################################################################################

configure_firewall() {
    log_info "Configuring firewall..."
    
    ufw --force enable
    ufw default deny incoming
    ufw default allow outgoing
    ufw allow 22/tcp    # SSH
    ufw allow 80/tcp    # HTTP
    ufw allow 443/tcp   # HTTPS
    ufw allow 3000/tcp  # Node.js dev server
    
    log_success "Firewall configured"
}

################################################################################
# Verification
################################################################################

verify_installation() {
    log_info "Verifying installation..."
    
    local errors=0
    
    # Check Python
    if ! python3 --version &> /dev/null; then
        log_error "Python3 not found"
        ((errors++))
    else
        log_success "Python3: $(python3 --version)"
    fi
    
    # Check Node.js
    if ! node --version &> /dev/null; then
        log_error "Node.js not found"
        ((errors++))
    else
        log_success "Node.js: $(node --version)"
    fi
    
    # Check pnpm
    if ! pnpm --version &> /dev/null; then
        log_error "pnpm not found"
        ((errors++))
    else
        log_success "pnpm: $(pnpm --version)"
    fi
    
    # Check I2C
    if ! i2cdetect -y 1 &> /dev/null; then
        log_warning "I2C not accessible (may require reboot)"
    else
        log_success "I2C interface accessible"
    fi
    
    # Check SPI
    if [ ! -e /dev/spidev0.0 ]; then
        log_warning "SPI not accessible (may require reboot)"
    else
        log_success "SPI interface accessible"
    fi
    
    if [ $errors -gt 0 ]; then
        log_error "Installation verification failed with $errors errors"
        return 1
    fi
    
    log_success "Installation verification passed"
    return 0
}

################################################################################
# Main Installation Flow
################################################################################

main() {
    log_info "=========================================="
    log_info "SAVAGE Framework Installation"
    log_info "=========================================="
    log_info ""
    
    # Pre-flight checks
    check_root
    check_raspberry_pi
    check_internet
    
    log_info "Installation will proceed with the following steps:"
    log_info "1. Update system packages"
    log_info "2. Install system dependencies"
    log_info "3. Install Node.js and pnpm"
    log_info "4. Enable I2C, SPI, UART interfaces"
    log_info "5. Install Python and Node.js dependencies"
    log_info "6. Build SAVAGE framework"
    log_info "7. Configure systemd service"
    log_info "8. Configure Nginx reverse proxy"
    log_info "9. Setup database"
    log_info "10. Configure firewall"
    log_info ""
    
    read -p "Continue with installation? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "Installation cancelled"
        exit 0
    fi
    
    # Execute installation steps
    update_system
    install_system_dependencies
    install_nodejs
    install_pnpm
    enable_i2c
    enable_spi
    enable_uart
    configure_gpio_permissions
    install_python_dependencies
    install_node_dependencies
    build_project
    create_systemd_service
    create_nginx_config
    setup_database
    configure_firewall
    verify_installation
    
    log_info ""
    log_info "=========================================="
    log_success "Installation completed successfully!"
    log_info "=========================================="
    log_info ""
    log_info "Next steps:"
    log_info "1. Reboot to apply interface changes:"
    log_info "   sudo reboot"
    log_info ""
    log_info "2. After reboot, start SAVAGE service:"
    log_info "   sudo systemctl start ${SERVICE_NAME}"
    log_info ""
    log_info "3. Enable service to start on boot:"
    log_info "   sudo systemctl enable ${SERVICE_NAME}"
    log_info ""
    log_info "4. Check service status:"
    log_info "   sudo systemctl status ${SERVICE_NAME}"
    log_info ""
    log_info "5. Access dashboard at:"
    log_info "   http://localhost:3000"
    log_info ""
    log_info "For more information, see:"
    log_info "- README.md - Complete project documentation"
    log_info "- QUICKSTART.md - Quick start guide"
    log_info "- docs/DRIVERS.md - Hardware driver documentation"
    log_info ""
}

# Run main installation
main "$@"
