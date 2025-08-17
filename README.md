# Cybersuite_backend
Cybersuite - all in one security toolkit

## Deployment Guide for Vercel

### Backend Deployment

1. **Prepare your backend for Vercel deployment**
   - A `vercel.json` file has been added to the root of your project
   - This configuration tells Vercel how to build and serve your Express.js application

2. **Set up environment variables in Vercel**
   - Go to your project settings in Vercel dashboard
   - Add the following environment variables:
     - `OTX_API_KEY` (if you're using AlienVault OTX)
     - `GOOGLE_SAFE_BROWSING_API_KEY` (if you're using Google Safe Browsing)
     - `FRONTEND_URL` (the URL of your deployed frontend)

3. **Deploy the backend**
   - Connect your GitHub repository to Vercel
   - Select the backend repository and deploy
   - Note the deployment URL (e.g., `https://your-backend.vercel.app`)

### Frontend Deployment

1. **Update API base URL**
   - In your frontend project, set the environment variable `VITE_API_BASE_URL` to your backend URL
   - For local development, this can be in a `.env` file
   - For production, add this as an environment variable in Vercel

2. **Deploy the frontend**
   - Connect your frontend repository to Vercel
   - Vercel will automatically detect Vite and use the correct build settings

### Troubleshooting 404 Errors

If you're experiencing 404 errors after deployment:

1. **Check vercel.json configuration**
   - Ensure the `vercel.json` file is in the root directory
   - Verify it has the correct configuration for routing all requests to your server.js

2. **CORS configuration**
   - Make sure your backend's CORS settings include your frontend's URL
   - The CORS configuration has been updated to use the `FRONTEND_URL` environment variable

3. **Environment variables**
   - Verify all required environment variables are set in Vercel
   - Check that the frontend is using the correct backend URL

4. **Deployment logs**
   - Check Vercel deployment logs for any errors
   - Look for issues with build or runtime errors
