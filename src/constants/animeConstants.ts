export const GENRES_LIST = [
  { name: 'Action', count: 1420, icon: 'Flame', color: '#EF4444', banner: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/16498-8jpFCOcDmneX.jpg' },
  { name: 'Adventure', count: 980, icon: 'Compass', color: '#F97316', banner: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/21-wf37VakJmZqs.jpg' },
  { name: 'Fantasy', count: 1250, icon: 'Sparkles', color: '#A855F7', banner: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/154587-ivXNJ23SM1xB.jpg' },
  { name: 'Supernatural', count: 870, icon: 'Ghost', color: '#E50914', banner: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/113415-jQBSkxWAAk83.jpg' },
  { name: 'Sci-Fi', count: 640, icon: 'Cpu', color: '#06B6D4', banner: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/n9253-JIhmKgBKsWUN.jpg' },
  { name: 'Romance', count: 890, icon: 'Heart', color: '#EC4899', banner: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/20954-f30bHMXa5Qoe.jpg' },
  { name: 'Comedy', count: 1100, icon: 'Smile', color: '#EAB308', banner: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/21459-yeVkolGKdGUV.jpg' },
  { name: 'Drama', count: 920, icon: 'Mask', color: '#8B5CF6', banner: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/101922-33MtJGsUSxga.jpg' },
  { name: 'Sports', count: 430, icon: 'Trophy', color: '#10B981', banner: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/20464-PpYjO9cPN1gs.jpg' },
  { name: 'Horror', count: 320, icon: 'Skull', color: '#DC2626', banner: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/127230-o8IRwCGVr9KW.jpg' },
  { name: 'Mystery', count: 510, icon: 'Eye', color: '#6366F1', banner: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/1535.jpg' },
  { name: 'Slice of Life', count: 680, icon: 'Coffee', color: '#14B8A6', banner: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/21087-sHb9zUZFsHe1.jpg' },
];

export function getScheduleDays() {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const shortDays = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const now = new Date();
  const currentDayIndex = now.getDay();

  return days.map((dayName, idx) => {
    const diff = idx - currentDayIndex;
    const targetDate = new Date();
    targetDate.setDate(now.getDate() + diff);

    return {
      dayIndex: idx,
      dayName,
      shortName: shortDays[idx],
      isToday: idx === currentDayIndex,
      dateStr: targetDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    };
  });
}
