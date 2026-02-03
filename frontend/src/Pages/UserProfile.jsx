import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import UserProfileView from '../componants/views/UserProfileView';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import Sidebar from '../componants/layout/Sidebar';
import MobileNav from '../componants/layout/MobileNav';

export default function UserProfile() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user: currentUser } = useAuth();
    const { isDarkMode } = useTheme();

    // If viewing own profile via this route, could optionally redirect to /profile
    // but for consistency keeping it here is fine.

    // Using a numeric ID, ensure it's passed correctly
    const userId = parseInt(id, 10);

    return (
        <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50/50'}`}>
            {/* Desktop Sidebar */}
            <aside className={`hidden lg:fixed lg:inset-y-0 lg:left-0 lg:w-72 lg:block border-r ${isDarkMode ? 'border-gray-700' : 'border-gray-100'}`}>
                <Sidebar
                    activeTab="profile" // Or maybe 'home' or no active tab to indicate browsing?
                    setActiveTab={() => { }}
                    unreadNotifications={0} // We might not have access to this state easily here without prop drilling or context
                    user={currentUser}
                />
            </aside>

            {/* Main Content */}
            <div className="lg:pl-72">
                <main className="p-4 pb-24 lg:pb-8 max-w-4xl mx-auto">
                    <UserProfileView
                        userId={userId}
                        onBack={() => navigate(-1)} // Go back in history
                        onPostClick={(post) => navigate(`/thread/${post.id}`)}
                        currentUserId={currentUser?.id}
                    />
                </main>
            </div>

            {/* Mobile Navigation */}
            <MobileNav
                activeTab="profile"
                setActiveTab={() => { }}
                unreadNotifications={0}
            />
        </div>
    );
}
