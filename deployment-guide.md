# Deployment Guide

This repository includes two deployment workflows:

1. **Production Deployment** - Deploys to GitHub Pages on merge to `main`
2. **Staging Deployment** - Deploys PRs to staging environments for testing

## 🚀 Production Deployment

### Configuration
- **Workflow:** `.github/workflows/deploy_to_pages.yml`
- **Trigger:** Push to `main` branch
- **Target:** GitHub Pages
- **URL:** `https://[username].github.io/ParticleCurlShader/`

### Setup
1. Enable GitHub Pages in repository settings
2. Set Pages source to "GitHub Actions"
3. No additional secrets required

---

## 🧪 Staging Deployment Options

### Option 1: GitHub Pages Staging (Recommended)

**Workflow:** `.github/workflows/deploy_staging.yml`

#### Features:
- ✅ No external dependencies
- ✅ Free GitHub hosting
- ✅ Automatic PR comments with staging links
- ✅ Performance testing checklist
- ✅ Multiple PR environments in subdirectories

#### Setup:
1. Workflow is ready to use immediately
2. No secrets required
3. Each PR gets deployed to: `https://[username].github.io/ParticleCurlShader-staging/pr-[NUMBER]/`

#### URL Structure:
```
Production:  https://[username].github.io/ParticleCurlShader/
Staging:     https://[username].github.io/ParticleCurlShader-staging/pr-123/
Index:       https://[username].github.io/ParticleCurlShader-staging/
```

### Option 2: Vercel Staging (Advanced)

**Workflow:** `.github/workflows/deploy_vercel_staging.yml`

#### Features:
- ✅ Superior performance and CDN
- ✅ Custom domain support
- ✅ Better development experience
- ✅ Advanced analytics
- ❌ Requires Vercel account and configuration

#### Setup:
1. Create a Vercel account and project
2. Add repository secrets in GitHub:
   ```
   VERCEL_TOKEN=your-vercel-token
   VERCEL_ORG_ID=your-org-id
   VERCEL_PROJECT_ID=your-project-id
   ```
3. Each PR gets deployed to: `https://pr-[NUMBER]-particle-curl-shader.vercel.app`

#### Getting Vercel Secrets:
1. **VERCEL_TOKEN:**
   - Go to [Vercel Settings > Tokens](https://vercel.com/account/tokens)
   - Create new token with appropriate scope

2. **VERCEL_ORG_ID & VERCEL_PROJECT_ID:**
   - Create project in Vercel dashboard
   - Find IDs in project settings or `.vercel/project.json`

---

## 📝 PR Staging Comments

Both staging workflows automatically comment on PRs with:

### 🚀 Staging Deployment Ready!

**Preview Links:**
- 🌐 Live Preview
- 📊 Performance Monitor (`?showFPS=true`)
- 🎛️ Debug Controls (`?debugMode=true`)

**Testing Checklist:**
- [ ] Visual quality maintained
- [ ] Performance improvements verified
- [ ] Mobile compatibility tested
- [ ] Controls functionality confirmed
- [ ] No console errors

**Performance Testing:**
1. Desktop: Target 60+ FPS
2. Mobile: Target 30+ FPS with adaptive quality
3. Monitor automatic quality adjustments

---

## 🔧 Environment Variables

### Build-time Variables:
```bash
VITE_APP_ENV=staging          # Environment identifier
VITE_PR_NUMBER=123           # PR number for staging URLs
PUBLIC_URL=/custom-path/     # Custom base URL override
```

### Runtime Variables (Available in app):
```javascript
__APP_ENV__        // 'production' | 'staging'
__PR_NUMBER__      // PR number string
__BUILD_TIME__     // ISO timestamp of build
```

### URL Parameters for Testing:
```
?showFPS=true      # Show performance overlay
?debugMode=true    # Enable debug controls
?mobile=true       # Force mobile optimizations
```

---

## 🎯 Deployment Comparison

| Feature | Production | GitHub Staging | Vercel Staging |
|---------|------------|----------------|----------------|
| **Cost** | Free | Free | Free (with limits) |
| **Setup** | Simple | Simple | Moderate |
| **Performance** | Good | Good | Excellent |
| **Custom Domains** | Limited | No | Yes |
| **Analytics** | Basic | None | Advanced |
| **CDN** | GitHub | GitHub | Vercel Edge |
| **Build Speed** | ~3-5min | ~3-5min | ~2-3min |
| **Rollbacks** | Manual | Manual | Automatic |

---

## 🚀 Quick Start

### For GitHub Pages Staging (Recommended):
1. The workflow is already configured and ready to use
2. Create a pull request
3. Wait 3-5 minutes for deployment
4. Check the PR comment for staging links

### For Vercel Staging:
1. Set up Vercel account and project
2. Add the three required secrets to repository
3. Enable the Vercel workflow (disable GitHub staging if desired)
4. Create a pull request

---

## 🔍 Troubleshooting

### Common Issues:

**Build Failures:**
- Check Node.js version (should be 20+)
- Verify all dependencies are installed
- Review build logs in Actions tab

**Missing Staging Comments:**
- Ensure workflow has `pull-requests: write` permission
- Check if bot comments are blocked in repository settings

**Performance Issues:**
- Enable source maps in staging for debugging
- Use performance monitor URL parameter
- Check browser console for WebGL errors

**Vercel Deployment Issues:**
- Verify all three secrets are correctly set
- Check Vercel project exists and is linked
- Ensure Vercel token has appropriate permissions

### Debug Steps:
1. Check GitHub Actions logs
2. Verify environment variables in build logs
3. Test staging URL manually
4. Check browser developer tools
5. Review performance monitor output

---

## 📊 Performance Monitoring

### Automated Checks:
- Real-time FPS monitoring
- Memory usage tracking
- Device capability detection
- Automatic quality adjustment
- Performance summaries in console

### Manual Testing:
1. Open staging URL with `?showFPS=true`
2. Test on multiple devices/browsers
3. Verify adaptive quality kicks in on low-end devices
4. Check mouse interactions and color changes
5. Monitor for memory leaks over time

---

## 🎉 Success Metrics

**Deployment Health:**
- ✅ Build completes in <5 minutes
- ✅ Staging URL accessible within 2 minutes
- ✅ PR comments posted automatically
- ✅ Performance monitor shows 2x+ FPS improvement

**Performance Targets:**
- **Desktop:** 60+ FPS → 90-120 FPS
- **Mobile:** 15+ FPS → 30-45 FPS
- **Bundle Size:** <1.5MB gzipped
- **Load Time:** <3 seconds on 3G

**Quality Assurance:**
- ✅ Visual parity with production
- ✅ All interactive features functional
- ✅ Responsive design works on all devices
- ✅ No console errors or warnings