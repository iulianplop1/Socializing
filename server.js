const express = require('express');
const cors = require('cors');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

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

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Increase limit for base64 images
app.use(express.urlencoded({ extended: true, limit: '10mb' })); // For form data
app.use(express.static('.')); // Serve static files from current directory

// Supabase configuration (server-side)
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://zlrdcfeowhlteklnllxc.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY; // support both var names
let supabase = null;
if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

function getDefaultGameData() {
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

// Helpers for fetching clientId from request
function getClientIdFromRequest(req) {
    return (req.query.clientId || req.headers['x-client-id'] || (req.body && req.body.clientId) || '').toString();
}

// API: Load user data from Supabase (Option A - keep current frontend)
app.get('/api/user/data', async (req, res) => {
    try {
        if (!supabase) {
            return res.status(500).json({ success: false, error: 'Supabase is not configured on the server' });
        }
        const clientId = getClientIdFromRequest(req);
        if (!clientId) {
            return res.status(400).json({ success: false, error: 'Missing clientId' });
        }

        const { data, error } = await supabase
            .from('user_data')
            .select('data')
            .eq('client_id', clientId)
            .maybeSingle();

        if (error) {
            console.error('Supabase select error:', error);
            return res.status(500).json({ success: false, error: 'Database error' });
        }

        const payload = data && data.data ? data.data : getDefaultGameData();
        return res.json({ success: true, data: payload });
    } catch (e) {
        console.error('GET /api/user/data failed:', e);
        return res.status(500).json({ success: false, error: 'Server error' });
    }
});

// API: Save user data to Supabase
app.post('/api/user/data', async (req, res) => {
    try {
        if (!supabase) {
            return res.status(500).json({ success: false, error: 'Supabase is not configured on the server' });
        }
        const clientId = getClientIdFromRequest(req);
        const payload = req.body && (req.body.data || req.body);

        if (!clientId) {
            return res.status(400).json({ success: false, error: 'Missing clientId' });
        }
        if (!payload || typeof payload !== 'object') {
            return res.status(400).json({ success: false, error: 'Missing or invalid data payload' });
        }

        const { error } = await supabase
            .from('user_data')
            .upsert({ client_id: clientId, data: payload, updated_at: new Date().toISOString() }, { onConflict: 'client_id' });

        if (error) {
            console.error('Supabase upsert error:', error);
            return res.status(500).json({ success: false, error: 'Database error' });
        }

        return res.json({ success: true, message: 'Data saved successfully' });
    } catch (e) {
        console.error('POST /api/user/data failed:', e);
        return res.status(500).json({ success: false, error: 'Server error' });
    }
});

// API: Upload ally image to Supabase Storage and return a public URL
app.post('/api/upload-image', async (req, res) => {
    try {
        if (!supabase) {
            return res.status(500).json({ success: false, error: 'Supabase is not configured on the server' });
        }
        const clientId = getClientIdFromRequest(req);
        const { imageData, allyId } = req.body || {};

        if (!clientId) return res.status(400).json({ success: false, error: 'Missing clientId' });
        if (!imageData || typeof imageData !== 'string' || !imageData.startsWith('data:image')) {
            return res.status(400).json({ success: false, error: 'Missing or invalid imageData' });
        }

        // Extract mime/type and base64
        const match = imageData.match(/^data:(image\/(?:png|jpeg|jpg|webp));base64,(.*)$/);
        if (!match) return res.status(400).json({ success: false, error: 'Unsupported image format' });
        const mime = match[1];
        const base64 = match[2];
        const buffer = Buffer.from(base64, 'base64');

        // Choose extension by mime
        const ext = mime.includes('png') ? 'png' : mime.includes('webp') ? 'webp' : 'jpg';
        const filename = `${clientId}/${allyId || 'ally'}_${Date.now()}.${ext}`;

        // Ensure bucket exists manually in Supabase console: 'ally-images' (public)
        const { error: uploadError } = await supabase
            .storage
            .from('ally-images')
            .upload(filename, buffer, {
                contentType: mime,
                upsert: true
            });
        if (uploadError) {
            console.error('Supabase storage upload error:', uploadError);
            return res.status(500).json({ success: false, error: 'Storage upload failed' });
        }

        const { data: publicUrlData } = supabase
            .storage
            .from('ally-images')
            .getPublicUrl(filename);
        const publicUrl = publicUrlData?.publicUrl;

        return res.json({ success: true, url: publicUrl });
    } catch (e) {
        console.error('POST /api/upload-image failed:', e);
        return res.status(500).json({ success: false, error: 'Server error' });
    }
});

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

// Serve index.html for root route
app.get('/', (req, res) => {
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

