# Quick Deploy to Vercel

## Why Vercel Instead of GitHub Pages?

- GitHub Pages = **Static files only** (no server)
- Your app needs = **Node.js server** for authentication and API

**Solution**: Deploy everything to Vercel (it can run your server AND serve your frontend)

## Deploy in 5 Minutes

### 1. Go to Vercel
- Visit: https://vercel.com
- Click "Sign Up" (use your GitHub account)

### 2. Import Your Project
- Click "Add New Project"
- Find your GitHub repository
- Click "Import"

### 3. Add Environment Variables
In the "Environment Variables" section, add:

**Variable 1:**
- Name: `GEMINI_API_KEY`
- Value: `AIzaSyDRkO31dq3n5R5KUFVbLgEXQF9yXrx455c`

**Variable 2:**
- Name: `SESSION_SECRET`
- Value: `your-random-secret-key-12345` (make this a random string)

### 4. Deploy!
- Click "Deploy"
- Wait 1-2 minutes
- Done! 🎉

### 5. Access Your App
- Vercel will give you a URL like: `https://your-project.vercel.app`
- Visit that URL - your app is live!

## What Happens Next?

- Every time you push to GitHub, Vercel auto-deploys
- Your app is live at your Vercel URL
- Authentication works
- All features work

## Troubleshooting

**"Build Failed"**: 
- Make sure you added the environment variables
- Check that `package.json` has all dependencies

**"404 Error"**:
- Wait a few minutes for deployment to complete
- Check the Vercel deployment logs

**"Sessions not working"**:
- This is normal - sessions are ephemeral on serverless
- Users need to log in per session
- For production, consider using a database (see DEPLOYMENT.md)

