# Adsterra Ads Integration for DevilMotion

This folder contains all isolated and modular components for **Adsterra** advertising on DevilMotion (`https://devilmotion.live`).

## Placement Guidelines & Constraints
1. **Zero Overlap with Monetag**:
   - Monetag handles Popunder, Vignette, and VIP Ultra Mirror link buttons.
   - Adsterra handles Social Bar notifications, Native Recommendation cards, and 300x250 Medium Rectangle sidebar displays.
2. **Ad Count Limit**: Maximum 3–4 total ads per page across the entire platform.
3. **Non-Intrusive**:
   - Ads never block video playback, player controls, or search.
   - Header, navigation menus, and footers remain 100% accessible and unobstructed.
4. **React SPA Isolation**:
   - Adsterra's 300x250 script executes `document.write`. To prevent clearing the React DOM, it is strictly isolated inside a sandboxed `srcDoc` iframe in `<AdsterraBanner300x250 />`.

---

## Ad Formats & Scripts

### 1. Social Bar
- **Script**:
  ```html
  <script data-cfasync="false" src="https://bauval.org/14/08f428f8ca2952fb932467bef2db4a47"></script>
  ```
- **Placement**: Loaded in `index.html` inside `<body>`.
- **Behavior**: Subtle floating web notification bar.

### 2. Native Banner
- **Code**:
  ```html
  <script async fetchpriority="high" data-cfasync="false" src="https://bauval.org/21/16be909fc62f62037ec1196397278a57"></script>
  <div id="container-16be909fc62f62037ec1196397278a57"></div>
  ```
- **Component**: `<AdsterraNativeBanner />`
- **Placements**:
  - `HomePage.tsx`: Between *Top 10 Popular Ranked* and *Browse by Genre* sections.
  - `AnimeDetailsPage.tsx`: Below episode and character tabs as sponsored recommendations.

### 3. Medium Rectangle (300x250 Banner)
- **Code**:
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
- **Component**: `<AdsterraBanner300x250 />`
- **Placement**: `WatchPage.tsx`: In the right sidebar directly below the episode playlist selector.
