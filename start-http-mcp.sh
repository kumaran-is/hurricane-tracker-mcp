#!/bin/bash

# Hurricane Tracker MCP - HTTP Transport Wrapper for Claude Desktop
# This script ensures the Docker container is running and provides connection info

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "Error: Docker is not running. Please start Docker Desktop." >&2
    exit 1
fi

# Check if container is running
if ! docker ps | grep -q hurricane-tracker-mcp; then
    echo "Starting Hurricane Tracker MCP container..." >&2
    cd "$(dirname "$0")"
    docker-compose up -d

    # Wait for container to be healthy
    for i in {1..30}; do
        if curl -s http://localhost:8080/health > /dev/null 2>&1; then
            echo "Container is healthy" >&2
            break
        fi
        echo "Waiting for container to start... ($i/30)" >&2
        sleep 1
    done
fi

# Keep the script running to maintain connection
echo "Hurricane Tracker MCP is available at http://localhost:8080/mcp" >&2
echo "Press Ctrl+C to stop" >&2

# Keep script alive
while true; do
    sleep 60
    # Check health every minute
    if ! curl -s http://localhost:8080/health > /dev/null 2>&1; then
        echo "Warning: Health check failed" >&2
    fi
done