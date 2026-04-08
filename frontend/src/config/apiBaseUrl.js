const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();

// In development, default to local backend when env var is not set.
export const API_BASE_URL = configuredBaseUrl || (import.meta.env.DEV ? 'http://localhost:5000' : '');

export const API_TARGET_LABEL = API_BASE_URL || 'VITE_API_BASE_URL (not configured)';
