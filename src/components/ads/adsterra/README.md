# Adsterra Anti-Adblock Ads Integration for DevilMotion

This folder contains all isolated and modular components for **Adsterra Anti-Adblock** advertising on DevilMotion (`https://devilmotion.live`).

> **Status**: 100% Adsterra Anti-Adblock (AAB). Monetag ads have been completely removed.
> **Smartlink**: `https://araplhn.org/4/7ea7959f2e2fd21bb3a079343ba7a03f`

---

## Anti-Adblock Ad Formats & Scripts

### 1. Banner 300x250 Anti-Adblock (Medium Rectangle)
```html
<script>
  atOptions = {
    'key' : '68b1b298ad50cf3bdfa7afb13018d1df',
    'format' : 'iframe',
    'height' : 250,
    'width' : 300,
    'params' : {}
  };
</script>
<script data-cfasync="false" src="https://bauval.org/22/68b1b298ad50cf3bdfa7afb13018d1df"></script>
```
- **Placements (Top & Middle)**:
  - **Watch Page (Top)**: Right Sidebar directly above Episode List (immediately visible alongside player above the fold).
  - **Watch Page (Middle)**: Right sidebar directly below Episode List.
  - **Anime Details Page**: Left poster sidebar directly below actions.
  - **Home Page**: Middle section between Trending and Recently Updated.

### 2. Social Bar Anti-Adblock
```html
<script data-cfasync="false" src="https://bauval.org/14/08f428f8ca2952fb932467bef2db4a47"></script>
```
- Global in `index.html` within `<body>`.

### 3. Native Banner Anti-Adblock
```html
<script async fetchpriority="high" data-cfasync="false" src="https://bauval.org/21/16be909fc62f62037ec1196397278a57"></script>
<div id="container-16be909fc62f62037ec1196397278a57"></div>
```
- **Placements (Top & Middle)**:
  - **Home Page**: Middle section between Top 10 Ranked and Browse by Genre.
  - **Watch Page**: Middle section between Player and Franchise Relations.
  - **Anime Details Page**: Top/Middle section between Synopsis/Stats and Episodes tabs.
  - **Anime Catalog Page**: Top/Middle section between Filters and Content Grid.
  - **Movies Page**: Top/Middle section between Genre Filters and Feature Film Grid.
  - **Genres Page**: Top/Middle section between Genre Badges and Anime Grid.
  - **Schedule Page**: Top/Middle section between Broadcast Day Tabs and Anime Grid.
  - **Search Page**: Top/Middle section between Search Tags and Results Grid.

### 4. Popunder Anti-Adblock (On-Click High CPM)
```html
<script data-cfasync="false" src="https://abscloud.org/1/1acd22d50f5c79ed2f392436bc705baf"></script>
```
- Global in `index.html` within `<body>`.

### 5. Smartlink Direct Triggers
- URL: `https://araplhn.org/4/7ea7959f2e2fd21bb3a079343ba7a03f`
- Integrated as 4K VIP streamer buttons, download buttons, and banners across all pages.
