export interface Post {
  id: number;
  source_channel_id: number;
  target_channel_id?: number;
  original_message_id: number;
  original_text?: string;
  original_media?: any;
  media_type?: string;
  processed_text?: string;
  status: 'scraped' | 'processed' | 'waiting' | 'pending' | 'approved' | 'rejected' | 'scheduled' | 'publishing' | 'published' | 'failed';
  created_at: string;
  processed_at?: string;
  approved_at?: string;
  scheduled_at?: string;
  published_at?: string;
  published_message_id?: number;
  admin_notes?: string;
  approved_by?: number;
  llm_classification_confidence?: number;
  llm_classification_result?: any;
  source_channel?: any;
  target_channel?: any;
  approver?: any;
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
  description?: string;
  tags?: string[];
  classification_threshold: number;
  auto_publish_enabled: boolean;
  rewrite_prompt?: string;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface TargetChannelCreate {
  channel_id: string;
  channel_name: string;
  channel_username?: string;
  description?: string;
  tags?: string[];
  classification_threshold: number;
  auto_publish_enabled: boolean;
  rewrite_prompt?: string;
}

export interface PostUpdate {
  text?: string;
  processed_text?: string;
  admin_notes?: string;
}

export interface PostStats {
  pending: number;
  processed: number;
  approved: number;
  scheduled: number;
  published: number;
}