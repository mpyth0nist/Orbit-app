import axios from 'axios';

const API_BASE_URL = 'http://localhost:8080/api';
const MEDIA_BASE_URL = 'http://localhost:8080';

/**
 * Builds a full URL for media files (profile pictures, thread media, etc.)
 * @param {string} path - Relative path like '/uploads/profiles/image.jpg'
 * @returns {string|null} Full URL or null if path is empty
 */
export const getMediaUrl = (path) => {
  if (!path) return null;
  // If already a full URL, return as-is
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  // Build full URL from relative path
  return `${MEDIA_BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
};

// Create axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling and unwrapping backend responses
apiClient.interceptors.response.use(
  (response) => {
    // Backend returns {success: true, data: {...}, message: '...'} format
    // Extract the data field if it exists, otherwise return the whole response
    if (response.data && typeof response.data === 'object' && 'success' in response.data) {
      const data = response.data.data;
      // If pagination info exists and data is an array, attach pagination to it
      // so we don't lose the cursor metadata while still returning the array
      if (response.data.pagination && Array.isArray(data)) {
        data.pagination = response.data.pagination;
      }
      return data || response.data;
    }
    return response.data;
  },
  (error) => {
    console.error('API Request failed:', error.response || error.message);
    // Optional: Handle 401 Unauthorized globally
    if (error.response && error.response.status === 401) {
      // localStorage.removeItem('authToken');
      // window.location.href = '/login'; 
    }
    return Promise.reject(error);
  }
);

// Threads API (formerly Posts)
export const threadsAPI = {
  // Get feed (personalized)
  getFeed: ({ cursor, limit = 20 } = {}) =>
    apiClient.get(`/threads/feed`, { params: { cursor, limit } }),

  // Get most liked/recommended (accounts)
  getMostLiked: ({ cursor, limit = 20 } = {}) =>
    apiClient.get(`/threads/most-liked`, { params: { cursor, limit } }),

  // Get trending threads (most liked in last 7 days)
  getTrending: ({ cursor, limit = 20 } = {}) =>
    apiClient.get(`/threads/trending`, { params: { cursor, limit } }),

  // Search threads
  search: ({ q, cursor, limit = 20 }) =>
    apiClient.get(`/threads/search`, { params: { q, cursor, limit } }),

  // Get single thread
  getById: (id) => apiClient.get(`/threads/${id}`),

  // Create thread (supports both JSON and FormData)
  create: (data) => {
    // If FormData, axios will auto-set Content-Type with boundary
    if (data instanceof FormData) {
      return apiClient.post('/threads', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    }
    return apiClient.post('/threads', data);
  },

  // Update thread
  update: (id, data) => apiClient.patch(`/threads/${id}`, data),

  // Delete thread
  delete: (id) => apiClient.delete(`/threads/${id}`),
};

// Aliased as postsAPI for backward compatibility during refactor
export const postsAPI = {
  getAll: (limit = 20) => threadsAPI.getFeed({ limit }), // Legacy wrapper
  getById: threadsAPI.getById,
  create: threadsAPI.create,
  update: threadsAPI.update,
  delete: threadsAPI.delete,
  // Note: like/unlike have been removed - use reactionsAPI.toggle instead
};

// Comments API
export const commentsAPI = {
  // Create comment (top-level or reply)
  create: (threadId, data) => apiClient.post(`/threads/${threadId}/comments`, data),

  // Get thread comments (top-level)
  getThreadComments: (threadId, { cursor, limit = 20, sort = 'newest' } = {}) =>
    apiClient.get(`/threads/${threadId}/comments`, { params: { cursor, limit, sort } }),

  // Get replies
  getReplies: (commentId, { cursor, limit = 20 } = {}) =>
    apiClient.get(`/comments/${commentId}/replies`, { params: { cursor, limit } }),

  // Get single comment
  getById: (id) => apiClient.get(`/comments/${id}`),

  // Update comment
  update: (id, data) => apiClient.patch(`/comments/${id}`, data),

  // Delete comment
  delete: (id) => apiClient.delete(`/comments/${id}`),
};

// Reactions API (Likes)
export const reactionsAPI = {
  // Toggle like (thread or comment)
  toggle: (entityType, id) => apiClient.post(`/reactions/${entityType}/${id}`),

  // Get users who liked (thread or comment)
  getLikes: (entityType, id, { page = 1, limit = 20 } = {}) =>
    apiClient.get(`/reactions/${entityType}/${id}`, { params: { page, limit } }),
};

// Media API
export const mediaAPI = {
  // Upload thread media (multiple)
  uploadThreadMedia: (files) => {
    const formData = new FormData();
    files.forEach((file) => formData.append('media', file));
    return apiClient.post('/media/thread', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  // Upload profile picture (single)
  uploadProfilePicture: (file) => {
    const formData = new FormData();
    formData.append('profilePicture', file);
    return apiClient.post('/media/profile-picture', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  // Delete media
  delete: (id) => apiClient.delete(`/media/${id}`),
};

// Notifications API
export const notificationsAPI = {
  // Get notifications
  get: ({ filter, cursor, limit = 20 } = {}) =>
    apiClient.get('/notifications', { params: { filter, cursor, limit } }),

  // Get unread count
  getUnreadCount: () => apiClient.get('/notifications/unread-count'),

  // Mark all read
  markAllAsRead: () => apiClient.patch('/notifications/mark-all-read'),

  // Delete all read
  deleteAllRead: () => apiClient.delete('/notifications/read'),

  // Mark single as read/unread
  update: (id, { isRead }) => apiClient.patch(`/notifications/${id}`, { isRead }),

  // Delete single
  delete: (id) => apiClient.delete(`/notifications/${id}`),

  // Legacy wrapper (userEmail parameter is ignored - backend uses authenticated user)
  getUserNotifications: () => apiClient.get('/notifications'),
};

// Users API
export const usersAPI = {
  getCurrent: () => apiClient.get('/user/'),
  getById: (id) => apiClient.get(`/user/${id}`),
  update: (userData) => apiClient.patch(`/user/`, userData), // Uses /user/ (current user)
  updateMe: (userData) => apiClient.patch(`/user/`, userData),

  // Profile
  updateProfile: (data) => apiClient.patch('/user/profile', data),
  updateProfilePicture: (data) => apiClient.patch('/user/profile/picture', data),

  // Threads
  getMyThreads: () => apiClient.get('/user/threads'),
  getUserThreads: (userId, { page = 1, limit = 20 } = {}) =>
    apiClient.get(`/user/${userId}/threads`, { params: { page, limit } }),

  // Stats
  getStats: () => apiClient.get('/user/stats'),

  // Search
  search: ({ q, page = 1, limit = 20 } = {}) =>
    apiClient.get('/user/search', { params: { q, page, limit } }),

  // Relationship
  getRelationship: (userId) => apiClient.get(`/user/${userId}/relationship`),

  // Follow System
  follow: (userId) => apiClient.post(`/user/follow/${userId}`),
  unfollow: (userId) => apiClient.delete(`/user/follow/${userId}`),
  getFollowers: (userId, { page = 1, limit = 20 } = {}) =>
    userId
      ? apiClient.get(`/user/${userId}/followers`, { params: { page, limit } })
      : apiClient.get('/user/followers', { params: { page, limit } }),
  getFollowing: (userId, { page = 1, limit = 20 } = {}) =>
    userId
      ? apiClient.get(`/user/${userId}/following`, { params: { page, limit } })
      : apiClient.get('/user/following', { params: { page, limit } }),
  removeFollower: (userId) => apiClient.delete(`/user/followers/${userId}`),
  updateFollowRequest: (userId, isAccepted) => apiClient.patch(`/user/follow-requests/${userId}`, { isAccepted }),

  // Profile Tabs Data
  getMyLikedPosts: ({ page = 1, limit = 20 } = {}) =>
    apiClient.get('/user/likes', { params: { page, limit } }),
  getMyMedia: ({ page = 1, limit = 20 } = {}) =>
    apiClient.get('/user/media', { params: { page, limit } }),
};

// Auth API (separate from users)
export const authAPI = {
  login: (credentials) => apiClient.post('/auth/login', credentials),
  register: (userData) => apiClient.post('/auth/register', userData),
  logout: () => {
    // Client-side logout (backend doesn't have logout endpoint)
    localStorage.removeItem('authToken');
    return Promise.resolve({ success: true });
  },
};

// Hashtags API
export const hashtagsAPI = {
  search: ({ q, limit = 20 }) => apiClient.get('/hashtags/search', { params: { q, limit } }),
  trending: ({ limit = 10 } = {}) => apiClient.get('/hashtags/trending', { params: { limit } }),
  getThreads: (tag, { page = 1, limit = 20 } = {}) =>
    apiClient.get(`/hashtags/${tag}/threads`, { params: { page, limit } })
};

// Search API
export const searchAPI = {
  searchThreads: ({ q, page, limit }) => apiClient.get('/threads/search', { params: { q, page, limit } }),
  searchPosts: (query) => threadsAPI.search({ q: query, limit: 50 }), // Legacy alias
  searchUsers: (query) => usersAPI.search({ q: query, limit: 20 }),
  searchHashtags: (query) => hashtagsAPI.search({ q: query, limit: 20 })
};

// Files API (Legacy wrapper for Media API)
export const filesAPI = {
  upload: (file) => mediaAPI.uploadProfilePicture(file), // Default to profile pic for now
};

export default {
  threads: threadsAPI,
  posts: postsAPI,
  comments: commentsAPI,
  reactions: reactionsAPI,
  media: mediaAPI,
  notifications: notificationsAPI,
  users: usersAPI,
  auth: authAPI,
  files: filesAPI,
  search: searchAPI,
  hashtags: hashtagsAPI,
};
