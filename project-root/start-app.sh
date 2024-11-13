#!/bin/bash

# Start Docker containers
docker-compose up -d

# Wait a few seconds for the SQL Server container to be ready
echo "Waiting for SQL Server to initialize..."
sleep 20

# Install npm dependencies
echo "Installing dependencies..."
npm install

# Run database initialization
echo "Initializing database..."
node initialize.js

# Start the Express server
echo "Starting server..."
node server.js
