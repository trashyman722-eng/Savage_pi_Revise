#!/bin/bash

# Build Script for SAVAGE Framework

set -e

echo "========================================"
echo "Building SAVAGE Framework"
echo "========================================"

# Clean previous build
echo "Cleaning previous build..."
rm -rf dist/

# Build TypeScript
echo "Building TypeScript..."
npx tsc

echo "========================================"
echo "Build complete!"
echo "========================================"
echo "Output: dist/"
echo "========================================"