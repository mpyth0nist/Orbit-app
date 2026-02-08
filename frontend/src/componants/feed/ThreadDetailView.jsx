import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeftIcon, HeartIcon, ChatBubbleIcon, ShareIcon, BookmarkIcon, CheckBadgeIcon, SendIcon, EllipsisHorizontalIcon, TrashIcon, PencilIcon, LinkIcon, HandThumbUpIcon, StarIcon } from '../ui/Icons';
import api, { getMediaUrl, threadsAPI, usersAPI } from '../../api/apiClient';
import { format, formatDistanceToNow } from 'date-fns';
import ContentRenderer from '../ui/ContentRenderer';
import EditThreadModal from './EditThreadModal';
import { Loader2 } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import TierBadge from '../ui/TierBadge';

/**
 * ThreadDetailView - Stylish detailed view of a single thread/post
 * Supports dark mode, multi-media gallery, and new backend data format
 */
export default function ThreadDetailView({
  post,
  onBack,
  onLike,
  onShare,
  onUserClick,
  user,
  // Community-specific props
  communityId = null,        // ID of the community (if thread belongs to one)
  isCommunityMember = true,  // Whether user is a member (defaults to true for non-community threads)
  onJoinCommunity = null,    // Callback to join community
}) {
  const [comments, setComments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [showRepostMenu, setShowRepostMenu] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const navigate = useNavigate();
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
  const repostsCount = post?.repostsCount ?? post?.reposts_count ?? 0;
  const isLiked = post?.isLiked ?? false;
  const isOwnPost = user?.id && post?.user?.id === user.id;

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
      toast.success('Comment posted successfully');
    } catch (error) {
      console.error('Failed to post comment:', error);
      // Show user-friendly message for 403 (non-member trying to comment)
      if (error.response?.status === 403) {
        toast.error(error.response?.data?.message || 'You must be a community member to comment on this post');
      } else {
        toast.error('Failed to post comment. Please try again.');
      }
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

  /* CommentItem Component with Flattened Nesting */
  const CommentItem = ({ comment, threadId, onReplySuccess, depth = 0, parentAuthor = null }) => {
    const [likesCount, setLikesCount] = useState(comment.likesCount || comment.likes_count || 0);
    const [isLiked, setIsLiked] = useState(comment.isLiked || false);
    const [isReplying, setIsReplying] = useState(false);
    const [replyContent, setReplyContent] = useState('');
    const [isSubmittingReply, setIsSubmittingReply] = useState(false);

    const [showReplies, setShowReplies] = useState(false);
    const [replies, setReplies] = useState([]);
    const [isLoadingReplies, setIsLoadingReplies] = useState(false);
    const [replyCount, setReplyCount] = useState(comment._count?.comments || 0);
    const [helpType, setHelpType] = useState(comment.helpType);

    // Options Menu & Editing State
    const [showOptionsMenu, setShowOptionsMenu] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState(comment.content);
    const [isUpdating, setIsUpdating] = useState(false);
    const [currentContent, setCurrentContent] = useState(comment.content); // Local state for immediate update

    const commentAuthor = getCommentAuthor(comment);
    const commentTime = comment.createdAt || comment.created_date;
    const isOwnComment = user?.id === comment.userId;

    // Logic for flattening replies:
    const shouldIndentChildren = depth < 2;
    const shouldShowTag = depth >= 3;

    const handleLike = async () => {
      const newIsLiked = !isLiked;
      setIsLiked(newIsLiked);
      setLikesCount(prev => newIsLiked ? prev + 1 : prev - 1);

      try {
        await api.reactions.toggle('comment', comment.id);
      } catch (error) {
        console.error('Failed to toggle like:', error);
        setIsLiked(!newIsLiked);
        setLikesCount(prev => newIsLiked ? prev - 1 : prev + 1);
        toast.error('Failed to like comment');
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

        if (showReplies) {
          setReplies(prev => [...prev, newReply]);
        }
        setReplyCount(prev => prev + 1);

        setReplyContent('');
        setIsReplying(false);
        if (!showReplies) fetchReplies();
        toast.success('Reply posted successfully');
      } catch (error) {
        console.error('Failed to reply:', error);
        if (error.response?.status === 403) {
          toast.error(error.response?.data?.message || 'You must be a community member to comment on this post');
        } else {
          toast.error('Failed to post reply. Please try again.');
        }
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

    const handleMarkHelpful = async (type) => {
      try {
        const newHelpType = helpType === type ? null : type;
        const response = await api.comments.toggleHelpful(comment.id, newHelpType);
        const updatedHelpType = response?.data?.helpType ?? response?.helpType ?? newHelpType;
        setHelpType(updatedHelpType);

        if (updatedHelpType) {
          toast.success(`Marked as ${updatedHelpType === 'BIG_HELP' ? 'Big Help' : 'Helpful'}`);
        } else {
          toast.success('Rating removed');
        }
      } catch (error) {
        console.error('Failed to mark helpful:', error);
        toast.error('Failed to update help rating');
      }
    };

    // Options Menu Handlers
    const handleOptionsClick = (e) => {
      e.stopPropagation();
      setShowOptionsMenu(prev => !prev);
    };

    const handleEditClick = (e) => {
      e.stopPropagation();
      setShowOptionsMenu(false);
      setIsEditing(true);
      setEditContent(currentContent);
    };

    const handleDeleteClick = async (e) => {
      e.stopPropagation();
      setShowOptionsMenu(false);
      if (window.confirm('Are you sure you want to delete this comment?')) {
        try {
          await api.comments.delete(comment.id);
          // Remove comment from local state
          // If it's a top-level comment, remove from 'comments' state
          // If it's a reply, remove from 'replies' state (if in CommentItem context)

          if (depth === 0) {
            setComments(prev => prev.filter(c => c.id !== comment.id));
          } else {
            // For replies, we can't easily update parent's state from here without a callback
            // But we can hide this component locally or trigger a callback
            // Let's assume onReplySuccess or similar could be used for refresh, 
            // but for now, we'll just hide it or ideally we passed a callback for deletion.
            // Since we didn't add a onDelete callback prop, we might need to refresh replies or lift state.
            // For simplicity in this iteration:
            // modifying element display style or simply reloading replies if possible.
            // Best approach: Add onDelete callback to CommentItem.
            // However, since we are inside the component, we can try to hack it by locating the parent in the replies array if we had access to setReplies of parent.
            // We passed 'replies' and 'setReplies' in the parent CommentItem.
            // Wait, CommentItem is recursive.
            // We need to pass a callback to remove from parent list.
            // Let's hide it visually for now or trigger reload.
            toast.success('Comment deleted');
            // To properly delete, we should likely refetch or update parent state.
            // Creating a simple "isDeleted" state to hide it.
            setIsDeleted(true);
          }
        } catch (error) {
          console.error('Failed to delete comment:', error);
          toast.error('Failed to delete comment');
        }
      }
    };

    // Quick fix: Add isDeleted state to hide component if deleted
    const [isDeleted, setIsDeleted] = useState(false);

    const handleUpdateSubmit = async (e) => {
      e.preventDefault();
      if (!editContent.trim() || isUpdating) return;

      setIsUpdating(true);
      try {
        await api.comments.update(comment.id, { content: editContent.trim() });
        setCurrentContent(editContent.trim());
        setIsEditing(false);
        toast.success('Comment updated');
      } catch (error) {
        console.error('Failed to update comment:', error);
        toast.error('Failed to update comment');
      } finally {
        setIsUpdating(false);
      }
    };

    if (isDeleted) return null;

    const isDeep = depth >= 2;
    const wrapperClass = depth > 0 ? 'mt-3 w-full' : 'w-full';
    const contentClasses = !isDeep
      ? `rounded-2xl p-4 shadow-sm border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`
      : `py-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-800'}`;

    return (
      <div className={wrapperClass}>
        <div className={contentClasses}>
          <div className="flex items-start gap-3">
            <img src={commentAuthor.avatar} alt={commentAuthor.name} className="w-10 h-10 rounded-full object-cover" />
            <div className="flex-1 min-w-0">
              {/* Header: Name, Verified, Time, Options */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`font-semibold ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>{commentAuthor.name}</span>
                  {post?.threadType === 'HELP' && <TierBadge points={comment.user?.profile?.points || 0} />}
                  <span className={`text-sm ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>@{commentAuthor.username}</span>
                  {shouldShowTag && parentAuthor && (
                    <span className={`flex items-center gap-1 text-sm ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                      <span>·</span>
                      <span className={isDarkMode ? 'text-gray-400' : 'text-gray-400'}>{t('replyingTo') || 'Replying to'}</span>
                      <span className="text-indigo-500 font-medium">@{parentAuthor.username}</span>
                    </span>
                  )}
                  <span className={isDarkMode ? 'text-gray-600' : 'text-gray-400'}>·</span>
                  <span className={`text-sm ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                    {commentTime ? formatDistanceToNow(new Date(commentTime), { addSuffix: true }) : 'Just now'}
                  </span>
                </div>

                {/* Options Menu Button for Own Comment */}
                {isOwnComment && (
                  <div className="relative">
                    <button
                      onClick={handleOptionsClick}
                      className={`p-1 rounded-lg transition-colors ${isDarkMode ? 'text-gray-500 hover:bg-gray-700 hover:text-gray-300' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'}`}
                      aria-label="Comment options"
                    >
                      <EllipsisHorizontalIcon className="w-5 h-5" />
                    </button>

                    {showOptionsMenu && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={(e) => { e.stopPropagation(); setShowOptionsMenu(false); }} />
                        <div className={`absolute right-0 top-8 w-40 rounded-xl shadow-xl border overflow-hidden z-20 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`} onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={handleEditClick}
                            className={`w-full flex items-center gap-2 px-3 py-2 text-sm font-medium transition-colors ${isDarkMode ? 'hover:bg-gray-700 text-gray-200' : 'hover:bg-gray-50 text-gray-700'}`}
                          >
                            <PencilIcon className="w-4 h-4 text-indigo-500" />
                            Edit
                          </button>
                          <button
                            onClick={handleDeleteClick}
                            className={`w-full flex items-center gap-2 px-3 py-2 text-sm font-medium transition-colors ${isDarkMode ? 'hover:bg-gray-700 text-red-400' : 'hover:bg-red-50 text-red-500'}`}
                          >
                            <TrashIcon className="w-4 h-4" />
                            Delete
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Content or Edit Form */}
              {isEditing ? (
                <form onSubmit={handleUpdateSubmit} className="mt-2">
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className={`w-full p-3 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 ${isDarkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-50 text-gray-800'}`}
                    rows={2}
                    autoFocus
                  />
                  <div className="flex justify-end gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg ${isDarkMode ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-500 hover:bg-gray-100'}`}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={!editContent.trim() || isUpdating}
                      className="px-3 py-1.5 text-xs font-medium bg-indigo-600 text-white rounded-lg disabled:opacity-50"
                    >
                      {isUpdating ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </form>
              ) : (
                <ContentRenderer content={currentContent} className={`mt-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-800'}`} />
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-4 mt-2">
                <button
                  onClick={handleLike}
                  className={`flex items-center gap-1 text-sm transition-colors ${isLiked ? 'text-rose-500' : isDarkMode ? 'text-gray-500 hover:text-rose-400' : 'text-gray-500 hover:text-rose-500'}`}
                >
                  <HeartIcon className="w-4 h-4" filled={isLiked} />
                  {likesCount > 0 && likesCount}
                </button>

                {isCommunityMember && (
                  <button
                    onClick={() => setIsReplying(!isReplying)}
                    className={`flex items-center gap-1 text-sm transition-colors ${isDarkMode ? 'text-gray-500 hover:text-indigo-400' : 'text-gray-500 hover:text-indigo-500'}`}
                  >
                    <ChatBubbleIcon className="w-4 h-4" />
                    {t('reply') || 'Reply'}
                  </button>
                )}

                {replyCount > 0 && (
                  <button
                    onClick={fetchReplies}
                    className={`text-sm font-medium ${isDarkMode ? 'text-indigo-400 hover:text-indigo-300' : 'text-indigo-600 hover:text-indigo-700'}`}
                  >
                    {showReplies ? (t('hideReplies') || 'Hide Replies') : `${t('viewReplies') || 'View'} ${replyCount} ${t('replies') || 'Replies'}`}
                  </button>
                )}

                {post?.threadType === 'HELP' && user?.id === post.userId && comment.user?.id !== user?.id && (
                  <div className="flex items-center gap-1 ml-auto">
                    <button
                      onClick={() => handleMarkHelpful('HELPFUL')}
                      className={`p-1.5 rounded-lg transition-colors ${helpType === 'HELPFUL' ? 'text-teal-600 bg-teal-50 ring-1 ring-teal-200' : 'text-gray-400 hover:text-teal-600 hover:bg-teal-50'}`}
                      title="Mark as Helpful (+1 Point)"
                    >
                      <HandThumbUpIcon className="w-5 h-5" filled={helpType === 'HELPFUL'} />
                    </button>
                    <button
                      onClick={() => handleMarkHelpful('BIG_HELP')}
                      className={`p-1.5 rounded-lg transition-colors ${helpType === 'BIG_HELP' ? 'text-yellow-500 bg-yellow-50 ring-1 ring-yellow-200' : 'text-gray-400 hover:text-yellow-500 hover:bg-yellow-50'}`}
                      title="Mark as Big Help (+2 Points)"
                    >
                      <StarIcon className="w-5 h-5" filled={helpType === 'BIG_HELP'} />
                    </button>
                  </div>
                )}

                {helpType && (user?.id !== post.userId || comment.user?.id === user?.id) && (
                  <div className={`ml-auto flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${helpType === 'BIG_HELP' ? 'bg-yellow-100 text-yellow-700' : 'bg-teal-100 text-teal-700'}`}>
                    {helpType === 'BIG_HELP' ? <StarIcon className="w-3 h-3" filled /> : <HandThumbUpIcon className="w-3 h-3" filled />}
                    {helpType === 'BIG_HELP' ? 'Big Help' : 'Helpful'}
                  </div>
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
                    className={`flex-1 px-3 py-2 text-sm rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 ${isDarkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-800'}`}
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
            </div>
          </div>
        </div>

        {showReplies && (
          <div className={`mt-2 ${shouldIndentChildren ? 'pl-4 border-l-2 ml-4 border-gray-200 dark:border-gray-700' : ''}`}>
            {isLoadingReplies ? (
              <div className="flex justify-center py-2"><Loader2 className="w-4 h-4 text-indigo-500 animate-spin" /></div>
            ) : (
              replies.map(reply => (
                <CommentItem
                  key={reply.id}
                  comment={reply}
                  threadId={threadId}
                  onReplySuccess={() => { }}
                  depth={depth + 1}
                  parentAuthor={commentAuthor}
                />
              ))
            )}
          </div>
        )}
      </div>
    );
  };

  const handleRepost = (e) => {
    e.stopPropagation();
    setShowRepostMenu(false);
    onShare?.(post);
  };

  const handleQuote = (e) => {
    e.stopPropagation();
    setShowRepostMenu(false);
    navigate(`/create?quoteId=${post.id}`);
  };

  const handleOriginalPostClick = (e) => {
    e.stopPropagation();
    if (post.originalPost) {
      navigate(`/thread/${post.originalPost.id}`);
    }
  };

  const handleOptionsClick = (e) => {
    e.stopPropagation();
    setShowOptionsMenu(!showOptionsMenu);
  };

  const handleCopyLink = (e) => {
    e?.stopPropagation();
    const link = `${window.location.origin}/thread/${post.id}`;
    navigator.clipboard.writeText(link).then(() => {
      toast.success('Link copied to clipboard');
      setShowOptionsMenu(false);
    });
  };

  const handleEdit = (e) => {
    e?.stopPropagation();
    setShowOptionsMenu(false);
    setIsEditing(true);
  };

  const handleDelete = async () => {
    setShowOptionsMenu(false);
    if (window.confirm('Are you sure you want to delete this thread?')) {
      try {
        await threadsAPI.delete(post.id);
        toast.success('Thread deleted successfully');
        navigate(-1); // Go back after delete
      } catch (error) {
        console.error('Failed to delete thread:', error);
        toast.error('Failed to delete thread');
      }
    }
  };

  const handleEditResult = (updatedThread) => {
    // In a real app, we'd update the local post state or invalidate queries
    // For now, we'll reload the page to fetch fresh data or you can update local state if `post` was state
    window.location.reload();
  };

  useEffect(() => {
    if (post) {
      setIsBookmarked(post.isSaved || false);
    }
  }, [post?.isSaved]);

  const handleBookmark = async () => {
    const newVal = !isBookmarked;
    setIsBookmarked(newVal);
    try {
      await threadsAPI.toggleSave(post.id);
      toast.success(newVal ? 'Thread saved' : 'Thread unsaved');
    } catch (error) {
      console.error('Failed to toggle bookmark:', error);
      setIsBookmarked(!newVal);
      toast.error('Failed to update bookmark');
    }
  };

  // Render original thread if this is a repost
  const renderRepostedThread = () => {
    if (!post?.originalPost) return null;

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
        className={`mt-3 p-5 rounded-2xl border ${isDarkMode
          ? 'bg-gray-900/50 border-gray-700/50'
          : 'bg-gray-50/50 border-gray-200/50'
          } hover:border-indigo-500/30 transition-colors cursor-pointer`}>
        <div className="flex items-center gap-2 mb-3">
          <img
            src={getMediaUrl(originalProfile.photoUrl || originalAuthor.photoUrl) || `https://ui-avatars.com/api/?name=${encodeURIComponent(originalDisplayName)}&background=6366f1&color=fff`}
            className="w-6 h-6 rounded-full object-cover"
            alt=""

          />
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className={`text-sm font-bold truncate ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                {originalDisplayName}
              </span>
              <span className="text-xs text-gray-500">@{originalAuthor.username}</span>
            </div>
            <span className="text-[10px] text-gray-500">{originalTimeAgo}</span>
          </div>
        </div>
        <div className={`text-base leading-relaxed ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
          <ContentRenderer content={originalThread.content} />
        </div>
        {originalThread.media && originalThread.media.length > 0 && (
          <div className="mt-3 rounded-2xl overflow-hidden border border-white/5">
            <img
              src={getMediaUrl(originalThread.media[0].url)}
              className="w-full max-h-64 object-cover"
              alt="Original media"
            />
          </div>
        )}
      </div>
    );
  };

  if (!post) return null;

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => onBack ? onBack() : navigate(-1)}
          className={`p-2 -ml-2 rounded-xl transition-colors ${isDarkMode
            ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          aria-label="Go back"
        >
          <ArrowLeftIcon className="w-6 h-6" />
        </button>
        <h1 className={`text-xl font-bold flex-1 ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
          {t('thread') || 'Thread'}
        </h1>

        {/* Options Menu Button */}
        {isOwnPost && (
          <div className="relative">
            <button
              onClick={handleOptionsClick}
              className={`p-2 rounded-xl transition-colors ${showOptionsMenu
                ? isDarkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-700'
                : isDarkMode
                  ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              aria-label="Thread options"
            >
              <EllipsisHorizontalIcon className="w-6 h-6" />
            </button>

            {/* Options Dropdown */}
            {showOptionsMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={(e) => { e.stopPropagation(); setShowOptionsMenu(false); }}
                />
                <div
                  className={`absolute right-0 top-12 w-48 rounded-2xl shadow-xl border overflow-hidden z-20 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'
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
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {isEditing && (
        <EditThreadModal
          thread={post}
          onClose={() => setIsEditing(false)}
          onSuccess={handleEditResult}
        />
      )}

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
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/profile/${author.id}`);
            }}
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

        {/* Repost Indicator for simple reposts (where content is empty) */}
        {post.originalPost && !post.content && (
          <div className="flex items-center gap-2 mb-4 px-1 text-xs font-bold text-green-500 uppercase tracking-widest">
            <ShareIcon className="w-4 h-4" />
            <span>Reposted</span>
          </div>
        )}

        {/* Content */}
        <ContentRenderer content={post.content || post.text} className="text-xl mb-4" />

        {/* Reposted Thread Content */}
        {renderRepostedThread()}

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
              {repostsCount}
            </strong>
            <span className={isDarkMode ? 'text-gray-500' : 'text-gray-500'}> {t('reposts') || 'Reposts'}</span>
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
          <div className="relative">
            <button
              onClick={() => setShowRepostMenu(!showRepostMenu)}
              className={`flex items-center gap-2 p-3 rounded-xl transition-all duration-300 ${showRepostMenu
                ? 'text-green-500 bg-green-500/10'
                : isDarkMode
                  ? 'text-gray-400 hover:text-green-400 hover:bg-green-500/10'
                  : 'text-gray-500 hover:text-green-500 hover:bg-green-50'
                }`}
              aria-label="Repost"
            >
              <ShareIcon className="w-6 h-6" />
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
          <button
            onClick={handleBookmark}
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

      {/* Comment Input - Conditional based on community membership */}
      {communityId && !isCommunityMember ? (
        <div
          className={`rounded-3xl p-6 shadow-sm border mb-4 text-center ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'
            }`}
        >
          <p className={`text-lg font-semibold mb-2 ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
            Join this community to participate
          </p>
          <p className={`text-sm mb-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Only community members can comment on posts. Join to share your thoughts!
          </p>
          {onJoinCommunity && (
            <button
              onClick={onJoinCommunity}
              className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-full font-medium hover:shadow-lg hover:shadow-indigo-500/30 transition-all"
            >
              Join Community
            </button>
          )}
        </div>
      ) : (
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
              )
                : (
                  <SendIcon className="w-5 h-5" />
                )}
            </button>
          </div>
        </form>
      )}

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
    </div >
  );
}