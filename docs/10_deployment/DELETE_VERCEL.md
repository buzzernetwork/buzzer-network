# Delete Vercel Frontend Project

## Current Vercel Project
- **Project Name**: `frontend`
- **Project ID**: `prj_07SiwT9GjK0KsBQTCxGkRibmDiwX`
- **Production URL**: https://frontend-g7x80zfm3-buzzs-projects-2d2107e3.vercel.app

## Steps to Delete

### Option 1: Via Web Dashboard (Recommended)

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Find the project: **frontend**
3. Click on the project
4. Go to **Settings** (gear icon in top right)
5. Scroll down to **"Danger Zone"** section
6. Click **"Delete Project"**
7. Type the project name to confirm: `frontend`
8. Click **"Delete"**

### Option 2: Direct Link
Go to: https://vercel.com/buzzs-projects-2d2107e3/frontend/settings

Then follow steps 4-8 above.

## After Deletion

The local `.vercel` folder has been removed from `packages/frontend/`.

If you want to deploy again later, you can:
```bash
cd packages/frontend
vercel login
vercel --prod
```

