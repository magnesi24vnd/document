const express = require('express');
const app = express();
const PORT = process.env.PORT || 3010;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Api-Version');
  if (req.method === 'OPTIONS') return res.status(200).end();
  next();
});

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'verified-vnkr-backend' }));

// Load compiled API handlers
let authHandler = null;
let balancesHandler = null;

try {
  authHandler = require('./dist/api/v1/authentication').default;
} catch(e) {
  console.warn('Auth handler not loaded:', e.message);
}

try {
  balancesHandler = require('./dist/api/v1/balances').default;
} catch(e) {
  console.warn('Balances handler not loaded:', e.message);
}

const notConfigured = (req, res) =>
  res.status(503).json({ error: 'API not configured', hint: 'Set env vars in .env' });

app.all('/api/v1/authentication', authHandler || notConfigured);
app.all('/api/authentication', authHandler || notConfigured);
app.get('/api/v1/balances', balancesHandler || notConfigured);
app.get('/api/balances', balancesHandler || notConfigured);

// 404 fallback
app.use((req, res) => res.status(404).json({ error: 'Not found' }));

app.listen(PORT, () => console.log(`Verified VNKR Backend running on http://localhost:${PORT}`));
