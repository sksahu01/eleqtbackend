#!/bin/bash
# Health check script for Render deployment

# Check if the server is responding
echo "Checking server health..."

# Wait for server to start
sleep 10

# Health check
curl -f http://localhost:${PORT:-4000}/health || exit 1

echo "Server is healthy!"
