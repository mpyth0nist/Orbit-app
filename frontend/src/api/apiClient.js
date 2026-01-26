import axios from 'axios';

const API_BASE_URL = 'http://localhost:5001/api';

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

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response.data,
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

  // Get most liked/recommended
  getMostLiked: ({ cursor, limit = 20 } = {}) =>
    apiClient.get(`/threads/most-liked`, { params: { cursor, limit } }),

  // Search threads
  search: ({ q, cursor, limit = 20 }) =>
    apiClient.get(`/threads/search`, { params: { q, cursor, limit } }),

  // Get single thread
  getById: (id) => apiClient.get(`/threads/${id}`),

  // Create thread
  create: (data) => apiClient.post('/threads', data),

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

  // Legacy wrapper
  getUserNotifications: (userEmail) => apiClient.get('/notifications', { params: { filter: 'unread' } }),
};

// Users & Auth API
export const usersAPI = {
  getCurrent: () => apiClient.get('/user/'),
  getById: (id) => apiClient.get(`/user/${id}`),
  update: (id, userData) => apiClient.patch(`/user/`, userData), // Uses /user/ (current user)
  updateMe: (userData) => apiClient.patch(`/user/`, userData),

  // Profile
  updateProfile: (data) => apiClient.patch('/user/profile', data),
  updateProfilePicture: (data) => apiClient.patch('/user/profile/picture', data),

  // Threads
  getMyThreads: () => apiClient.get('/user/threads'),

  // Follow System
  follow: (userId) => apiClient.post(`/user/follow/${userId}`),
  unfollow: (userId) => apiClient.delete(`/user/follow/${userId}`),
  getFollowers: () => apiClient.get('/user/followers'),
  getFollowing: () => apiClient.get('/user/following'),
  removeFollower: (userId) => apiClient.delete(`/user/followers/${userId}`),
  updateFollowRequest: (userId, status) => apiClient.patch(`/user/follow-requests/${userId}`, { status }),

  // Auth
  login: (credentials) => apiClient.post('/auth/login', credentials),
  register: (userData) => apiClient.post('/auth/register', userData),
  logout: () => apiClient.post('/auth/logout'), // Note: Backend might not have this, check auth.routes.js if needed, otherwise client-side only
};

// Search API
export const searchAPI = {
  searchThreads: ({ q, cursor, limit }) => threadsAPI.search({ q, cursor, limit }),
  // searchUsers missing in provided routes, assuming removed or future impl
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
  auth: usersAPI,
  files: filesAPI,
  search: searchAPI,
};
