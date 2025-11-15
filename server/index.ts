/**
 * Gas Sponsorship Server
 * Backend service that handles gas-sponsored transactions for Keplr integration
 */

import express from 'express';
import cors from 'cors';
import sponsorRoutes from './routes/sponsor';

const app = express();
const PORT = process.env.SPONSOR_PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api', sponsorRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'gas-sponsor' });
});

// Start server
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 Gas sponsorship server running on port ${PORT}`);
    console.log(`📡 POST /api/sponsor - Sponsor and broadcast transactions`);
    console.log(`❤️  GET /health - Health check`);
    
    if (!process.env.DEVELOPER_MNEMONIC) {
      console.warn('⚠️  WARNING: DEVELOPER_MNEMONIC not set. Server will not be able to sponsor transactions.');
    }
  });
}

export default app;
