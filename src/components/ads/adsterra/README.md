# Adsterra Ads Integration for DevilMotion

This folder contains all isolated and modular components for **Adsterra** advertising on DevilMotion (`https://devilmotion.live`).

> **Note**: Monetag ads have been fully disabled and removed across the platform in favor of pure, high-quality Adsterra ads.

## Placement Guidelines & Quality Safeguards
1. **Adsterra Only**: Zero Monetag tags, popunders, or links.
2. **Ad Count Limit**: Strictly 2–3 genuine ads per page to prevent overcrowding and maintain a premium streaming experience.
3. **Non-Intrusive & High-CTR**:
   - Ads never block video playback, player controls, audio switchers, or search.
   - Header navigation, search autocomplete, and footers remain 100% accessible and unobstructed.
4. **React SPA Isolation**:
   - Adsterra's 300x250 medium rectangle executes `document.write()`. It is isolated inside a sandboxed `srcDoc` iframe in `<AdsterraBanner300x250 />` to prevent wiping the Single Page App DOM.

---

## Ad Placements Across Pages

| Page | Placements | Ad Count |
| :--- | :--- | :--- |
| **Home Page** (`HomePage.tsx`) | • Native Banner (between *Top 10 Ranked* and *Browse Genres*)<br>• 300x250 Showcase (between *Movies* and *Upcoming*)<br>• Social Bar | 3 ads |
| **Watch Page** (`WatchPage.tsx`) | • 300x250 Banner (right sidebar below Episode Playlist)<br>• Native Banner (bottom below Recommendations)<br>• Social Bar | 3 ads |
| **Anime Details** (`AnimeDetailsPage.tsx`) | • 300x250 Banner (poster column sidebar below actions)<br>• Native Banner (bottom below tabs)<br>• Social Bar | 3 ads |
| **Catalog Page** (`AnimeCatalogPage.tsx`) | • Native Banner (above pagination/load more)<br>• Social Bar | 2 ads |
| **Movies Page** (`MoviesPage.tsx`) | • Native Banner (above pagination/load more)<br>• Social Bar | 2 ads |
