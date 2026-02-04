import React, { useState, useRef } from 'react';
import { ArrowLeftIcon, PhotoIcon, XMarkIcon, GlobeIcon, CodeBracketIcon } from '../ui/Icons';
import api from '../../api/apiClient';
import { Loader2 } from 'lucide-react';

export default function CreatePostView({ onBack, onPost, user }) {
  const [content, setContent] = useState('');
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [isPosting, setIsPosting] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const MAX_CONTENT_LENGTH = 500;
  const MAX_FILES = 4;

  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files || []);

    if (files.length + selectedFiles.length > MAX_FILES) {
      setError(`Maximum ${MAX_FILES} files allowed`);
      return;
    }

    // Validate file types - backend accepts images and videos
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/quicktime'];
    const invalidFiles = selectedFiles.filter(file => !validTypes.includes(file.type));

    if (invalidFiles.length > 0) {
      setError('Only images (JPG, PNG, GIF, WebP) and videos (MP4, MOV) are allowed');
      return;
    }

    setError('');
    setFiles(prev => [...prev, ...selectedFiles]);

    // Create previews
    selectedFiles.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviews(prev => [...prev, {
          url: reader.result,
          type: file.type.startsWith('image/') ? 'image' : 'video',
          name: file.name
        }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
    setError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const insertCodeBlock = () => {
    const textarea = document.querySelector('textarea');
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = content;
    const before = text.substring(0, start);
    const selected = text.substring(start, end);
    const after = text.substring(end);

    const codeBlock = selected
      ? `\`\`\`javascript\n${selected}\n\`\`\``
      : "```javascript\n// Your code here\n```";

    setContent(`${before}${codeBlock}${after}`);

    setTimeout(() => {
      textarea.focus();
      if (selected) {
        // Position cursor after the block
        const newPos = start + codeBlock.length;
        textarea.setSelectionRange(newPos, newPos);
      } else {
        // Select the placeholder text
        const newCursorPos = start + 13;
        textarea.setSelectionRange(newCursorPos, newCursorPos + 16);
      }
    }, 0);
  };

  const handlePost = async (e) => {
    e.preventDefault();

    if (!content.trim()) {
      setError('Content is required');
      return;
    }

    if (content.trim().length > MAX_CONTENT_LENGTH) {
      setError(`Content must be ${MAX_CONTENT_LENGTH} characters or less`);
      return;
    }

    setIsPosting(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('content', content.trim());

      // Backend expects 'media' field name (multer config: .array('media', 4))
      files.forEach(file => {
        formData.append('media', file);
      });

      await api.threads.create(formData);

      // Cleanup
      setContent('');
      setFiles([]);
      setPreviews([]);

      if (onPost) {
        onPost();
      }

    } catch (error) {
      console.error('Failed to post:', error);
      setError(error.response?.data?.message || 'Failed to create post. Please try again.');
    } finally {
      setIsPosting(false);
    }
  };

  const charCount = content.length;
  const maxChars = MAX_CONTENT_LENGTH;
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
          disabled={isPosting}
        />

        {/* Media Preview Grid */}
        {previews.length > 0 && (
          <div className="mt-4 grid grid-cols-2 gap-3 animate-[fadeIn_0.3s_ease]">
            {previews.map((preview, index) => (
              <div key={index} className="relative aspect-square bg-gray-100 rounded-2xl overflow-hidden group">
                {preview.type === 'image' ? (
                  <img
                    src={preview.url}
                    alt={`Preview ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <video
                    src={preview.url}
                    controls
                    className="w-full h-full object-cover"
                  />
                )}
                <button
                  onClick={() => removeFile(index)}
                  className="absolute top-2 right-2 p-1.5 bg-black/50 backdrop-blur-sm text-white rounded-full hover:bg-black/70 transition-colors"
                  disabled={isPosting}
                  type="button"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm animate-[shake_0.4s_ease]">
            {error}
          </div>
        )}

        {/* Actions Bar */}
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,video/mp4,video/quicktime"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              disabled={isPosting || files.length >= MAX_FILES}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              title={`Add media (${files.length}/${MAX_FILES})`}
              disabled={isPosting || files.length >= MAX_FILES}
              type="button"
            >
              <PhotoIcon className="w-6 h-6" />
            </button>
            {files.length > 0 && (
              <span className="text-sm text-gray-500 ml-1">
                {files.length}/{MAX_FILES} files
              </span>
            )}

            <button
              onClick={insertCodeBlock}
              className="p-2.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              title="Add code block"
              disabled={isPosting}
              type="button"
            >
              <CodeBracketIcon className="w-6 h-6" />
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
              type="submit"
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