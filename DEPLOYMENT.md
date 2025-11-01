# Deployment Guide for SocialQuest

## Problem
GitHub Pages only serves static files (HTML, CSS, JS) and cannot run Node.js servers. Your AI features need a backend server to work.

## Solution: Deploy Backend to Vercel (Free)

### Step 1: Deploy Backend to Vercel

1. **Install Vercel CLI** (optional, or use Vercel website):
   ```bash
   npm install -g vercel
   ```

2. **Deploy to Vercel**:
   ```bash
   vercel
   ```
   Or visit [vercel.com](https://vercel.com) and:
   - Sign up/login with GitHub
   - Import your repository
   - Add environment variable: `GEMINI_API_KEY` = your API key
   - Deploy

3. **Get your backend URL**:
   - After deployment, Vercel will give you a URL like: `https://your-project-name.vercel.app`
   - Copy this URL

### Step 2: Update Frontend Code

1. **Edit `app.js`** and replace this line:
   ```javascript
   const API_BASE_URL = isProduction 
       ? 'https://your-backend-url.vercel.app' // Replace with your actual backend URL
       : window.location.origin;
   ```
   
   Replace `'https://your-backend-url.vercel.app'` with your actual Vercel URL

2. **Commit and push** to GitHub:
   ```bash
   git add app.js
   git commit -m "Update backend URL for deployment"
   git push
   ```

### Step 3: Alternative - Direct API Calls (Less Secure)

If you want to skip backend deployment, you can call Gemini API directly from the frontend (API key will be visible in code):

1. See `app-direct-api.js` for implementation
2. **Warning**: This exposes your API key publicly. Only use for demos/testing.

## Environment Variables

For Vercel deployment, add this environment variable:
- **Name**: `GEMINI_API_KEY`
- **Value**: Your Gemini API key

## Testing

1. **Local**: Run `npm start` and visit `http://localhost:3000`
2. **Production**: Visit your GitHub Pages URL - AI features should work!

## Notes

- Your API key is now stored securely in Vercel environment variables
- The backend will automatically redeploy when you push to GitHub
- Frontend (GitHub Pages) and backend (Vercel) are now separate but working together

