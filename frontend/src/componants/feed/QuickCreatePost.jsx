import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { PhotoIcon, CodeBracketIcon, XMarkIcon, SendIcon } from '../ui/Icons';
import { getMediaUrl } from '../../api/apiClient';
import apiClient from '../../api/apiClient';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';


export default function QuickCreatePost() {
    const { user } = useAuth();
    const { isDarkMode } = useTheme();
    const queryClient = useQueryClient();
    const [isExpanded, setIsExpanded] = useState(false);
    const [content, setContent] = useState('');
    const [files, setFiles] = useState([]);
    const [previews, setPreviews] = useState([]);
    const fileInputRef = useRef(null);
    const textareaRef = useRef(null);

    const createPostMutation = useMutation({
        mutationFn: (formData) => apiClient.threads.create(formData),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['threads'] });
            setContent('');
            setFiles([]);
            setPreviews([]);
            setIsExpanded(false);
        },
    });

    const handleFileSelect = (e) => {
        const selectedFiles = Array.from(e.target.files || []);
        if (files.length + selectedFiles.length > 4) {
            alert('Maximum 4 files allowed');
            return;
        }

        setFiles(prev => [...prev, ...selectedFiles]);

        const newPreviews = selectedFiles.map(file => ({
            url: URL.createObjectURL(file),
            type: file.type.startsWith('image/') ? 'image' : 'video'
        }));
        setPreviews(prev => [...prev, ...newPreviews]);
    };

    const removeFile = (index) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
        setPreviews(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!content.trim() && files.length === 0) return;

        const formData = new FormData();
        formData.append('content', content.trim());
        files.forEach(file => formData.append('media', file));

        createPostMutation.mutate(formData);
    };

    const insertCodeBlock = () => {
        const textarea = textareaRef.current;
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

        const newContent = `${before}${codeBlock}${after}`;
        setContent(newContent);

        setIsExpanded(true);
        setTimeout(() => {
            textarea.focus();
            const newPos = start + codeBlock.length;
            textarea.setSelectionRange(newPos, newPos);
        }, 0);
    };

    const userPhoto = user?.photoUrl || user?.profile?.photoUrl;
    const userName = user?.firstName || user?.profile?.firstName || 'User';

    return (
        <div className={`mb-6 p-4 rounded-3xl shadow-sm border transition-all duration-300 ${isDarkMode
            ? 'bg-gray-800/50 border-gray-700/50 hover:border-gray-600/50'
            : 'bg-white border-gray-100 hover:border-gray-200'
            } ${isExpanded ? 'ring-1 ring-blue-500/20' : ''}`}>
            <div className="flex gap-4">
                {/* User Avatar */}
                <div className={`w-10 h-10 rounded-full overflow-hidden flex-shrink-0 ${!userPhoto && 'bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-semibold text-sm'
                    }`}>
                    {userPhoto ? (
                        <img
                            src={getMediaUrl(userPhoto)}
                            alt="Profile"
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        userName.charAt(0).toUpperCase()
                    )}
                </div>

                {/* Composer Area */}
                <div className="flex-1">
                    <textarea
                        ref={textareaRef}
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        onFocus={() => setIsExpanded(true)}
                        placeholder={`What's on your mind, ${userName}?`}
                        className={`w-full bg-transparent resize-none py-2 focus:outline-none text-gray-800 dark:text-gray-100 transition-all duration-300 ${isExpanded ? 'min-h-[100px]' : 'min-h-[40px]'
                            }`}
                    />

                    {/* Media Previews */}
                    {previews.length > 0 && (
                        <div className="grid grid-cols-2 gap-2 mt-2 mb-4">
                            {previews.map((preview, index) => (
                                <div key={index} className="relative aspect-video rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800 group">
                                    {preview.type === 'image' ? (
                                        <img src={preview.url} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <video src={preview.url} className="w-full h-full object-cover" />
                                    )}
                                    <button
                                        onClick={() => removeFile(index)}
                                        className="absolute top-2 right-2 p-1.5 bg-black/50 backdrop-blur-sm text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <XMarkIcon className="w-3 h-3" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Actions Bar */}
                    <div className={`flex items-center justify-between mt-2 pt-2 border-t ${isDarkMode ? 'border-gray-700/50' : 'border-gray-50'
                        }`}>
                        <div className="flex items-center gap-1">
                            <input
                                ref={fileInputRef}
                                type="file"
                                className="hidden"
                                multiple
                                accept="image/*,video/*"
                                onChange={handleFileSelect}
                            />
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="p-2 text-gray-500 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-xl transition-colors"
                                title="Add Media"
                            >
                                <PhotoIcon className="w-5 h-5" />
                            </button>
                            <button
                                onClick={insertCodeBlock}
                                className="p-2 text-gray-500 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-xl transition-colors"
                                title="Add Code"
                            >
                                <CodeBracketIcon className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex items-center gap-3">
                            {isExpanded && (
                                <button
                                    onClick={() => {
                                        setIsExpanded(false);
                                        if (!content.trim() && files.length === 0) {
                                            setContent('');
                                            setFiles([]);
                                            setPreviews([]);
                                        }
                                    }}
                                    className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                                >
                                    Cancel
                                </button>
                            )}
                            <button
                                onClick={handleSubmit}
                                disabled={(!content.trim() && files.length === 0) || createPostMutation.isPending}
                                className={`flex items-center gap-2 px-5 py-2 rounded-xl font-semibold text-sm transition-all duration-300 ${(!content.trim() && files.length === 0) || createPostMutation.isPending
                                    ? 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-600 cursor-not-allowed'
                                    : 'bg-blue-500 text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:-translate-y-0.5 active:translate-y-0'
                                    }`}
                            >
                                {createPostMutation.isPending ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <>
                                        <span>Post</span>
                                        <SendIcon className="w-4 h-4" />
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
