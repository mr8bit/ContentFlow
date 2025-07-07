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
      <div className="space-y-2 sm:space-y-3">
        <div className={`grid gap-1 sm:gap-2 ${gridClass} max-w-xs sm:max-w-lg`}>
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
          <p className="text-xs sm:text-sm text-muted-foreground">
            Всего медиафайлов: {totalCount}
          </p>
        )}
      </div>
    );
  } else if ('file_id' in media && 'file_path' in media) {
    // BackendMedia - new format from API
    return (
      <div className="space-y-2 sm:space-y-3">
        <div className="max-w-xs sm:max-w-lg">
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
      <div className="space-y-2 sm:space-y-3">
        <div className="max-w-xs sm:max-w-lg">
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