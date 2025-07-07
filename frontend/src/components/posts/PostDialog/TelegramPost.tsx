import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import { TelegramPostProps } from './types';
import { getPostTypeBorderColor, getPostTypeBackgroundColor, getPostTypeLabel } from './utils';
import { MediaContent } from './MediaContent';

export const TelegramPost = React.memo<TelegramPostProps>(({ text, type, post, onMediaClick }) => {
  if (!text && type !== 'improved') {
    return (
      <div className="bg-muted/50 rounded-lg p-3 sm:p-4 border border-dashed">
        <p className="text-muted-foreground italic text-center text-xs sm:text-sm">Текст отсутствует</p>
      </div>
    );
  }

  if (!text && type === 'improved') {
    return (
      <div className="bg-muted/50 rounded-lg p-3 sm:p-4 border border-dashed">
        <p className="text-muted-foreground italic text-center text-xs sm:text-sm">Нажмите "Улучшить" для генерации</p>
      </div>
    );
  }

  const borderColor = getPostTypeBorderColor(type);
  const backgroundColor = getPostTypeBackgroundColor(type);
  const typeLabel = getPostTypeLabel(type);

  return (
    <div className={`rounded-lg border-2 ${borderColor} ${backgroundColor} overflow-hidden`}>
      {/* Telegram-style header */}
      <div className="px-3 sm:px-4 py-2 bg-muted/30 border-b border-border/50">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-xs font-medium text-primary">TG</span>
          </div>
          <div>
            <p className="text-xs sm:text-sm font-medium">Telegram Post</p>
            <p className="text-xs text-muted-foreground">{typeLabel}</p>
          </div>
        </div>
      </div>
      
      {/* Post content */}
      <div className="p-3 sm:p-4 space-y-2 sm:space-y-3">
        {/* Media content - показываем медиа в начале поста как в Telegram */}
        {post?.original_media && (
          <div className="-mx-3 sm:-mx-4 -mt-3 sm:-mt-4 mb-2 sm:mb-3">
            <div className="px-3 sm:px-4 pt-3 sm:pt-4">
              <MediaContent media={post.original_media} onMediaClick={onMediaClick} />
            </div>
          </div>
        )}
        
        {/* Text content */}
        {text && (
          <div className="whitespace-pre-wrap text-xs sm:text-sm leading-relaxed">
            {text}
          </div>
        )}
      </div>
      
      {/* Telegram-style footer */}
      <div className="px-3 sm:px-4 py-2 bg-muted/20 border-t border-border/50">
        <p className="text-xs text-muted-foreground">
          {post?.created_at && formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: ru })}
        </p>
      </div>
    </div>
  );
});

TelegramPost.displayName = 'TelegramPost';