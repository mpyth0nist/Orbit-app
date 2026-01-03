const API_BASE_URL = 'https://app.base44.com/api/apps/6957fa27f13402a151c107c8';
const API_KEY = 'fe3fc11e82854c14a738f157d7012cc6';

class Base44Client {
  constructor() {
    this.baseUrl = API_BASE_URL;
    this.apiKey = API_KEY;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const config = {
      headers: {
        'api_key': this.apiKey,
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`API request failed: ${error.message}`);
      throw error;
    }
  }

  // Auth methods
  auth = {
    me: async () => {
      return this.request('/auth/me');
    }
  };

  // Generic entity methods
  entities = {
    Post: {
      list: async (orderBy = '-created_date', limit = 50) => {
        return this.request(`/entities/Post?order=${orderBy}&limit=${limit}`);
      },
      get: async (id) => {
        return this.request(`/entities/Post/${id}`);
      },
      create: async (data) => {
        return this.request('/entities/Post', {
          method: 'POST',
          body: JSON.stringify(data),
        });
      },
      update: async (id, data) => {
        return this.request(`/entities/Post/${id}`, {
          method: 'PUT',
          body: JSON.stringify(data),
        });
      },
      delete: async (id) => {
        return this.request(`/entities/Post/${id}`, {
          method: 'DELETE',
        });
      },
      filter: async (filters) => {
        const params = new URLSearchParams(filters);
        return this.request(`/entities/Post?${params}`);
      },
    },
    Comment: {
      list: async (orderBy = '-created_date', limit = 50) => {
        return this.request(`/entities/Comment?order=${orderBy}&limit=${limit}`);
      },
      get: async (id) => {
        return this.request(`/entities/Comment/${id}`);
      },
      create: async (data) => {
        return this.request('/entities/Comment', {
          method: 'POST',
          body: JSON.stringify(data),
        });
      },
      update: async (id, data) => {
        return this.request(`/entities/Comment/${id}`, {
          method: 'PUT',
          body: JSON.stringify(data),
        });
      },
      delete: async (id) => {
        return this.request(`/entities/Comment/${id}`, {
          method: 'DELETE',
        });
      },
      filter: async (filters) => {
        const params = new URLSearchParams(filters);
        return this.request(`/entities/Comment?${params}`);
      },
    },
    Community: {
      list: async (orderBy = '-created_date', limit = 50) => {
        return this.request(`/entities/Community?order=${orderBy}&limit=${limit}`);
      },
      get: async (id) => {
        return this.request(`/entities/Community/${id}`);
      },
      create: async (data) => {
        return this.request('/entities/Community', {
          method: 'POST',
          body: JSON.stringify(data),
        });
      },
      update: async (id, data) => {
        return this.request(`/entities/Community/${id}`, {
          method: 'PUT',
          body: JSON.stringify(data),
        });
      },
      delete: async (id) => {
        return this.request(`/entities/Community/${id}`, {
          method: 'DELETE',
        });
      },
      filter: async (filters) => {
        const params = new URLSearchParams(filters);
        return this.request(`/entities/Community?${params}`);
      },
    },
    Notification: {
      list: async (orderBy = '-created_date', limit = 50) => {
        return this.request(`/entities/Notification?order=${orderBy}&limit=${limit}`);
      },
      get: async (id) => {
        return this.request(`/entities/Notification/${id}`);
      },
      create: async (data) => {
        return this.request('/entities/Notification', {
          method: 'POST',
          body: JSON.stringify(data),
        });
      },
      update: async (id, data) => {
        return this.request(`/entities/Notification/${id}`, {
          method: 'PUT',
          body: JSON.stringify(data),
        });
      },
      delete: async (id) => {
        return this.request(`/entities/Notification/${id}`, {
          method: 'DELETE',
        });
      },
      filter: async (filters) => {
        const params = new URLSearchParams(filters);
        return this.request(`/entities/Notification?${params}`);
      },
    },
    User: {
      list: async (orderBy = '-created_date', limit = 50) => {
        return this.request(`/entities/User?order=${orderBy}&limit=${limit}`);
      },
      get: async (id) => {
        return this.request(`/entities/User/${id}`);
      },
      create: async (data) => {
        return this.request('/entities/User', {
          method: 'POST',
          body: JSON.stringify(data),
        });
      },
      update: async (id, data) => {
        return this.request(`/entities/User/${id}`, {
          method: 'PUT',
          body: JSON.stringify(data),
        });
      },
      delete: async (id) => {
        return this.request(`/entities/User/${id}`, {
          method: 'DELETE',
        });
      },
      filter: async (filters) => {
        const params = new URLSearchParams(filters);
        return this.request(`/entities/User?${params}`);
      },
    },
  };
}

export default new Base44Client();