# Adsterra Ads Integration for DevilMotion

This folder contains all isolated and modular components for **Adsterra** advertising on DevilMotion (`https://devilmotion.live`).

> **Status**: 100% Adsterra Only. Monetag ads have been completely removed.
> **Smartlink**: `https://araplhn.org/4/7ea7959f2e2fd21bb3a079343ba7a03f`
> **Popunder**: `<script data-cfasync="false" src="https://abscloud.org/1/1acd22d50f5c79ed2f392436bc705baf"></script>`

---

## High-Converting Placements (Top & Middle)

### 1. Popunder (On-Click High CPM)
- Script embedded in `index.html` within `<body>`.
- Listens for user interactions to trigger clean high-CPM sponsor tabs.

### 2. Smartlink (Direct Link Triggers)
- **Navbar (Desktop & Mobile)**: `⚡ VIP 4K` pill button in desktop header (`hidden sm:inline-flex` for zero mobile header squeezing) and full-width in mobile menu drawer.
- **Watch Page Streaming Server Switcher**: `⚡ VIP 4K Server` button in the server selector.
- **Watch Page Player Toolbar**: `⚡ Download 4K` button.
- **Watch Page Middle**: `⚡ Stream in Ultra HD 4K without Buffer — Connect to VIP Node` interactive banner.
- **Anime Details Page**: `⚡ Watch in 4K HDR Ultra (VIP Node)` action button right under "Summon & Watch Ep 1".
- **Genres Page**: Top/Middle 4K VIP Banner.
- **Schedule Page**: Top/Middle Simulcast 4K VIP Banner.
- **Search Page**: Top/Middle 4K VIP Banner.

### 3. Native Banners (Top & Middle of Feeds)
- **Home Page**: Middle section between Top 10 Ranked and Browse by Genre.
- **Watch Page**: Middle section between Player and Franchise Relations.
- **Anime Details Page**: Top/Middle section between Synopsis/Stats and Episodes tabs.
- **Anime Catalog Page**: Top/Middle section between Filters and Content Grid.
- **Movies Page**: Top/Middle section between Genre Filters and Feature Film Grid.
- **Genres Page**: Top/Middle section between Genre Badges and Anime Grid.
- **Schedule Page**: Top/Middle section between Broadcast Day Tabs and Anime Grid.
- **Search Page**: Top/Middle section between Search Tags and Results Grid.

### 4. Medium Rectangle (300x250 Banners)
- **Watch Page (Top)**: Top of the right sidebar directly above Episode List (immediately visible alongside player above the fold).
- **Watch Page (Middle)**: Right sidebar directly below Episode List.
- **Anime Details Page**: Left poster sidebar directly below actions.
- **Home Page**: Middle section between Trending and Recently Updated.

### 5. Social Bar
- Global non-intrusive floating bar loaded in `index.html`.
