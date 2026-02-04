import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { HeartIcon, ChatBubbleIcon, ShareIcon, BookmarkIcon, CheckBadgeIcon, EllipsisHorizontalIcon } from '../ui/Icons';
import { getMediaUrl } from '../../api/apiClient';
import ContentRenderer from '../ui/ContentRenderer';
import { useTheme } from '../../contexts/ThemeContext';
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
  isLiked = false,
  isBookmarked = false,
  isOwnPost = false,
}) {
  const { isDarkMode } = useTheme();

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
  const sharesCount = post.sharesCount ?? post.shares_count ?? 0;

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

  // Event handlers with stopPropagation
  const handleLike = (e) => {
    e.stopPropagation();
    onLike?.(post);
  };

  const handleComment = (e) => {
    e.stopPropagation();
    onComment?.(post);
  };

  const handleShare = (e) => {
    e.stopPropagation();
    onShare?.(post);
  };

  const handleBookmark = (e) => {
    e.stopPropagation();
    onBookmark?.(post);
  };

  const handleOptionsClick = (e) => {
    e.stopPropagation();
    // TODO: Implement options menu
  };

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
      {/* Author Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <img
            src={avatarUrl}
            alt={`${displayName}'s profile picture`}
            className={`w-12 h-12 rounded-full object-cover ring-2 ${isDarkMode ? 'ring-gray-700' : 'ring-gray-100'
              }`}
            loading="lazy"
          />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className={`font-semibold truncate ${isDarkMode ? 'text-gray-100' : 'text-gray-900'
                }`}>{displayName}</span>
              {isVerified && (
                <CheckBadgeIcon className="w-5 h-5 text-indigo-500 flex-shrink-0" aria-label="Verified account" />
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
      </div>

      {/* Content */}
      <div className="mb-4">
        <ContentRenderer content={content} />
      </div>

      {/* Media Gallery */}
      {renderMedia()}

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

          <button
            onClick={handleShare}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all duration-300 ${isDarkMode
              ? 'text-gray-500 hover:text-green-400 hover:bg-green-500/10'
              : 'text-gray-500 hover:text-green-500 hover:bg-green-50'
              }`}
            aria-label="Share post"
          >
            <ShareIcon className="w-5 h-5" />
            <span className="text-sm font-medium">{sharesCount}</span>
          </button>
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
  /** Whether the current user has liked this post */
  isLiked: PropTypes.bool,
  /** Whether the current user has bookmarked this post */
  isBookmarked: PropTypes.bool,
  /** Whether the current user is the author of this post */
  isOwnPost: PropTypes.bool,
};