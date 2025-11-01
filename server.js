const express = require('express');
const cors = require('cors');
const path = require('path');

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

