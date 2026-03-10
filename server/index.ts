import express from 'express';
import cors from 'cors';
import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PLANS_DIR = path.join(__dirname, '..', 'public', 'plans');
const TRAINING_CONFIG_PATH = path.join(
  __dirname,
  '..',
  'src',
  'config',
  'training.ts',
);

const app = express();
const PORT = 3001;

const WHOOP_AUTH_URL = 'https://api.prod.whoop.com/oauth/oauth2/auth';
const WHOOP_TOKEN_URL = 'https://api.prod.whoop.com/oauth/oauth2/token';
const WHOOP_API_BASE = 'https://api.prod.whoop.com/developer/v1';
const REDIRECT_URI = process.env.REDIRECT_URI || 'http://localhost:3001/api/auth/callback';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const SCOPES = 'read:recovery read:cycles read:sleep offline';

const CLIENT_ID = process.env.WHOOP_CLIENT_ID || '';
const CLIENT_SECRET = process.env.WHOOP_CLIENT_SECRET || '';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';

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

app.get('/api/auth/url', (_req, res) => {
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
  res.json({ url: `${WHOOP_AUTH_URL}?${params.toString()}` });
});

app.get('/api/auth/callback', async (req, res) => {
  console.log('Callback hit! Query params:', req.query);
  const code = req.query.code as string;

  if (!code) {
    const error = (req.query.error as string) || 'missing_code';
    console.error('Callback error — no code received:', error);
    res.redirect(`${FRONTEND_URL}?error=${encodeURIComponent(error)}`);
    return;
  }
  console.log('Got authorization code, exchanging for token...');

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

    res.redirect(FRONTEND_URL);
  } catch (err) {
    console.error('Token exchange error:', err);
    res.redirect(`${FRONTEND_URL}?error=token_exchange_failed`);
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

async function fetchWhoop(endpoint: string): Promise<unknown> {
  const accessToken = await ensureValidToken();
  if (!accessToken) throw new Error('Not authenticated');

  const response = await fetch(`${WHOOP_API_BASE}${endpoint}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error(`WHOOP API error: ${response.status}`);
  }

  return response.json();
}

async function proxyWhoop(endpoint: string, res: express.Response) {
  try {
    const data = await fetchWhoop(endpoint);
    res.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    if (message.includes('Not authenticated')) {
      res.status(401).json({ error: message });
    } else {
      console.error('WHOOP proxy error:', err);
      res.status(502).json({ error: 'Failed to reach WHOOP API' });
    }
  }
}

app.get('/api/whoop/recovery', (req, res) => {
  const { start, end } = req.query;
  let endpoint = '/recovery';
  if (start && end) {
    endpoint += `?start=${start}T00:00:00.000Z&end=${end}T23:59:59.999Z`;
  }
  proxyWhoop(endpoint, res);
});

app.get('/api/whoop/cycle', (req, res) => {
  const { start, end } = req.query;
  let endpoint = '/cycle';
  if (start && end) {
    endpoint += `?start=${start}T00:00:00.000Z&end=${end}T23:59:59.999Z`;
  }
  proxyWhoop(endpoint, res);
});

app.get('/api/whoop/sleep', (req, res) => {
  const { start, end } = req.query;
  let endpoint = '/activity/sleep';
  if (start && end) {
    endpoint += `?start=${start}T00:00:00.000Z&end=${end}T23:59:59.999Z`;
  }
  proxyWhoop(endpoint, res);
});

// --- Plan Management ---

function getAvailablePlans(): string[] {
  if (!fs.existsSync(PLANS_DIR)) return [];
  return fs
    .readdirSync(PLANS_DIR)
    .filter((f) => /^workout-plan-\d{4}-\d{2}-\d{2}\.md$/.test(f))
    .sort();
}

app.get('/api/plans', (_req, res) => {
  res.json({ plans: getAvailablePlans() });
});

// --- Date Helpers ---

function getDateWindow(): {
  prevMonday: string;
  prevSunday: string;
  thisMonday: string;
  thisSunday: string;
} {
  const today = new Date();
  const dow = today.getUTCDay(); // 0=Sun, 1=Mon, ...
  const daysSinceMon = dow === 0 ? 6 : dow - 1;

  const thisMonday = new Date(today);
  thisMonday.setUTCDate(today.getUTCDate() - daysSinceMon);

  const prevMonday = new Date(thisMonday);
  prevMonday.setUTCDate(thisMonday.getUTCDate() - 7);

  const prevSunday = new Date(thisMonday);
  prevSunday.setUTCDate(thisMonday.getUTCDate() - 1);

  const thisSunday = new Date(thisMonday);
  thisSunday.setUTCDate(thisMonday.getUTCDate() + 6);

  const fmt = (d: Date) => d.toISOString().split('T')[0];

  return {
    prevMonday: fmt(prevMonday),
    prevSunday: fmt(prevSunday),
    thisMonday: fmt(thisMonday),
    thisSunday: fmt(thisSunday),
  };
}

// --- Fetch WHOOP Week Data ---

interface DayData {
  date: string;
  recoveryScore: number | null;
  recoveryZone: string;
  hrv: number | null;
  rhr: number | null;
  strain: number | null;
  sleepScore: number | null;
}

async function fetchWeekWhoopData(
  startDate: string,
  endDate: string,
): Promise<DayData[]> {
  const [recoveryData, cycleData, sleepData] = await Promise.allSettled([
    fetchWhoop(
      `/recovery?start=${startDate}T00:00:00.000Z&end=${endDate}T23:59:59.999Z`,
    ),
    fetchWhoop(
      `/cycle?start=${startDate}T00:00:00.000Z&end=${endDate}T23:59:59.999Z`,
    ),
    fetchWhoop(
      `/activity/sleep?start=${startDate}T00:00:00.000Z&end=${endDate}T23:59:59.999Z`,
    ),
  ]);

  // Build a map of date -> data
  const dayMap = new Map<string, DayData>();

  // Initialize 7 days
  const start = new Date(startDate);
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setUTCDate(start.getUTCDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    dayMap.set(dateStr, {
      date: dateStr,
      recoveryScore: null,
      recoveryZone: 'unknown',
      hrv: null,
      rhr: null,
      strain: null,
      sleepScore: null,
    });
  }

  // Parse recovery records
  if (recoveryData.status === 'fulfilled') {
    const records = (recoveryData.value as { records?: unknown[] }).records || [];
    for (const rec of records as Array<{
      created_at?: string;
      score?: {
        recovery_score?: number;
        hrv_rmssd_milli?: number;
        resting_heart_rate?: number;
      };
    }>) {
      const dateStr = rec.created_at?.split('T')[0];
      if (dateStr && dayMap.has(dateStr)) {
        const day = dayMap.get(dateStr)!;
        day.recoveryScore = rec.score?.recovery_score ?? null;
        day.hrv =
          rec.score?.hrv_rmssd_milli != null
            ? Math.round(rec.score.hrv_rmssd_milli)
            : null;
        day.rhr = rec.score?.resting_heart_rate ?? null;
        if (day.recoveryScore !== null) {
          day.recoveryZone =
            day.recoveryScore >= 67
              ? 'green'
              : day.recoveryScore >= 34
                ? 'yellow'
                : 'red';
        }
      }
    }
  }

  // Parse cycle/strain records
  if (cycleData.status === 'fulfilled') {
    const records = (cycleData.value as { records?: unknown[] }).records || [];
    for (const rec of records as Array<{
      start?: string;
      score?: { strain?: number };
    }>) {
      const dateStr = rec.start?.split('T')[0];
      if (dateStr && dayMap.has(dateStr)) {
        const day = dayMap.get(dateStr)!;
        day.strain =
          rec.score?.strain != null
            ? Math.round(rec.score.strain * 10) / 10
            : null;
      }
    }
  }

  // Parse sleep records
  if (sleepData.status === 'fulfilled') {
    const records = (sleepData.value as { records?: unknown[] }).records || [];
    for (const rec of records as Array<{
      start?: string;
      score?: { sleep_performance_percentage?: number };
    }>) {
      const dateStr = rec.start?.split('T')[0];
      if (dateStr && dayMap.has(dateStr)) {
        const day = dayMap.get(dateStr)!;
        day.sleepScore = rec.score?.sleep_performance_percentage ?? null;
      }
    }
  }

  // Return sorted by date
  return Array.from(dayMap.values()).sort((a, b) =>
    a.date.localeCompare(b.date),
  );
}

// --- Plan Generation ---

function buildWhoopSummaryTable(days: DayData[]): string {
  let table =
    '| Date | Recovery % | Zone | HRV | RHR | Strain | Sleep % |\n';
  table +=
    '|------|-----------|------|-----|-----|--------|--------|\n';
  for (const d of days) {
    table += `| ${d.date} | ${d.recoveryScore ?? '—'} | ${d.recoveryZone} | ${d.hrv ?? '—'} | ${d.rhr ?? '—'} | ${d.strain ?? '—'} | ${d.sleepScore ?? '—'} |\n`;
  }
  return table;
}

function buildGenerationPrompt(
  days: DayData[],
  thisMonday: string,
  thisSunday: string,
): string {
  const whoopTable = buildWhoopSummaryTable(days);

  const greenDays = days.filter((d) => d.recoveryZone === 'green').length;
  const yellowDays = days.filter((d) => d.recoveryZone === 'yellow').length;
  const redDays = days.filter((d) => d.recoveryZone === 'red').length;
  const avgRecovery =
    days.filter((d) => d.recoveryScore !== null).length > 0
      ? Math.round(
          days
            .filter((d) => d.recoveryScore !== null)
            .reduce((sum, d) => sum + d.recoveryScore!, 0) /
            days.filter((d) => d.recoveryScore !== null).length,
        )
      : null;
  const last3 = days.slice(-3);
  const last3Zones = last3.map((d) => d.recoveryZone);
  const lowSleepDays = days.filter(
    (d) => d.sleepScore !== null && d.sleepScore < 70,
  );

  return `Generate a personalized 7-day workout plan for the week of ${thisMonday} to ${thisSunday}, based on the prior week's WHOOP recovery data below.

## Prior Week WHOOP Data (${days[0]?.date} to ${days[days.length - 1]?.date})

${whoopTable}

### Trend Analysis
- Average recovery: ${avgRecovery ?? 'N/A'}%
- Green days: ${greenDays}, Yellow days: ${yellowDays}, Red days: ${redDays}
- Last 3 days zones: ${last3Zones.join(', ')}
- Days with poor sleep (<70%): ${lowSleepDays.length > 0 ? lowSleepDays.map((d) => d.date).join(', ') : 'None'}

## Training Preferences

**Training Split:**
- Day A — Chest & Upper/Mid Back: bench press variations, rows, pull-ups, chest flyes, cable rows
- Day B — Legs & Lower Back: squats, lunges, leg press, RDLs, hamstring curls, calf raises
- Day C — Arms (Biceps, Triceps, Shoulders): curls, tricep extensions, overhead press, lateral raises, face pulls
- Each muscle group must be hit minimum 1x per week

**Weekly Structure:**
- 3–4 strength training days
- 1 rest day, 1 mobility/flexibility day
- Every Tuesday: Soccer session (no strength training)

**Session Format:** 15-min warm-up, 60-min main workout, 5-min cool-down

**Equipment:** Full gym access (barbells, dumbbells, cables, machines, bands)

**Goals:** Maintain strength while cutting (caloric deficit); improve mobility and flexibility

**Lower Back — Always Active:**
- Avoid on days following poor recovery: heavy barbell back squats, conventional deadlifts, heavy good mornings
- Substitute with: belt squats, leg press, trap bar deadlifts, Bulgarian split squats, RDLs at moderate weight with controlled tempo

**Recovery-Based Intensity:**
- Green (67–100%): High intensity — 3–8 reps compounds, 6–10 accessories, full volume, progressive overload focus
- Yellow (34–66%): Moderate — 8–12 reps, 3-1-2 tempo, ~75% volume, submaximal effort
- Red (0–33%): Active recovery only — mobility, yoga, walking, or full rest; no resistance training
- After 2+ consecutive yellow/red days, ease back in with a moderate session before high-intensity
- On days following poor sleep (<70%), reduce volume by 1–2 sets per exercise

**Mobility Session Template:**
- 10 min foam rolling (quads, hamstrings, glutes, thoracic spine, lats)
- 15 min dynamic mobility (hip circles, world's greatest stretch, cat-cow, thread the needle)
- 15 min targeted stretching (hip flexors, hamstrings, thoracic extension, shoulder mobility)
- 10 min lower-back-friendly core work (dead bugs, bird dogs, pallof press, McGill curl-ups)
- 5 min breathing/relaxation (diaphragmatic breathing, 4-7-8 pattern)

## Intensity Assignment Rules

- If last 3 days trend green → first training day = high intensity
- If mixed or declining → start moderate, ramp up mid-week
- If predominantly red/yellow → start with mobility or rest, program conservatively

**Injury rules:**
- If most recent recovery was yellow or red, avoid heavy spinal loading on next leg day
- Use belt squats, leg press, trap bar deadlifts, or single-leg work as substitutes

## Output Format

**CRITICAL MARKDOWN FORMATTING RULE:** Every bold section label (e.g. \`**Warm-Up (15 min)**\`) MUST be followed by a blank line before any list items (\`-\`) or table (\`|\`).

Use EXACTLY this markdown structure:

\`\`\`
# Week Overview

[2–3 paragraphs summarizing last week's WHOOP trends and how they shaped programming]

# Daily Breakdown

## Monday

**Duration:** [X min] | **Target Intensity:** [High / Moderate / Active Recovery]

### Warm-up
- [exercise 1]
...

### Main Workout

| Exercise | Sets | Reps | Rest |
|----------|------|------|------|
| [exercise] | [sets] | [reps] | [rest] |

### Cool-down
- [stretch 1]
...

### Flexibility Note
[How to adjust if recovery feels different than projected]

[Continue for Tuesday through Sunday]

# Notes
- **Hydration target:** ...
- **Sleep:** ...
- **Nutrition:** ...
- **Lower back protocol:** ...
- **Progressive overload:** ...
\`\`\`

Generate the complete plan now. Output ONLY the markdown content, no code fences or preamble.`;
}

function updatePlanManifest(filename: string): void {
  const content = fs.readFileSync(TRAINING_CONFIG_PATH, 'utf-8');

  // Check if already in manifest
  if (content.includes(filename)) return;

  // Insert the new filename into the PLAN_MANIFEST array
  const updated = content.replace(
    /export const PLAN_MANIFEST = \[([^\]]*)\]/s,
    (_match, inner: string) => {
      const trimmed = inner.trim();
      const newEntry = `  '${filename}',`;
      if (trimmed.length === 0) {
        return `export const PLAN_MANIFEST = [\n${newEntry}\n]`;
      }
      return `export const PLAN_MANIFEST = [\n${trimmed}\n${newEntry}\n]`;
    },
  );

  fs.writeFileSync(TRAINING_CONFIG_PATH, updated, 'utf-8');
}

app.post('/api/generate-plan', async (_req, res) => {
  if (!ANTHROPIC_API_KEY) {
    res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });
    return;
  }

  try {
    const { prevMonday, prevSunday, thisMonday, thisSunday } = getDateWindow();
    const filename = `workout-plan-${thisMonday}.md`;
    const filepath = path.join(PLANS_DIR, filename);

    // Check if plan already exists
    if (fs.existsSync(filepath)) {
      res.json({
        success: true,
        filename,
        weekDate: thisMonday,
        message: 'Plan already exists for this week',
        alreadyExisted: true,
      });
      return;
    }

    console.log(
      `Generating plan for ${thisMonday}. WHOOP data window: ${prevMonday} → ${prevSunday}`,
    );

    // Fetch WHOOP data for prior week (works with or without auth)
    let whoopDays: DayData[];
    const accessToken = await ensureValidToken();
    if (accessToken) {
      whoopDays = await fetchWeekWhoopData(prevMonday, prevSunday);
    } else {
      console.log('No WHOOP auth — generating plan without recovery data');
      whoopDays = [];
      const start = new Date(prevMonday);
      for (let i = 0; i < 7; i++) {
        const d = new Date(start);
        d.setUTCDate(start.getUTCDate() + i);
        whoopDays.push({
          date: d.toISOString().split('T')[0],
          recoveryScore: null,
          recoveryZone: 'unknown',
          hrv: null,
          rhr: null,
          strain: null,
          sleepScore: null,
        });
      }
    }
    console.log(
      'WHOOP data fetched:',
      whoopDays.map((d) => `${d.date}: ${d.recoveryZone}`).join(', '),
    );

    // Build prompt and call Claude
    const prompt = buildGenerationPrompt(whoopDays, thisMonday, thisSunday);

    const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8192,
      messages: [{ role: 'user', content: prompt }],
    });

    const planContent =
      message.content[0].type === 'text' ? message.content[0].text : '';

    if (!planContent) {
      res.status(500).json({ error: 'Empty response from Claude' });
      return;
    }

    // Ensure plans directory exists
    if (!fs.existsSync(PLANS_DIR)) {
      fs.mkdirSync(PLANS_DIR, { recursive: true });
    }

    // Fix bold-label formatting (safety net from the original plugin)
    const fixedContent = planContent.replace(
      /(\*\*[^\n]+\*\*\n)(-|\|)/g,
      '$1\n$2',
    );

    // Write the plan file
    fs.writeFileSync(filepath, fixedContent, 'utf-8');
    console.log(`Plan saved: ${filepath}`);

    // Update the PLAN_MANIFEST
    updatePlanManifest(filename);
    console.log(`Manifest updated with: ${filename}`);

    res.json({
      success: true,
      filename,
      weekDate: thisMonday,
      whoopSummary: {
        avgRecovery:
          whoopDays.filter((d) => d.recoveryScore !== null).length > 0
            ? Math.round(
                whoopDays
                  .filter((d) => d.recoveryScore !== null)
                  .reduce((sum, d) => sum + d.recoveryScore!, 0) /
                  whoopDays.filter((d) => d.recoveryScore !== null).length,
              )
            : null,
        greenDays: whoopDays.filter((d) => d.recoveryZone === 'green').length,
        yellowDays: whoopDays.filter((d) => d.recoveryZone === 'yellow').length,
        redDays: whoopDays.filter((d) => d.recoveryZone === 'red').length,
      },
      message: 'Plan generated successfully',
    });
  } catch (err) {
    console.error('Plan generation error:', err);
    res.status(500).json({
      error: 'Failed to generate plan',
      details: err instanceof Error ? err.message : 'Unknown error',
    });
  }
});

// --- Start ---

app.listen(PORT, () => {
  console.log(`WHOOP auth server running on http://localhost:${PORT}`);
  if (!CLIENT_ID || !CLIENT_SECRET) {
    console.warn(
      'Warning: WHOOP_CLIENT_ID and/or WHOOP_CLIENT_SECRET not set. OAuth will not work.',
    );
  } else {
    const params = new URLSearchParams({
      client_id: CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      response_type: 'code',
      scope: SCOPES,
    });
    console.log(
      `\nWHOOP Auth URL (copy to browser if button doesn't work):\n${WHOOP_AUTH_URL}?${params.toString()}\n`,
    );
  }
  if (!ANTHROPIC_API_KEY) {
    console.warn(
      'Warning: ANTHROPIC_API_KEY not set. Plan generation will not work.',
    );
  }
});
