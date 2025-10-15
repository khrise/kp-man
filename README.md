This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Docker Deployment

This application includes Docker support for containerized deployment with PostgreSQL database.

### Quick Test Setup

1. **Test the complete Docker setup:**

   ```bash
   ./test-docker.sh
   ```

   This will:

   - Start PostgreSQL on port 5433 (non-standard port)
   - Build and start the Next.js application on port 3000
   - Run database initialization scripts from `./scripts/`
   - Show service status and connection details

2. **Manual Docker Compose setup:**
   ```bash
   docker-compose up --build
   ```

### Individual Docker Commands

1. **Build the Docker image:**

   ```bash
   ./build-docker.sh
   ```

   Or manually:

   ```bash
   docker build -t kp-man-app .
   ```

2. **Run the container (standalone):**
   ```bash
   docker run -p 3000:3000 kp-man-app
   ```

### Environment Configuration

The docker-compose setup includes:

- **PostgreSQL Database**: localhost:5433
  - Database: `kp_man`
  - Username: `kp_user`
  - Password: `kp_password`
- **Next.js Application**: localhost:3000

For custom configuration, copy `.env.example` to `.env.local` and modify as needed.

### Useful Commands

```bash
# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Stop and remove all data
docker-compose down --volumes

# Connect to database
psql -h localhost -p 5433 -U kp_user -d kp_man
```

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
