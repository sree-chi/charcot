# TherapyLens Deployment Guide

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Local Development](#local-development)
3. [Production Deployment](#production-deployment)
4. [Security Considerations](#security-considerations)
5. [Environment Variables](#environment-variables)
6. [Monitoring & Logging](#monitoring--logging)

## Prerequisites

### Required
- Node.js 16+ or modern web browser
- HTTPS-enabled hosting (required for webcam access)
- Anthropic API key (for Claude integration)

### Recommended
- CDN for static assets
- Error tracking service (Sentry, LogRocket)
- Analytics (privacy-respecting only)
- Backup solution for exported reports

## Local Development

### Quick Start (No Build)

```bash
# Simply open index.html in a browser
open index.html  # macOS
start index.html # Windows
xdg-open index.html # Linux
```

**Note:** Some browsers require a local server even for file:// protocol. Use:

```bash
# Python 3
python -m http.server 8000

# Node.js
npx serve .

# PHP
php -S localhost:8000
```

### Development with Build Tools

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Access at http://localhost:3000
```

## Production Deployment

### Option 1: Static Hosting (Recommended)

Perfect for: Netlify, Vercel, GitHub Pages, AWS S3 + CloudFront

```bash
# Build production bundle
npm run build

# Deploy the 'dist' folder to your hosting service
```

#### Netlify Deployment

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Deploy
netlify deploy --prod --dir=dist
```

**netlify.toml:**
```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
    Permissions-Policy = "camera=*, microphone=()"
```

#### Vercel Deployment

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod
```

**vercel.json:**
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "Permissions-Policy",
          "value": "camera=*, microphone=()"
        }
      ]
    }
  ]
}
```

### Option 2: Docker Deployment

**Dockerfile:**
```dockerfile
FROM node:18-alpine as build

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 443
CMD ["nginx", "-g", "daemon off;"]
```

**nginx.conf:**
```nginx
server {
    listen 80;
    server_name therapylens.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name therapylens.yourdomain.com;

    ssl_certificate /etc/ssl/certs/therapylens.crt;
    ssl_certificate_key /etc/ssl/private/therapylens.key;
    
    # Security headers
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "camera=*, microphone=()" always;
    
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

**Deploy with Docker:**
```bash
# Build image
docker build -t therapylens:latest .

# Run container
docker run -d -p 443:443 --name therapylens therapylens:latest
```

### Option 3: Cloud Platform Deployment

#### AWS S3 + CloudFront

```bash
# Build
npm run build

# Upload to S3
aws s3 sync dist/ s3://therapylens-app --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id YOUR_DISTRIBUTION_ID \
  --paths "/*"
```

#### Google Cloud Platform

```bash
# Build
npm run build

# Deploy to Firebase Hosting
firebase deploy --only hosting
```

**firebase.json:**
```json
{
  "hosting": {
    "public": "dist",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ],
    "headers": [
      {
        "source": "**",
        "headers": [
          {
            "key": "X-Frame-Options",
            "value": "DENY"
          },
          {
            "key": "X-Content-Type-Options",
            "value": "nosniff"
          }
        ]
      }
    ]
  }
}
```

## Security Considerations

### HTTPS is MANDATORY

Webcam access requires HTTPS in production. Options:

1. **Let's Encrypt** (Free)
```bash
# Using Certbot
sudo certbot --nginx -d therapylens.yourdomain.com
```

2. **Cloudflare** (Free with flexible SSL)
3. **AWS Certificate Manager** (Free with AWS services)
4. **Platform SSL** (Netlify/Vercel provide free SSL)

### Content Security Policy

Add to your hosting configuration:

```
Content-Security-Policy: 
  default-src 'self'; 
  script-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com https://unpkg.com; 
  style-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com; 
  img-src 'self' data: blob:; 
  media-src blob:; 
  connect-src 'self' https://api.anthropic.com; 
  camera 'self'
```

### API Key Management

**NEVER commit API keys to version control.**

#### Option 1: Environment Variables (Recommended)

```javascript
// Create .env file (add to .gitignore)
VITE_ANTHROPIC_API_KEY=your_api_key_here

// Access in code
const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
```

#### Option 2: Backend Proxy (Most Secure)

```javascript
// Instead of calling Claude API directly, call your backend
const response = await fetch('/api/analyze', {
  method: 'POST',
  body: JSON.stringify({ metrics: behavioralData })
});
```

**Simple Node.js proxy:**
```javascript
// server.js
const express = require('express');
const app = express();

app.post('/api/analyze', async (req, res) => {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: req.body.messages
    })
  });
  
  const data = await response.json();
  res.json(data);
});

app.listen(3001);
```

## Environment Variables

Create `.env` file (don't commit this):

```bash
# Anthropic API
VITE_ANTHROPIC_API_KEY=sk-ant-xxxxx

# Optional: Analytics
VITE_ANALYTICS_ID=UA-XXXXXXX

# Optional: Error Tracking
VITE_SENTRY_DSN=https://xxxxx@sentry.io/xxxxx

# Environment
VITE_ENVIRONMENT=production
```

Create `.env.example` (commit this):

```bash
# Anthropic API Key - Get from https://console.anthropic.com
VITE_ANTHROPIC_API_KEY=your_api_key_here

# Optional: Analytics ID
VITE_ANALYTICS_ID=

# Optional: Error Tracking DSN
VITE_SENTRY_DSN=

# Environment (development/staging/production)
VITE_ENVIRONMENT=development
```

## Monitoring & Logging

### Error Tracking with Sentry

```bash
npm install @sentry/react
```

```javascript
// Add to TherapyLens.jsx
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.VITE_ENVIRONMENT,
  tracesSampleRate: 1.0,
});
```

### Privacy-Respecting Analytics

**Plausible Analytics (Recommended):**

```html


```

### Health Checks

```javascript
// Add health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});
```

## Performance Optimization

### 1. Code Splitting

```javascript
// Lazy load components
const SessionReport = React.lazy(() => import('./components/SessionReport'));

// Use with Suspense
}>
  

```

### 2. CDN for Assets

```javascript
// vite.config.js
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        assetFileNames: 'assets/[name].[hash][extname]'
      }
    }
  }
});
```

### 3. Compression

Enable gzip/brotli in your hosting:

**Nginx:**
```nginx
gzip on;
gzip_types text/plain text/css application/json application/javascript;
gzip_min_length 1000;
```

## Backup & Recovery

### Export Functionality

The app includes a built-in export feature. To automate backups:

```javascript
// Auto-export on session end
const endSession = async () => {
  // ... existing code ...
  
  // Auto-save to secure storage
  if (import.meta.env.VITE_AUTO_BACKUP === 'true') {
    await saveToSecureStorage(sessionReport);
  }
};
```

### Database Integration (Optional)

For multi-session storage:

```javascript
// Using IndexedDB for local storage
import { openDB } from 'idb';

const db = await openDB('therapylens', 1, {
  upgrade(db) {
    db.createObjectStore('sessions', { keyPath: 'id' });
  }
});

// Save session
await db.add('sessions', sessionData);

// Retrieve sessions
const sessions = await db.getAll('sessions');
```

## Compliance Checklist

Before deploying to production:

- [ ] HTTPS enabled
- [ ] Patient consent implemented
- [ ] Privacy policy displayed
- [ ] Data deletion functionality working
- [ ] No session recording/storage
- [ ] API keys secured
- [ ] Error tracking configured
- [ ] Security headers set
- [ ] Backup strategy in place
- [ ] Incident response plan documented
- [ ] Staff training completed
- [ ] Legal review completed
- [ ] HIPAA compliance verified (if applicable)

## Troubleshooting

### Webcam Not Working in Production

1. Verify HTTPS is enabled
2. Check browser permissions
3. Test with different browsers
4. Review CSP headers

### API Calls Failing

1. Check API key is set correctly
2. Verify network connectivity
3. Check CORS settings if using proxy
4. Monitor rate limits

### Build Errors

```bash
# Clear cache and rebuild
rm -rf node_modules package-lock.json
npm install
npm run build
```

## Support

For deployment issues:
- Check the README.md
- Review error logs
- Contact support team

## License

See LICENSE file for deployment terms and conditions.
