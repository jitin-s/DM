import React, { useState, useEffect } from 'react';
import { MessageSquare, Flame, ThumbsUp, Send, Sparkles, Smile, ShieldCheck } from 'lucide-react';

interface CommentItem {
  id: string;
  username: string;
  avatarColor: string;
  text: string;
  badge?: string;
  timeAgo: string;
  likes: number;
  userLiked?: boolean;
}

const DEFAULT_GENZ_COMMENTS: CommentItem[] = [
  {
    id: 'c1',
    username: 'zenith_slayer',
    avatarColor: 'from-[#F01428] to-[#8B0018]',
    text: 'bro the animation budget went CRAZY this episode 🔥🔥 MAPPA/Ufotable level compositing on that final clash no cap',
    badge: '🔥 PEAK FICTION',
    timeAgo: '2h ago',
    likes: 184,
  },
  {
    id: 'c2',
    username: 'sukuna_finger',
    avatarColor: 'from-purple-600 to-indigo-900',
    text: 'nah he cooked here fr, villain really thought he was the main character until the beat dropped 💀 bro got humbled in 4K',
    badge: '💀 COOKED',
    timeAgo: '4h ago',
    likes: 129,
  },
  {
    id: 'c3',
    username: 'levi_tea',
    avatarColor: 'from-amber-500 to-red-800',
    text: 'ost had me levitating in my gaming chair on god 🎵 whoever composed that orchestral drop needs an immediate salary bonus',
    badge: '🎵 CHILLS',
    timeAgo: '5h ago',
    likes: 96,
  },
  {
    id: 'c4',
    username: 'chainsaw_denji',
    avatarColor: 'from-orange-500 to-amber-700',
    text: 'waiting a whole week for 20 minutes of pure cinematic adrenaline 🍿😭 why does time fly so fast when it is this good',
    badge: '😭 REPLAY VALUE 10/10',
    timeAgo: '8h ago',
    likes: 142,
  },
  {
    id: 'c5',
    username: 'gojo_blindfold',
    avatarColor: 'from-cyan-500 to-blue-700',
    text: 'bro pulled up with the aura unmatched ⚡ the voice acting carried pure emotional weight. stand proud, this adaptation is elite',
    badge: '🐐 GOAT TIER',
    timeAgo: '11h ago',
    likes: 88,
  },
  {
    id: 'c6',
    username: 'frieren_magic',
    avatarColor: 'from-emerald-500 to-teal-800',
    text: 'the plot twist at the end had me staring at my screen like 👁️👄👁️ absolutely zero foreshadowing that was illegal',
    badge: '🗿 NO CAP',
    timeAgo: '1d ago',
    likes: 73,
  },
];

interface GenZCommentsSectionProps {
  animeId: string | number;
  episodeNumber?: number;
}

export const GenZCommentsSection: React.FC<GenZCommentsSectionProps> = ({
  animeId,
  episodeNumber = 1,
}) => {
  const storageKey = `devilmotion_comments_${animeId}_ep_${episodeNumber}`;

  const [comments, setComments] = useState<CommentItem[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return DEFAULT_GENZ_COMMENTS;
  });

  const [newCommentText, setNewCommentText] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('🔥 PEAK');
  const [activeFilter, setActiveFilter] = useState<'top' | 'newest'>('top');

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(comments));
    } catch {}
  }, [comments, storageKey]);

  const handleLike = (commentId: string) => {
    setComments(prev =>
      prev.map(c => {
        if (c.id === commentId) {
          const isLiked = c.userLiked;
          return {
            ...c,
            likes: isLiked ? c.likes - 1 : c.likes + 1,
            userLiked: !isLiked,
          };
        }
        return c;
      })
    );
  };

  const handlePostComment = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCommentText.trim();
    if (!trimmed) return;

    const colors = [
      'from-red-600 to-rose-900',
      'from-purple-600 to-indigo-900',
      'from-amber-500 to-yellow-800',
      'from-emerald-600 to-teal-900',
      'from-blue-600 to-cyan-900',
    ];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    const userNames = ['devil_watcher', 'solo_grinder', 'otaku_prime', 'anime_reaper', 'shadow_ninja'];
    const randomUser = `${userNames[Math.floor(Math.random() * userNames.length)]}_${Math.floor(Math.random() * 899 + 100)}`;

    const newComment: CommentItem = {
      id: `user_${Date.now()}`,
      username: randomUser,
      avatarColor: randomColor,
      text: trimmed,
      badge: selectedTag,
      timeAgo: 'Just now',
      likes: 1,
      userLiked: true,
    };

    setComments(prev => [newComment, ...prev]);
    setNewCommentText('');
  };

  const sortedComments = [...comments].sort((a, b) => {
    if (activeFilter === 'top') {
      return b.likes - a.likes;
    }
    return 0; // Natural order for newest
  });

  const reactionTags = ['🔥 PEAK', '💀 COOKED', '🐐 GOAT', '😭 REAL', '⚡ AURA', '🗿 W'];

  return (
    <div className="rounded-2xl bg-[#0F0F14] border border-white/[0.08] p-4 sm:p-6 space-y-6 shadow-xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/[0.08]">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-[#F01428]/20 text-[#FF4D61] border border-[#F01428]/30">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-black text-white font-heading flex items-center gap-2">
              <span>Episode Discussion & Community Hype</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-[#9E9EB2] font-semibold">
                {comments.length}
              </span>
            </h3>
            <p className="text-xs text-[#9E9EB2]">
              Live community reactions for Episode {episodeNumber} · DevilMotion Certified
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-1 bg-[#16161E] p-1 rounded-xl border border-white/5 text-xs">
          <button
            type="button"
            onClick={() => setActiveFilter('top')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1 ${
              activeFilter === 'top'
                ? 'bg-[#F01428] text-white shadow-sm shadow-[#F01428]/30'
                : 'text-[#9E9EB2] hover:text-white'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>Top Hype</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('newest')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1 ${
              activeFilter === 'newest'
                ? 'bg-[#F01428] text-white shadow-sm shadow-[#F01428]/30'
                : 'text-[#9E9EB2] hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Latest</span>
          </button>
        </div>
      </div>

      {/* Comment Input Box */}
      <form onSubmit={handlePostComment} className="space-y-3">
        <div className="relative">
          <textarea
            rows={2}
            value={newCommentText}
            onChange={e => setNewCommentText(e.target.value)}
            placeholder="Drop your thoughts on this episode... (no spoilers, just pure hype)"
            className="w-full px-4 py-3 bg-[#16161E] border border-white/10 rounded-xl text-sm text-white placeholder-[#646478] focus:outline-none focus:border-[#F01428] transition-colors resize-none"
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Reaction Tag Selection */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] text-[#646478] font-semibold mr-1">Reaction:</span>
            {reactionTags.map(tag => (
              <button
                key={tag}
                type="button"
                onClick={() => setSelectedTag(tag)}
                className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                  selectedTag === tag
                    ? 'bg-[#F01428]/20 text-[#FF4D61] border-[#F01428] font-bold'
                    : 'bg-[#16161E] text-[#9E9EB2] border-white/5 hover:text-white'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>

          <button
            type="submit"
            disabled={!newCommentText.trim()}
            className="px-4 py-2 rounded-xl bg-[#F01428] hover:bg-[#d60e20] text-white text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md shadow-[#F01428]/30 flex items-center gap-1.5 ml-auto cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Post Reaction</span>
          </button>
        </div>
      </form>

      {/* Comments List */}
      <div className="space-y-3 pt-2">
        {sortedComments.map(comment => (
          <div
            key={comment.id}
            className="p-3.5 sm:p-4 rounded-xl bg-[#14141B] border border-white/[0.04] hover:border-white/10 transition-colors space-y-2"
          >
            {/* Top user row */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-7 h-7 rounded-full bg-gradient-to-tr ${comment.avatarColor} flex items-center justify-center text-xs font-black text-white shrink-0 shadow-sm`}
                >
                  {comment.username.charAt(0).toUpperCase()}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-white tracking-wide">
                    @{comment.username}
                  </span>
                  <span className="text-[11px] text-[#646478]">· {comment.timeAgo}</span>
                </div>
              </div>

              {comment.badge && (
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-[#F01428]/15 text-[#FF4D61] border border-[#F01428]/25 tracking-wider shrink-0">
                  {comment.badge}
                </span>
              )}
            </div>

            {/* Comment Text */}
            <p className="text-xs sm:text-sm text-[#D0D0E0] leading-relaxed pl-9">
              {comment.text}
            </p>

            {/* Upvote & Actions */}
            <div className="flex items-center justify-between pl-9 pt-1">
              <button
                type="button"
                onClick={() => handleLike(comment.id)}
                className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                  comment.userLiked
                    ? 'bg-[#F01428]/20 text-[#FF4D61] border-[#F01428]/40 font-bold'
                    : 'bg-white/[0.03] text-[#9E9EB2] border-white/5 hover:text-white hover:bg-white/[0.06]'
                }`}
              >
                <ThumbsUp className="w-3 h-3" />
                <span>{comment.likes}</span>
              </button>

              <div className="flex items-center gap-1 text-[11px] text-emerald-400/80">
                <ShieldCheck className="w-3 h-3" />
                <span>Verified Streamer</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
