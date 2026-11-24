// DevilMotion Service Worker - Ads Temporarily Paused
// Original Monetag service worker backed up in backups/ads_monetag/sw.js
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', () => self.clients.claim());
