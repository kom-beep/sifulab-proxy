const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
app.use(cors());
app.use(express.json());

// Guna environment variable – jangan letak key sini
const FINNHUB_KEY = process.env.FINNHUB_KEY;
if (!FINNHUB_KEY) {
  console.error('FINNHUB_KEY not set');
  process.exit(1);
}

const RATE_LIMIT = 60;
const rateLimits = new Map();

app.use((req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    const window = 60000;
    
    if (!rateLimits.has(ip)) {
        rateLimits.set(ip, { count: 0, reset: now + window });
    }
    
    const limit = rateLimits.get(ip);
    if (now > limit.reset) {
        limit.count = 0;
        limit.reset = now + window;
    }
    
    if (limit.count >= RATE_LIMIT) {
        return res.status(429).json({ error: 'Rate limit exceeded. Please wait.' });
    }
    
    limit.count++;
    next();
});

app.get('/api/finnhub', async (req, res) => {
    const endpoint = req.query.endpoint;
    if (!endpoint) {
        return res.status(400).json({ error: 'Missing endpoint parameter' });
    }
    
    const url = `https://finnhub.io/api/v1/${endpoint}${endpoint.includes('?') ? '&' : '?'}token=${FINNHUB_KEY}`;
    
    try {
        const response = await fetch(url);
        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('Proxy error:', error);
        res.status(500).json({ error: 'Failed to fetch data from Finnhub' });
    }
});

app.get('/api/market-status', async (req, res) => {
    try {
        const url = `https://finnhub.io/api/v1/stock/market-status?exchange=US&token=${FINNHUB_KEY}`;
        const response = await fetch(url);
        const data = await response.json();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch market status' });
    }
});

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`SifuLab Proxy running on port ${PORT}`);
});