const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const fs = require('fs').promises;

const app = express();
const PORT = process.env.PORT || 3000;

// Gemini API configuration
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyDRkO31dq3n5R5KUFVbLgEXQF9yXrx455c';
// Using gemini-2.5-flash which is available and supports generateContent
const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

function getGeminiAPIUrl() {
    return `${GEMINI_API_BASE}/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
}

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    }
}));

// Middleware
app.use(cors({
    origin: true,
    credentials: true
}));
app.use(express.json({ limit: '10mb' })); // Increase limit for base64 images
app.use(express.urlencoded({ extended: true, limit: '10mb' })); // For form data

// User storage file path
const USERS_FILE = path.join(__dirname, 'users.json');
const USER_DATA_DIR = path.join(__dirname, 'user_data');

// Initialize user storage
async function initStorage() {
    try {
        // Create users.json if it doesn't exist
        try {
            await fs.access(USERS_FILE);
        } catch {
            await fs.writeFile(USERS_FILE, JSON.stringify({}), 'utf8');
        }
        
        // Create user_data directory if it doesn't exist
        try {
            await fs.access(USER_DATA_DIR);
        } catch {
            await fs.mkdir(USER_DATA_DIR, { recursive: true });
        }
    } catch (error) {
        console.error('Error initializing storage:', error);
    }
}

initStorage();

// Helper functions for user management
async function getUsers() {
    try {
        const data = await fs.readFile(USERS_FILE, 'utf8');
        return JSON.parse(data);
    } catch {
        return {};
    }
}

async function saveUsers(users) {
    await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
}

async function getUserData(userId) {
    try {
        const filePath = path.join(USER_DATA_DIR, `${userId}.json`);
        const data = await fs.readFile(filePath, 'utf8');
        return JSON.parse(data);
    } catch {
        // Return default game data if file doesn't exist
        return {
            socialLevel: 1,
            totalRXP: 0,
            allies: [],
            interactions: [],
            quests: [],
            achievements: [],
            lastQuestGeneration: null,
            streak: {
                current: 0,
                lastInteractionDate: null,
                longest: 0,
                milestones: []
            },
            reminders: [],
            settings: {
                soundEnabled: true,
                notificationsEnabled: false,
                theme: 'dark'
            }
        };
    }
}

async function saveUserData(userId, data) {
    const filePath = path.join(USER_DATA_DIR, `${userId}.json`);
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
}

// Authentication middleware
function requireAuth(req, res, next) {
    if (req.session && req.session.userId) {
        return next();
    }
    res.status(401).json({ error: 'Authentication required' });
}

// Authentication endpoints
app.post('/api/auth/signup', async (req, res) => {
    try {
        const { username, password, email } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }
        
        if (username.length < 3) {
            return res.status(400).json({ error: 'Username must be at least 3 characters' });
        }
        
        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }
        
        const users = await getUsers();
        
        if (users[username]) {
            return res.status(400).json({ error: 'Username already exists' });
        }
        
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Save user
        users[username] = {
            username,
            password: hashedPassword,
            email: email || null,
            createdAt: new Date().toISOString()
        };
        
        await saveUsers(users);
        
        // Create session
        req.session.userId = username;
        
        res.json({ 
            success: true, 
            message: 'Account created successfully',
            user: { username }
        });
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ error: 'Server error during signup' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }
        
        const users = await getUsers();
        const user = users[username];
        
        if (!user) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }
        
        const isValidPassword = await bcrypt.compare(password, user.password);
        
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }
        
        // Create session
        req.session.userId = username;
        
        res.json({ 
            success: true, 
            message: 'Logged in successfully',
            user: { username }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Server error during login' });
    }
});

app.post('/api/auth/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ error: 'Error logging out' });
        }
        res.json({ success: true, message: 'Logged out successfully' });
    });
});

app.get('/api/auth/check', (req, res) => {
    if (req.session && req.session.userId) {
        res.json({ 
            authenticated: true, 
            user: { username: req.session.userId }
        });
    } else {
        res.json({ authenticated: false });
    }
});

// User data endpoints
app.get('/api/user/data', requireAuth, async (req, res) => {
    try {
        const userId = req.session.userId;
        const data = await getUserData(userId);
        res.json({ success: true, data });
    } catch (error) {
        console.error('Error fetching user data:', error);
        res.status(500).json({ error: 'Error fetching user data' });
    }
});

app.post('/api/user/data', requireAuth, async (req, res) => {
    try {
        const userId = req.session.userId;
        const data = req.body;
        await saveUserData(userId, data);
        res.json({ success: true, message: 'Data saved successfully' });
    } catch (error) {
        console.error('Error saving user data:', error);
        res.status(500).json({ error: 'Error saving user data' });
    }
});

// Serve static files - handle CSS, JS, and other assets
app.get(/\.(css|js|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/, (req, res, next) => {
    const filePath = path.join(__dirname, req.path);
    res.sendFile(filePath, (err) => {
        if (err) {
            console.error('Error serving static file:', req.path, err);
            res.status(404).send('File not found');
        }
    });
});

// Serve static files using express.static (fallback)
app.use(express.static(__dirname, {
    maxAge: '1d',
    etag: true
}));

// Health check endpoint (GET request for testing)
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        message: 'Backend API is running',
        timestamp: new Date().toISOString()
    });
});

// Proxy endpoint for analyzing interactions
app.post('/api/analyze-interaction', async (req, res) => {
    try {
        const { notes, type, duration, quality } = req.body;

        const prompt = `Analyze this social interaction and determine appropriate Relationship XP (RXP) points.
        
Interaction Details:
- Type: ${type}
- Duration: ${duration} hours
- Quality: ${quality}
- Notes: ${notes}

Based on the interaction quality, type, and duration, assign RXP points. 
Consider:
- Positive interactions: 20-100 RXP
- Neutral interactions: 10-40 RXP
- Negative interactions: -50 to -5 RXP (must be negative)
- Duration multiplier: longer interactions get more points
- Type matters: hangouts and events are worth more than texts

Return ONLY a JSON object with this exact format:
{"rxp": <number>, "reasoning": "<brief explanation>"}

Be strict but fair. Don't over-reward simple interactions.`;

        const response = await fetch(getGeminiAPIUrl(), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }],
                generationConfig: {
                    temperature: 0.7,
                    topK: 40,
                    topP: 0.95,
                    maxOutputTokens: 1024,
                }
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Gemini API Error:', errorText);
            throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();

        if (!data.candidates || !data.candidates[0]) {
            console.error('Invalid API response structure:', JSON.stringify(data, null, 2));
            throw new Error('Invalid API response: missing candidates');
        }

        const candidate = data.candidates[0];
        
        // Check if response was truncated due to token limit
        if (candidate.finishReason === 'MAX_TOKENS') {
            console.warn('Warning: Response was truncated due to MAX_TOKENS limit');
        }

        // Check if content exists
        if (!candidate.content) {
            console.error('Invalid API response: missing content');
            console.error('Finish reason:', candidate.finishReason);
            console.error('Response data:', JSON.stringify(data, null, 2));
            throw new Error(`Invalid API response: missing content (finishReason: ${candidate.finishReason})`);
        }

        const content = candidate.content;
        if (!content.parts || !Array.isArray(content.parts) || content.parts.length === 0) {
            console.error('Invalid API response: missing or empty parts array');
            console.error('Finish reason:', candidate.finishReason);
            console.error('Response data:', JSON.stringify(data, null, 2));
            
            // If MAX_TOKENS, we might be able to retry with a shorter prompt or different approach
            if (candidate.finishReason === 'MAX_TOKENS') {
                throw new Error('Response truncated: Please try again or simplify your request');
            }
            throw new Error('Invalid API response: missing parts in content');
        }

        const text = content.parts[0].text;
        
        if (!text || typeof text !== 'string') {
            console.error('Invalid API response: missing or invalid text in parts[0]');
            console.error('Parts:', JSON.stringify(content.parts, null, 2));
            throw new Error('Invalid API response: missing text in response');
        }

        // Extract JSON from response - try multiple methods
        let result = null;
        
        // Method 1: Try to parse entire text as JSON
        try {
            result = JSON.parse(text.trim());
        } catch (e) {
            // Method 2: Try to extract JSON object from text (handle multi-line)
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                try {
                    result = JSON.parse(jsonMatch[0]);
                } catch (parseError) {
                    console.error('JSON parse error:', parseError);
                    console.error('Response text:', text);
                    // Method 3: Try to fix common JSON issues
                    try {
                        // Remove markdown code blocks if present
                        let cleaned = jsonMatch[0].replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
                        result = JSON.parse(cleaned);
                    } catch (fixError) {
                        console.error('Failed to parse JSON after cleaning:', fixError);
                    }
                }
            }
        }
        
        if (result && typeof result.rxp === 'number') {
            res.json({ 
                success: true, 
                rxp: Math.round(result.rxp),
                reasoning: result.reasoning || 'Interaction analyzed'
            });
        } else {
            console.error('Invalid JSON response from API:', text);
            throw new Error('No valid JSON found in response. API may have returned unexpected format.');
        }
    } catch (error) {
        console.error('Error analyzing interaction:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Proxy endpoint for generating quests
app.post('/api/generate-quest', async (req, res) => {
    try {
        const { gameData } = req.body;

        // Validate gameData structure
        if (!gameData) {
            throw new Error('Missing gameData in request body');
        }

        // Safely access gameData properties with defaults
        const allies = gameData.allies || [];
        const totalRXP = gameData.totalRXP || 0;
        const interactions = gameData.interactions || [];

        const prompt = `Based on this social gaming data, suggest a personalized quest for the player.

Player Stats:
- Total Allies: ${allies.length}
- Total RXP: ${totalRXP}
- Recent Interactions: ${interactions.slice(-5).map(i => {
    const ally = allies.find(a => a.id === i.allyId);
    return `${ally?.name || 'Unknown'}: ${i.type || 'interaction'} (${i.quality || 'neutral'})`;
}).join(', ')}

Allies Info:
${allies.slice(0, 5).map(ally => {
    const hobbies = Array.isArray(ally.hobbies) ? ally.hobbies.join(', ') : 'None';
    return `${ally.name || 'Ally'}: Bond Level ${getBondLevel(ally.rxp || 0)}, Hobbies: ${hobbies}`;
}).join('\n')}

Generate a creative, personalized quest that would help the player improve their social life. 
It could be about:
- Reconnecting with someone
- Deepening a specific relationship
- Trying something new with an ally
- Supporting someone who might need it

Return ONLY a JSON object with this exact format:
{"title": "<quest title>", "description": "<detailed quest description>", "reward": <number between 50-300>}

Make it specific, actionable, and engaging.`;

        const response = await fetch(getGeminiAPIUrl(), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }],
                generationConfig: {
                    temperature: 0.8,
                    topK: 40,
                    topP: 0.95,
                    maxOutputTokens: 2048,
                }
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Gemini API Error:', errorText);
            throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();

        if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
            console.error('Invalid API response structure:', JSON.stringify(data, null, 2));
            throw new Error('Invalid API response: missing candidates or content');
        }

        const content = data.candidates[0].content;
        if (!content.parts || !Array.isArray(content.parts) || content.parts.length === 0) {
            console.error('Invalid API response: missing or empty parts array');
            console.error('Response data:', JSON.stringify(data, null, 2));
            throw new Error('Invalid API response: missing parts in content');
        }

        const text = content.parts[0].text;
        
        if (!text || typeof text !== 'string') {
            console.error('Invalid API response: missing or invalid text in parts[0]');
            console.error('Parts:', JSON.stringify(content.parts, null, 2));
            throw new Error('Invalid API response: missing text in response');
        }

        // Extract JSON from response - try multiple methods
        let result = null;
        
        // Method 1: Try to parse entire text as JSON
        try {
            result = JSON.parse(text.trim());
        } catch (e) {
            // Method 2: Try to extract JSON object from text (handle multi-line)
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                try {
                    result = JSON.parse(jsonMatch[0]);
                } catch (parseError) {
                    console.error('JSON parse error:', parseError);
                    console.error('Response text:', text);
                    // Method 3: Try to fix truncated JSON by attempting to repair it
                    try {
                        // Remove markdown code blocks if present
                        let cleaned = jsonMatch[0].replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
                        
                        // Try to repair truncated JSON
                        // If JSON is cut off, try to close it properly
                        if (cleaned.length > 0 && !cleaned.endsWith('}')) {
                            // Count open braces
                            const openBraces = (cleaned.match(/\{/g) || []).length;
                            const closeBraces = (cleaned.match(/\}/g) || []).length;
                            const missingBraces = openBraces - closeBraces;
                            
                            // Try to find the last complete field and close the JSON
                            // Look for last complete string value
                            const lastCompleteString = cleaned.match(/"[^"]*"\s*:\s*"[^"]*"/g);
                            if (lastCompleteString && missingBraces > 0) {
                                // Extract what we have and close it
                                const lastMatch = lastCompleteString[lastCompleteString.length - 1];
                                const lastIndex = cleaned.lastIndexOf(lastMatch) + lastMatch.length;
                                let repaired = cleaned.substring(0, lastIndex);
                                
                                // Close any open strings
                                if (repaired.match(/"\s*$/)) {
                                    repaired = repaired.replace(/"\s*$/, '"');
                                }
                                
                                // Close any open objects
                                for (let i = 0; i < missingBraces; i++) {
                                    repaired += '}';
                                }
                                
                                try {
                                    result = JSON.parse(repaired);
                                } catch (repairError) {
                                    // If repair failed, try with default values
                                    console.error('Failed to repair truncated JSON:', repairError);
                                }
                            }
                        } else {
                            result = JSON.parse(cleaned);
                        }
                    } catch (fixError) {
                        console.error('Failed to parse JSON after cleaning:', fixError);
                    }
                }
            }
        }
        
        // If result is still null or incomplete, try to extract partial data
        if (!result || !result.title || !result.description || typeof result.reward !== 'number') {
            // Try to extract any valid fields from truncated response
            // Handle both complete strings and truncated strings
            const titleMatch = text.match(/"title"\s*:\s*"([^"]*(?:"|$))/);
            let descMatch = text.match(/"description"\s*:\s*"([^"]*)"/);
            // If description string is incomplete (not closed), try to get what we have
            if (!descMatch) {
                const descStart = text.indexOf('"description"');
                if (descStart !== -1) {
                    const afterColon = text.indexOf(':', descStart) + 1;
                    const afterQuote = text.indexOf('"', afterColon) + 1;
                    if (afterQuote > afterColon) {
                        // Get the rest of the text (truncated description)
                        const remaining = text.substring(afterQuote);
                        // Take everything up to the next quote or end of string
                        const descEnd = remaining.search(/"/);
                        const descText = descEnd > 0 ? remaining.substring(0, descEnd) : remaining.replace(/[^"]*$/, '').trim();
                        if (descText.length > 0) {
                            descMatch = [null, descText];
                        }
                    }
                }
            }
            const rewardMatch = text.match(/"reward"\s*:\s*(\d+)/);
            
            if (titleMatch || descMatch || rewardMatch) {
                const title = titleMatch && titleMatch[1] ? titleMatch[1] : 'Social Quest';
                let description = 'Complete a social interaction to earn rewards.';
                if (descMatch && descMatch[1]) {
                    description = descMatch[1];
                    // If description seems incomplete, add note
                    if (description.length > 0 && !description.endsWith('.') && !description.endsWith('!') && !description.endsWith('?')) {
                        description += '...';
                    }
                    description += ' (response may have been truncated)';
                }
                
                result = {
                    title: title,
                    description: description,
                    reward: rewardMatch ? parseInt(rewardMatch[1]) : 100
                };
                console.warn('Using partial data from truncated response');
            }
        }
        
        if (result && result.title && result.description && typeof result.reward === 'number') {
            res.json({ 
                success: true, 
                quest: result 
            });
        } else {
            console.error('Invalid JSON response from API:', text);
            console.error('Parsed result:', result);
            throw new Error('No valid JSON found in response. API may have returned unexpected format.');
        }
    } catch (error) {
        console.error('Error generating quest:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Helper function for bond level calculation (simplified)
function getBondLevel(rxp) {
    const thresholds = {
        1: 0, 2: 50, 3: 150, 4: 300, 5: 500,
        6: 750, 7: 1100, 8: 1500, 9: 2000, 10: 2600
    };
    for (let level = 10; level >= 1; level--) {
        if (rxp >= thresholds[level]) return level;
    }
    return 1;
}

// Serve landing page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'landing.html'));
});

// Serve main app (protected)
app.get('/app', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Export for Vercel serverless functions
// Export app directly for @vercel/node compatibility
module.exports = app;

// Start server locally (for development)
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`🚀 Server running on http://localhost:${PORT}`);
        console.log(`📱 Open http://localhost:${PORT} in your browser`);
    });
}

