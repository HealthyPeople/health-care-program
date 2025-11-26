#!/bin/bash
# Post-build script for Oryx to copy static files for Next.js standalone mode
# This script runs automatically after npm run build via npm's postbuild hook

set -e

echo "=== Post-build: Copying static files for standalone mode ==="

# Get the current directory (should be /home/site/wwwroot during Oryx build)
CURRENT_DIR=$(pwd)
echo "Current directory: $CURRENT_DIR"

# Check if standalone directory exists
if [ ! -d ".next/standalone" ]; then
  echo "Error: .next/standalone directory not found in $CURRENT_DIR"
  echo "Contents of .next directory:"
  ls -la .next/ 2>/dev/null || echo "No .next directory found"
  exit 1
fi

echo "Found .next/standalone directory"

# Create .next directory in standalone if it doesn't exist
mkdir -p ".next/standalone/.next"
echo "Created .next/standalone/.next directory"

# Copy static files
if [ -d ".next/static" ]; then
  echo "Copying .next/static to .next/standalone/.next/static..."
  cp -r ".next/static" ".next/standalone/.next/static"
  echo "✓ Copied .next/static"
else
  echo "Warning: .next/static directory not found"
fi

# Copy public folder
if [ -d "public" ]; then
  echo "Copying public folder to .next/standalone/public..."
  cp -r "public" ".next/standalone/public"
  echo "✓ Copied public folder"
else
  echo "Warning: public directory not found"
fi

# Copy package.json to standalone folder (for module resolution)
if [ -f "package.json" ]; then
  echo "Copying package.json to .next/standalone/package.json..."
  cp "package.json" ".next/standalone/package.json"
  echo "✓ Copied package.json"
fi

# Verify server.js exists
if [ -f ".next/standalone/server.js" ]; then
  echo "✓ Verified server.js exists"
else
  echo "Error: .next/standalone/server.js not found"
  exit 1
fi

echo "=== Post-build completed successfully ==="

