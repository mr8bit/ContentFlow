import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Types
export interface User {
  id: number;
  username: string;
  is_admin: boolean;
  created_at: string;
}

export interface SourceChannel {
  id: number;
  channel_id: string;
  channel_name: string;
  name?: string;
  channel_username?: string;
  is_active: boolean;
  check_interval: number;
  last_checked?: string;
  last_message_id: number;
  created_at: string;
  updated_at?: string;
}

export interface TargetChannel {
  id: number;
  channel_id: string;
  channel_name: string;
  channel_username?: string;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface SourceChannelCreate {
  channel_id: string;
  channel_name: string;
  channel_username?: string;
  check_interval: number;
}

export interface TargetChannelCreate {
  channel_id: string;
  channel_name: string;
  channel_username?: string;
}

export interface MediaItem {
  type: 'photo' | 'video' | 'document';
  file_path?: string;
  path?: string;
  file_id?: string;
}

export interface MediaGroup {
  type: 'media_group';
  media_list: MediaItem[];
}

export interface SingleMedia {
  type: 'photo' | 'video' | 'document';
  file_path?: string;
  path?: string;
  file_id?: string;
}

// New format from backend
export interface BackendMedia {
  type: 'photo' | 'video' | 'document';
  file_id: string;
  file_path: string;
}

export type OriginalMedia = MediaGroup | SingleMedia | BackendMedia;

export interface Post {
  id: number;
  source_channel_id: number;
  target_channel_id?: number;
  original_message_id: number;
  original_text?: string;
  original_media?: OriginalMedia;
  media_type?: string;
  processed_text?: string;
  status: 'pending' | 'processed' | 'approved' | 'rejected' | 'scheduled' | 'publishing' | 'published';
  created_at: string;
  processed_at?: string;
  approved_at?: string;
  scheduled_at?: string;
  published_at?: string;
  published_message_id?: number;
  admin_notes?: string;
  approved_by?: number;
  source_channel?: SourceChannel;
  target_channel?: TargetChannel;
  approver?: User;
}

export interface PostUpdate {
  processed_text?: string;
  admin_notes?: string;
  target_channel_id?: number;
}

export interface DashboardStats {
  total_source_channels: number;
  active_source_channels: number;
  total_target_channels: number;
  active_target_channels: number;
  pending_posts: number;
  approved_posts: number;
  rejected_posts: number;
  published_posts: number;
  posts_today: number;
}

export interface Setting {
  id: number;
  key: string;
  value: string;
  description?: string;
  created_at: string;
  updated_at?: string;
}

export interface AIModel {
  id: number;
  name: string;
  provider: string;
  model_id: string;
  description?: string;
  is_active: boolean;
  is_default: boolean;
  created_at: string;
  updated_at?: string;
}

export interface AIModelCreate {
  name: string;
  provider: string;
  model_id: string;
  description?: string;
  is_active?: boolean;
  is_default?: boolean;
}

export interface AIModelUpdate {
  name?: string;
  provider?: string;
  model_id?: string;
  description?: string;
  is_active?: boolean;
  is_default?: boolean;
}

// API functions
export const authAPI = {
  register: (username: string, password: string) =>
    apiClient.post('/auth/register', { username, password }),
  login: (username: string, password: string) =>
    apiClient.post('/auth/login', { username, password }),
  getMe: () => apiClient.get('/auth/me'),
};

export const dashboardAPI = {
  getStats: () => apiClient.get<DashboardStats>('/dashboard/stats'),
};

export const sourceChannelsAPI = {
  getAll: (params?: { skip?: number; limit?: number; active_only?: boolean }) =>
    apiClient.get<SourceChannel[]>('/source-channels', { params }),
  getById: (id: number) => apiClient.get<SourceChannel>(`/source-channels/${id}`),
  create: (data: Omit<SourceChannel, 'id' | 'is_active' | 'last_checked' | 'last_message_id' | 'created_at' | 'updated_at'>) =>
    apiClient.post<SourceChannel>('/source-channels', data),
  update: (id: number, data: Partial<SourceChannel>) =>
    apiClient.put<SourceChannel>(`/source-channels/${id}`, data),
  delete: (id: number) => apiClient.delete(`/source-channels/${id}`),
};

export const targetChannelsAPI = {
  getAll: (params?: { skip?: number; limit?: number; active_only?: boolean }) =>
    apiClient.get<TargetChannel[]>('/target-channels', { params }),
  getById: (id: number) => apiClient.get<TargetChannel>(`/target-channels/${id}`),
  create: (data: Omit<TargetChannel, 'id' | 'is_active' | 'created_at' | 'updated_at'>) =>
    apiClient.post<TargetChannel>('/target-channels', data),
  update: (id: number, data: Partial<TargetChannel>) =>
    apiClient.put<TargetChannel>(`/target-channels/${id}`, data),
  delete: (id: number) => apiClient.delete(`/target-channels/${id}`),
};

export interface PostCreate {
  text?: string;
  media_files?: string[];
  target_channel_id: number;
}

export const postsAPI = {
  create: (data: PostCreate) =>
    apiClient.post<Post>('/posts', data),
  getAll: (params?: { 
    skip?: number; 
    limit?: number; 
    status?: string;
    source_channel_id?: number;
    target_channel_id?: number;
    date_from?: string;
    date_to?: string;
    is_manual?: boolean;
  }) =>
    apiClient.get<Post[]>('/posts', { params }),
  getCount: (params?: {
    status?: string;
    source_channel_id?: number;
    target_channel_id?: number;
    date_from?: string;
    date_to?: string;
    is_manual?: boolean;
  }) =>
    apiClient.get<{ count: number }>('/posts/count', { params }),
  getById: (id: number) => apiClient.get<Post>(`/posts/${id}`),
  update: (id: number, data: PostUpdate) =>
    apiClient.put<Post>(`/posts/${id}`, data),
  approve: (id: number, data: {
    target_channel_id: number;
    admin_notes?: string;
  }) => apiClient.post<Post>(`/posts/${id}/approve`, data),
  publish: (id: number, data: {
    target_channel_id: number;
  }) => apiClient.post<Post>(`/posts/${id}/publish`, data),
  schedule: (id: number, data: {
    target_channel_id: number;
    scheduled_at: string;
    admin_notes?: string;
    processed_text?: string;
  }) => apiClient.post<Post>(`/posts/${id}/schedule`, data),
  reject: (id: number, admin_notes?: string) =>
    apiClient.post<Post>(`/posts/${id}/reject`, { admin_notes }),
  getPending: (limit?: number) =>
    apiClient.get<Post[]>('/posts/pending', { params: { limit } }),
  improveText: (text: string, modelId?: number) =>
    apiClient.post<{ improved_text: string }>('/posts/improve-text', { text, model_id: modelId }),
  improveTextWithPrompt: (text: string, prompt: string, modelId?: number) =>
    apiClient.post<{ improved_text: string }>('/posts/improve-text-with-prompt', { text, prompt, model_id: modelId }),
};

export const settingsAPI = {
  getAll: (params?: { skip?: number; limit?: number }) =>
    apiClient.get<Setting[]>('/settings', { params }),
  getByKey: (key: string) => apiClient.get<Setting>(`/settings/${key}`),
  update: (key: string, data: { value: string; description?: string }) =>
    apiClient.put<Setting>(`/settings/${key}`, data),
};

export const aiModelsAPI = {
  getAll: (params?: { skip?: number; limit?: number; active_only?: boolean }) =>
    apiClient.get<AIModel[]>('/ai-models', { params }),
  getById: (id: number) => apiClient.get<AIModel>(`/ai-models/${id}`),
  create: (data: AIModelCreate) =>
    apiClient.post<AIModel>('/ai-models', data),
  update: (id: number, data: AIModelUpdate) =>
    apiClient.put<AIModel>(`/ai-models/${id}`, data),
  delete: (id: number) => apiClient.delete(`/ai-models/${id}`),
  setDefault: (id: number) =>
    apiClient.post<AIModel>(`/ai-models/${id}/set-default`),
};

export interface SettingUpdate {
  value: string;
  description?: string;
}

export interface TelegramSessionTestResponse {
  status: string;
  message: string;
  user_info?: {
    id: number;
    username?: string;
    first_name?: string;
    last_name?: string;
  };
}

export interface WorkerResponse {
  status: 'running' | 'stopped' | 'starting' | 'stopping' | 'error' | 'unknown';
  should_run?: boolean;
  is_running?: boolean;
  last_heartbeat?: string;
  started_at?: string;
  stopped_at?: string;
  message?: string;
  details?: string;
}

export interface SessionGenerationStartResponse {
  status: 'success';
  message: string;
  session_id: string;
}

export interface SessionGenerationVerifyResponse {
  status: 'success' | 'password_required';
  message: string;
  session_id?: string;
  user_info?: {
    id: number;
    username?: string;
    first_name: string;
    last_name?: string;
  };
}

export interface SessionGenerationCancelResponse {
  status: 'success' | 'info';
  message: string;
}

export const telegramAPI = {
  testSession: () => apiClient.post<TelegramSessionTestResponse>('/telegram/test-session'),
  startSessionGeneration: (phoneNumber: string) => 
    apiClient.post<SessionGenerationStartResponse>('/telegram/generate-session/start', { phone_number: phoneNumber }),
  verifySessionCode: (sessionId: string, code: string, password?: string) => 
    apiClient.post<SessionGenerationVerifyResponse>('/telegram/generate-session/verify', { session_id: sessionId, code, password }),
  cancelSessionGeneration: (sessionId: string) => 
    apiClient.delete<SessionGenerationCancelResponse>(`/telegram/generate-session/${sessionId}`),
};

export const workerAPI = {
  start: () => apiClient.post<WorkerResponse>('/worker/start'),
  stop: () => apiClient.post<WorkerResponse>('/worker/stop'),
  getStatus: () => apiClient.get<WorkerResponse>('/worker/status'),
};

export interface ServiceStatus {
  is_running: boolean;
  should_run: boolean;
  last_heartbeat?: string;
  started_at?: string;
  stopped_at?: string;
  created_at?: string;
}

export interface ServiceResponse {
  message: string;
  status: string;
}

export const scrapperAPI = {
  start: () => apiClient.post<ServiceResponse>('/scrapper/start'),
  stop: () => apiClient.post<ServiceResponse>('/scrapper/stop'),
  restart: () => apiClient.post<ServiceResponse>('/scrapper/restart'),
  getStatus: () => apiClient.get<ServiceStatus>('/scrapper/status'),
};

export const publisherAPI = {
  start: () => apiClient.post<ServiceResponse>('/publisher/start'),
  stop: () => apiClient.post<ServiceResponse>('/publisher/stop'),
  restart: () => apiClient.post<ServiceResponse>('/publisher/restart'),
  getStatus: () => apiClient.get<ServiceStatus>('/publisher/status'),
};

export interface TelegramSettingsData {
  telegram_bot_token?: string;
  telegram_api_id?: string;
  telegram_api_hash?: string;
  telegram_session_string?: string;
}

export interface TelegramSettingItem {
  value: string;
  has_value: boolean;
  description?: string;
  updated_at?: string;
}

export interface TelegramSettingsResponse {
  status: string;
  settings: {
    telegram_bot_token: TelegramSettingItem;
    telegram_api_id: TelegramSettingItem;
    telegram_api_hash: TelegramSettingItem;
    telegram_session_string: TelegramSettingItem;
  };
}

export const telegramSettingsAPI = {
  getSettings: () => apiClient.get<TelegramSettingsResponse>('/telegram/settings'),
  saveSettings: (settings: TelegramSettingsData) => apiClient.post('/telegram/settings', settings),
};