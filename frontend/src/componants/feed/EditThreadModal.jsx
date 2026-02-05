import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Loader2, X } from 'lucide-react';
import api from '../../api/apiClient';
import { useTheme } from '../../contexts/ThemeContext';
import { getMediaUrl } from '../../api/apiClient';

export default function EditThreadModal({ thread, onClose, onSuccess }) {
    const [content, setContent] = useState(thread?.content || thread?.text || '');
    const [media, setMedia] = useState(thread?.media || []);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const { isDarkMode } = useTheme();
    const [deletedMedia, setDeletedMedia] = useState([]);

    useEffect(() => {
        // Disable body scroll when modal is open
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, []);

    const handleMediaDelete = (index) => {
        setDeletedMedia([...deletedMedia, media[index].id]);
        setMedia(media.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!content.trim() && media.length === 0) return;

        setIsLoading(true);
        setError('');

        try {
            const response = await api.threads.update(thread.id, { content: content.trim() });

            deletedMedia.forEach(async (mediaId) => {
                console.log(mediaId)
                await api.media.delete(mediaId);
            });
            const updatedThread = response?.data || response;
            if (onSuccess) onSuccess(updatedThread);
            onClose();
        } catch (err) {
            console.error('Failed to update thread:', err);
            setError(err.response?.data?.message || 'Failed to update thread. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
            <div
                className={`w-full max-w-lg rounded-2xl shadow-xl overflow-hidden transform transition-all animate-[scaleIn_0.2s_ease-out] ${isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white'
                    }`}
            >
                <div className={`flex items-center justify-between p-4 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-100'}`}>
                    <h3 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Edit Thread</h3>
                    <button
                        onClick={onClose}
                        className={`p-2 rounded-full transition-colors ${isDarkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'
                            }`}
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-4">
                    <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        className={`w-full min-h-[120px] p-3 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ${isDarkMode
                            ? 'bg-gray-700/50 text-white placeholder-gray-500 border-transparent'
                            : 'bg-gray-50 text-gray-900 placeholder-gray-400 border-gray-200'
                            } border`}
                        placeholder="What's on your mind?"
                        autoFocus
                        maxLength={500}
                        disabled={isLoading}
                    />

                    {/* Media Preview */}
                    {media.length > 0 && (
                        <div className="mt-3">
                            <div className="flex items-center justify-between mb-2">
                                <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                    Attached Media ({media.length})
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setMedia([])}
                                    className={`text-xs text-red-500 hover:text-red-600 transition-colors ${isDarkMode ? 'hover:bg-red-900/20' : 'hover:bg-red-50'
                                        } px-2 py-1 rounded-lg`}
                                >
                                    Remove All
                                </button>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                {media.map((item, index) => (
                                    <div key={index} className="relative group">
                                        <img
                                            src={getMediaUrl(item.url)}
                                            alt={`Preview ${index + 1}`}
                                            className="w-full h-32 object-cover rounded-lg border border-gray-200 dark:border-gray-700"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => handleMediaDelete(index)}
                                            className={`absolute top-2 right-2 p-1 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors ${isDarkMode ? 'hover:bg-gray-700/70' : 'hover:bg-gray-800/70'
                                                }`}
                                            aria-label={`Remove image ${index + 1}`}
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end gap-3 mt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className={`px-4 py-2 text-sm font-medium rounded-xl transition-colors ${isDarkMode
                                ? 'text-gray-300 hover:bg-gray-700'
                                : 'text-gray-600 hover:bg-gray-100'
                                }`}
                            disabled={isLoading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={!content.trim() || isLoading}
                            className="px-6 py-2 text-sm font-medium text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                            Save
                        </button>
                    </div>

                    {error && (
                        <p className="mt-3 text-sm text-red-500">{error}</p>
                    )}
                </form>
            </div>
        </div>
    );
}

EditThreadModal.propTypes = {
    thread: PropTypes.object.isRequired,
    onClose: PropTypes.func.isRequired,
    onSuccess: PropTypes.func,
};
