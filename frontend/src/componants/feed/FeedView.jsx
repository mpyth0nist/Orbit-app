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
  currentUserEmail 
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
        <p className="text-gray-500">Be the first to share something!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stories/Highlights Bar */}
      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
        {['Your Story', 'Tech', 'Design', 'Gaming', 'Travel', 'Music'].map((story, i) => (
          <div key={story} className="flex flex-col items-center gap-2 flex-shrink-0">
            <div className={`w-16 h-16 rounded-full p-0.5 ${i === 0 ? 'bg-gray-200' : 'bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500'}`}>
              <div className="w-full h-full bg-white rounded-full p-0.5">
                <div className="w-full h-full rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center">
                  {i === 0 ? (
                    <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  ) : (
                    <span className="text-2xl">{['✨', '🎨', '🎮', '✈️', '🎵'][i-1]}</span>
                  )}
                </div>
              </div>
            </div>
            <span className="text-xs text-gray-600 font-medium">{story}</span>
          </div>
        ))}
      </div>

      {/* Posts */}
      {posts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          currentUserEmail={currentUserEmail}
          onClick={() => onPostClick?.(post)}
          onLike={onLike}
          onComment={onComment}
          onShare={onShare}
        />
      ))}
    </div>
  );
}