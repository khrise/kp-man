#!/bin/bash

# Build the Docker image
echo "Building Docker image..."
docker build -t kp-man-app .

# Check if build was successful
if [ $? -eq 0 ]; then
    echo "✅ Docker image built successfully!"
    echo ""
    echo "To run the container:"
    echo "  docker run -p 3000:3000 kp-man-app"
    echo ""
    echo "Or use docker-compose:"
    echo "  docker-compose up"
else
    echo "❌ Docker build failed!"
    exit 1
fi