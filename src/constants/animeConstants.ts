export const GENRES_LIST = [
  { name: 'Action', count: 1420, icon: 'Flame', color: '#EF4444', banner: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop&q=80' },
  { name: 'Adventure', count: 980, icon: 'Compass', color: '#F97316', banner: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80' },
  { name: 'Fantasy', count: 1250, icon: 'Sparkles', color: '#A855F7', banner: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop&q=80' },
  { name: 'Supernatural', count: 870, icon: 'Ghost', color: '#E50914', banner: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=600&auto=format&fit=crop&q=80' },
  { name: 'Sci-Fi', count: 640, icon: 'Cpu', color: '#06B6D4', banner: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=600&auto=format&fit=crop&q=80' },
  { name: 'Romance', count: 890, icon: 'Heart', color: '#EC4899', banner: 'https://images.unsplash.com/photo-1514539079130-25950c84af65?w=600&auto=format&fit=crop&q=80' },
  { name: 'Comedy', count: 1100, icon: 'Smile', color: '#EAB308', banner: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=600&auto=format&fit=crop&q=80' },
  { name: 'Drama', count: 920, icon: 'Mask', color: '#8B5CF6', banner: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=600&auto=format&fit=crop&q=80' },
  { name: 'Sports', count: 430, icon: 'Trophy', color: '#10B981', banner: 'https://images.unsplash.com/photo-1514539079130-25950c84af65?w=600&auto=format&fit=crop&q=80' },
  { name: 'Horror', count: 320, icon: 'Skull', color: '#DC2626', banner: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80' },
  { name: 'Mystery', count: 510, icon: 'Eye', color: '#6366F1', banner: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=600&auto=format&fit=crop&q=80' },
  { name: 'Slice of Life', count: 680, icon: 'Coffee', color: '#14B8A6', banner: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80' },
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
