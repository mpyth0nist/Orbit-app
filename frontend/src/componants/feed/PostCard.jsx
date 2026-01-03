import React, { useState } from 'react';
import { HeartIcon, ChatBubbleIcon, ShareIcon, BookmarkIcon, CheckBadgeIcon, EllipsisHorizontalIcon } from '../ui/Icons';
import { format } from 'date-fns';

export default function PostCard({ 
  post, 
  onLike, 
  onComment, 
  onShare, 
  onClick,
  currentUserEmail 
}) {
  const [isBookmarked, setIsBookmarked] = useState(false);
  const isLiked = post.liked_by?.includes(currentUserEmail);
  
  const timeAgo = post.created_date 
    ? format(new Date(post.created_date), 'MMM d')
    : 'Just now';

  return (
    <article 
      onClick={onClick}
      className="bg-white rounded-3xl p-5 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer border border-gray-100/50"
    >
      {/* Author Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <img
            src={post.author_avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(post.author_name)}&background=6366f1&color=fff`}
            alt={post.author_name}
            className="w-12 h-12 rounded-full object-cover ring-2 ring-gray-100"
          />
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-gray-900">{post.author_name}</span>
              {post.author_verified && (
                <CheckBadgeIcon className="w-5 h-5 text-indigo-500" />
              )}
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span>@{post.author_handle}</span>
              <span>·</span>
              <span>{timeAgo}</span>
            </div>
          </div>
        </div>
        <button 
          onClick={(e) => e.stopPropagation()}
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
        >
          <EllipsisHorizontalIcon className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="mb-4">
        <p className="text-gray-800 text-[15px] leading-relaxed whitespace-pre-wrap">
          {post.content}
        </p>
      </div>

      {/* Image */}
      {post.image_url && (
        <div className="mb-4 -mx-5">
          <img
            src={post.image_url}
            alt="Post"
            className="w-full max-h-96 object-cover"
          />
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onLike?.(post);
            }}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all duration-300 ${
              isLiked 
                ? 'text-rose-500 bg-rose-50' 
                : 'text-gray-500 hover:text-rose-500 hover:bg-rose-50'
            }`}
          >
            <HeartIcon className="w-5 h-5" filled={isLiked} />
            <span className="text-sm font-medium">{post.likes_count || 0}</span>
          </button>
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              onComment?.(post);
            }}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-gray-500 hover:text-indigo-500 hover:bg-indigo-50 transition-all duration-300"
          >
            <ChatBubbleIcon className="w-5 h-5" />
            <span className="text-sm font-medium">{post.comments_count || 0}</span>
          </button>
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              onShare?.(post);
            }}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-gray-500 hover:text-green-500 hover:bg-green-50 transition-all duration-300"
          >
            <ShareIcon className="w-5 h-5" />
            <span className="text-sm font-medium">{post.shares_count || 0}</span>
          </button>
        </div>
        
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsBookmarked(!isBookmarked);
          }}
          className={`p-2 rounded-xl transition-all duration-300 ${
            isBookmarked 
              ? 'text-amber-500 bg-amber-50' 
              : 'text-gray-400 hover:text-amber-500 hover:bg-amber-50'
          }`}
        >
          <BookmarkIcon className="w-5 h-5" filled={isBookmarked} />
        </button>
      </div>
    </article>
  );
}