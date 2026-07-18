'use client';

import { useEffect } from 'react';

/**
 * Silent global service-worker registration — runs on every page so the
 * offline cache and push handlers are active from first load, not only
 * after visiting Settings (which keeps its own subscribe UI).
 */
export default function SwRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // Registration failure just means no offline cache — never block the app.
      });
    }
  }, []);

  return null;
}
