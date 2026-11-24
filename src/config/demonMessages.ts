/**
 * DevilMotion Centralized Demon-Themed Message System
 * Consistent, dark-fantasy, premium anime realm terminology across the entire platform.
 */

export interface DemonMessageCategory {
  [key: string]: string | string[];
}

export const DEMON_MESSAGES = {
  homepage: {
    welcome: 'Welcome to the Realm of Anime.',
    tagline: 'Stream Masterpieces from the Dark Archives in Ultra HD',
    featuredHeadline: 'Our demons have discovered something worth watching.',
    trendingTitle: 'Trending in the Realm',
    trendingSubtitle: 'The titles captivating souls across all dimensions',
    popularTitle: 'Summoned Legends',
    popularSubtitle: 'Timeless masterpieces that echo through eternity',
    latestTitle: 'Latest Arrivals in the Realm',
    latestSubtitle: 'Fresh episodes summoned directly from Japanese broadcast towers',
    genresTitle: 'Explore by Dimension & Genre',
    genresSubtitle: 'Enter realms sorted by mystical category and emotion',
    moviesTitle: 'Theatrical Chronicles',
    moviesSubtitle: 'Feature-length legends that transcend ordinary stories',
    scheduleTitle: 'Airing Rituals & Schedule',
    scheduleSubtitle: 'Track when new episodes breach the dimensional gates',
    hindiDubbedTitle: 'Hindi Dubbed Archives',
    hindiDubbedSubtitle: 'Summoned with authentic Hindi voice casting',
  },

  loading: {
    general: 'Summoning DevilMotion...',
    connecting: 'Connecting to DevilMotion Streaming Node...',
    archives: 'Our demons are searching the streaming archives...',
    preparing: 'Our demons are preparing your episode...',
    gates: 'The demons are opening the gates to your anime...',
    portal: 'The portal is being summoned...',
    checkingSources: 'Our demons are checking the available sources...',
    darkRealm: 'The dark realm is preparing your playback...',
    finishing: 'Almost there... the demons are finishing their work.',
    searchingCatalog: 'Our demons are searching for your anime...',
    aggregating: 'Gathering metadata from the eternal AniList archives...',
  },

  anime: {
    legend: 'Discover the legend behind this anime.',
    storyBegins: 'The story begins beyond these gates.',
    archivesUncovered: 'Our archives have uncovered its ancient details.',
    verified: 'DevilMotion Verified Archive Record',
    noEpisodes: 'This anime has not entered our active archives yet.',
    totalCount: 'Archived Episodes',
  },

  episodes: {
    chooseJourney: 'Choose your next journey.',
    nextChapter: 'The next chapter awaits.',
    arranged: 'Our demons have arranged the episodes.',
    notYetArchived: 'This episode has not breached the gates yet.',
    tbaTitle: 'Title Pending Archive Translation',
    fillerBadge: 'Filler Chapter',
  },

  streaming: {
    portalOpening: 'The portal is opening...',
    portalCollapsed: 'A portal has collapsed. Summoning another source...',
    switchingSource: 'Re-routing connection through alternative realm node...',
    disturbance: 'The stream has encountered a mystical disturbance.',
    unreachable: 'The realm is temporarily unreachable.',
    subVerified: 'Japanese Audio with English Inscriptions',
    dubVerified: 'English Voice Track Synchronized',
    hindiVerified: 'Hindi Voice Track Synchronized',
    ultraHdBadge: '1080p Ultra HD Verified',
    secureNodeBadge: 'Demonic Encryption Active',
  },

  search: {
    searching: 'Summoning results from the anime archives...',
    emptyQuery: 'Inscribe a title, character, or spell to search the archives.',
    notFound: "Even our demons couldn't find that anime.",
    tryAnother: 'Try another title. The realm is vast.',
    resultsFound: 'summoned titles discovered',
  },

  errors: {
    unexpected: 'Our demons encountered an unexpected disturbance.',
    boundaryTitle: 'Something Disrupted the Connection Between Realms',
    boundaryDesc: 'A mystical fracture occurred while loading this page. Our demons have contained the rift.',
    notFoundTitle: '404 — Banished to Another Dimension',
    notFoundDesc: 'The page or anime you are seeking has vanished from the active archives.',
    streamFailedTitle: 'Playback Portal Collapsed',
    streamFailedDesc: 'All verified stream nodes are currently recalibrating. Try selecting a backup node above.',
    investigating: 'The demons are investigating this disturbance.',
    recoveryAction: 'Return to the Realm',
    retryAction: 'Summon Again',
  },

  emptyStates: {
    noResults: 'No anime escaped our archives this time.',
    emptyWatchlist: 'Your grimoire holds no marked titles.',
    emptyWatchlistDesc: 'Summon anime to your personal grimoire using the bookmark seal on any title card.',
    emptyHistory: 'Your journey has not yet begun.',
    emptyHistoryDesc: 'When you stream episodes on DevilMotion, the realm will remember your footsteps here.',
    noSchedule: 'No dimensional broadcasts scheduled for this day.',
  },

  success: {
    savedProgress: 'The demons have saved your progress.',
    addedToCollection: 'Added to your dark grimoire.',
    removedFromCollection: 'Banished from your grimoire.',
    journeyUpdated: 'Your journey has been updated.',
    remembered: 'The realm has remembered your last episode.',
    historyCleared: 'Your journey tracks have been erased from this realm.',
  },

  navigation: {
    enterRealm: 'Enter the Realm',
    exploreArchives: 'Explore the Archives',
    returnHome: 'Return to the Realm',
    backToAnime: 'Back to Anime Archives',
    continueWatching: 'Continue Watching',
    discoverMore: 'Discover More Legends',
    watchNow: 'Summon & Watch',
    viewDetails: 'Inspect Archives',
  },

  buttons: {
    summonMore: 'Summon More',
    tryAgain: 'Try Again',
    openEpisode: 'Open Episode',
    retryPlayback: 'Re-summon Stream',
    cancel: 'Abandon Ritual',
    switchServer: 'Switch Realm Node',
    clearHistory: 'Purge Viewing Footsteps',
  },

  network: {
    offline: 'Connection severed from the earthly realm.',
    reconnecting: 'Re-establishing demonic tether...',
  },

  maintenance: {
    recalibrating: 'Our arch-demons are recalibrating the realm archives.',
  },
} as const;

export type DemonMessageSection = keyof typeof DEMON_MESSAGES;

/**
 * Get a demon message safely with fallback
 */
export function getDemonMessage(
  section: DemonMessageSection,
  key: string,
  fallback = 'The realm is updating...'
): string {
  const cat = DEMON_MESSAGES[section] as Record<string, string> | undefined;
  if (!cat || !cat[key]) return fallback;
  return cat[key];
}

/**
 * Get a stage-appropriate loading message for the player state machine
 */
export function getStreamingLoadingMessage(stage: string): string {
  switch (stage) {
    case 'fetching_episode':
    case 'discovering_sources':
      return DEMON_MESSAGES.loading.archives;
    case 'checking_source':
      return DEMON_MESSAGES.loading.checkingSources;
    case 'connecting':
      return DEMON_MESSAGES.loading.gates;
    case 'initializing_player':
      return DEMON_MESSAGES.loading.portal;
    case 'buffering':
      return DEMON_MESSAGES.loading.darkRealm;
    case 'retrying':
    case 'SWITCHING_SOURCE':
      return DEMON_MESSAGES.streaming.portalCollapsed;
    case 'failed':
      return DEMON_MESSAGES.errors.streamFailedTitle;
    case 'timeout':
      return DEMON_MESSAGES.streaming.unreachable;
    default:
      return DEMON_MESSAGES.loading.preparing;
  }
}
