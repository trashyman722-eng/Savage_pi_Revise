#!/bin/bash

################################################################################
# SAVAGE Framework Uninstall Script
# Safely removes SAVAGE framework and related services
# 
# Usage: sudo bash uninstall.sh
################################################################################

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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
        exit 1
    fi
}

main() {
    log_info "=========================================="
    log_info "SAVAGE Framework Uninstall"
    log_info "=========================================="
    log_info ""
    
    check_root
    
    read -p "This will remove SAVAGE framework. Continue? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "Uninstall cancelled"
        exit 0
    fi
    
    # Stop service
    log_info "Stopping SAVAGE service..."
    systemctl stop savage 2>/dev/null || true
    systemctl disable savage 2>/dev/null || true
    log_success "Service stopped"
    
    # Remove systemd service
    log_info "Removing systemd service..."
    rm -f /etc/systemd/system/savage.service
    systemctl daemon-reload
    log_success "Systemd service removed"
    
    # Remove Nginx config
    log_info "Removing Nginx configuration..."
    rm -f /etc/nginx/sites-available/savage-framework
    rm -f /etc/nginx/sites-enabled/savage-framework
    systemctl reload nginx 2>/dev/null || true
    log_success "Nginx configuration removed"
    
    # Remove Python packages
    log_info "Removing Python packages..."
    pip3 uninstall -y -r /home/pi/savage-framework/requirements.txt 2>/dev/null || true
    log_success "Python packages removed"
    
    # Remove Node.js packages
    log_info "Removing Node.js packages..."
    rm -rf /home/pi/savage-framework/node_modules
    rm -rf /home/pi/savage-framework/dist
    log_success "Node.js packages removed"
    
    log_info ""
    log_success "SAVAGE framework uninstalled successfully"
    log_info ""
    log_info "Optional: Remove project directory"
    log_info "  rm -rf /home/pi/savage-framework"
    log_info ""
}

main "$@"
