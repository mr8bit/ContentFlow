import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import { TelegramPostProps } from './types';
import { getPostTypeBorderColor, getPostTypeBackgroundColor, getPostTypeLabel } from './utils';
import { MediaContent } from './MediaContent';
import { MarkdownRenderer } from './MarkdownRenderer';

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
    <div className={`rounded-xl border-2 ${borderColor} ${backgroundColor} overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200`}>
      {/* Telegram-style header */}
      <div className="px-3 sm:px-4 py-2.5 bg-muted/30 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center ring-2 ring-primary/20">
            <span className="text-xs sm:text-sm font-semibold text-primary">TG</span>
          </div>
          <div>
            <p className="text-xs sm:text-sm font-semibold text-foreground">Telegram Post</p>
            <p className="text-xs text-muted-foreground font-medium">{typeLabel}</p>
          </div>
        </div>
      </div>
      
      {/* Post content */}
      <div className="p-4 sm:p-5 space-y-3 sm:space-y-4">
        {/* Media content - показываем медиа в начале поста как в Telegram */}
        {post?.original_media && (
          <div className="-mx-4 sm:-mx-5 -mt-4 sm:-mt-5 mb-3 sm:mb-4">
            <div className="px-4 sm:px-5 pt-4 sm:pt-5">
              <MediaContent media={post.original_media} onMediaClick={onMediaClick} />
            </div>
          </div>
        )}
        
        {/* Text content */}
        {text && (
          <div className="text-sm sm:text-base leading-relaxed">
            <MarkdownRenderer 
              text={text} 
              showValidator={type === 'improved' || type === 'processed'}
              className="prose prose-sm sm:prose-base max-w-none dark:prose-invert prose-headings:text-foreground prose-p:text-foreground prose-strong:text-foreground prose-em:text-foreground prose-code:text-foreground"
            />
          </div>
        )}
      </div>
      
      {/* Telegram-style footer */}
      <div className="px-4 sm:px-5 py-2.5 bg-muted/20 border-t border-border/50">
        <p className="text-xs sm:text-sm text-muted-foreground font-medium">
          {post?.created_at && formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: ru })}
        </p>
      </div>
    </div>
  );
});

TelegramPost.displayName = 'TelegramPost';