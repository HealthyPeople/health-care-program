#!/bin/bash

# Exit on error
set -e

echo "Handling Node.js deployment..."

# Navigate to deployment target
cd "$DEPLOYMENT_TARGET"

# Install dependencies
if [ -e package.json ]; then
  echo "Installing npm packages..."
  npm install
fi

# Build the application
if [ -e package.json ]; then
  echo "Building the application..."
  npm run build
  
  # Copy static files for standalone mode
  if [ -d ".next/standalone" ]; then
    echo "Copying static files for standalone mode..."
    
    # Create directories if they don't exist
    mkdir -p ".next/standalone/.next"
    
    # Copy static files
    if [ -d ".next/static" ]; then
      cp -r ".next/static" ".next/standalone/.next/static"
    fi
    
    # Copy public folder
    if [ -d "public" ]; then
      cp -r "public" ".next/standalone/public"
    fi
    
    # Copy package.json to standalone folder
    if [ -f "package.json" ]; then
      cp "package.json" ".next/standalone/package.json"
    fi
  fi
fi

echo "Finished successfully."

