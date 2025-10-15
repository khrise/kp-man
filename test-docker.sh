#!/bin/bash

echo "🐳 Testing Docker setup for KP-Man application"
echo "=============================================="
echo ""

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check if Docker and Docker Compose are installed
if ! command_exists docker; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command_exists docker-compose; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Check if Docker daemon is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker daemon is not running. Please start Docker first."
    exit 1
fi

echo "✅ Docker and Docker Compose are available"
echo ""

# Clean up any existing containers
echo "🧹 Cleaning up existing containers..."
docker-compose down --volumes --remove-orphans

echo ""
echo "🔨 Building and starting services..."
echo "This will:"
echo "  - Start PostgreSQL on port 5433"
echo "  - Build the Next.js application"
echo "  - Start the application on port 3000"
echo ""

# Build and start services
docker-compose up --build -d

# Wait a moment for services to start
echo "⏳ Waiting for services to start..."
sleep 10

# Check if services are running
echo ""
echo "🔍 Checking service status..."
if docker-compose ps | grep -q "Up"; then
    echo "✅ Services are running!"
    echo ""
    echo "📊 Service status:"
    docker-compose ps
    echo ""
    echo "🌐 Application should be available at: http://localhost:3000"
    echo "🗄️  PostgreSQL is running on: localhost:5433"
    echo ""
    echo "📋 Database connection details:"
    echo "   Host: localhost"
    echo "   Port: 5433"
    echo "   Database: kp_man"
    echo "   Username: kp_user"
    echo "   Password: kp_password"
    echo ""
    echo "🔧 Useful commands:"
    echo "   View logs: docker-compose logs -f"
    echo "   Stop services: docker-compose down"
    echo "   Restart services: docker-compose restart"
    echo "   Connect to DB: psql -h localhost -p 5433 -U kp_user -d kp_man"
else
    echo "❌ Some services failed to start. Check the logs:"
    docker-compose logs
    exit 1
fi