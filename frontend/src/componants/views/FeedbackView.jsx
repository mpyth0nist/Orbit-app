import React, { useState } from 'react';
import { ArrowLeftIcon } from '../ui/Icons';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';
import { MessageSquare, Send, CheckCircle2, AlertCircle, Loader2, Star } from 'lucide-react';

export default function FeedbackView({ onBack }) {
    const { t } = useLanguage();
    const { isDarkMode } = useTheme();
    const [formData, setFormData] = useState({
        type: 'suggestion',
        rating: 5,
        message: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [error, setError] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.message.trim()) {
            setError(t('feedbackRequired') || 'Please enter your feedback');
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            // Mock API call - in a real app, this would send to a database or email service
            await new Promise(resolve => setTimeout(resolve, 1500));

            console.log('Feedback submitted:', formData);
            setIsSubmitted(true);

            // Auto-navigate back after success
            setTimeout(() => {
                onBack();
            }, 3000);
        } catch (err) {
            setError(t('feedbackError') || 'Failed to send feedback. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isSubmitted) {
        return (
            <div className="max-w-xl mx-auto py-12 text-center animate-[fadeIn_0.5s_ease]">
                <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle2 className="w-10 h-10" />
                </div>
                <h2 className={`text-2xl font-bold mb-3 ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                    {t('feedbackSuccessTitle') || 'Thank You!'}
                </h2>
                <p className={`mb-8 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    {t('feedbackSuccessMsg') || 'Your feedback has been submitted successfully. We appreciate your input!'}
                </p>
                <button
                    onClick={onBack}
                    className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold rounded-2xl shadow-lg hover:shadow-xl transition-all"
                >
                    {t('backToSettings') || 'Back to Settings'}
                </button>
            </div>
        );
    }

    return (
        <div className="max-w-xl mx-auto pb-12">
            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
                <button
                    onClick={onBack}
                    className={`p-2 -ml-2 rounded-xl transition-colors ${isDarkMode
                        ? 'text-gray-300 hover:bg-gray-700'
                        : 'text-gray-600 hover:bg-gray-100'
                        }`}
                >
                    <ArrowLeftIcon className="w-6 h-6" />
                </button>
                <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-gray-100' : 'text-gray-900'
                    }`}>{t('sendFeedback') || 'Send Feedback'}</h1>
            </div>

            <form onSubmit={handleSubmit} className={`rounded-3xl p-6 border shadow-sm ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'
                }`}>
                <div className="flex items-center gap-4 mb-8">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isDarkMode ? 'bg-indigo-900/50 text-indigo-400' : 'bg-indigo-50 text-indigo-600'
                        }`}>
                        <MessageSquare className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className={`font-bold ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                            {t('howCanWeImprove') || 'How can we improve?'}
                        </h2>
                        <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            {t('feedbackIntro') || 'Share your thoughts, report a bug, or suggest a new feature.'}
                        </p>
                    </div>
                </div>

                {error && (
                    <div className="mb-6 p-4 rounded-2xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 flex items-center gap-3 text-sm font-medium">
                        <AlertCircle className="w-5 h-5 flex-shrink-0" />
                        {error}
                    </div>
                )}

                <div className="space-y-6">
                    {/* Feedback Type */}
                    <div>
                        <label className={`block text-sm font-semibold mb-3 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            {t('feedbackType') || 'Feedback Type'}
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            {['suggestion', 'bug', 'complaint', 'other'].map((type) => (
                                <button
                                    key={type}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, type })}
                                    className={`py-3 px-4 rounded-xl border text-sm font-medium capitalize transition-all ${formData.type === type
                                            ? 'bg-indigo-600 border-indigo-600 text-white shadow-md'
                                            : isDarkMode
                                                ? 'bg-gray-700 border-gray-600 text-gray-300 hover:border-gray-500'
                                                : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-gray-300'
                                        }`}
                                >
                                    {t(`feedback_${type}`) || type}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Rating */}
                    <div>
                        <label className={`block text-sm font-semibold mb-3 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            {t('overallExperience') || 'Overall Experience'}
                        </label>
                        <div className="flex gap-2">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                    key={star}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, rating: star })}
                                    className="p-1 transition-transform active:scale-90"
                                >
                                    <Star
                                        className={`w-8 h-8 ${star <= formData.rating
                                                ? 'fill-amber-400 text-amber-400'
                                                : isDarkMode ? 'text-gray-600' : 'text-gray-200'
                                            }`}
                                    />
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Message */}
                    <div>
                        <label className={`block text-sm font-semibold mb-3 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            {t('yourMessage') || 'Your Message'}
                        </label>
                        <textarea
                            value={formData.message}
                            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                            placeholder={t('feedbackPlaceholder') || "Tell us what's on your mind..."}
                            className={`w-full min-h-[150px] p-4 rounded-2xl border resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all ${isDarkMode
                                    ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-500'
                                    : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'
                                }`}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting || !formData.message.trim()}
                        className="w-full py-4 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold rounded-2xl shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:shadow-indigo-500/40 transition-all disabled:opacity-50 disabled:translate-y-0 flex items-center justify-center gap-3"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                {t('sending') || 'Sending...'}
                            </>
                        ) : (
                            <>
                                <Send className="w-5 h-5" />
                                {t('submitFeedback') || 'Submit Feedback'}
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}
