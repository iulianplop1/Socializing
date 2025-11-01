# Deployment Guide for SocialQuest

## Quick Start: Deploy to Vercel (Recommended)

Since this app uses authentication and requires a backend server, **Vercel is the best deployment option**. Vercel can run both your backend API and serve your frontend files.

### Step 1: Deploy to Vercel

1. **Sign up/Login to Vercel**:
   - Go to [vercel.com](https://vercel.com)
   - Sign up/login with your GitHub account

2. **Import Your Repository**:
   - Click "Add New Project"
   - Import your GitHub repository
   - Vercel will auto-detect the settings (it will see `vercel.json`)

3. **Add Environment Variables** (in Vercel dashboard):
   - Go to your project → Settings → Environment Variables
   - Add these variables:
     - **Name**: `GEMINI_API_KEY`
       **Value**: `AIzaSyDRkO31dq3n5R5KUFVbLgEXQF9yXrx455c` (or your own API key)
     - **Name**: `SESSION_SECRET`
       **Value**: Any random string (e.g., `my-super-secret-key-12345`)

4. **Deploy**:
   - Click "Deploy"
   - Wait for deployment to complete (usually 1-2 minutes)

5. **Access Your App**:
   - Vercel will give you a URL like: `https://your-project-name.vercel.app`
   - Your app will be live! 🎉

### Step 2: Update Settings (Optional)

- **Custom Domain**: You can add a custom domain in Vercel settings
- **Auto-Deploy**: Vercel automatically deploys when you push to GitHub

## Alternative: GitHub Pages + Vercel Backend

If you prefer GitHub Pages for the frontend:

1. **Deploy Backend to Vercel** (follow Step 1 above, but only deploy the backend)
2. **Get your Vercel backend URL** (e.g., `https://your-backend.vercel.app`)
3. **Update `app.js`** to point to your Vercel backend:
   ```javascript
   const API_BASE_URL = 'https://your-backend.vercel.app';
   ```
4. **Deploy frontend to GitHub Pages**:
   - Go to your GitHub repo → Settings → Pages
   - Select source branch (usually `main`)
   - Your site will be at `https://your-username.github.io/repo-name`

**Note**: This approach is more complex and sessions may not work properly across different domains.

## Important Notes

### Session Storage on Vercel

Vercel uses serverless functions, which means sessions stored in memory won't persist between invocations. For production, consider:

1. **Using a session store** (like Redis or a database)
2. **Or using JWT tokens** stored in cookies/localStorage

For now, sessions will work within the same browser session, but will expire when the serverless function restarts.

### File Storage

The `users.json` and `user_data/` files are stored in the filesystem. On Vercel:
- These files are **ephemeral** (reset on each deployment)
- For production, use a database like:
  - **Vercel Postgres** (recommended)
  - **MongoDB Atlas** (free tier)
  - **Supabase** (free tier)

### Current Limitations

- User data is stored in files (not persistent on Vercel serverless)
- Sessions work within a session but may expire

### Recommended Next Steps

For a production-ready app, consider:
1. Using Vercel Postgres or another database for user data
2. Using a session store (Redis) or JWT tokens
3. Setting up proper CORS for cross-domain deployments

## Troubleshooting

### "404 Not Found" on GitHub Pages
- GitHub Pages can't run Node.js servers
- Use Vercel instead (see Step 1 above)

### Sessions Not Working
- Sessions may not persist on Vercel serverless
- Consider using a database or JWT tokens

### Environment Variables Not Working
- Make sure you've added them in Vercel dashboard
- Redeploy after adding variables

## Local Development

To run locally:
```bash
npm install
npm start
```

Then visit `http://localhost:3000`
