import React from 'react';
import { OriginalMedia } from '../../../services/api';
import { MediaItem } from './MediaItem';
import { getGridClass } from './utils';

interface MediaContentProps {
  media: OriginalMedia;
  onMediaClick: (url: string) => void;
}

export const MediaContent = React.memo<MediaContentProps>(({ media, onMediaClick }) => {
  if ('media_list' in media) {
    // MediaGroup - Telegram-style gallery
    const mediaList = media.media_list;
    const totalCount = mediaList.length;
    
    // Show only first 4 items in grid, indicate more with overlay
    const displayItems = mediaList.slice(0, Math.min(4, totalCount));
    const gridClass = getGridClass(totalCount);
    
    return (
      <div className="space-y-3 sm:space-y-4">
        <div className={`grid gap-2 sm:gap-3 ${gridClass} max-w-sm sm:max-w-2xl rounded-xl overflow-hidden shadow-sm border border-muted/50`}>
          {displayItems.map((item, index) => (
            <MediaItem
              key={index}
              item={item}
              index={index}
              isGroup={true}
              totalCount={totalCount}
              onMediaClick={onMediaClick}
            />
          ))}
        </div>
        {totalCount > 4 && (
          <div className="flex items-center gap-2 px-3 py-2 bg-muted/30 rounded-lg">
            <div className="w-2 h-2 bg-primary rounded-full"></div>
            <p className="text-xs sm:text-sm text-muted-foreground font-medium">
              Всего медиафайлов: {totalCount}
            </p>
          </div>
        )}
      </div>
    );
  } else if ('file_id' in media && 'file_path' in media) {
    // BackendMedia - new format from API
    return (
      <div className="space-y-3 sm:space-y-4">
        <div className="max-w-sm sm:max-w-2xl rounded-xl overflow-hidden shadow-sm border border-muted/50">
          <MediaItem
            item={media}
            index={0}
            isGroup={false}
            totalCount={1}
            onMediaClick={onMediaClick}
          />
        </div>
      </div>
    );
  } else {
    // SingleMedia - legacy format
    return (
      <div className="space-y-3 sm:space-y-4">
        <div className="max-w-sm sm:max-w-2xl rounded-xl overflow-hidden shadow-sm border border-muted/50">
          <MediaItem
            item={media}
            index={0}
            isGroup={false}
            totalCount={1}
            onMediaClick={onMediaClick}
          />
        </div>
      </div>
    );
  }
});

MediaContent.displayName = 'MediaContent';