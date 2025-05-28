#!/bin/bash

# Navigate to project directory
cd "$(dirname "$0")"

# Check for node
if ! command -v node &> /dev/null
then
    echo "Node.js is not installed. Please install it first."
    exit 1
fi

# Check for PM2
if ! command -v pm2 &> /dev/null
then
    echo "PM2 is not installed. Installing PM2..."
    npm install -g pm2
fi

# Check if index.mjs exists
if [ -f "./backend/index.mjs" ]; then
    echo "Starting server using PM2 with index.mjs..."
    PORT=3000 pm2 start backend/index.mjs --name "jbs-backend"
elif [ -f "./backend/server.js" ]; then
    echo "Starting server using PM2 with server.js..."
    PORT=3000 pm2 start backend/server.js --name "jbs-backend"
else
    echo "Error: Could not find server entry point (index.mjs or server.js)"
    exit 1
fi
