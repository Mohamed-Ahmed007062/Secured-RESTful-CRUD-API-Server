import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createApp } from '../src/app.js';
import { connectDatabase } from '../src/config/database.js';

const app = createApp();
let isConnected = false;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!isConnected) {
    try {
      await connectDatabase();
      isConnected = true;
    } catch (err) {
      console.error('Failed to establish database connection in serverless function:', err);
    }
  }
  return (app as any)(req, res);
}
