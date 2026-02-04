import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeftIcon, HeartIcon, ChatBubbleIcon, ShareIcon, BookmarkIcon, CheckBadgeIcon, SendIcon } from '../ui/Icons';
import api, { getMediaUrl } from '../../api/apiClient';
import { format, formatDistanceToNow } from 'date-fns';
import ContentRenderer from '../ui/ContentRenderer';
import { Loader2 } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';

/**
 * ThreadDetailView - Stylish detailed view of a single thread/post
 * Supports dark mode, multi-media gallery, and new backend data format
 */
export default function ThreadDetailView({
  post,
  onBack,
  onLike,
  onUserClick,
  user
}) {
  const [comments, setComments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);

  const { isDarkMode } = useTheme();
  const { t } = useLanguage();

  // Extract author info from new or legacy format
  const author = useMemo(() => {
    const postUser = post?.user || {};
    const profile = postUser.profile || {};

    return {
      id: postUser.id || post?.userId,
      name: profile.firstName && profile.lastName
        ? `${profile.firstName} ${profile.lastName}`.trim()
        : post?.author_name || postUser.username || 'User',
      username: postUser.username || post?.author_handle || 'user',
      avatar: getMediaUrl(profile.photoUrl) || post?.author_avatar ||
        `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.firstName || postUser.username || 'User')}&background=6366f1&color=fff`,
      verified: postUser.verified || post?.author_verified
    };
  }, [post]);

  // Extract media items
  const mediaItems = useMemo(() => {
    const media = post?.media || [];
    if (media.length > 0) {
      return media.map(item => ({
        id: item.id,
        url: getMediaUrl(item.url),
        type: item.type || 'IMAGE'
      }));
    }
    if (post?.image_url) {
      return [{ id: 'legacy', url: post.image_url, type: 'IMAGE' }];
    }
    return [];
  }, [post?.media, post?.image_url]);

  // Get counts
  const likesCount = post?.likesCount ?? post?.likes_count ?? 0;
  const commentsCount = post?.commentsCount ?? post?.comments_count ?? 0;
  const sharesCount = post?.sharesCount ?? post?.shares_count ?? 0;
  const isLiked = post?.isLiked ?? false;

  // Format time
  const formattedTime = useMemo(() => {
    const date = post?.createdAt || post?.created_date;
    if (!date) return 'Just now';
    return format(new Date(date), 'MMM d, yyyy · h:mm a');
  }, [post?.createdAt, post?.created_date]);

  useEffect(() => {
    loadComments();
  }, [post?.id]);

  const loadComments = async () => {
    if (!post?.id) return;

    setIsLoading(true);
    try {
      const response = await api.comments.getThreadComments(post.id);
      const commentsData = response?.data || response || [];
      setComments(Array.isArray(commentsData) ? commentsData : []);
    } catch (error) {
      console.error('Failed to load comments:', error);
      setComments([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const response = await api.comments.create(post.id, {
        content: newComment.trim(),
      });

      const newCommentData = response?.data || response;
      setComments([newCommentData, ...comments]);
      setNewComment('');
    } catch (error) {
      console.error('Failed to post comment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };



  const getCommentAuthor = (comment) => {
    const commentUser = comment.user || {};
    const profile = commentUser.profile || {};

    return {
      name: profile.firstName
        ? `${profile.firstName} ${profile.lastName || ''}`.trim()
        : comment.author_name || commentUser.username || 'User',
      username: commentUser.username || comment.author_handle || 'user',
      avatar: getMediaUrl(profile.photoUrl) || comment.author_avatar ||
        `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.firstName || commentUser.username || 'User')}&background=6366f1&color=fff`
    };
  };

  /* Comment Item Component */
  const CommentItem = ({ comment, threadId, onReplySuccess }) => {
    const [likesCount, setLikesCount] = useState(comment.likesCount || comment.likes_count || 0);
    const [isLiked, setIsLiked] = useState(comment.isLiked || false);
    const [isReplying, setIsReplying] = useState(false);
    const [replyContent, setReplyContent] = useState('');
    const [isSubmittingReply, setIsSubmittingReply] = useState(false);

    const [showReplies, setShowReplies] = useState(false);
    const [replies, setReplies] = useState([]);
    const [isLoadingReplies, setIsLoadingReplies] = useState(false);
    const [replyCount, setReplyCount] = useState(comment._count?.comments || 0);

    const commentAuthor = getCommentAuthor(comment);
    const commentTime = comment.createdAt || comment.created_date;

    const handleLike = async () => {
      // Optimistic update
      const newIsLiked = !isLiked;
      setIsLiked(newIsLiked);
      setLikesCount(prev => newIsLiked ? prev + 1 : prev - 1);

      try {
        await api.reactions.toggle('comment', comment.id);
      } catch (error) {
        console.error('Failed to toggle like:', error);
        // Revert on failure
        setIsLiked(!newIsLiked);
        setLikesCount(prev => newIsLiked ? prev - 1 : prev + 1);
      }
    };

    const handleReplySubmit = async (e) => {
      e.preventDefault();
      if (!replyContent.trim() || isSubmittingReply) return;

      setIsSubmittingReply(true);
      try {
        const response = await api.comments.create(threadId, {
          content: replyContent.trim(),
          parentId: comment.id
        });

        const newReply = response?.data || response;

        // Add to local replies if showing, otherwise update count
        if (showReplies) {
          setReplies(prev => [...prev, newReply]);
        }
        setReplyCount(prev => prev + 1);

        setReplyContent('');
        setIsReplying(false);
        if (!showReplies) fetchReplies(); // Auto-open replies if not open
      } catch (error) {
        console.error('Failed to reply:', error);
      } finally {
        setIsSubmittingReply(false);
      }
    };

    const fetchReplies = async () => {
      if (showReplies) {
        setShowReplies(false);
        return;
      }

      setIsLoadingReplies(true);
      setShowReplies(true);
      try {
        const response = await api.comments.getReplies(comment.id);
        const repliesData = response?.data || response || [];
        setReplies(Array.isArray(repliesData) ? repliesData : []);
      } catch (error) {
        console.error('Failed to load replies:', error);
      } finally {
        setIsLoadingReplies(false);
      }
    };

    return (
      <div className={`rounded-2xl p-4 shadow-sm border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
        <div className="flex items-start gap-3">
          <img
            src={commentAuthor.avatar}
            alt={commentAuthor.name}
            className="w-10 h-10 rounded-full object-cover"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`font-semibold ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                {commentAuthor.name}
              </span>
              <span className={`text-sm ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                @{commentAuthor.username}
              </span>
              <span className={isDarkMode ? 'text-gray-600' : 'text-gray-400'}>·</span>
              <span className={`text-sm ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                {commentTime
                  ? formatDistanceToNow(new Date(commentTime), { addSuffix: true })
                  : 'Just now'
                }
              </span>
            </div>
            <p className={`mt-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-800'}`}>
              {comment.content}
            </p>

            {/* Action Buttons */}
            <div className="flex items-center gap-4 mt-2">
              <button
                onClick={handleLike}
                className={`flex items-center gap-1 text-sm transition-colors ${isLiked
                  ? 'text-rose-500'
                  : isDarkMode ? 'text-gray-500 hover:text-rose-400' : 'text-gray-500 hover:text-rose-500'
                  }`}
              >
                <HeartIcon className="w-4 h-4" filled={isLiked} />
                {likesCount > 0 && likesCount}
              </button>

              <button
                onClick={() => setIsReplying(!isReplying)}
                className={`flex items-center gap-1 text-sm transition-colors ${isDarkMode ? 'text-gray-500 hover:text-indigo-400' : 'text-gray-500 hover:text-indigo-500'
                  }`}
              >
                <ChatBubbleIcon className="w-4 h-4" />
                {t('reply') || 'Reply'}
              </button>

              {replyCount > 0 && (
                <button
                  onClick={fetchReplies}
                  className={`text-sm font-medium ${isDarkMode ? 'text-indigo-400 hover:text-indigo-300' : 'text-indigo-600 hover:text-indigo-700'}`}
                >
                  {showReplies
                    ? (t('hideReplies') || 'Hide Replies')
                    : `${t('viewReplies') || 'View'} ${replyCount} ${t('replies') || 'Replies'}`
                  }
                </button>
              )}
            </div>

            {/* Reply Input */}
            {isReplying && (
              <form onSubmit={handleReplySubmit} className="mt-3 flex gap-2">
                <input
                  type="text"
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder={t('writeReply') || "Write a reply..."}
                  autoFocus
                  className={`flex-1 px-3 py-2 text-sm rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 ${isDarkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-800'
                    }`}
                />
                <button
                  type="submit"
                  disabled={!replyContent.trim() || isSubmittingReply}
                  className="p-2 bg-indigo-600 text-white rounded-xl disabled:opacity-50"
                >
                  {isSubmittingReply ? <Loader2 className="w-4 h-4 animate-spin" /> : <SendIcon className="w-4 h-4" />}
                </button>
              </form>
            )}

            {/* Nested Replies */}
            {showReplies && (
              <div className="mt-3 space-y-3 pl-4 border-l-2 border-gray-200 dark:border-gray-700">
                {isLoadingReplies ? (
                  <div className="flex justify-center py-2">
                    <Loader2 className="w-4 h-4 text-indigo-500 animate-spin" />
                  </div>
                ) : (
                  replies.map(reply => (
                    <CommentItem
                      key={reply.id}
                      comment={reply}
                      threadId={threadId}
                      onReplySuccess={() => { }}
                    />
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (!post) return null;

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={onBack}
          className={`p-2 -ml-2 rounded-xl transition-colors ${isDarkMode
            ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          aria-label="Go back"
        >
          <ArrowLeftIcon className="w-6 h-6" />
        </button>
        <h1 className={`text-xl font-bold ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
          {t('thread') || 'Thread'}
        </h1>
      </div>

      {/* Post Card */}
      <article className={`rounded-3xl p-6 shadow-lg border ${isDarkMode
        ? 'bg-gray-800 border-gray-700'
        : 'bg-white border-gray-100'
        } mb-4`}>
        {/* Author Header */}
        <div
          className="flex items-center gap-3 mb-4 cursor-pointer"
          onClick={() => onUserClick?.(author.id)}
        >
          <img
            src={author.avatar}
            alt={author.name}
            className={`w-14 h-14 rounded-full object-cover ring-2 ${isDarkMode ? 'ring-gray-700' : 'ring-gray-100'
              }`}
          />
          <div className="flex-1">
            <div className="flex items-center gap-1.5">
              <span className={`font-bold text-lg ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                {author.name}
              </span>
              {author.verified && (
                <CheckBadgeIcon className="w-5 h-5 text-indigo-500" />
              )}
            </div>
            <span className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>
              @{author.username}
            </span>
          </div>
        </div>

        {/* Content */}
        <ContentRenderer content={post.content || post.text} className="text-xl mb-4" />

        {/* Media Gallery */}
        {mediaItems.length > 0 && (
          <div className="mb-4 -mx-6 relative">
            {/* Main Media Display */}
            <div className="relative">
              {mediaItems[currentMediaIndex].type === 'VIDEO' ? (
                <video
                  src={mediaItems[currentMediaIndex].url}
                  controls
                  className="w-full max-h-[500px] object-contain bg-black"
                />
              ) : (
                <img
                  src={mediaItems[currentMediaIndex].url}
                  alt={`Media ${currentMediaIndex + 1}`}
                  className="w-full max-h-[500px] object-cover"
                />
              )}

              {/* Media Navigation Dots */}
              {mediaItems.length > 1 && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                  {mediaItems.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentMediaIndex(index)}
                      className={`w-2 h-2 rounded-full transition-all ${index === currentMediaIndex
                        ? 'bg-white w-4'
                        : 'bg-white/50 hover:bg-white/75'
                        }`}
                      aria-label={`View media ${index + 1}`}
                    />
                  ))}
                </div>
              )}

              {/* Navigation Arrows */}
              {mediaItems.length > 1 && (
                <>
                  <button
                    onClick={() => setCurrentMediaIndex(prev => prev > 0 ? prev - 1 : mediaItems.length - 1)}
                    className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
                    aria-label="Previous media"
                  >
                    <ArrowLeftIcon className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setCurrentMediaIndex(prev => prev < mediaItems.length - 1 ? prev + 1 : 0)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors rotate-180"
                    aria-label="Next media"
                  >
                    <ArrowLeftIcon className="w-5 h-5" />
                  </button>
                </>
              )}
            </div>

            {/* Thumbnail Strip for multiple media */}
            {mediaItems.length > 1 && (
              <div className="flex gap-2 px-6 mt-3">
                {mediaItems.map((item, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentMediaIndex(index)}
                    className={`w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 transition-all ${index === currentMediaIndex
                      ? 'ring-2 ring-indigo-500'
                      : 'opacity-60 hover:opacity-100'
                      }`}
                  >
                    <img
                      src={item.url}
                      alt={`Thumbnail ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Timestamp */}
        <p className={`text-sm pb-4 border-b ${isDarkMode ? 'text-gray-500 border-gray-700' : 'text-gray-500 border-gray-100'
          }`}>
          {formattedTime}
        </p>

        {/* Stats */}
        <div className={`flex items-center gap-6 py-4 border-b text-sm ${isDarkMode ? 'border-gray-700' : 'border-gray-100'
          }`}>
          <span>
            <strong className={isDarkMode ? 'text-gray-100' : 'text-gray-900'}>
              {likesCount.toLocaleString()}
            </strong>
            <span className={isDarkMode ? 'text-gray-500' : 'text-gray-500'}> {t('likes') || 'Likes'}</span>
          </span>
          <span>
            <strong className={isDarkMode ? 'text-gray-100' : 'text-gray-900'}>
              {commentsCount}
            </strong>
            <span className={isDarkMode ? 'text-gray-500' : 'text-gray-500'}> {t('comments') || 'Comments'}</span>
          </span>
          <span>
            <strong className={isDarkMode ? 'text-gray-100' : 'text-gray-900'}>
              {sharesCount}
            </strong>
            <span className={isDarkMode ? 'text-gray-500' : 'text-gray-500'}> {t('shares') || 'Shares'}</span>
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-around pt-4">
          <button
            onClick={() => onLike?.(post)}
            className={`flex items-center gap-2 p-3 rounded-xl transition-all duration-300 ${isLiked
              ? 'text-rose-500 bg-rose-500/10'
              : isDarkMode
                ? 'text-gray-400 hover:text-rose-500 hover:bg-rose-500/10'
                : 'text-gray-500 hover:text-rose-500 hover:bg-rose-50'
              }`}
            aria-label={isLiked ? 'Unlike' : 'Like'}
            aria-pressed={isLiked}
          >
            <HeartIcon className="w-6 h-6" filled={isLiked} />
          </button>
          <button
            className={`flex items-center gap-2 p-3 rounded-xl transition-all duration-300 ${isDarkMode
              ? 'text-gray-400 hover:text-indigo-400 hover:bg-indigo-500/10'
              : 'text-gray-500 hover:text-indigo-500 hover:bg-indigo-50'
              }`}
            aria-label="Comment"
          >
            <ChatBubbleIcon className="w-6 h-6" />
          </button>
          <button
            className={`flex items-center gap-2 p-3 rounded-xl transition-all duration-300 ${isDarkMode
              ? 'text-gray-400 hover:text-green-400 hover:bg-green-500/10'
              : 'text-gray-500 hover:text-green-500 hover:bg-green-50'
              }`}
            aria-label="Share"
          >
            <ShareIcon className="w-6 h-6" />
          </button>
          <button
            onClick={() => setIsBookmarked(!isBookmarked)}
            className={`p-3 rounded-xl transition-all duration-300 ${isBookmarked
              ? 'text-amber-500 bg-amber-500/10'
              : isDarkMode
                ? 'text-gray-400 hover:text-amber-500 hover:bg-amber-500/10'
                : 'text-gray-500 hover:text-amber-500 hover:bg-amber-50'
              }`}
            aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark'}
            aria-pressed={isBookmarked}
          >
            <BookmarkIcon className="w-6 h-6" filled={isBookmarked} />
          </button>
        </div>
      </article>

      {/* Comment Input */}
      <form
        onSubmit={handleSubmitComment}
        className={`rounded-3xl p-4 shadow-sm border mb-4 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'
          }`}
      >
        <div className="flex items-center gap-3">
          <img
            src={user?.avatar || getMediaUrl(user?.photoUrl) || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.firstName || user?.full_name || 'User')}&background=6366f1&color=fff`}
            alt="You"
            className={`w-10 h-10 rounded-full object-cover ring-2 ${isDarkMode ? 'ring-gray-700' : 'ring-gray-100'
              }`}
          />
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder={t('writeComment') || 'Write a comment...'}
            className={`flex-1 px-4 py-2.5 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500 ${isDarkMode
              ? 'bg-gray-700 text-gray-200 placeholder-gray-500'
              : 'bg-gray-100 text-gray-800 placeholder-gray-500'
              }`}
          />
          <button
            type="submit"
            disabled={!newComment.trim() || isSubmitting}
            className="p-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-full disabled:opacity-50 transition-all hover:shadow-lg hover:shadow-indigo-500/30"
            aria-label="Send comment"
          >
            {isSubmitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <SendIcon className="w-5 h-5" />
            )}
          </button>
        </div>
      </form>

      {/* Comments */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
          </div>
        ) : comments.length === 0 ? (
          <div className={`rounded-3xl p-8 text-center ${isDarkMode ? 'bg-gray-800' : 'bg-white'
            }`}>
            <p className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>
              {t('noComments') || 'No comments yet. Be the first to comment!'}
            </p>
          </div>
        ) : (
          comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              threadId={post.id}
            />
          ))
        )}
      </div>
    </div>
  );
}