import React from 'react';
import PostCard from './PostCard';
import { Loader2 } from 'lucide-react';

export default function FeedView({
  posts,
  isLoading,
  onPostClick,
  onLike,
  onComment,
  onShare,
  onBookmark,
  currentUserEmail,
  currentUserId,
  currentTab = "following",
}) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  if (!posts?.length) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <svg className="w-10 h-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-1">No posts yet</h3>
        <p className="text-gray-500">{currentTab === "following" ? "Be the first to share something!" : "No posts to display"}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stories/Highlights Bar */}


      {/* Posts */}
      {posts && posts.length > 0 ? (
        posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            currentUserEmail={currentUserEmail}
            onClick={() => onPostClick?.(post)}
            onLike={onLike}
            onComment={onComment}
            onShare={onShare}
            onBookmark={onBookmark}
            isLiked={post.isLiked}
            isBookmarked={post.isSaved}
            isOwnPost={currentUserId === post.userId || currentUserId === post.user?.id}
          />
        ))
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">No posts to display</p>
          <p className="text-gray-400 text-sm mt-2">Follow some users to see their posts here!</p>
        </div>
      )}
    </div>
  );
}