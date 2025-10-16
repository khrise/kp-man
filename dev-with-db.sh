#!/bin/bash

# Start only the database service
echo "Starting PostgreSQL database..."
docker-compose up -d postgres

# Wait for database to be ready
echo "Waiting for database to be ready..."
sleep 5

# Check if database is accessible
echo "Checking database connection..."
docker-compose exec postgres pg_isready -U kp_user -d kp_man

if [ $? -eq 0 ]; then
    echo "✅ Database is ready!"
    echo ""
    echo "Now you can run the Next.js development server locally:"
    echo "  npm run dev"
    echo ""
    echo "The app will be available at http://localhost:3000"
    echo "Database will be available at localhost:5433"
else
    echo "❌ Database is not ready. Check docker-compose logs postgres"
fi