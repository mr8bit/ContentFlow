import React from 'react';
import { File as FileIcon, Play } from 'lucide-react';
import { MediaItemProps } from './types';
import { getMediaUrl, getMediaItemClass } from './utils';

const FALLBACK_IMAGE = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjI0IiBoZWlnaHQ9IjI0IiBmaWxsPSIjZjNmNGY2Ii8+CjxwYXRoIGQ9Im0xNSAxMi0zIDMtMyAzIiBzdHJva2U9IiM5Y2EzYWYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+CjwvcGF0aD4KPC9zdmc+';

export const MediaItem = React.memo<MediaItemProps>(({ 
  item, 
  index, 
  isGroup = false, 
  totalCount = 1, 
  onMediaClick 
}) => {
  const mediaPath = item.file_path || item.path;
  const mediaUrl = getMediaUrl(mediaPath);

  if (!mediaUrl) {
    return (
      <div className="relative bg-muted rounded-lg p-3 sm:p-4 border flex items-center gap-2 sm:gap-3">
        <FileIcon className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground" />
        <div>
          <p className="text-sm sm:text-base font-medium capitalize">{item.type}</p>
          <p className="text-xs sm:text-sm text-muted-foreground">Файл недоступен</p>
        </div>
      </div>
    );
  }

  const itemClass = getMediaItemClass(isGroup, totalCount, index);

  if (item.type === 'photo') {
    return (
      <div 
        className={`relative rounded-lg overflow-hidden cursor-pointer group ${itemClass}`}
        onClick={() => onMediaClick(mediaUrl)}
      >
        <img 
          src={mediaUrl} 
          alt={`Фото ${index + 1}`}
          className="w-full h-full object-cover transition-transform group-hover:scale-105"
          onError={(e) => {
            e.currentTarget.src = FALLBACK_IMAGE;
          }}
        />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
        {isGroup && totalCount > 4 && index === 3 && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <span className="text-white text-sm sm:text-lg font-semibold">+{totalCount - 4}</span>
          </div>
        )}
      </div>
    );
  }

  if (item.type === 'video') {
    return (
      <div 
        className={`relative rounded-lg overflow-hidden cursor-pointer group bg-black ${
          isGroup && totalCount > 1 ? 'aspect-square' : 'aspect-video max-w-md'
        }`}
        onClick={() => onMediaClick(mediaUrl)}
      >
        <video 
          className="w-full h-full object-cover"
          preload="metadata"
          poster={mediaUrl}
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        >
          <source src={mediaUrl} />
        </video>
        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-black/60 rounded-full p-2 sm:p-3 group-hover:bg-black/80 transition-colors">
            <Play className="h-6 w-6 sm:h-8 sm:w-8 text-white fill-white" />
          </div>
        </div>
        {isGroup && totalCount > 4 && index === 3 && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <span className="text-white text-sm sm:text-lg font-semibold">+{totalCount - 4}</span>
          </div>
        )}
      </div>
    );
  }

  // Document or other file types
  return (
    <div className="relative bg-muted rounded-lg p-3 sm:p-4 border flex items-center gap-2 sm:gap-3 hover:bg-muted/80 transition-colors cursor-pointer">
      <div className="p-1.5 sm:p-2 bg-primary/10 rounded">
        <FileIcon className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
      </div>
      <div className="flex-1">
        <p className="text-sm sm:text-base font-medium">{mediaPath?.split('/').pop() || 'Документ'}</p>
        <p className="text-xs sm:text-sm text-muted-foreground capitalize">{item.type}</p>
      </div>
    </div>
  );
});

MediaItem.displayName = 'MediaItem';