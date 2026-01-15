import React, { createContext, useContext, useState, useEffect } from 'react';

const LanguageContext = createContext();

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(() => {
    // Check localStorage for saved language
    const savedLanguage = localStorage.getItem('language');
    if (savedLanguage) {
      return savedLanguage;
    }
    // Check browser language preference
    const browserLanguage = navigator.language || navigator.userLanguage;
    if (browserLanguage?.startsWith('fr')) {
      return 'french';
    }
    if (browserLanguage?.startsWith('ar')) {
      return 'arabic';
    }
    return 'english';
  });

  const translations = {
    english: {
      // Navigation
      settings: 'Settings',
      feed: 'Feed',
      search: 'Search',
      notifications: 'Notifications',
      communities: 'Communities',
      profile: 'Profile',
      createPost: 'Create Post',
      thread: 'Thread',
      home: 'Home',
      
      // Settings page
      language: 'Language',
      languageDesc: 'English (US)',
      manageAccount: 'Manage your account preferences',
      editProfile: 'Edit Profile',
      privacy: 'Privacy',
      security: 'Security',
      darkMode: 'Dark Mode',
      darkModeDesc: 'Switch between light and dark themes',
      helpCenter: 'Help Center',
      sendFeedback: 'Send Feedback',
      termsOfService: 'Terms of Service',
      privacyPolicy: 'Privacy Policy',
      logout: 'Log Out',
      
      // General
      login: 'Login',
      register: 'Register',
      
      // Feed page
      whatOnYourMind: "What's on your mind?",
      post: 'Post',
      shareYourThoughts: 'Share your thoughts with the community',
      noPostsYet: 'No posts yet',
      startConversation: 'Start a conversation',
      
      // Search page
      searchPlaceholder: 'Search for posts, users, or communities...',
      recentSearches: 'Recent Searches',
      trendingTopics: 'Trending Topics',
      suggestedUsers: 'Suggested Users',
      clear: 'Clear',
      searchResults: 'Search Results',
      
      // Profile page
      posts: 'Posts',
      followers: 'Followers',
      following: 'Following',
      joinDate: 'Joined',
      editProfile: 'Edit Profile',
      noPosts: 'No posts yet',
      noPostsMessage: 'Start sharing your journey with the community',
      defaultBio: '✨ Digital creator & tech enthusiast\n🌍 Exploring the world one pixel at a time\n💡 Building amazing things',
      
      // Create post
      createNewPost: 'Create New Post',
      writeSomething: 'Write something interesting...',
      
      // Notifications
      allNotifications: 'All Notifications',
      mentions: 'Mentions',
      likes: 'Likes',
      comment: 'Comment',
      follow: 'Follow',
      unread: 'unread',
      markAllAsRead: 'Mark all as read',
      
      // Communities
      discoverCommunities: 'Discover Communities',
      yourCommunities: 'Your Communities',
      all: 'All',
      
      // Actions
      edit: 'Edit',
      save: 'Save',
      cancel: 'Cancel',
      back: 'Back',
      next: 'Next',
      previous: 'Previous',
      follow: 'Follow',
      unfollow: 'Unfollow',
      like: 'Like',
      unlike: 'Unlike',
      comment: 'Comment',
      share: 'Share',
      delete: 'Delete',
      
      // Messages
      loading: 'Loading...',
      error: 'Error',
      success: 'Success',
      noResults: 'No results found',
      
      // Time
      now: 'Now',
      minutesAgo: 'minutes ago',
      hoursAgo: 'hours ago',
      daysAgo: 'days ago',
      
      // Auth
      fullName: 'Full Name',
      email: 'Email',
      password: 'Password',
      confirmPassword: 'Confirm Password',
      forgotPassword: 'Forgot Password?',
    },
    french: {
      // Navigation
      settings: 'Paramètres',
      feed: 'Fil',
      search: 'Recherche',
      notifications: 'Notifications',
      communities: 'Communautés',
      profile: 'Profil',
      createPost: 'Créer une publication',
      thread: 'Fil de discussion',
      home: 'Accueil',
      
      // Settings page
      language: 'Langue',
      languageDesc: 'Français',
      manageAccount: 'Gérez les préférences de votre compte',
      editProfile: 'Modifier le profil',
      privacy: 'Confidentialité',
      security: 'Sécurité',
      darkMode: 'Mode Sombre',
      darkModeDesc: 'Basculer entre les thèmes clair et sombre',
      helpCenter: 'Centre d\'aide',
      sendFeedback: 'Envoyer des commentaires',
      termsOfService: 'Conditions d\'utilisation',
      privacyPolicy: 'Politique de confidentialité',
      logout: 'Déconnexion',
      
      // General
      login: 'Connexion',
      register: 'S\'inscrire',
      
      // Feed page
      whatOnYourMind: "Qu'est-ce qui vous préoccupe ?",
      post: 'Publier',
      shareYourThoughts: 'Partagez vos pensées avec la communauté',
      noPostsYet: 'Aucune publication pour le moment',
      startConversation: 'Commencez une conversation',
      
      // Search page
      searchPlaceholder: 'Rechercher des publications, des utilisateurs ou des communautés...',
      recentSearches: 'Recherches récentes',
      trendingTopics: 'Sujets tendance',
      suggestedUsers: 'Utilisateurs suggérés',
      clear: 'Effacer',
      searchResults: 'Résultats de recherche',
      
      // Profile page
      posts: 'Publications',
      followers: 'Abonnés',
      following: 'Abonnements',
      joinDate: 'Inscrit',
      editProfile: 'Modifier le profil',
      noPosts: 'Aucune publication pour le moment',
      noPostsMessage: 'Commencez à partager votre parcours avec la communauté',
      defaultBio: '✨ Créateur numérique et passionné de technologie\n🌍 Explorer le monde pixel par pixel\n💡 Construire des choses incroyables',
      
      // Create post
      createNewPost: 'Créer une nouvelle publication',
      writeSomething: 'Écrivez quelque chose d\'intéressant...',
      
      // Notifications
      allNotifications: 'Toutes les notifications',
      mentions: 'Mentions',
      likes: 'J\'aime',
      comment: 'Commenter',
      follow: 'Suivre',
      unread: 'non lu',
      markAllAsRead: 'Marquer tout comme lu',
      
      // Communities
      discoverCommunities: 'Découvrir les communautés',
      yourCommunities: 'Vos communautés',
      all: 'Tous',
      
      // Actions
      edit: 'Modifier',
      save: 'Enregistrer',
      cancel: 'Annuler',
      back: 'Retour',
      next: 'Suivant',
      previous: 'Précédent',
      follow: 'Suivre',
      unfollow: 'Ne plus suivre',
      like: 'J\'aime',
      unlike: 'Je n\'aime plus',
      comment: 'Commenter',
      share: 'Partager',
      delete: 'Supprimer',
      
      // Messages
      loading: 'Chargement...',
      error: 'Erreur',
      success: 'Succès',
      noResults: 'Aucun résultat trouvé',
      
      // Time
      now: 'Maintenant',
      minutesAgo: 'il y a minutes',
      hoursAgo: 'il y a heures',
      daysAgo: 'il y a jours',
      
      // Auth
      fullName: 'Nom complet',
      email: 'Email',
      password: 'Mot de passe',
      confirmPassword: 'Confirmer le mot de passe',
      forgotPassword: 'Mot de passe oublié?',
    },
    arabic: {
      // Navigation
      settings: 'الإعدادات',
      feed: 'الخلاصة',
      search: 'البحث',
      notifications: 'الإشعارات',
      communities: 'المجتمعات',
      profile: 'الملف الشخصي',
      createPost: 'إنشاء منشور',
      thread: 'المحادثة',
      home: 'الرئيسية',
      
      // Settings page
      language: 'اللغة',
      languageDesc: 'العربية',
      manageAccount: 'إدارة تفضيلات حسابك',
      editProfile: 'تعديل الملف الشخصي',
      privacy: 'الخصوصية',
      security: 'الأمان',
      darkMode: 'الوضع الليلي',
      darkModeDesc: 'التبديل بين الثيمات الفاتحة والداكنة',
      helpCenter: 'مركز المساعدة',
      sendFeedback: 'إرسال ملاحظات',
      termsOfService: 'شروط الخدمة',
      privacyPolicy: 'سياسة الخصوصية',
      logout: 'تسجيل الخروج',
      
      // General
      login: 'تسجيل الدخول',
      register: 'إنشاء حساب',
      
      // Feed page
      whatOnYourMind: 'ما الذي يدور في ذهنك؟',
      post: 'نشر',
      shareYourThoughts: 'شارك أفكارك مع المجتمع',
      noPostsYet: 'لا توجد منشورات بعد',
      startConversation: 'ابدأ محادثة',
      
      // Search page
      searchPlaceholder: 'البحث عن منشورات أو مستخدمين أو مجتمعات...',
      recentSearches: 'عمليات البحث الأخيرة',
      trendingTopics: 'المواضيع الرائجة',
      suggestedUsers: 'المستخدمون المقترحون',
      clear: 'مسح',
      searchResults: 'نتائج البحث',
      
      // Profile page
      posts: 'المنشورات',
      followers: 'المتابعون',
      following: 'المتابَعون',
      joinDate: 'انضم في',
      editProfile: 'تعديل الملف الشخصي',
      noPosts: 'لا توجد منشورات بعد',
      noPostsMessage: 'ابدأ مشاركة رحلتك مع المجتمع',
      defaultBio: '✨ منشئ رقمي ومتحمس للتكنولوجيا\n🌍 استكشاف العالم بكسل بكسل\n💡 بناء أشياء مذهلة',
      
      // Create post
      createNewPost: 'إنشاء منشور جديد',
      writeSomething: 'اكتب شيئاً مثيراً للاهتمام...',
      
      // Notifications
      allNotifications: 'جميع الإشعارات',
      mentions: 'الإشارات',
      likes: 'الإعجابات',
      comment: 'تعليق',
      follow: 'متابعة',
      unread: 'غير مقروء',
      markAllAsRead: 'تعيين الكل كمقروء',
      
      // Communities
      discoverCommunities: 'اكتشاف المجتمعات',
      yourCommunities: 'مجتمعاتك',
      all: 'الكل',
      
      // Actions
      edit: 'تعديل',
      save: 'حفظ',
      cancel: 'إلغاء',
      back: 'رجوع',
      next: 'التالي',
      previous: 'السابق',
      follow: 'متابعة',
      unfollow: 'إلغاء المتابعة',
      like: 'إعجاب',
      unlike: 'إلغاء الإعجاب',
      comment: 'تعليق',
      share: 'مشاركة',
      delete: 'حذف',
      
      // Messages
      loading: 'جاري التحميل...',
      error: 'خطأ',
      success: 'نجح',
      noResults: 'لم يتم العثور على نتائج',
      
      // Time
      now: 'الآن',
      minutesAgo: 'دقائق مضت',
      hoursAgo: 'ساعات مضت',
      daysAgo: 'أيام مضت',
      
      // Auth
      fullName: 'الاسم الكامل',
      email: 'البريد الإلكتروني',
      password: 'كلمة المرور',
      confirmPassword: 'تأكيد كلمة المرور',
      forgotPassword: 'نسيت كلمة المرور؟',
    }
  };

  useEffect(() => {
    // Save language to localStorage
    localStorage.setItem('language', language);
    
    // Update document language attribute for accessibility
    if (language === 'french') {
      document.documentElement.lang = 'fr';
    } else if (language === 'arabic') {
      document.documentElement.lang = 'ar';
      document.documentElement.dir = 'rtl'; // Right-to-left for Arabic
    } else {
      document.documentElement.lang = 'en';
      document.documentElement.dir = 'ltr'; // Left-to-right for English
    }
  }, [language]);

  const t = (key) => {
    return translations[language][key] || key;
  };

  const changeLanguage = (newLanguage) => {
    setLanguage(newLanguage);
  };

  const value = {
    language,
    changeLanguage,
    t,
    isFrench: language === 'french',
    isEnglish: language === 'english',
    isArabic: language === 'arabic',
    isRTL: language === 'arabic', // Add RTL flag for components
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};
