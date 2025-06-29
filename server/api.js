// server/api.js - Express server with OpenAI integration for IKIGAI X-ONE
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs/promises';
import { existsSync, mkdirSync } from 'fs';
import dotenv from 'dotenv';
import OpenAI from 'openai';

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// --------------------------------------------------------------------------- //
// Detect deployment environment
// Vercel (and most other serverless platforms) expose the env var VERCEL=1
// Their filesystem is read-only (except /tmp) – so we skip JSON persistence.
// --------------------------------------------------------------------------- //
const IS_SERVERLESS = !!process.env.VERCEL;

// --------------------------------------------------------------------------- //
// Auth: predefined user accounts (email → password)
// NOTE: Do NOT store sensitive data in VCS for real projects. These are injected
//       here only because the spec explicitly asked for hard-coded accounts.
// --------------------------------------------------------------------------- //
const USERS = {
  'juergen.pohl@mac.com': 'jocop',
  'carola.pohl@mac.com': 'rollyp',
  'christoph.pohl@mac.com': 'chrisleep',
  'ben.pohl@icloud.com': 'beninatorp',
  'silvana.schober83@gmail.com': 'schmuseschmuiiip',
};

// Set up __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configure middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());
app.use(cors());
app.use(express.json());
app.use(express.static(join(__dirname, '../public')));

// Data persistence setup
const DATA_PATH = process.env.DATA_PATH || './data/sessions.json';
const DATA_DIR = dirname(DATA_PATH);

// Ensure data directory exists
if (!IS_SERVERLESS && !existsSync(DATA_DIR)) {
  mkdirSync(DATA_DIR, { recursive: true });
}

// Initialize data file if it doesn't exist
async function initDataFile() {
  if (IS_SERVERLESS) return; // skip on Vercel
  try {
    if (!existsSync(DATA_PATH)) {
      await fs.writeFile(DATA_PATH, JSON.stringify({ sessions: [] }));
      console.log(`Created data file at ${DATA_PATH}`);
    }
  } catch (error) {
    console.error('Error initializing data file:', error);
  }
}

// Basic Auth middleware
function basicAuth(req, res, next) {
  // Skip auth in development mode
  if (process.env.NODE_ENV === 'development') return next();
  
  // Get auth header
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    res.setHeader('WWW-Authenticate', 'Basic realm="IKIGAI X-ONE"');
    return res.status(401).send('Authentication required');
  }
  
  // Decode credentials
  const base64Credentials = authHeader.split(' ')[1];
  const credentials = Buffer.from(base64Credentials, 'base64').toString('utf8');
  const [username, password] = credentials.split(':');
  
  // Check credentials
  const validSingle =
    process.env.AUTH_USERNAME &&
    process.env.AUTH_PASSWORD &&
    username === process.env.AUTH_USERNAME &&
    password === process.env.AUTH_PASSWORD;

  const validMulti = USERS[username] && USERS[username] === password;

  if (validSingle || validMulti) {
    return next();
  }
  
  res.setHeader('WWW-Authenticate', 'Basic realm="IKIGAI X-ONE"');
  return res.status(401).send('Invalid credentials');
}

// Apply auth to all routes
app.use(basicAuth);

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Save session data
async function saveSession(sessionData) {
  // On Vercel (read-only FS) just resolve true – client keeps its own cache
  if (IS_SERVERLESS) return true;
  try {
    let data = { sessions: [] };
    
    if (existsSync(DATA_PATH)) {
      const fileContent = await fs.readFile(DATA_PATH, 'utf8');
      data = JSON.parse(fileContent);
    }
    
    // Add new session or update existing one
    const existingIndex = data.sessions.findIndex(s => s.id === sessionData.id);
    
    if (existingIndex >= 0) {
      data.sessions[existingIndex] = sessionData;
    } else {
      data.sessions.push(sessionData);
    }
    
    await fs.writeFile(DATA_PATH, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving session:', error);
    return false;
  }
}

// API endpoint for Ikigai generation
app.post('/api/ikigai', async (req, res) => {
  try {
    const { answers, sessionId } = req.body;
    
    if (!answers || !Array.isArray(answers) || answers.length === 0) {
      return res.status(400).json({ error: 'Valid answers array required' });
    }
    
    // Format answers for OpenAI prompt
    const formattedAnswers = answers.map((a, i) => `Frage ${i+1}: ${a.question}\nAntwort ${i+1}: ${a.answer}`).join('\n\n');
    
    // Create session object
    const session = {
      id: sessionId || Date.now().toString(),
      timestamp: new Date().toISOString(),
      answers,
      result: null,
      imageUrl: null
    };
    
    // Save initial session data
    await saveSession(session);
    
    // Start streaming response
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    
    // Send event for processing start
    res.write(`data: ${JSON.stringify({ event: 'processing', message: 'Analyzing your answers...' })}\n\n`);
    
    // Generate Ikigai statement with OpenAI
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `Du bist ein Ikigai-Experte, der Menschen hilft, ihren persönlichen Lebenssinn zu finden.
          Basierend auf den Antworten des Nutzers, erstelle eine prägnante Ikigai-Aussage und drei umsetzbare wöchentliche Gewohnheiten.
          Antworte NUR im folgenden JSON-Format:
          {
            "ikigai": "Eine prägnante, tiefgründige Ikigai-Aussage (max. 2 Sätze)",
            "actions": [
              "Erste umsetzbare wöchentliche Gewohnheit (ein Satz)",
              "Zweite umsetzbare wöchentliche Gewohnheit (ein Satz)",
              "Dritte umsetzbare wöchentliche Gewohnheit (ein Satz)"
            ]
          }`
        },
        {
          role: 'user',
          content: `Hier sind meine Antworten zu den Ikigai-Fragen:\n\n${formattedAnswers}`
        }
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' }
    });
    
    // Parse the response
    const responseContent = completion.choices[0].message.content;
    const ikigaiResult = JSON.parse(responseContent);
    
    // Send event for Ikigai result
    res.write(`data: ${JSON.stringify({ event: 'ikigai', data: ikigaiResult })}\n\n`);
    
    // Update session with Ikigai result
    session.result = ikigaiResult;
    await saveSession(session);
    
    // Generate image based on Ikigai
    res.write(`data: ${JSON.stringify({ event: 'processing', message: 'Creating your Ikigai visualization...' })}\n\n`);
    
    const imagePrompt = `Northern-lights vortex symbolizing merged purpose: "${ikigaiResult.ikigai}", ultra-wide, 4k, vibrant, cosmic energy, spiritual awakening, purpose visualization, flowing energy, sacred geometry, deep blues and purples with green accents.`;
    
    const imageResponse = await openai.images.generate({
      model: process.env.OPENAI_IMAGE_MODEL || 'dall-e-3',
      prompt: imagePrompt,
      n: 1,
      size: process.env.OPENAI_IMAGE_SIZE || '1792x1024',
      quality: process.env.OPENAI_IMAGE_QUALITY || 'standard',
      response_format: 'url'
    });
    
    const imageUrl = imageResponse.data[0].url;
    
    // Update session with image URL
    session.imageUrl = imageUrl;
    await saveSession(session);
    
    // Send event for image result
    res.write(`data: ${JSON.stringify({ event: 'image', url: imageUrl })}\n\n`);
    
    // Send completion event
    res.write(`data: ${JSON.stringify({ event: 'complete', sessionId: session.id })}\n\n`);
    
    // End the response
    res.end();
    
  } catch (error) {
    console.error('Error generating Ikigai:', error);
    
    // Try to send error as SSE if connection is still open
    try {
      res.write(`data: ${JSON.stringify({ event: 'error', message: 'Error generating Ikigai. Please try again.' })}\n\n`);
      res.end();
    } catch (sendError) {
      // If can't send as SSE, try regular error response
      if (!res.headersSent) {
        res.status(500).json({ error: 'Error generating Ikigai' });
      }
    }
  }
});

// Get session data
app.get('/api/session/:id', async (req, res) => {
  try {
    if (IS_SERVERLESS) {
      return res
        .status(501)
        .json({ error: 'Session lookup disabled in serverless deployment' });
    }

    const sessionId = req.params.id;
    
    if (!existsSync(DATA_PATH)) {
      return res.status(404).json({ error: 'No sessions found' });
    }
    
    const fileContent = await fs.readFile(DATA_PATH, 'utf8');
    const data = JSON.parse(fileContent);
    
    const session = data.sessions.find(s => s.id === sessionId);
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    return res.json(session);
  } catch (error) {
    console.error('Error retrieving session:', error);
    return res.status(500).json({ error: 'Error retrieving session data' });
  }
});

// Serve the main HTML file for all other routes (SPA support)
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, '../public/index.html'));
});

// Initialize and start the server
async function startServer() {
  await initDataFile();
  
  app.listen(PORT, () => {
    console.log(`🚀 IKIGAI X-ONE server running on port ${PORT}`);
    console.log(`📁 Data stored at: ${DATA_PATH}`);
    console.log(`🔒 Auth ${process.env.NODE_ENV === 'development' ? 'disabled (dev mode)' : 'enabled'}`);
  });
}

startServer().catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
