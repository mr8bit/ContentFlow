import { Post } from '../../../types';
import { MediaItem } from '../../../services/api';

export interface PostDialogProps {
  post: Post | null;
  onClose: () => void;
  isFullPage?: boolean;
}

export type PostType = 'original' | 'processed' | 'improved';

export interface MediaItemProps {
  item: MediaItem;
  index: number;
  isGroup?: boolean;
  totalCount?: number;
  onMediaClick: (url: string) => void;
}

export interface TelegramPostProps {
  text: string;
  type: PostType;
  post: Post | null;
  onMediaClick: (url: string) => void;
}

export interface PostMetadataProps {
  post: Post;
}

export interface ImprovedTextSectionProps {
  post: Post;
  improvedText: string;
  setImprovedText: (text: string) => void;
  onSave: () => void;
  onCancel: () => void;
  isLoading: boolean;
}