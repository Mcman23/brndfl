// Direct start script - runs the Express server without npm
import app from './src/app.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

app.listen(PORT, () => {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`[Brandfull Backend Server]`);
  console.log(`Environment: ${NODE_ENV}`);
  console.log(`Server running on: http://localhost:${PORT}`);
  console.log(`Database: ${process.env.DATABASE_URL ? 'Connected (Supabase PostgreSQL)' : 'No DATABASE_URL set'}`);
  console.log(`${'='.repeat(60)}\n`);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n[Server] SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\n[Server] SIGINT received, shutting down gracefully...');
  process.exit(0);
});
