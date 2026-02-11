import { Router } from 'express';
import { db } from '../../infrastructure/db/drizzle/client';
import { sql } from 'drizzle-orm';

const router: ReturnType<typeof Router> = Router();

// Lightweight health check that warms DB connection
router.get('/health', async (req, res) => {
  const startTime = Date.now();
  try {
    // Simple query that warms the connection pool
    await db.execute(sql`SELECT 1`);
    const responseTime = Date.now() - startTime;
    
    res.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      database: 'connected',
      responseTime: `${responseTime}ms`,
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'error', 
      error: 'Database connection failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;

