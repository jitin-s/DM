# DevilMotion — Next-Generation Anime Streaming & Discovery Platform

DevilMotion is a production-grade, full-stack anime entertainment platform inspired by cinematic streaming experiences. It features automatic anime metadata synchronization via the official **AniList GraphQL API**, responsive video streaming via **MegaPlay documented embed endpoints**, episode discovery via **Anikoto**, a normalized **Prisma ORM database**, secure **JWT authentication**, and a dedicated **Admin Operations Dashboard**.

---

## 🚀 Key Features

### 1. Live AniList GraphQL Integration
- **Automatic Catalog Population**: Discovers and ingests trending, popular, top-rated, currently airing, upcoming, and movie anime directly from the official AniList API.
- **High-Definition Artwork Management**: Ingests and renders official `coverImage.large`, `coverImage.extraLarge`, and widescreen `bannerImage` assets without downloading or duplicating third-party media.
- **Rich Metadata**: Complete English, Romaji, and Japanese titles, studios, ratings, season years, genres, synopsis, format, and episode counts.
- **Real-Time Airing Schedule**: Weekly simulcast schedule synced with Japanese television broadcast times.

### 2. MegaPlay Streaming Integration
- **Documented Embed Patterns**:
  - **AniList ID Pattern**: `https://megaplay.buzz/stream/ani/{ANILIST_ID}/{EPISODE_NUMBER}/{LANGUAGE}`
  - **MAL ID Pattern**: `https://megaplay.buzz/stream/mal/{MAL_ID}/{EPISODE_NUMBER}/{LANGUAGE}`
  - **Provider S-2 Pattern**: `https://megaplay.buzz/stream/s-2/{EPISODE_EMBED_ID}/{LANGUAGE}`
- **Sub & Dub Audio Switching**: Instant toggle between original Japanese audio with subtitles and English dubbed tracks.
- **Multi-Server Selector**: Switch between MegaPlay Prime (1080p), Stream-2 (Multi-Sub), and CDN Mirror.
- **Cinema Mode & Native Controls**: Responsive 16:9 iframe integration with theater dimming, fullscreen, auto-play next episode, and progress tracking.

### 3. Anikoto Episode Discovery
- Periodically queries `https://anikotoapi.site/recent-anime` and `/series/{id}` to detect newly released episodes and map provider-specific `episode_embed_id` identifiers.

### 4. Background Synchronization Engine (`SyncEngine`)
- **Metadata Synchronization**: Runs every 6–12 hours (configurable) to refresh airing statuses, episode counts, scores, and new series.
- **Episode Discovery**: Runs every 15–30 minutes to check for freshly dropped episodes.
- **Sync History**: Comprehensive audit logging in the `SyncLog` database table.

### 5. User Accounts, Watchlist & History
- Secure bcrypt password hashing and signed JWT authentication.
- Cloud-synced user watchlist.
- Real-time playback history and "Continue Watching" progress tracking.

### 6. Admin Operations Dashboard (`/admin`)
- Live system telemetry: total cached anime, indexed episodes, stream mappings, registered users.
- One-click manual triggers for AniList Metadata Sync and Anikoto Episode Discovery.
- Interactive streaming provider manager (enable/disable providers).
- Episode mapping inspector showing metadata status, stream availability, and error logs.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS v4, Lucide Icons, Framer Motion |
| **Backend** | Node.js, Express, Axios, JsonWebToken, BcryptJS |
| **Database** | SQLite (zero-config local dev) / PostgreSQL (production-ready) |
| **ORM** | Prisma ORM 6 |
| **APIs** | AniList GraphQL API, MegaPlay Embed API, Anikoto API |

---

## 📂 Project Structure

```
devilmotion/
├── prisma/
│   └── schema.prisma         # Normalized database models & relationships
├── server/
│   ├── db.ts                 # Prisma singleton instance
│   ├── index.ts              # Express API server entrypoint
│   ├── routes/
│   │   ├── animeRoutes.ts    # AniList discovery, trending, search, schedule
│   │   ├── streamRoutes.ts   # MegaPlay embed resolver & server switcher
│   │   ├── authRoutes.ts     # User register, login, profile JWT auth
│   │   ├── userRoutes.ts     # Cloud watchlist & watch history progress
│   │   └── adminRoutes.ts    # Dashboard telemetry, sync triggers, provider toggles
│   └── services/
│       ├── anilistService.ts # Official AniList GraphQL queries & DB caching
│       ├── megaplayService.ts# Stream URL pattern resolution & availability check
│       ├── anikotoService.ts # Recent anime discovery & series episode mapping
│       └── syncEngine.ts     # Automated background sync workers
├── src/
│   ├── components/           # Reusable UI, Cards, Navigation, Player, Hero, Sections
│   ├── context/              # AuthContext & WatchlistContext
│   ├── pages/                # Home, Catalog, Details, Watch, Schedule, Admin, etc.
│   └── services/api.ts       # Unified frontend API client
├── public/
│   ├── logo.png              # Exact original 2000x2000 brand logo
│   └── logo_cropped.png      # High-density banner logo for UI header/footer
├── .env.example              # Environment variables template
└── vite.config.ts            # Vite bundler with /api proxy to Express
```

---

## ⚙️ Environment Variables

Create a `.env` file in the project root:

```env
# Database (SQLite default for zero-setup local dev; use PostgreSQL for production)
DATABASE_URL="file:./dev.db"
# DATABASE_URL="postgresql://postgres:password@localhost:5432/devilmotion?schema=public"

# Server Port
PORT=3001
NODE_ENV=development

# JWT Secret
AUTH_SECRET="devilmotion_super_secure_jwt_secret_key_2026"
JWT_EXPIRES_IN="7d"

# External API Endpoints
ANILIST_API_URL="https://graphql.anilist.co"
MEGAPLAY_BASE_URL="https://megaplay.buzz"
ANIKOTO_API_BASE_URL="https://anikotoapi.site"

# Background Sync Intervals (in minutes)
SYNC_INTERVAL_RECENT=15
SYNC_INTERVAL_METADATA=360
SYNC_INTERVAL_PROVIDER=30
```

---

## 💻 Local Development Setup

1. **Clone & Install Dependencies**:
   ```bash
   git clone <repo-url>
   cd devilmotion
   npm install
   ```

2. **Initialize Database**:
   ```bash
   npx prisma db push
   ```

3. **Start the Platform (Backend + Frontend)**:
   ```bash
   npm run dev
   ```
   - Frontend UI: `http://localhost:5173/`
   - Backend API: `http://localhost:3001/`

---

## 🔑 Default Administrator Credentials

Upon initial startup, the system automatically provisions the default administrator account:
- **Email**: `admin@devilmotion.com`
- **Password**: `admin123456`
- **Admin Console**: Navigate to `/admin` after logging in.

---

## 🚢 Production Deployment

### Option A: Node.js / Docker / VPS
1. Set `DATABASE_URL` to your production PostgreSQL connection string in `.env`.
2. Update `prisma/schema.prisma` datasource provider to `postgresql`.
3. Run `npx prisma db push` or `npx prisma migrate deploy`.
4. Build the client:
   ```bash
   npm run build
   ```
5. Run the server using PM2 or Docker:
   ```bash
   npm run server
   ```

### Option B: Cloud Hosting (Render / Railway / Fly.io)
- **Build Command**: `npm install && npx prisma db push && npm run build`
- **Start Command**: `npm run server`
- Set environment variables in the cloud dashboard.
