// api/auth-check.js - Simple authentication check endpoint for IKIGAI X-ONE
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

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

// Basic Auth function
function checkAuth(req) {
  // Skip auth in development mode
  if (process.env.NODE_ENV === 'development') return true;
  
  // Get auth header
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    return false;
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

  return validSingle || validMulti;
}

// Vercel API handler for /api/auth-check
export default function handler(req, res) {
  // Set CORS headers to allow from any origin
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Only allow GET or HEAD methods
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  // Check authentication
  if (!checkAuth(req)) {
    res.setHeader('WWW-Authenticate', 'Basic realm="IKIGAI X-ONE"');
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  // If authenticated, return success
  return res.status(200).json({ 
    authenticated: true,
    message: 'Authentication successful'
  });
}
