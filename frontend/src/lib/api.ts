import axios from 'axios';
import { extractTenantSlug, ROUTES } from './routes';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/v1',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      let tenantId = '';

      const profileStr = localStorage.getItem('user_profile');
      if (profileStr) {
        try {
          const profile = JSON.parse(profileStr);
          if (profile.restaurantId) {
            tenantId = profile.restaurantId;
          }
        } catch (e) {
          console.error('Error parsing user profile for tenant context:', e);
        }
      }

      if (!tenantId) {
        const slug = extractTenantSlug(window.location.pathname);
        if (slug) {
          tenantId = slug;
        }
      }

      if (tenantId) {
        config.headers['X-Tenant-ID'] = tenantId;
      }

      const token = localStorage.getItem('staff_auth_token');
      if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for status monitoring
import { getErrorMessage } from './error-utils';
import { useToastStore } from '../store/useToastStore';

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Determine friendly error message
    const friendlyMsg = getErrorMessage(error);

    if (error.response) {
      const { status } = error.response;

      if (status === 401) {
        const isLoginRequest = error.config?.url?.includes('/auth/login') || error.config?.url?.includes('auth/login');
        if (!isLoginRequest && typeof window !== 'undefined') {
          // Clear credential cache and redirect to onboarding screen
          localStorage.removeItem('staff_auth_token');
          localStorage.removeItem('user_profile');
          useToastStore.getState().showError('Your session has expired. Please login again.');
          // Use setTimeout to allow toast to render before redirecting
          setTimeout(() => {
            window.location.href = ROUTES.AUTH.LOGIN;
          }, 1000);
        }
      } else if (status === 503) {
        // Trigger offline visual indicators
        if (typeof window !== 'undefined') {
          const offlineEvent = new CustomEvent('network:offline-warning', {
            detail: { message: 'Ordering services are currently operating offline due to local server outages.' }
          });
          window.dispatchEvent(offlineEvent);
          useToastStore.getState().showWarning('Ordering services are currently operating offline.');
        }
      } else {
        // For other API errors, trigger standard error toast
        useToastStore.getState().showError(friendlyMsg);
      }
    } else {
      // Network or timeout errors
      useToastStore.getState().showError(friendlyMsg);
    }

    return Promise.reject(error);
  }
);

export default api;
