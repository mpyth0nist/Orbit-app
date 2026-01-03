import React, { useState, useRef } from 'react';
import { ArrowLeftIcon, PhotoIcon, SparklesIcon, XMarkIcon, GlobeIcon } from '../ui/Icons';
import * as base44 from '@/api/base44Client';
import { Loader2 } from 'lucide-react';

export default function CreatePostView({ onBack, onPost, user }) {
  const [content, setContent] = useState('');
  const [imagePreview, setImagePreview] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const fileInputRef = useRef(null);

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImagePreview(null);
    setImageFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleEnhanceWithAI = async () => {
    if (!content.trim()) return;
    
    setIsEnhancing(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a social media expert. Enhance the following post to make it more engaging, add relevant emojis, and improve readability while keeping the original message. Keep it concise (max 280 chars). 

Original post: "${content}"

Return only the enhanced post text, nothing else.`,
      });
      
      if (result) {
        setContent(typeof result === 'string' ? result : result.enhanced_post || content);
      }
    } catch (error) {
      console.error('AI enhancement failed:', error);
    } finally {
      setIsEnhancing(false);
    }
  };

  const handlePost = async () => {
    if (!content.trim()) return;
    
    setIsPosting(true);
    try {
      let imageUrl = null;
      
      if (imageFile) {
        const uploadResult = await base44.integrations.Core.UploadFile({ file: imageFile });
        imageUrl = uploadResult.file_url;
      }

      await onPost({
        content: content.trim(),
        image_url: imageUrl,
      });

      setContent('');
      setImagePreview(null);
      setImageFile(null);
      onBack?.();
    } catch (error) {
      console.error('Failed to post:', error);
    } finally {
      setIsPosting(false);
    }
  };

  const charCount = content.length;
  const maxChars = 500;
  const charPercentage = (charCount / maxChars) * 100;

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={onBack}
          className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
        >
          <ArrowLeftIcon className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-bold text-gray-900">Create Post</h1>
        <div className="w-10" />
      </div>

      {/* Composer */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
        {/* Author */}
        <div className="flex items-center gap-3 mb-4">
          <img
            src={user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.full_name || 'User')}&background=6366f1&color=fff`}
            alt="Profile"
            className="w-12 h-12 rounded-full object-cover ring-2 ring-indigo-100"
          />
          <div>
            <p className="font-semibold text-gray-900">{user?.full_name || 'User'}</p>
            <div className="flex items-center gap-1.5 text-sm text-gray-500">
              <GlobeIcon className="w-4 h-4" />
              <span>Public</span>
            </div>
          </div>
        </div>

        {/* Textarea */}
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="What's on your mind?"
          className="w-full min-h-[150px] resize-none text-lg text-gray-800 placeholder-gray-400 focus:outline-none"
          maxLength={maxChars}
        />

        {/* Image Preview */}
        {imagePreview && (
          <div className="relative mt-4 rounded-2xl overflow-hidden">
            <img src={imagePreview} alt="Preview" className="w-full max-h-80 object-cover" />
            <button
              onClick={removeImage}
              className="absolute top-3 right-3 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Actions Bar */}
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"
              title="Add image"
            >
              <PhotoIcon className="w-6 h-6" />
            </button>
            <button
              onClick={handleEnhanceWithAI}
              disabled={!content.trim() || isEnhancing}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isEnhancing ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <SparklesIcon className="w-5 h-5" />
              )}
              <span className="hidden sm:inline">Enhance with AI</span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            {/* Character Count */}
            <div className="relative w-8 h-8">
              <svg className="w-8 h-8 -rotate-90">
                <circle
                  cx="16"
                  cy="16"
                  r="14"
                  fill="none"
                  stroke="#e5e7eb"
                  strokeWidth="2"
                />
                <circle
                  cx="16"
                  cy="16"
                  r="14"
                  fill="none"
                  stroke={charPercentage > 90 ? '#ef4444' : charPercentage > 70 ? '#f59e0b' : '#6366f1'}
                  strokeWidth="2"
                  strokeDasharray={`${charPercentage * 0.88} 88`}
                  className="transition-all duration-300"
                />
              </svg>
              {charPercentage > 70 && (
                <span className="absolute inset-0 flex items-center justify-center text-[10px] font-medium text-gray-500">
                  {maxChars - charCount}
                </span>
              )}
            </div>

            <button
              onClick={handlePost}
              disabled={!content.trim() || isPosting}
              className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold rounded-xl shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/40 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isPosting && <Loader2 className="w-4 h-4 animate-spin" />}
              Post
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}