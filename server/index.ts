import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 3001;

const WHOOP_AUTH_URL = 'https://api.prod.whoop.com/oauth/oauth2/auth';
const WHOOP_TOKEN_URL = 'https://api.prod.whoop.com/oauth/oauth2/token';
const WHOOP_API_BASE = 'https://api.prod.whoop.com/developer/v1';
const REDIRECT_URI = process.env.REDIRECT_URI || 'http://localhost:5173/api/auth/callback';
const SCOPES = 'read:recovery read:cycles offline';

const CLIENT_ID = process.env.WHOOP_CLIENT_ID || '';
const CLIENT_SECRET = process.env.WHOOP_CLIENT_SECRET || '';

interface TokenStore {
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

let tokens: TokenStore | null = null;

app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json());

// --- Auth Routes ---

app.get('/api/auth/login', (_req, res) => {
  if (!CLIENT_ID) {
    res.status(500).json({ error: 'WHOOP_CLIENT_ID not configured' });
    return;
  }

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: SCOPES,
  });

  res.redirect(`${WHOOP_AUTH_URL}?${params.toString()}`);
});

app.get('/api/auth/callback', async (req, res) => {
  const code = req.query.code as string;

  if (!code) {
    res.status(400).json({ error: 'Missing authorization code' });
    return;
  }

  try {
    const response = await fetch(WHOOP_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error('Token exchange failed:', response.status, text);
      res.status(500).json({ error: 'Token exchange failed' });
      return;
    }

    const data = await response.json();
    tokens = {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: Date.now() + data.expires_in * 1000,
    };

    res.redirect('/');
  } catch (err) {
    console.error('Token exchange error:', err);
    res.status(500).json({ error: 'Token exchange failed' });
  }
});

app.get('/api/auth/status', (_req, res) => {
  res.json({ authenticated: tokens !== null });
});

app.post('/api/auth/logout', (_req, res) => {
  tokens = null;
  res.json({ success: true });
});

// --- Token Refresh ---

async function ensureValidToken(): Promise<string | null> {
  if (!tokens) return null;

  if (Date.now() < tokens.expires_at) {
    return tokens.access_token;
  }

  // Token expired — refresh
  try {
    const response = await fetch(WHOOP_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: tokens.refresh_token,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
      }),
    });

    if (!response.ok) {
      console.error('Token refresh failed:', response.status);
      tokens = null;
      return null;
    }

    const data = await response.json();
    tokens = {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: Date.now() + data.expires_in * 1000,
    };

    return tokens.access_token;
  } catch (err) {
    console.error('Token refresh error:', err);
    tokens = null;
    return null;
  }
}

// --- WHOOP API Proxy ---

async function proxyWhoop(endpoint: string, res: express.Response) {
  const accessToken = await ensureValidToken();
  if (!accessToken) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  try {
    const response = await fetch(`${WHOOP_API_BASE}${endpoint}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      res.status(response.status).json({ error: 'WHOOP API error' });
      return;
    }

    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error('WHOOP proxy error:', err);
    res.status(502).json({ error: 'Failed to reach WHOOP API' });
  }
}

app.get('/api/whoop/recovery', (_req, res) => {
  proxyWhoop('/recovery', res);
});

app.get('/api/whoop/cycle', (_req, res) => {
  proxyWhoop('/cycle', res);
});

// --- Start ---

app.listen(PORT, () => {
  console.log(`WHOOP auth server running on http://localhost:${PORT}`);
  if (!CLIENT_ID || !CLIENT_SECRET) {
    console.warn(
      'Warning: WHOOP_CLIENT_ID and/or WHOOP_CLIENT_SECRET not set. OAuth will not work.',
    );
  }
});
