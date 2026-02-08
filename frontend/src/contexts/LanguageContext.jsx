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

      editProfileDesc: 'Update your name, bio, and photo',
      editProfile: 'Edit Profile',
      tapToChangePhoto: 'Tap to change photo',
      username: 'Username',
      firstName: 'First Name',
      lastName: 'Last Name',
      bioPlaceholder: 'Tell everyone about yourself...',
      bio: 'Bio',
      privacy: 'Privacy',
      privacyDesc: 'Manage who can see your content',
      security: 'Security',
      darkMode: 'Dark Mode',
      darkModeDesc: 'Switch between light and dark themes',
      helpCenter: 'Help Center',
      helpCenterDesc: 'Get help with your account',
      sendFeedback: 'Send Feedback',
      sendFeedbackDesc: 'Help us improve the app',
      termsOfService: 'Terms of Service',
      privacyPolicy: 'Privacy Policy',
      logout: 'Log Out',
      logoutDesc: 'Sign out of your account',
      confirmLogout: 'Confirm Logout',
      confirmLogoutMessage: 'Are you sure you want to log out of your account?',
      account: 'Account',
      preferences: 'Preferences',
      support: 'Support',
      dangerZone: 'Danger Zone',
      notificationsDesc: 'Push, email, and in-app notifications',

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
      comments: 'Comments',
      follows: 'Follows',
      unread: 'unread',
      markAllAsRead: 'Mark all as read',
      noNotifications: 'No notifications yet',
      noNotificationsMessage: "When someone interacts with you, you'll see it here",
      likedYourPost: 'liked your post',
      commentedOnYourPost: 'commented on your post',
      startedFollowingYou: 'started following you',
      requestedToFollowYou: 'requested to follow you',
      acceptedYourFollowRequest: 'accepted your follow request',
      accept: 'Accept',
      decline: 'Decline',
      requestAccepted: 'Request Accepted',
      requestDeclined: 'Request Declined',


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
      securitySettings: 'Security Settings',
      allFieldsRequired: 'All fields are required',
      passwordTooShort: 'New password must be at least 8 characters',
      passwordsDoNotMatch: 'Passwords do not match',
      newPasswordSameAsOld: 'New password cannot be the same as current password',
      passwordUpdatedSuccess: 'Password updated successfully!',
      passwordUpdateError: 'Failed to update password',
      updating: 'Updating...',
      updated: 'Updated!',
      updatePassword: 'Update Password',
      changePassword: 'Change Password',
      secureAccountDesc: 'Ensure your account is using a long, random password to stay secure.',
      currentPassword: 'Current Password',
      newPassword: 'New Password',
      passwordRequirement: 'Must be at least 8 characters long.',
      confirmNewPassword: 'Confirm New Password',
      confirmNewPassword: 'Confirm New Password',
      saving: 'Saving...',
      usernamePlaceholder: 'Your username',
      firstNamePlaceholder: 'Your first name',
      lastNamePlaceholder: 'Your last name',
      securityDesc: 'Manage your password and security settings',
      // Help Center

      helpSearchPlaceholder: 'Search for help, articles, or keywords...',
      helpGettingStarted: 'Getting Started',
      helpHowToCreate: 'How to create your first post',
      helpSettingProfile: 'Setting up your profile',
      helpFindingFriends: 'Finding and following friends',
      helpPrivacySecurity: 'Privacy & Security',
      helpAccountPrivacy: 'Managing account privacy',
      helpChangePassword: 'Changing your password',
      helpChangePasswordDesc: 'Changing your password',
      helpReporting: 'Reporting inappropriate content',
      helpAccountSettings: 'Account Settings',
      helpEditInfo: 'Updating your personal info',
      helpNotifications: 'Configuring notifications',
      helpDeactivation: 'Account deactivation',
      helpUsingOrbit: 'Using Orbit',
      helpCommunities: 'Joining and creating communities',
      helpDirectMessages: 'Sending direct messages',
      helpContact: 'Contact Us',
      helpCommunity: 'Community',
      helpSafety: 'Safety',
      helpFAQs: 'FAQs',
      popularQuestions: 'Popular Questions',
      helpQ1: 'How do I change my profile picture?',
      helpQ2: 'Who can see my posts?',
      helpQ3: 'How do I block someone?',
      helpQ4: 'What are trending topics?',
      // Feedback
      howCanWeImprove: 'How can we improve?',
      feedbackIntro: 'Share your thoughts, report a bug, or suggest a new feature.',
      feedback_suggestion: 'Suggestion',
      feedback_bug: 'Bug Report',
      feedback_complaint: 'Complaint',
      feedback_other: 'Other',
      feedbackType: 'Feedback Type',
      overallExperience: 'Overall Experience',
      yourMessage: 'Your Message',
      feedbackPlaceholder: 'Tell us what\'s on your mind...',
      submitFeedback: 'Submit Feedback',
      sending: 'Sending...',
      feedbackSuccessTitle: 'Thank You!',
      feedbackSuccessMsg: 'Your feedback has been submitted successfully. We appreciate your input!',
      backToSettings: 'Back to Settings',
      feedbackRequired: 'Please enter your feedback',
      feedbackError: 'Failed to send feedback. Please try again.',

      // Thread Detail
      justNow: 'Just now',
      replyingTo: 'Replying to',
      reply: 'Reply',
      hideReplies: 'Hide Replies',
      viewReplies: 'View',
      replies: 'Replies',
      markHelpful: 'Mark as Helpful',
      markBigHelp: 'Mark as Big Help',
      bigHelp: 'Big Help',
      helpful: 'Helpful',
      writeReply: 'Write a reply...',
      copyLink: 'Copy Link',
      editThread: 'Edit Thread',
      deleteThread: 'Delete Thread',
      writeComment: 'Add to the discussion...',
      noComments: 'No comments yet. Be the first to start the conversation!',

      // Toasts & Alerts
      commentPosted: 'Comment posted successfully',
      commentPostError: 'Failed to post comment. Please try again.',
      communityMemberRequired: 'You must be a community member to comment on this post',
      replyPosted: 'Reply posted successfully',
      replyPostError: 'Failed to post reply. Please try again.',
      markedAs: 'Marked as',
      ratingRemoved: 'Rating removed',
      ratingUpdateError: 'Failed to update help rating',
      confirmDeleteComment: 'Are you sure you want to delete this comment?',
      commentDeleted: 'Comment deleted',
      commentDeleteError: 'Failed to delete comment',
      commentUpdated: 'Comment updated',
      commentUpdateError: 'Failed to update comment',
      linkCopied: 'Link copied to clipboard',
      confirmDeleteThread: 'Are you sure you want to delete this thread?',
      threadDeleted: 'Thread deleted successfully',
      threadDeleteError: 'Failed to delete thread',
      threadSaved: 'Thread saved',
      threadUnsaved: 'Thread unsaved',
      bookmarkUpdateError: 'Failed to update bookmark',
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

      editProfileDesc: 'Mettre à jour votre nom, bio et photo',
      editProfile: 'Modifier le profil',
      tapToChangePhoto: 'Appuyez pour changer la photo',
      username: 'Nom d\'utilisateur',
      firstName: 'Prénom',
      lastName: 'Nom',
      bioPlaceholder: 'Parlez-nous de vous...',
      bio: 'Bio',
      privacy: 'Confidentialité',
      privacyDesc: 'Gérer qui peut voir votre contenu',
      security: 'Sécurité',
      darkMode: 'Mode Sombre',
      darkModeDesc: 'Basculer entre les thèmes clair et sombre',
      helpCenter: 'Centre d\'aide',
      helpCenterDesc: 'Obtenez de l\'aide avec votre compte',
      sendFeedback: 'Envoyer des commentaires',
      sendFeedbackDesc: 'Aidez-nous à améliorer l\'application',
      termsOfService: 'Conditions d\'utilisation',
      privacyPolicy: 'Politique de confidentialité',
      logout: 'Déconnexion',
      logoutDesc: 'Se déconnecter de votre compte',
      confirmLogout: 'Confirmer la déconnexion',
      confirmLogoutMessage: 'Êtes-vous sûr de vouloir vous déconnecter de votre compte?',
      account: 'Compte',
      preferences: 'Préférences',
      support: 'Support',
      dangerZone: 'Zone de Danger',
      notificationsDesc: 'Notifications push, email et dans l\'application',

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
      comments: 'Commentaires',
      follows: 'Abonnements',
      unread: 'non lu',
      markAllAsRead: 'Marquer tout comme lu',
      noNotifications: 'Pas encore de notifications',
      noNotificationsMessage: 'Quand quelqu\'un interagit avec vous, vous le verrez ici',
      likedYourPost: 'a aimé votre publication',
      commentedOnYourPost: 'a commenté votre publication',
      startedFollowingYou: 'a commencé à vous suivre',
      requestedToFollowYou: 'a demandé à vous suivre',
      acceptedYourFollowRequest: 'a accepté votre demande de suivi',
      accept: 'Accepter',
      decline: 'Refuser',
      requestAccepted: 'Demande acceptée',
      requestDeclined: 'Demande refusée',

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
      securitySettings: 'Paramètres de sécurité',
      allFieldsRequired: 'Tous les champs sont obligatoires',
      passwordTooShort: 'Le nouveau mot de passe doit comporter au moins 8 caractères',
      passwordsDoNotMatch: 'Les mots de passe ne correspondent pas',
      newPasswordSameAsOld: 'Le nouveau mot de passe ne peut pas être le même que l\'actuel',
      passwordUpdatedSuccess: 'Mot de passe mis à jour avec succès !',
      passwordUpdateError: 'Échec de la mise à jour du mot de passe',
      updating: 'Mise à jour...',
      updated: 'Mis à jour!',
      updatePassword: 'Mettre à jour le mot de passe',
      changePassword: 'Changer le mot de passe',
      secureAccountDesc: 'Assurez-vous que votre compte utilise un mot de passe long et aléatoire pour rester en sécurité.',
      currentPassword: 'Mot de passe actuel',
      newPassword: 'Nouveau mot de passe',
      passwordRequirement: 'Doit comporter au moins 8 caractères.',
      confirmNewPassword: 'Confirmer le nouveau mot de passe',
      confirmNewPassword: 'Confirmer le nouveau mot de passe',
      saving: 'Enregistrement...',
      usernamePlaceholder: "Votre nom d'utilisateur",
      firstNamePlaceholder: 'Votre prénom',
      lastNamePlaceholder: 'Votre nom',
      securityDesc: 'Gérer votre mot de passe et vos paramètres de sécurité',
      // Help Center

      helpSearchPlaceholder: 'Rechercher de l\'aide, des articles ou des mots-clés...',
      helpGettingStarted: 'Commencer',
      helpHowToCreate: 'Comment créer votre premier post',
      helpSettingProfile: 'Configurer votre profil',
      helpFindingFriends: 'Trouver et suivre des amis',
      helpPrivacySecurity: 'Confidentialité et sécurité',
      helpAccountPrivacy: 'Gérer la confidentialité du compte',
      helpReporting: 'Signaler un contenu inapproprié',
      helpAccountSettings: 'Paramètres du compte',
      helpEditInfo: 'Mettre à jour vos informations personnelles',
      helpNotifications: 'Configurer les notifications',
      helpDeactivation: 'Désactivation du compte',
      helpChangePassword: 'Changer le mot de passe',
      helpChangePasswordDesc: 'Changer le mot de passe',
      helpUsingOrbit: 'Utiliser Orbit',
      helpCommunities: 'Rejoindre et créer des communautés',
      helpDirectMessages: 'Envoyer des messages directs',
      helpContact: 'Contactez-nous',
      helpCommunity: 'Communauté',
      helpSafety: 'Sécurité',
      helpFAQs: 'FAQ',
      popularQuestions: 'Questions populaires',
      helpQ1: 'Comment changer ma photo de profil ?',
      helpQ2: 'Qui peut voir mes posts ?',
      helpQ3: 'Comment bloquer quelqu\'un ?',
      helpQ4: 'Quels sont les sujets tendance ?',
      // Feedback
      howCanWeImprove: 'Comment pouvons-nous nous améliorer ?',
      feedbackIntro: 'Partagez vos pensées, signalez un bug ou suggérez une nouvelle fonctionnalité.',
      feedback_suggestion: 'Suggestion',
      feedback_bug: 'Rapport de bug',
      feedback_complaint: 'Réclamation',
      feedback_other: 'Autre',
      feedbackType: 'Type de feedback',
      overallExperience: 'Expérience globale',
      yourMessage: 'Votre message',
      feedbackPlaceholder: 'Dites-nous ce que vous en pensez...',
      submitFeedback: 'Envoyer le feedback',
      sending: 'Envoi...',
      feedbackSuccessTitle: 'Merci !',
      feedbackSuccessMsg: 'Votre feedback a été envoyé avec succès. Nous apprécions votre contribution !',
      backToSettings: 'Retour aux paramètres',
      feedbackRequired: 'Veuillez entrer votre feedback',
      feedbackError: 'Échec de l\'envoi du feedback. Veuillez réessayer.',

      // Thread Detail
      justNow: "À l'instant",
      replyingTo: 'En réponse à',
      reply: 'Répondre',
      hideReplies: 'Masquer les réponses',
      viewReplies: 'Voir',
      replies: 'réponses',
      markHelpful: 'Marquer comme Utile',
      markBigHelp: 'Marquer comme Grande Aide',
      bigHelp: 'Grande Aide',
      helpful: 'Utile',
      writeReply: 'Écrire une réponse...',
      copyLink: 'Copier le lien',
      editThread: 'Modifier le fil',
      deleteThread: 'Supprimer le fil',
      writeComment: 'Ajouter à la discussion...',
      noComments: 'Aucun commentaire pour l\'instant. Soyez le premier à participer !',

      // Toasts & Alerts
      commentPosted: 'Commentaire publié avec succès',
      commentPostError: 'Échec de la publication du commentaire. Veuillez réessayer.',
      communityMemberRequired: 'Vous devez être membre de la communauté pour commenter cette publication',
      replyPosted: 'Réponse publiée avec succès',
      replyPostError: 'Échec de la publication de la réponse. Veuillez réessayer.',
      markedAs: 'Marqué comme',
      ratingRemoved: 'Évaluation supprimée',
      ratingUpdateError: 'Échec de la mise à jour de l\'évaluation',
      confirmDeleteComment: 'Êtes-vous sûr de vouloir supprimer ce commentaire ?',
      commentDeleted: 'Commentaire supprimé',
      commentDeleteError: 'Échec de la suppression du commentaire',
      commentUpdated: 'Commentaire mis à jour',
      commentUpdateError: 'Échec de la mise à jour du commentaire',
      linkCopied: 'Lien copié dans le presse-papiers',
      confirmDeleteThread: 'Êtes-vous sûr de vouloir supprimer ce fil ?',
      threadDeleted: 'Fil supprimé avec succès',
      threadDeleteError: 'Échec de la suppression du fil',
      threadSaved: 'Fil enregistré',
      threadUnsaved: 'Fil non enregistré',
      bookmarkUpdateError: 'Échec de la mise à jour du signet',
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

      editProfileDesc: 'تحديث اسمك، سيرتك الذاتية وصورتك',
      editProfile: 'تعديل الملف الشخصي',
      tapToChangePhoto: 'اضغط لتغيير الصورة',
      username: 'اسم المستخدم',
      firstName: 'الاسم',
      lastName: 'اللقب',
      helpChangePassword: 'تغيير كلمة المرور',
      helpChangePasswordDesc: 'تغيير كلمة المرور',
      bioPlaceholder: 'حدثنا عن نفسك...',
      bio: 'سيرة ذاتية',
      privacy: 'الخصوصية',
      privacyDesc: 'إدارة من يمكنه رؤية محتواك',
      security: 'الأمان',
      darkMode: 'الوضع الليلي',
      darkModeDesc: 'التبديل بين الثيمات الفاتحة والداكنة',
      helpCenter: 'مركز المساعدة',
      helpCenterDesc: 'احصل على المساعدة مع حسابك',
      sendFeedback: 'إرسال ملاحظات',
      sendFeedbackDesc: 'ساعدنا في تحسين التطبيق',
      termsOfService: 'شروط الخدمة',
      privacyPolicy: 'سياسة الخصوصية',
      logout: 'تسجيل الخروج',
      logoutDesc: 'تسجيل الخروج من حسابك',
      confirmLogout: 'تأكيد تسجيل الخروج',
      confirmLogoutMessage: 'هل أنت متأكد أنك تريد تسجيل الخروج من حسابك؟',
      account: 'الحساب',
      preferences: 'التفضيلات',
      support: 'الدعم',
      dangerZone: 'منطقة الخطر',
      notificationsDesc: 'إشعارات الدفع والبريد الإلكتروني والتطبيق',

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
      comments: 'التعليقات',
      follows: 'المتابعات',
      unread: 'غير مقروء',
      markAllAsRead: 'تعيين الكل كمقروء',
      noNotifications: 'لا توجد إشعارات بعد',
      noNotificationsMessage: 'عندما يتفاعل معك شخص ما، ستراه هنا',
      likedYourPost: 'أعجب بمنشورك',
      commentedOnYourPost: 'علق على منشورك',
      startedFollowingYou: 'بدأ بمتابعتك',
      requestedToFollowYou: 'طلب متابعتك',
      acceptedYourFollowRequest: 'قبل طلب المتابعة الخاص بك',
      accept: 'قبول',
      decline: 'رفض',
      requestAccepted: 'تم قبول الطلب',
      requestDeclined: 'تم رفض الطلب',

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
      securitySettings: 'إعدادات الأمان',
      allFieldsRequired: 'جميع الحقول مطلوبة',
      passwordTooShort: 'يجب أن تتكون كلمة المرور الجديدة من 8 أحرف على الأقل',
      passwordsDoNotMatch: 'كلمات المرور غير متطابقة',
      newPasswordSameAsOld: 'لا يمكن أن تكون كلمة المرور الجديدة هي نفسها كلمة المرور الحالية',
      passwordUpdatedSuccess: 'تم تحديث كلمة المرور بنجاح!',
      passwordUpdateError: 'فشل تحديث كلمة المرور',
      updating: 'جاري التحديث...',
      updated: 'تم التحديث!',
      updatePassword: 'تحديث كلمة المرور',
      changePassword: 'تغيير كلمة المرور',
      secureAccountDesc: 'تأكد من أن حسابك يستخدم كلمة مرور طويلة وعشوائية للبقاء آمنًا.',
      currentPassword: 'كلمة المرور الحالية',
      newPassword: 'كلمة المرور الجديدة',
      passwordRequirement: 'يجب أن لا تقل عن 8 أحرف.',
      confirmNewPassword: 'تأكيد كلمة المرور الجديدة',
      confirmNewPassword: 'تأكيد كلمة المرور الجديدة',
      saving: 'جاري الحفظ...',
      usernamePlaceholder: 'اسم المستخدم الخاص بك',
      firstNamePlaceholder: 'الاسم الأول',
      lastNamePlaceholder: 'اسم العائلة',
      securityDesc: 'إدارة كلمة المرور وإعدادات الأمان الخاصة بك',
      // Help Center

      helpSearchPlaceholder: 'ابحث عن مساعدة أو مقالات أو كلمات رئيسية...',
      helpGettingStarted: 'البدء',
      helpHowToCreate: 'كيفية إنشاء أول منشور لك',
      helpSettingProfile: 'إعداد ملفك الشخصي',
      helpFindingFriends: 'البحث عن الأصدقاء ومتابعتهم',
      helpPrivacySecurity: 'الخصوصية والأمان',
      helpAccountPrivacy: 'إدارة خصوصية الحساب',
      helpReporting: 'الإبلاغ عن محتوى غير لائق',
      helpAccountSettings: 'إعدادات الحساب',
      helpEditInfo: 'تحديث معلوماتك الشخصية',
      helpNotifications: 'تكوين الإشعارات',
      helpDeactivation: 'تعطيل الحساب',
      helpUsingOrbit: 'استخدام Orbit',
      helpCommunities: 'الانضمام وإنشاء المجتمعات',
      helpDirectMessages: 'إرسال الرسائل المباشرة',
      helpContact: 'اتصل بنا',
      helpCommunity: 'المجتمع',
      helpSafety: 'الأمان',
      helpFAQs: 'الأسئلة الشائعة',
      popularQuestions: 'الأسئلة الشائعة',
      helpQ1: 'كيف أغير صورتي الشخصية؟',
      helpQ2: 'من يمكنه رؤية منشوراتي؟',
      helpQ3: 'كيف أحظر شخصًا ما؟',
      helpQ4: 'ما هي المواضيع المتداولة؟',
      // Feedback
      howCanWeImprove: 'كيف يمكننا التحسن؟',
      feedbackIntro: 'شاركنا أفكارك، أو أبلغ عن خلل، أو اقترح ميزة جديدة.',
      feedback_suggestion: 'اقتراح',
      feedback_bug: 'تقرير خلل',
      feedback_complaint: 'شكوى',
      feedback_other: 'آخر',
      feedbackType: 'نوع الملاحظات',
      overallExperience: 'التجربة العامة',
      yourMessage: 'رسالتك',
      feedbackPlaceholder: 'أخبرنا برأيك...',
      submitFeedback: 'إرسال الملاحظات',
      sending: 'جاري الإرسال...',
      feedbackSuccessTitle: 'شكراً لك!',
      feedbackSuccessMsg: 'تم إرسال ملاحظاتك بنجاح. نحن نقدر مساهمتك!',
      backToSettings: 'العودة إلى الإعدادات',
      feedbackRequired: 'يرجى إدخال ملاحظاتك',
      feedbackError: 'فشل إرسال الملاحظات. يرجى المحاولة مرة أخرى.',

      // Thread Detail
      justNow: 'الآن',
      replyingTo: 'ردًا على',
      reply: 'رد',
      hideReplies: 'إخفاء الردود',
      viewReplies: 'عرض',
      replies: 'الردود',
      markHelpful: 'تحديد كمفيد',
      markBigHelp: 'تحديد كمساعدة كبيرة',
      bigHelp: 'مساعدة كبيرة',
      helpful: 'مفيد',
      writeReply: 'اكتب ردًا...',
      copyLink: 'نسخ الرابط',
      editThread: 'تعديل المحادثة',
      deleteThread: 'حذف المحادثة',
      writeComment: 'أضف إلى المناقشة...',
      noComments: 'لا توجد تعليقات بعد. كن أول من يبدأ المحادثة!',

      // Toasts & Alerts
      commentPosted: 'تم نشر التعليق بنجاح',
      commentPostError: 'فشل نشر التعليق. يرجى المحاولة مرة أخرى.',
      communityMemberRequired: 'يجب أن تكون عضوًا في المجتمع للتعليق على هذا المنشور',
      replyPosted: 'تم نشر الرد بنجاح',
      replyPostError: 'فشل نشر الرد. يرجى المحاولة مرة أخرى.',
      markedAs: 'تم وضع علامة كـ',
      ratingRemoved: 'تمت إزالة التقييم',
      ratingUpdateError: 'فشل تحديث تقييم المساعدة',
      confirmDeleteComment: 'هل أنت متأكد أنك تريد حذف هذا التعليق؟',
      commentDeleted: 'تم حذف التعليق',
      commentDeleteError: 'فشل حذف التعليق',
      commentUpdated: 'تم تحديث التعليق',
      commentUpdateError: 'فشل تحديث التعليق',
      linkCopied: 'تم نسخ الرابط إلى الحافظة',
      confirmDeleteThread: 'هل أنت متأكد أنك تريد حذف هذا المحادثة؟',
      threadDeleted: 'تم حذف المحادثة بنجاح',
      threadDeleteError: 'فشل حذف المحادثة',
      threadSaved: 'تم حفظ المحادثة',
      threadUnsaved: 'تم إلغاء حفظ المحادثة',
      bookmarkUpdateError: 'فشل تحديث الإشارة المرجعية',
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
