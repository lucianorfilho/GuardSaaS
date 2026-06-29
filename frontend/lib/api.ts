import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('dbguard_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('dbguard_token');
      localStorage.removeItem('dbguard_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
