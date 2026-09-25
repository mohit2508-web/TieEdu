import React, { useState, useEffect, useCallback } from 'react';
import { QuestionComment } from '@/types';
import { ThumbsUp, Pin, Send } from 'lucide-react';
import { API_BASE_URL } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';

interface QuestionDiscussionProps {
  itemId: string;
  onCountChange?: (count: number) => void;
}

const authHeader = (): Record<string, string> =>
  getAccessToken() ? { Authorization: `Bearer ${getAccessToken()}` } : {};

function formatWhen(iso: string): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return iso;
  const diff = Date.now() - t;
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'Just now';
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hour${hr > 1 ? 's' : ''} ago`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day} day${day > 1 ? 's' : ''} ago`;
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0]!.toUpperCase())
    .join('');
}

export const QuestionDiscussion: React.FC<QuestionDiscussionProps> = ({ itemId, onCountChange }) => {
  const [comments, setComments] = useState<QuestionComment[]>([]);
  const [newCommentText, setNewCommentText] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [postError, setPostError] = useState<string | null>(null);

  const fetchComments = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/comments/${encodeURIComponent(itemId)}`, {
        headers: authHeader(),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setComments(data);
      setFetchError(null);
      onCountChange?.(data.length);
    } catch {
      // Honest failure: show nothing rather than invented discussions.
      setComments([]);
      setFetchError('Discussion could not be loaded — check your connection and retry.');
      onCountChange?.(0);
    }
  }, [itemId, onCountChange]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;

    setLoading(true);
    setPostError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify({
          item_id: itemId,
          text: newCommentText.trim(),
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setNewCommentText('');
      await fetchComments();
    } catch {
      // Never fake a posted comment — tell the truth and keep the text.
      setPostError('Could not post your comment — please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpvote = async (commentId: string) => {
    const prev = comments;
    setComments(prev.map(c => (c.id === commentId ? { ...c, upvotes: c.upvotes + 1 } : c)));
    try {
      const res = await fetch(`${API_BASE_URL}/comments/${encodeURIComponent(commentId)}/upvote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch {
      setComments(prev); // roll back — upvote did not persist
    }
  };

  return (
    <div className="space-y-6">
      {/* Post Comment Input */}
      <form onSubmit={handlePostComment} className="p-4 bg-[#FAFAF9] border border-[#EDEDEB] rounded-2xl space-y-3 shadow-2xs">
        <label className="block text-xs font-bold font-mono text-[#1F3A5F] uppercase tracking-wide">
          Ask a doubt or share candidate experience
        </label>

        <textarea
          rows={3}
          value={newCommentText}
          onChange={(e) => setNewCommentText(e.target.value)}
          placeholder="Write your question, test case doubt, or candidate insight..."
          className="w-full p-3 text-xs sm:text-sm bg-white border border-[#EDEDEB] rounded-xl focus:ring-2 focus:ring-[#E8A33D] focus:outline-none"
        />

        {postError && (
          <p className="text-[11px] font-semibold text-red-600">{postError}</p>
        )}

        <div className="flex justify-between items-center">
          <span className="text-[11px] text-gray-500 font-mono">
            {getAccessToken() ? 'Posted as your account' : 'Posted as TieEdu Student (sign in to use your name)'}
          </span>
          <button
            type="submit"
            disabled={loading || !newCommentText.trim()}
            className="px-4 py-2 bg-[#1F3A5F] hover:bg-[#162A45] text-white text-xs font-bold rounded-xl transition-all disabled:opacity-50 flex items-center gap-1.5"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{loading ? 'Posting…' : 'Post Doubt'}</span>
          </button>
        </div>
      </form>

      {/* Fetch error */}
      {fetchError && (
        <div className="p-4 rounded-2xl border border-red-200 bg-red-50/60 text-xs text-red-700 flex items-center justify-between gap-3">
          <span>{fetchError}</span>
          <button
            onClick={fetchComments}
            className="px-3 py-1.5 bg-white border border-red-200 rounded-lg font-bold text-red-700 hover:bg-red-100"
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty state (real — no seeded comments) */}
      {!fetchError && comments.length === 0 && (
        <div className="p-6 rounded-2xl border border-dashed border-[#EDEDEB] bg-white text-center">
          <p className="text-xs sm:text-sm text-gray-500">
            No discussions yet on this question — be the first to ask a doubt or share your experience.
          </p>
        </div>
      )}

      {/* Comment Thread List */}
      <div className="space-y-3">
        {comments.map((comment) => (
          <div
            key={comment.id}
            className={`p-4 rounded-2xl border transition-all ${
              comment.is_pinned
                ? 'bg-amber-50/60 border-amber-200/80 shadow-2xs'
                : 'bg-white border-[#EDEDEB]'
            }`}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2.5">
                {comment.user_avatar ? (
                  <img
                    src={comment.user_avatar}
                    alt={comment.user_name}
                    className="w-8 h-8 rounded-full object-cover border border-[#EDEDEB]"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-[#1F3A5F]/10 border border-[#EDEDEB] flex items-center justify-center text-[10px] font-bold text-[#1F3A5F]">
                    {initials(comment.user_name)}
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-[#1A1A1A]">{comment.user_name}</span>
                    {comment.is_pinned && (
                      <span className="flex items-center gap-0.5 text-[10px] font-mono font-bold bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full">
                        <Pin className="w-3 h-3" /> Pinned Mentor Insight
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-gray-400 font-mono">{formatWhen(comment.created_at)}</span>
                </div>
              </div>

              {/* Upvote */}
              <button
                onClick={() => handleUpvote(comment.id)}
                className="flex items-center gap-1 text-xs font-mono font-semibold text-gray-600 hover:text-[#1F3A5F] bg-[#FAFAF9] px-2.5 py-1 rounded-lg border border-[#EDEDEB]"
              >
                <ThumbsUp className="w-3.5 h-3.5 text-[#E8A33D]" />
                <span>{comment.upvotes}</span>
              </button>
            </div>

            <p className="text-xs sm:text-sm text-gray-700 leading-relaxed pl-10">
              {comment.text}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};