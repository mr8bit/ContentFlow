import { PostType } from './types';

export function getStatusColor(status: string): string {
  switch (status) {
    case 'pending':
      return 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20 dark:text-yellow-400';
    case 'processed':
      return 'bg-blue-500/10 text-blue-700 border-blue-500/20 dark:text-blue-400';
    case 'approved':
      return 'bg-green-500/10 text-green-700 border-green-500/20 dark:text-green-400';
    case 'rejected':
      return 'bg-destructive/10 text-destructive border-destructive/20';
    case 'scheduled':
      return 'bg-purple-500/10 text-purple-700 border-purple-500/20 dark:text-purple-400';
    case 'published':
      return 'bg-muted text-muted-foreground border-border';
    default:
      return 'bg-muted text-muted-foreground border-border';
  }
}

export function getStatusText(status: string): string {
  switch (status) {
    case 'pending':
      return 'Ожидает';
    case 'processed':
      return 'Обработан';
    case 'approved':
      return 'Одобрен';
    case 'rejected':
      return 'Отклонен';
    case 'scheduled':
      return 'Запланирован';
    case 'published':
      return 'Опубликован';
    default:
      return status;
  }
}

export function getPostTypeBorderColor(type: PostType): string {
  switch (type) {
    case 'original':
      return 'border-blue-200 dark:border-blue-800';
    case 'processed':
      return 'border-green-200 dark:border-green-800';
    case 'improved':
      return 'border-purple-200 dark:border-purple-800';
    default:
      return 'border-border';
  }
}

export function getPostTypeBackgroundColor(type: PostType): string {
  switch (type) {
    case 'original':
      return 'bg-blue-50/50 dark:bg-blue-950/20';
    case 'processed':
      return 'bg-green-50/50 dark:bg-green-950/20';
    case 'improved':
      return 'bg-purple-50/50 dark:bg-purple-950/20';
    default:
      return 'bg-background';
  }
}

export function getPostTypeLabel(type: PostType): string {
  switch (type) {
    case 'original':
      return 'Оригинал';
    case 'processed':
      return 'Обработанный';
    case 'improved':
      return 'Улучшенный';
    default:
      return type;
  }
}

export function getMediaUrl(mediaPath: string | undefined): string | null {
  if (!mediaPath) return null;
  
  // If path already starts with 'media/', use it as is
  if (mediaPath.startsWith('media/')) {
    return `http://localhost:8000/api/${mediaPath}`;
  }
  
  // Otherwise, extract filename and use legacy format
  return `http://localhost:8000/api/media/${mediaPath.split('/').pop()}`;
}

export function getGridClass(totalCount: number): string {
  if (totalCount === 1) return 'grid-cols-1';
  if (totalCount === 2) return 'grid-cols-2';
  if (totalCount === 3) return 'grid-cols-2';
  return 'grid-cols-2';
}

export function getMediaItemClass(isGroup: boolean, totalCount: number, index: number): string {
  if (!isGroup || totalCount <= 1) {
    return 'aspect-[4/3] max-w-md';
  }
  
  if (totalCount === 2) {
    return 'aspect-square';
  }
  
  if (totalCount === 3) {
    return index === 0 ? 'col-span-2 aspect-[4/3]' : 'aspect-square';
  }
  
  if (totalCount === 4) {
    return 'aspect-square';
  }
  
  return index === 0 ? 'col-span-2 aspect-[4/3]' : 'aspect-square';
}

export function isVideoFile(url: string): boolean {
  return url.includes('.mp4') || url.includes('.webm') || url.includes('.mov');
}