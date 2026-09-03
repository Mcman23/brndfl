# 🚀 Brandfull System Startup Guide

## System Architecture
- **Backend**: Express.js API server (port 5000)
- **Frontend**: Static HTML/CSS/JS files (served by backend)
- **Database**: PostgreSQL on Supabase (connection configured in `.env`)

## Quick Start

### Option 1: Using npm (Recommended)
1. Open PowerShell or Command Prompt
2. Navigate to the backend folder:
   ```
   cd "C:\Users\Mcman\Desktop\Brandfull upd\backend"
   ```
3. Start the development server with hot-reload:
   ```
   npm run dev
   ```

### Option 2: Using Node directly
If you prefer to run without nodemon:
```
cd "C:\Users\Mcman\Desktop\Brandfull upd\backend"
node src/server.js
```

## Access the System
Once the server is running, open your browser and navigate to:
- **Main Application**: http://localhost:5000
- **Admin Panel**: http://localhost:5000/admin
- **API Documentation**: http://localhost:5000/api/...

## Configuration
The backend uses environment variables from `backend/.env`:
- `PORT`: 5000 (Express server port)
- `DATABASE_URL`: PostgreSQL connection string (Supabase)
- `JWT_SECRET`: For authentication tokens
- `NODE_ENV`: development

## Features
- ✅ Express.js REST API
- ✅ JWT Authentication
- ✅ PostgreSQL Database (Supabase)
- ✅ Static Frontend Serving
- ✅ CORS Enabled
- ✅ Helmet Security Headers
- ✅ File Upload Support
- ✅ Admin Panel

## Troubleshooting
- **Port 5000 already in use**: Change PORT in `.env` or kill the process using that port
- **Database connection error**: Verify DATABASE_URL in `.env`
- **Frontend not loading**: Ensure backend is running (port 5000)

## Available npm Scripts
- `npm run dev` - Start with auto-reload (nodemon)
- `npm start` - Start production server
- `npm run prisma:generate` - Generate Prisma client
- `npm run prisma:migrate` - Run database migrations
- `npm run prisma:seed` - Seed database with demo data

