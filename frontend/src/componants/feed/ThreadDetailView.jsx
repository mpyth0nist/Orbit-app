import React, { useState, useEffect } from 'react';
import { ArrowLeftIcon, HeartIcon, ChatBubbleIcon, ShareIcon, BookmarkIcon, CheckBadgeIcon, SendIcon } from '../ui/Icons';
import * as base44 from '@/api/base44Client';
import { format } from 'date-fns';
import { Loader2 } from 'lucide-react';

export default function ThreadDetailView({ 
  post, 
  onBack, 
  onLike,
  currentUserEmail,
  user 
}) {
  const [comments, setComments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);

  const isLiked = post?.liked_by?.includes(currentUserEmail);

  useEffect(() => {
    loadComments();
  }, [post?.id]);

  const loadComments = async () => {
    if (!post?.id) return;
    
    setIsLoading(true);
    try {
      const data = await base44.entities.Comment.filter({ post_id: post.id }, '-created_date');
      setComments(data || []);
    } catch (error) {
      console.error('Failed to load comments:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const comment = await base44.entities.Comment.create({
        post_id: post.id,
        content: newComment.trim(),
        author_name: user?.full_name || 'User',
        author_handle: user?.handle || user?.email?.split('@')[0],
        author_avatar: user?.avatar,
      });

      setComments([comment, ...comments]);
      setNewComment('');

      // Update post comment count
      await base44.entities.Post.update(post.id, {
        comments_count: (post.comments_count || 0) + 1,
      });
    } catch (error) {
      console.error('Failed to post comment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!post) return null;

  const timeAgo = post.created_date 
    ? format(new Date(post.created_date), 'MMM d, yyyy · h:mm a')
    : 'Just now';

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={onBack}
          className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
        >
          <ArrowLeftIcon className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-bold text-gray-900">Thread</h1>
      </div>

      {/* Post */}
      <article className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 mb-4">
        {/* Author */}
        <div className="flex items-center gap-3 mb-4">
          <img
            src={post.author_avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(post.author_name)}&background=6366f1&color=fff`}
            alt={post.author_name}
            className="w-14 h-14 rounded-full object-cover ring-2 ring-gray-100"
          />
          <div className="flex-1">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-gray-900 text-lg">{post.author_name}</span>
              {post.author_verified && (
                <CheckBadgeIcon className="w-5 h-5 text-indigo-500" />
              )}
            </div>
            <span className="text-gray-500">@{post.author_handle}</span>
          </div>
        </div>

        {/* Content */}
        <p className="text-xl text-gray-800 leading-relaxed whitespace-pre-wrap mb-4">
          {post.content}
        </p>

        {/* Image */}
        {post.image_url && (
          <div className="mb-4 -mx-6">
            <img
              src={post.image_url}
              alt="Post"
              className="w-full max-h-[500px] object-cover"
            />
          </div>
        )}

        {/* Time */}
        <p className="text-gray-500 text-sm pb-4 border-b border-gray-100">
          {timeAgo}
        </p>

        {/* Stats */}
        <div className="flex items-center gap-6 py-4 border-b border-gray-100 text-sm">
          <span><strong className="text-gray-900">{post.likes_count || 0}</strong> <span className="text-gray-500">Likes</span></span>
          <span><strong className="text-gray-900">{post.comments_count || 0}</strong> <span className="text-gray-500">Comments</span></span>
          <span><strong className="text-gray-900">{post.shares_count || 0}</strong> <span className="text-gray-500">Shares</span></span>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-around pt-3">
          <button
            onClick={() => onLike?.(post)}
            className={`flex items-center gap-2 p-3 rounded-xl transition-all duration-300 ${
              isLiked 
                ? 'text-rose-500 bg-rose-50' 
                : 'text-gray-500 hover:text-rose-500 hover:bg-rose-50'
            }`}
          >
            <HeartIcon className="w-6 h-6" filled={isLiked} />
          </button>
          <button className="flex items-center gap-2 p-3 text-gray-500 hover:text-indigo-500 hover:bg-indigo-50 rounded-xl transition-all duration-300">
            <ChatBubbleIcon className="w-6 h-6" />
          </button>
          <button className="flex items-center gap-2 p-3 text-gray-500 hover:text-green-500 hover:bg-green-50 rounded-xl transition-all duration-300">
            <ShareIcon className="w-6 h-6" />
          </button>
          <button
            onClick={() => setIsBookmarked(!isBookmarked)}
            className={`p-3 rounded-xl transition-all duration-300 ${
              isBookmarked 
                ? 'text-amber-500 bg-amber-50' 
                : 'text-gray-500 hover:text-amber-500 hover:bg-amber-50'
            }`}
          >
            <BookmarkIcon className="w-6 h-6" filled={isBookmarked} />
          </button>
        </div>
      </article>

      {/* Comment Input */}
      <form onSubmit={handleSubmitComment} className="bg-white rounded-3xl p-4 shadow-sm border border-gray-100 mb-4">
        <div className="flex items-center gap-3">
          <img
            src={user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.full_name || 'User')}&background=6366f1&color=fff`}
            alt="You"
            className="w-10 h-10 rounded-full object-cover ring-2 ring-gray-100"
          />
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Write a comment..."
            className="flex-1 px-4 py-2.5 bg-gray-100 rounded-full text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            type="submit"
            disabled={!newComment.trim() || isSubmitting}
            className="p-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-full disabled:opacity-50 transition-all hover:shadow-lg"
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
          <div className="bg-white rounded-3xl p-8 text-center">
            <p className="text-gray-500">No comments yet. Be the first to comment!</p>
          </div>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-start gap-3">
                <img
                  src={comment.author_avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(comment.author_name)}&background=6366f1&color=fff`}
                  alt={comment.author_name}
                  className="w-10 h-10 rounded-full object-cover"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900">{comment.author_name}</span>
                    <span className="text-sm text-gray-500">@{comment.author_handle}</span>
                    <span className="text-sm text-gray-400">·</span>
                    <span className="text-sm text-gray-400">
                      {comment.created_date ? format(new Date(comment.created_date), 'MMM d') : 'Now'}
                    </span>
                  </div>
                  <p className="text-gray-800 mt-1">{comment.content}</p>
                  <div className="flex items-center gap-4 mt-2">
                    <button className="text-sm text-gray-500 hover:text-rose-500 transition-colors">
                      ♡ {comment.likes_count || 0}
                    </button>
                    <button className="text-sm text-gray-500 hover:text-indigo-500 transition-colors">
                      Reply
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}