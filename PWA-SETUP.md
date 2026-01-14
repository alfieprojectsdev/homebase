# PWA Setup

## Installation

The PWA boilerplate has been added to Homebase with the following components:

### 1. Icons

Dummy icons have been generated in `public/icons/`:
- icon-72x72.png
- icon-96x96.png
- icon-128x128.png
- icon-144x144.png
- icon-152x152.png
- icon-192x192.png
- icon-384x384.png
- icon-512x512.png

These are minimal placeholder icons (blue background with "H" text). Replace them with proper branded icons before production.

### 2. Manifest

`public/manifest.json` - PWA manifest with:
- App name and description
- Icon references
- Display mode: standalone
- Theme color: #2563eb (blue-600)
- Start URL: /

### 3. Service Worker

`public/sw.js` - Basic service worker with:
- Cache name: homebase-v1
- Caches root, manifest, and key icons
- Network-first fallback for uncached resources

### 4. Service Worker Registration

`src/components/ServiceWorkerRegistration.tsx` - Client component that:
- Detects service worker support
- Registers sw.js on page load
- Logs registration status

### 5. Root Layout Updates

`src/app/layout.tsx` - Added:
- PWA metadata
- Manifest link
- Viewport settings
- Apple touch icon
- ServiceWorkerRegistration component

### 6. Next.js Configuration

`next.config.mjs` - Added:
- Output: standalone (required for PWA)
- Generate etags: false (better caching)

## Testing PWA Installation

### 1. Build the Application

```bash
npm run build
npm run start
```

### 2. Open in Browser

Open http://localhost:3000 in Chrome, Edge, or Safari.

### 3. Install as PWA

**Chrome/Edge (Desktop):**
- Click the install icon in the address bar (⊕)
- Or: Three dots menu → "Install Homebase"

**Chrome/Edge (Mobile):**
- Tap menu (three dots)
- Select "Install app" or "Add to Home screen"

**Safari (iOS):**
- Tap Share button
- Select "Add to Home Screen"

### 4. Verify Installation

After installation:
- App opens in standalone mode (no browser address bar)
- Works offline (basic assets cached)
- Shows as "Homebase" on home screen

## Replacing Icons

### Method 1: Use Online Tool

1. Create a 512x512 PNG icon with your branding
2. Use https://www.pwabuilder.com/imageGenerator to generate all sizes
3. Replace files in `public/icons/`

### Method 2: Use ImageMagick

```bash
cd scripts
./generate-icons.sh
```

This uses the configured colors (blue-600 background, white text).

### Method 3: Manual

Create PNG files at these resolutions and place in `public/icons/`:
- 72x72
- 96x96
- 128x128
- 144x144
- 152x152
- 192x192
- 384x384
- 512x512

## Customizing PWA Settings

### App Name and Description

Edit `public/manifest.json`:
```json
{
  "name": "Your App Name",
  "short_name": "Short Name",
  "description": "Your description"
}
```

### Theme Color

Edit `public/manifest.json` and `src/app/layout.tsx`:
```json
"theme_color": "#2563eb"
```

### Display Mode

Options in `public/manifest.json`:
- `standalone` - Full screen, no browser UI (recommended)
- `minimal-ui` - Minimal browser UI
- `browser` - Normal browser tab

## Service Worker Advanced Usage

The current service worker is minimal. For Phase 4 (Offline PWA), expand with:
- Background sync for API requests
- Cache-first strategy for static assets
- Offline fallback pages
- Push notification handlers

## Troubleshooting

### PWA Install Button Not Showing

1. Ensure serving over HTTPS (or localhost for testing)
2. Check browser console for service worker errors
3. Verify manifest.json is accessible at `/manifest.json`
4. Try in Incognito mode to rule out extension conflicts

### Icons Not Loading

1. Check file paths in `public/manifest.json`
2. Verify icons exist in `public/icons/`
3. Clear browser cache and reload

### Service Worker Not Registering

1. Check browser console for errors
2. Verify `public/sw.js` is accessible
3. Ensure ServiceWorkerRegistration component is imported in layout

## What's NOT Modified

This PWA boilerplate does NOT modify:
- Any existing API routes
- Business logic
- Database operations
- Authentication flow
- UI components (except adding ServiceWorkerRegistration)

It's purely additive metadata and configuration for PWA functionality.

## Next Steps

For full offline PWA (Phase 4), you'll need:
1. IndexedDB for local data storage
2. Background sync for API requests
3. Offline fallback pages
4. Advanced caching strategies

Current implementation provides installable PWA with basic offline support.
