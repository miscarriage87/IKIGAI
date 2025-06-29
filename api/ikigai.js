// api/ikigai.js - Vercel serverless function for IKIGAI X-ONE Ikigai generation
import dotenv from 'dotenv';
import OpenAI from 'openai';

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

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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

// Vercel API handler for /api/ikigai
export default async function handler(req, res) {
  // Only allow POST method
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  // Check authentication
  if (!checkAuth(req)) {
    res.setHeader('WWW-Authenticate', 'Basic realm="IKIGAI X-ONE"');
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  try {
    const { answers, sessionId } = req.body;
    
    if (!answers || !Array.isArray(answers) || answers.length === 0) {
      return res.status(400).json({ error: 'Valid answers array required' });
    }
    
    // Format answers for OpenAI prompt
    const formattedAnswers = answers.map((a, i) => `Frage ${i+1}: ${a.question}\nAntwort ${i+1}: ${a.answer}`).join('\n\n');
    
    // Create session object (in-memory only for Vercel)
    const session = {
      id: sessionId || Date.now().toString(),
      timestamp: new Date().toISOString(),
      answers
    };
    
    // Set up SSE response
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    
    // Send event for processing start
    res.write(`event: processing\ndata: ${JSON.stringify({ message: 'Analyzing your answers...' })}\n\n`);
    
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
    res.write(`event: ikigai\ndata: ${JSON.stringify(ikigaiResult)}\n\n`);
    
    // Generate image based on Ikigai
    res.write(`event: processing\ndata: ${JSON.stringify({ message: 'Creating your Ikigai visualization...' })}\n\n`);
    
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
    
    // Send event for image result
    res.write(`event: image\ndata: ${JSON.stringify({ url: imageUrl })}\n\n`);
    
    // Send completion event
    res.write(`event: complete\ndata: ${JSON.stringify({ sessionId: session.id })}\n\n`);
    
    // End the response
    res.end();
    
  } catch (error) {
    console.error('Error generating Ikigai:', error);
    
    // Try to send error as SSE if connection is still open
    try {
      res.write(`event: error\ndata: ${JSON.stringify({ message: 'Error generating Ikigai. Please try again.' })}\n\n`);
      res.end();
    } catch (sendError) {
      // If can't send as SSE, try regular error response
      if (!res.headersSent) {
        res.status(500).json({ error: 'Error generating Ikigai' });
      }
    }
  }
}
