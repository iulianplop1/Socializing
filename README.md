# SocialQuest - Gamify Your Social Life 🎮

A personalized web application that gamifies your social interactions, turning friendships into an engaging RPG-style experience.

## Features

- **Allies System**: Log people you know as "Allies" with detailed character sheets and pictures
- **RXP System**: Earn Relationship XP (RXP) from every interaction
- **Bond Levels**: Level up your friendships from Level 1 to Level 10
- **Quest System**: Daily, weekly, and AI-generated quests
- **Achievements**: Unlock achievements as you progress
- **AI-Powered**: Uses Google Gemini AI for smart interaction analysis and quest generation

## Setup Instructions

### Prerequisites

- Node.js installed on your computer ([Download here](https://nodejs.org/))
- A Google Gemini API key (already included in the code)

### Installation

1. **Install Dependencies**

   Open a terminal in the project folder and run:
   ```bash
   npm install
   ```

2. **Start the Server**

   ```bash
   npm start
   ```

   You should see:
   ```
   🚀 Server running on http://localhost:3000
   📱 Open http://localhost:3000 in your browser
   ```

3. **Open in Browser**

   Navigate to `http://localhost:3000` in your web browser.

## How It Works

The application consists of:

- **Frontend**: HTML, CSS, and JavaScript files served by the Express server
- **Backend**: Node.js/Express server that acts as a proxy for the Gemini API (solves CORS issues)
- **Data Storage**: All data is stored locally in your browser using localStorage

## API Endpoints

The backend provides two API endpoints:

- `POST /api/analyze-interaction` - Analyzes interactions and assigns RXP
- `POST /api/generate-quest` - Generates personalized AI quests

## Troubleshooting

### Server Won't Start

- Make sure Node.js is installed: `node --version`
- Make sure you're in the project directory
- Try deleting `node_modules` folder and running `npm install` again

### AI Features Not Working

- Make sure the server is running (`npm start`)
- Check the browser console for error messages
- Verify you're accessing the site at `http://localhost:3000` (not opening index.html directly)

### Port Already in Use

If port 3000 is already in use, you can change it by setting the PORT environment variable:
```bash
PORT=3001 npm start
```

## Project Structure

```
Socializing/
├── index.html      # Main HTML file
├── styles.css       # Styling
├── app.js          # Frontend JavaScript
├── server.js        # Backend server
├── package.json     # Dependencies
└── README.md        # This file
```

## Features Guide

### Logging an Ally
1. Click "+ Log New Ally"
2. Fill in name (required)
3. Optionally add age, hobbies, likes, dislikes, and a picture
4. Click "Save Ally"

### Logging Interactions
1. Go to "Interactions" tab
2. Select an ally
3. Choose interaction type and describe what happened
4. Select quality (Positive, Neutral, or Negative)
5. The AI will analyze and assign RXP automatically

### Completing Quests
1. Go to "Quests" tab
2. View active quests
3. Click "🤖 Generate AI Quest" for personalized quests
4. Complete quests manually or they auto-complete when conditions are met

Enjoy gamifying your social life! 🎉

