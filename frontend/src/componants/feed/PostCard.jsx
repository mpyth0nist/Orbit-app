import React, { useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import PropTypes from 'prop-types';
import { toast } from 'sonner';
import { HeartIcon, ChatBubbleIcon, ShareIcon, BookmarkIcon, CheckBadgeIcon, EllipsisHorizontalIcon, TrashIcon, PencilIcon, LinkIcon, RubberDuckIcon } from '../ui/Icons';
import { getMediaUrl, threadsAPI } from '../../api/apiClient';
import ContentRenderer from '../ui/ContentRenderer';
import { useTheme } from '../../contexts/ThemeContext';
import EditThreadModal from './EditThreadModal';
import { format, formatDistanceToNow } from 'date-fns';

/**
 * PostCard Component
 * 
 * Displays a single post/thread with author info, content, media, and action buttons.
 */
export default function PostCard({
  post,
  onLike,
  onComment,
  onShare,
  onBookmark,
  onClick,
  onDelete,
  onUpdate,
  isLiked = false,
  isBookmarked = false,
  isOwnPost = false,
  canComment = true, // New prop: whether user can comment (for community posts)
}) {
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showRepostMenu, setShowRepostMenu] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);



  // Memoized user/profile data extraction
  const user = post.user || {};
  const profile = user.profile || {};

  // Memoized display name
  const displayName = useMemo(() => {
    if (profile.firstName || profile.lastName) {
      return `${profile.firstName || ''} ${profile.lastName || ''}`.trim();
    }
    return post.author_name || user.username || 'User';
  }, [profile.firstName, profile.lastName, post.author_name, user.username]);

  // Memoized username
  const username = useMemo(() => {
    return user.username || post.author_handle || 'user';
  }, [user.username, post.author_handle]);

  // Memoized avatar URL
  const avatarUrl = useMemo(() => {
    const photoUrl = getMediaUrl(profile.photoUrl || user.photoUrl);
    if (photoUrl) return photoUrl;
    if (post.author_avatar) return post.author_avatar;
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=6366f1&color=fff&size=96`;
  }, [profile.photoUrl, user.photoUrl, post.author_avatar, displayName]);

  // Memoized content
  const content = post.content || post.text || '';



  // Memoized media array with full URLs
  const mediaItems = useMemo(() => {
    const media = post.media || [];
    if (media.length > 0) {
      return media.map(item => ({
        id: item.id,
        url: getMediaUrl(item.url),
        type: item.type || 'IMAGE',
      }));
    }
    // Fallback to legacy single image
    if (post.image_url) {
      return [{ id: 'legacy', url: post.image_url, type: 'IMAGE' }];
    }
    return [];
  }, [post.media, post.image_url]);

  // Memoized counts
  const likesCount = post.likesCount ?? post.likes_count ?? 0;
  const commentsCount = post.commentsCount ?? post.comments_count ?? 0;
  const repostsCount = post.repostsCount ?? post.reposts_count ?? 0;

  // Memoized time display
  const timeAgo = useMemo(() => {
    const date = post.createdAt || post.created_date;
    if (!date) return 'Just now';

    const postDate = new Date(date);
    const now = new Date();
    const diffInHours = (now - postDate) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return formatDistanceToNow(postDate, { addSuffix: false });
    }
    return format(postDate, 'MMM d');
  }, [post.createdAt, post.created_date]);

  const isVerified = user.verified || post.author_verified;

  // Event handlers with stopPropagation (memoized with useCallback)
  const handleLike = useCallback((e) => {
    e.stopPropagation();
    onLike?.(post);
  }, [onLike, post]);

  const handleComment = useCallback((e) => {
    e.stopPropagation();
    onComment?.(post);
  }, [onComment, post]);

  const handleShare = useCallback((e) => {
    e.stopPropagation();
    setShowRepostMenu(prev => !prev);
  }, []);

  const handleRepost = useCallback((e) => {
    e.stopPropagation();
    setShowRepostMenu(false);
    onShare?.(post);
  }, [onShare, post]);

  const handleQuote = useCallback((e) => {
    e.stopPropagation();
    setShowRepostMenu(false);
    navigate(`/create?quoteId=${post.id}`);
  }, [navigate, post.id]);

  const handleOriginalPostClick = useCallback((e) => {
    e.stopPropagation();
    if (post.originalPost) {
      navigate(`/thread/${post.originalPost.id}`);
    }
  }, [navigate, post.originalPost]);

  const handleBookmark = useCallback((e) => {
    e.stopPropagation();
    onBookmark?.(post);
  }, [onBookmark, post]);

  const handleOptionsClick = useCallback((e) => {
    e.stopPropagation();
    setShowOptionsMenu(prev => !prev);
  }, []);

  const handleEdit = useCallback((e) => {
    e.stopPropagation();
    setShowOptionsMenu(false);
    setIsEditing(true);
  }, []);

  const handleDelete = useCallback(async (e) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this post?')) {
      setShowOptionsMenu(false);

      // Optimistically remove from all caches
      const previousCaches = new Map();

      const removeThreadFromCache = (queryKey) => {
        const oldData = queryClient.getQueryData(queryKey);
        if (!oldData) return;

        // Store previous data for rollback
        previousCaches.set(JSON.stringify(queryKey), oldData);

        queryClient.setQueryData(queryKey, (old) => {
          if (!old) return old;

          // Handle infinite query structure (pages array)
          if (old.pages && Array.isArray(old.pages)) {
            return {
              ...old,
              pages: old.pages.map(page =>
                Array.isArray(page) ? page.filter(thread => thread.id !== post.id) : page
              ),
            };
          }

          // Handle paginated data structure
          if (old.data && Array.isArray(old.data)) {
            return {
              ...old,
              data: old.data.filter(thread => thread.id !== post.id),
            };
          }

          // Handle simple array structure
          if (Array.isArray(old)) {
            return old.filter(thread => thread.id !== post.id);
          }

          return old;
        });
      };

      // Remove from all query caches that might contain this thread
      queryClient.getQueryCache().findAll().forEach((query) => {
        const queryKey = query.queryKey;

        // Update if it's a threads query (Feed, Profile, Communities, etc.)
        if (queryKey[0] === 'threads' ||
          queryKey[0] === 'community' && queryKey[2] === 'threads' ||
          queryKey[0] === 'user' && queryKey.includes('posts')) {
          removeThreadFromCache(queryKey);
        }
      });

      try {
        await threadsAPI.delete(post.id);
        onDelete?.(post.id);
        toast.success('Post deleted successfully');
      } catch (error) {
        console.error('Failed to delete post:', error);
        toast.error('Failed to delete post');

        // Rollback all cache updates
        previousCaches.forEach((data, key) => {
          queryClient.setQueryData(JSON.parse(key), data);
        });
      }
    }
  }, [post.id, onDelete, queryClient]);

  const handleCopyLink = useCallback((e) => {
    e.stopPropagation();
    const link = `${window.location.origin}/thread/${post.id}`;
    navigator.clipboard.writeText(link).then(() => {
      toast.success('Link copied to clipboard');
      setShowOptionsMenu(false);
    });
  }, [post.id]);

  const handleEditResult = useCallback((updatedThread) => {
    // Call parent's onUpdate if provided
    if (onUpdate) {
      onUpdate(updatedThread);
    }

    // Update all possible query caches where this thread might exist
    // This ensures the update shows everywhere without refresh
    const updateThreadInCache = (queryKey) => {
      queryClient.setQueryData(queryKey, (old) => {
        if (!old) return old;

        // Handle infinite query structure (pages array)
        if (old.pages && Array.isArray(old.pages)) {
          return {
            ...old,
            pages: old.pages.map(page =>
              Array.isArray(page)
                ? page.map(thread => thread.id === updatedThread.id ? updatedThread : thread)
                : page
            ),
          };
        }

        // Handle paginated data structure
        if (old.data && Array.isArray(old.data)) {
          return {
            ...old,
            data: old.data.map(thread =>
              thread.id === updatedThread.id ? updatedThread : thread
            ),
          };
        }

        // Handle simple array structure
        if (Array.isArray(old)) {
          return old.map(thread =>
            thread.id === updatedThread.id ? updatedThread : thread
          );
        }

        return old;
      });
    };

    // Update all query caches that might contain this thread
    queryClient.getQueryCache().findAll().forEach((query) => {
      const queryKey = query.queryKey;

      // Update if it's a threads query
      if (queryKey[0] === 'threads' ||
        queryKey[0] === 'community' && queryKey[2] === 'threads' ||
        queryKey[0] === 'user' && queryKey.includes('posts')) {
        updateThreadInCache(queryKey);
      }
    });

    toast.success('Post updated successfully');
    setIsEditing(false);
  }, [onUpdate, queryClient]);

  // Render media gallery (supports 1-4 images)
  const renderMedia = () => {
    if (mediaItems.length === 0) return null;

    const gridClass = mediaItems.length === 1
      ? ''
      : mediaItems.length === 2
        ? 'grid grid-cols-2 gap-1'
        : mediaItems.length === 3
          ? 'grid grid-cols-2 gap-1'
          : 'grid grid-cols-2 gap-1';

    return (
      <div className={`mb-4 -mx-5 overflow-hidden ${gridClass}`}>
        {mediaItems.slice(0, 4).map((item, index) => (
          <div
            key={item.id || index}
            className={`relative ${mediaItems.length === 3 && index === 0 ? 'row-span-2' : ''}`}
          >
            {item.type === 'VIDEO' ? (
              <video
                src={item.url}
                controls
                className="w-full max-h-96 object-cover"
                aria-label={`Video ${index + 1} of ${mediaItems.length}`}
              />
            ) : (
              <img
                src={item.url}
                alt={`Post media ${index + 1} of ${mediaItems.length}`}
                className="w-full max-h-96 object-cover"
                loading="lazy"
              />
            )}
          </div>
        ))}
      </div>
    );
  };

  // Render original thread if this is a repost
  const renderRepostedThread = () => {
    if (!post.originalPost) return null;

    const originalThread = post.originalPost;
    const originalAuthor = originalThread.user || {};
    const originalProfile = originalAuthor.profile || {};
    const originalDisplayName = `${originalProfile.firstName || ''} ${originalProfile.lastName || ''}`.trim() || originalAuthor.username || 'User';

    const originalTimeAgo = originalThread.createdAt
      ? formatDistanceToNow(new Date(originalThread.createdAt), { addSuffix: true })
      : '';

    return (
      <div
        onClick={handleOriginalPostClick}
        className={`mt-3 p-4 rounded-2xl border ${isDarkMode
          ? 'bg-gray-900/50 border-gray-700/50'
          : 'bg-gray-50/50 border-gray-200/50'
          } hover:border-indigo-500/30 transition-colors cursor-pointer`}>
        <div className="flex items-center gap-2 mb-2">
          <img
            src={getMediaUrl(originalProfile.photoUrl || originalAuthor.photoUrl) || `https://ui-avatars.com/api/?name=${encodeURIComponent(originalDisplayName)}&background=6366f1&color=fff`}
            className="w-5 h-5 rounded-full object-cover"
            alt=""
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/profile/${originalAuthor.id}`);
            }}
          />
          <span className={`text-sm font-semibold truncate ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
            {originalDisplayName}
          </span>
          <span className="text-xs text-gray-500">@{originalAuthor.username}</span>
          <span className="text-xs text-gray-500">·</span>
          <span className="text-xs text-gray-500">{originalTimeAgo}</span>
        </div>
        <div className={`text-sm leading-relaxed ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
          <ContentRenderer content={originalThread.content} />
        </div>
        {originalThread.media && originalThread.media.length > 0 && (
          <div className="mt-2 rounded-xl overflow-hidden border border-gray-200/10">
            <img
              src={getMediaUrl(originalThread.media[0].url)}
              className="w-full h-32 object-cover"
              alt="Original media"
            />
          </div>
        )}
      </div>
    );
  };

  return (
    <article
      onClick={onClick}
      className={`rounded-3xl p-5 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer border ${isDarkMode
        ? 'bg-gray-800 border-gray-700/50 hover:border-gray-600'
        : 'bg-white border-gray-100/50 hover:border-gray-200'
        }`}
      role="article"
      aria-label={`Post by ${displayName}`}
    >
      {/* Repost Indicator */}
      {post.originalPost && !post.content && (
        <div className="flex items-center gap-2 mb-3 px-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">
          <ShareIcon className="w-3.5 h-3.5" />
          <span>Reposted by {displayName}</span>
        </div>
      )}

      {/* Author Header */}
      <div className="relative flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <img
            src={avatarUrl}
            alt={`${displayName}'s profile picture`}
            className={`w-12 h-12 rounded-full object-cover ring-2 ${isDarkMode ? 'ring-gray-700' : 'ring-gray-100'
              }`}
            loading="lazy"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/profile/${post.userId}`);
            }}
          />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className={`font-semibold truncate ${isDarkMode ? 'text-gray-100' : 'text-gray-900'
                }`}>{displayName}</span>
              {isVerified && (
                <CheckBadgeIcon className="w-5 h-5 text-indigo-500 flex-shrink-0" aria-label="Verified account" />
              )}
              {post.threadType === 'HELP' && (
                <RubberDuckIcon className="w-5 h-5 flex-shrink-0" aria-label="Rubber Duck Thread" />
              )}
            </div>
            <div className={`flex items-center gap-2 text-sm ${isDarkMode ? 'text-gray-500' : 'text-gray-500'
              }`}>
              <span className="truncate">@{username}</span>
              <span aria-hidden="true">·</span>
              <time className="flex-shrink-0" dateTime={post.createdAt || post.created_date}>
                {timeAgo}
              </time>
            </div>
          </div>
        </div>

        {isOwnPost ? (
          <button
            onClick={handleOptionsClick}
            className={`p-2 rounded-xl transition-colors ${isDarkMode
              ? 'text-gray-500 hover:text-gray-300 hover:bg-gray-700'
              : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
              }`}
            aria-label="Post options"
          >
            <EllipsisHorizontalIcon className="w-5 h-5" />
          </button>
        ) : null}

        {/* Options Menu */}
        {showOptionsMenu && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={(e) => { e.stopPropagation(); setShowOptionsMenu(false); }}
            />
            <div
              className={`absolute right-4 top-12 w-48 rounded-2xl shadow-xl border overflow-hidden z-20 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'
                }`}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={handleCopyLink}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors ${isDarkMode ? 'hover:bg-gray-700 text-gray-200' : 'hover:bg-gray-50 text-gray-700'
                  }`}
              >
                <LinkIcon className="w-4 h-4 text-gray-500" />
                Copy Link
              </button>
              {isOwnPost && (
                <>
                  <button
                    onClick={handleEdit}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors ${isDarkMode ? 'hover:bg-gray-700 text-gray-200' : 'hover:bg-gray-50 text-gray-700'
                      }`}
                  >
                    <PencilIcon className="w-4 h-4 text-indigo-500" />
                    Edit Thread
                  </button>
                  <button
                    onClick={handleDelete}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors ${isDarkMode ? 'hover:bg-gray-700 text-red-400' : 'hover:bg-red-50 text-red-500'
                      }`}
                  >
                    <TrashIcon className="w-4 h-4" />
                    Delete Thread
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </div>

      {/* Edit Modal */}
      {isEditing && (
        <div onClick={(e) => e.stopPropagation()}>
          <EditThreadModal
            thread={post}
            onClose={() => setIsEditing(false)}
            onSuccess={handleEditResult}
          />
        </div>
      )}

      {/* Content */}
      <div className="mb-4">
        <ContentRenderer content={content} />
      </div>

      {/* Media Gallery */}
      {renderMedia()}

      {/* Reposted Thread Content */}
      {renderRepostedThread()}

      {/* Actions */}
      <div className={`flex items-center justify-between pt-3 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-100'
        }`}>
        <div className="flex items-center gap-1">
          <button
            onClick={handleLike}
            disabled={isOwnPost}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all duration-300 ${isLiked
              ? 'text-rose-500 bg-rose-500/10'
              : isOwnPost
                ? isDarkMode ? 'text-gray-600 cursor-not-allowed' : 'text-gray-400 cursor-not-allowed'
                : isDarkMode
                  ? 'text-gray-500 hover:text-rose-500 hover:bg-rose-500/10'
                  : 'text-gray-500 hover:text-rose-500 hover:bg-rose-50'
              }`}
            aria-label={isOwnPost ? 'Cannot like own post' : isLiked ? 'Unlike post' : 'Like post'}
            aria-pressed={isLiked}
          >
            <HeartIcon className="w-5 h-5" filled={isLiked} />
            <span className="text-sm font-medium">{likesCount}</span>
          </button>

          {canComment ? (
            <button
              onClick={handleComment}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all duration-300 ${isDarkMode
                ? 'text-gray-500 hover:text-indigo-400 hover:bg-indigo-500/10'
                : 'text-gray-500 hover:text-indigo-500 hover:bg-indigo-50'
                }`}
              aria-label="Comment on post"
            >
              <ChatBubbleIcon className="w-5 h-5" />
              <span className="text-sm font-medium">{commentsCount}</span>
            </button>
          ) : (
            <div
              className={`flex items-center gap-2 px-3 py-2 rounded-xl ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`}
              title="Join the community to comment"
            >
              <ChatBubbleIcon className="w-5 h-5" />
              <span className="text-sm font-medium">{commentsCount}</span>
            </div>
          )}

          <div className="relative">
            <button
              onClick={handleShare}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all duration-300 ${showRepostMenu
                ? 'text-green-500 bg-green-500/10'
                : isDarkMode
                  ? 'text-gray-500 hover:text-green-400 hover:bg-green-500/10'
                  : 'text-gray-500 hover:text-green-500 hover:bg-green-50'
                }`}
              aria-label="Repost"
            >
              <ShareIcon className="w-5 h-5" />
              <span className="text-sm font-medium">{repostsCount}</span>
            </button>

            {showRepostMenu && (
              <div
                className={`absolute bottom-full mb-2 left-0 w-48 rounded-2xl shadow-xl border overflow-hidden z-50 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'
                  }`}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={handleRepost}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors ${isDarkMode ? 'hover:bg-gray-700 text-gray-200' : 'hover:bg-gray-50 text-gray-700'
                    }`}
                >
                  <ShareIcon className="w-4 h-4 text-green-500" />
                  Repost
                </button>
                <button
                  onClick={handleQuote}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors ${isDarkMode ? 'hover:bg-gray-700 text-gray-200' : 'hover:bg-gray-50 text-gray-700'
                    }`}
                >
                  <ChatBubbleIcon className="w-4 h-4 text-indigo-500" />
                  Quote
                </button>
              </div>
            )}
          </div>
        </div>

        <button
          onClick={handleBookmark}
          className={`p-2 rounded-xl transition-all duration-300 ${isBookmarked
            ? 'text-amber-500 bg-amber-500/10'
            : isDarkMode
              ? 'text-gray-500 hover:text-amber-500 hover:bg-amber-500/10'
              : 'text-gray-400 hover:text-amber-500 hover:bg-amber-50'
            }`}
          aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark post'}
          aria-pressed={isBookmarked}
        >
          <BookmarkIcon className="w-5 h-5" filled={isBookmarked} />
        </button>
      </div>
    </article>
  );
}

// PropTypes for type checking
PostCard.propTypes = {
  /** The post/thread data object */
  post: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    content: PropTypes.string,
    text: PropTypes.string,
    createdAt: PropTypes.string,
    created_date: PropTypes.string,
    likesCount: PropTypes.number,
    likes_count: PropTypes.number,
    commentsCount: PropTypes.number,
    comments_count: PropTypes.number,
    sharesCount: PropTypes.number,
    shares_count: PropTypes.number,
    user: PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      username: PropTypes.string,
      photoUrl: PropTypes.string,
      verified: PropTypes.bool,
      profile: PropTypes.shape({
        firstName: PropTypes.string,
        lastName: PropTypes.string,
        photoUrl: PropTypes.string,
      }),
    }),
    media: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        url: PropTypes.string,
        type: PropTypes.oneOf(['IMAGE', 'VIDEO']),
      })
    ),
    image_url: PropTypes.string,
    author_name: PropTypes.string,
    author_handle: PropTypes.string,
    author_avatar: PropTypes.string,
    author_verified: PropTypes.bool,
  }).isRequired,
  /** Callback when like button is clicked */
  onLike: PropTypes.func,
  /** Callback when comment button is clicked */
  onComment: PropTypes.func,
  /** Callback when share button is clicked */
  onShare: PropTypes.func,
  /** Callback when bookmark button is clicked */
  onBookmark: PropTypes.func,
  /** Callback when the card is clicked */
  onClick: PropTypes.func,
  /** Callback when delete is successful */
  onDelete: PropTypes.func,
  /** Callback when update is successful */
  onUpdate: PropTypes.func,
  /** Whether the current user has liked this post */
  isLiked: PropTypes.bool,
  /** Whether the current user has bookmarked this post */
  isBookmarked: PropTypes.bool,
  /** Whether the current user is the author of this post */
  isOwnPost: PropTypes.bool,
  /** Whether the current user can comment on this post */
  canComment: PropTypes.bool,
};