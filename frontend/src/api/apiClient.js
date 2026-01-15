// API utility functions using fetch for your backend endpoints

const API_BASE_URL = 'http://localhost:5001/api';


// Generic fetch wrapper with error handling
async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  // Add auth token if available
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, config);
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('API Request failed:', error);
    throw error;
  }
}

// Posts API
export const postsAPI = {
  // Get all posts
  getAll: (limit = 50) => apiRequest(`/posts?limit=${limit}&sort=-created_date`),
  
  // Get single post
  getById: (id) => apiRequest(`/posts/${id}`),
  
  // Create post
  create: (postData) => apiRequest('/posts', {
    method: 'POST',
    body: JSON.stringify(postData),
  }),
  
  // Update post
  update: (id, updateData) => apiRequest(`/posts/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updateData),
  }),
  
  // Delete post
  delete: (id) => apiRequest(`/posts/${id}`, {
    method: 'DELETE',
  }),
  
  // Like/unlike post
  like: (id, userEmail) => apiRequest(`/posts/${id}/like`, {
    method: 'POST',
    body: JSON.stringify({ userEmail }),
  }),
  
  // Unlike post
  unlike: (id, userEmail) => apiRequest(`/posts/${id}/unlike`, {
    method: 'POST',
    body: JSON.stringify({ userEmail }),
  }),
};

// Users API
export const usersAPI = {
  // Get current user
  getCurrent: () => apiRequest('/users/me'),
  
  // Get user by ID
  getById: (id) => apiRequest(`/users/${id}`),
  
  // Update user
  update: (id, userData) => apiRequest(`/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(userData),
  }),
  
  // Login
  login: (credentials) => apiRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  }),
  
  // Register
  register: (userData) => apiRequest('/auth/register', {
    method: 'POST',
    body: JSON.stringify(userData),
  }),
};

// Notifications API
export const notificationsAPI = {
  // Get user notifications
  getUserNotifications: (userEmail) => apiRequest(`/notifications?user_email=${userEmail}&is_read=false`),
  
  // Mark notification as read
  markAsRead: (id) => apiRequest(`/notifications/${id}/read`, {
    method: 'PUT',
  }),
  
  // Mark all notifications as read
  markAllAsRead: (userEmail) => apiRequest(`/notifications/mark-all-read`, {
    method: 'POST',
    body: JSON.stringify({ userEmail }),
  }),
};

// Files API
export const filesAPI = {
  // Upload file
  upload: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    
    return apiRequest('/files/upload', {
      method: 'POST',
      body: formData,
      headers: {}, // Remove Content-Type to let browser set multipart/form-data
    });
  },
};

// Search API
export const searchAPI = {
  // Search posts
  searchPosts: (query) => apiRequest(`/search/posts?q=${encodeURIComponent(query)}`),
  
  // Search users
  searchUsers: (query) => apiRequest(`/search/users?q=${encodeURIComponent(query)}`),
  
  // Get trending topics
  getTrending: () => apiRequest('/search/trending'),
};

export default {
  posts: postsAPI,
  users: usersAPI,
  notifications: notificationsAPI,
  files: filesAPI,
  search: searchAPI,
};
