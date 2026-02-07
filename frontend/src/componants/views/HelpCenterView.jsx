import React, { useState } from 'react';
import { ArrowLeftIcon, SearchIcon } from '../ui/Icons';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';
import {
    ChevronRight,
    BookOpen,
    MessageSquare,
    Shield,
    Settings as SettingsIcon,
    HelpCircle,
    Smartphone,
    Users
} from 'lucide-react';

export default function HelpCenterView({ onBack }) {
    const { t } = useLanguage();
    const { isDarkMode } = useTheme();
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedArticle, setSelectedArticle] = useState(null);

    const guideContent = {
        1: {
            title: t('helpHowToCreate') || 'How to create your first post',
            content: `
                1. Look for the **"+" button** in the sidebar or the "Create Post" button.
                2. Type your thoughts in the text area. You'll see your **profile photo and name** at the top.
                3. (Optional) Click the **Photo icon** to upload images or videos (up to 4).
                4. (Optional) Use the **Code icon** to share code snippets with syntax highlighting.
                5. Monitor the character count circle at the bottom right.
                6. Click **"Post"** to share it with the world!
            `
        },
        5: {
            title: t('helpChangePassword') || 'How to change your password',
            content: `
                1. Go to **Settings** from the sidebar.
                2. Click on **Security** under the Account section.
                3. Enter your **Current Password** first for safety.
                4. Type your **New Password** (minimum 8 characters).
                5. Confirm the new password and click **"Update Password"**.
                6. You'll see a success message and be redirected back.
            `
        },
        'sidebar-guide': {
            title: 'Navigating Orbit',
            content: `
                Orbit's sidebar is your command center:
                - **Feed**: See latest posts from you and people you follow.
                - **Search**: Find new friends and communities.
                - **Notifications**: Stay updated on likes and replies.
                - **Profile**: View and edit your personal posts.
                - **Settings**: Manage your account, theme, and security.
                
                *Tip: Check the bottom-left of the sidebar to see your active profile status.*
            `
        }
    };

    const categories = [
        {
            id: 'getting-started',
            title: t('helpGettingStarted') || 'Getting Started',
            icon: BookOpen,
            articles: [
                { id: 1, title: t('helpHowToCreate') || 'How to create your first post' },
                { id: 'sidebar-guide', title: 'Navigating the Sidebar' },
                { id: 2, title: t('helpSettingProfile') || 'Setting up your profile' }
            ]
        },
        {
            id: 'privacy-security',
            title: t('helpPrivacySecurity') || 'Privacy & Security',
            icon: Shield,
            articles: [
                { id: 4, title: t('helpAccountPrivacy') || 'Managing account privacy' },
                { id: 5, title: t('helpChangePassword') || 'How to change your password' },
                { id: 6, title: t('helpReporting') || 'Reporting inappropriate content' }
            ]
        },
        {
            id: 'account-settings',
            title: t('helpAccountSettings') || 'Account Settings',
            icon: SettingsIcon,
            articles: [
                { id: 7, title: t('helpEditInfo') || 'Updating your personal info' },
                { id: 8, title: t('helpNotifications') || 'Configuring notifications' },
                { id: 9, title: t('helpDeactivation') || 'Account deactivation' }
            ]
        },
        {
            id: 'using-orbit',
            title: t('helpUsingOrbit') || 'Using Orbit',
            icon: Smartphone,
            articles: [
                { id: 11, title: t('helpCommunities') || 'Joining and creating communities' },
                { id: 12, title: t('helpDirectMessages') || 'Sending direct messages' }
            ]
        }
    ];

    const popularQuestions = [
        t('helpQ1') || 'How do I change my profile picture?',
        t('helpQ2') || 'Who can see my posts?',
        t('helpQ3') || 'How do I block someone?',
        t('helpQ4') || 'What are trending topics?'
    ];

    const filteredCategories = categories.map(cat => ({
        ...cat,
        articles: cat.articles.filter(art =>
            art.title.toLowerCase().includes(searchQuery.toLowerCase())
        )
    })).filter(cat => cat.articles.length > 0);

    if (selectedArticle) {
        const article = guideContent[selectedArticle] || { title: 'Working on it', content: 'This guide is currently being updated. Check back soon!' };
        return (
            <div className="max-w-3xl mx-auto pb-12">
                <div className="flex items-center gap-4 mb-8">
                    <button
                        onClick={() => setSelectedArticle(null)}
                        className={`p-2 -ml-2 rounded-xl transition-colors ${isDarkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'}`}
                    >
                        <ArrowLeftIcon className="w-6 h-6" />
                    </button>
                    <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>{article.title}</h1>
                </div>

                <div className={`rounded-3xl p-8 border ${isDarkMode ? 'bg-gray-800 border-gray-700 text-gray-300' : 'bg-white border-gray-100 shadow-sm text-gray-700'}`}>
                    <div className="prose dark:prose-invert max-w-none">
                        {article.content.split('\n').map((line, i) => (
                            <p key={i} className="mb-4 leading-relaxed">
                                {line.includes('**') ? (
                                    line.split('**').map((part, j) => j % 2 === 1 ? <strong key={j} className="text-indigo-500">{part}</strong> : part)
                                ) : line}
                            </p>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto pb-12">
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
                    }`}>{t('helpCenter') || 'Help Center'}</h1>
            </div>

            {/* Search Bar */}
            <div className={`relative mb-10 p-2 rounded-3xl border transition-all ${isDarkMode
                ? 'bg-gray-800 border-gray-700 focus-within:border-indigo-500'
                : 'bg-white border-gray-100 focus-within:border-indigo-400 shadow-sm'
                }`}>
                <div className="absolute left-6 top-1/2 -translate-y-1/2">
                    <SearchIcon className={`w-5 h-5 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                </div>
                <input
                    type="text"
                    placeholder={t('helpSearchPlaceholder') || "Search for help, articles, or keywords..."}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={`w-full pl-12 pr-6 py-3 bg-transparent rounded-2xl focus:outline-none ${isDarkMode ? 'text-gray-100 placeholder-gray-500' : 'text-gray-900 placeholder-gray-400'
                        }`}
                />
            </div>

            {!searchQuery && (
                <>
                    {/* Quick Stats/Links */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
                        <QuickLink icon={MessageSquare} label={t('helpContact') || 'Contact Us'} isDarkMode={isDarkMode} />
                        <QuickLink icon={Users} label={t('helpCommunity') || 'Community'} isDarkMode={isDarkMode} />
                        <QuickLink icon={Shield} label={t('helpSafety') || 'Safety'} isDarkMode={isDarkMode} />
                        <QuickLink icon={HelpCircle} label={t('helpFAQs') || 'FAQs'} isDarkMode={isDarkMode} />
                    </div>

                    {/* Popular Questions */}
                    <div className={`mb-10 rounded-3xl p-6 border ${isDarkMode ? 'bg-indigo-900/20 border-indigo-500/20' : 'bg-indigo-50 border-indigo-100'}`}>
                        <h2 className={`font-bold mb-4 flex items-center gap-2 ${isDarkMode ? 'text-indigo-300' : 'text-indigo-900'}`}>
                            <span className="text-lg">🔥</span> {t('popularQuestions') || 'Popular Questions'}
                        </h2>
                        <div className="grid sm:grid-cols-2 gap-3">
                            {popularQuestions.map((q, i) => (
                                <button
                                    key={i}
                                    className={`text-left text-sm py-2 px-3 rounded-lg transition-colors ${isDarkMode ? 'text-gray-300 hover:bg-indigo-900/40' : 'text-gray-700 hover:bg-white'
                                        }`}
                                >
                                    {q}
                                </button>
                            ))}
                        </div>
                    </div>
                </>
            )}

            {/* Help Categories */}
            <div className="space-y-8">
                {filteredCategories.length > 0 ? (
                    filteredCategories.map((category) => (
                        <div key={category.id}>
                            <h2 className={`text-lg font-bold mb-4 flex items-center gap-3 ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDarkMode ? 'bg-gray-800 text-indigo-400' : 'bg-white text-indigo-600 shadow-sm border border-gray-100'
                                    }`}>
                                    <category.icon className="w-5 h-5" />
                                </div>
                                {category.title}
                            </h2>
                            <div className={`rounded-3xl border overflow-hidden ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100 shadow-sm'}`}>
                                {category.articles.map((article, idx) => (
                                    <button
                                        key={article.id}
                                        onClick={() => setSelectedArticle(article.id)}
                                        className={`w-full flex items-center justify-between p-4 text-left transition-colors border-b last:border-b-0 ${isDarkMode ? 'hover:bg-gray-700/50 border-gray-700' : 'hover:bg-gray-50 border-gray-100'
                                            }`}
                                    >
                                        <span className={`text-[15px] ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{article.title}</span>
                                        <ChevronRight className={`w-4 h-4 ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`} />
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center py-12">
                        <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                            <SearchIcon className="w-8 h-8 text-gray-400" />
                        </div>
                        <h3 className={`text-lg font-bold ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>No results found</h3>
                        <p className="text-gray-500">We couldn't find any articles matching your search.</p>
                    </div>
                )}
            </div>
        </div>
    );
}

function QuickLink({ icon: Icon, label, isDarkMode }) {
    return (
        <button className={`flex flex-col items-center gap-3 p-4 rounded-3xl border transition-all hover:-translate-y-1 ${isDarkMode
            ? 'bg-gray-800 border-gray-700 hover:border-indigo-500/50 hover:bg-gray-700'
            : 'bg-white border-gray-100 shadow-sm hover:shadow-md hover:border-indigo-100'
            }`}>
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isDarkMode ? 'bg-indigo-900/30 text-indigo-400' : 'bg-indigo-50 text-indigo-600'
                }`}>
                <Icon className="w-6 h-6" />
            </div>
            <span className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{label}</span>
        </button>
    );
}
