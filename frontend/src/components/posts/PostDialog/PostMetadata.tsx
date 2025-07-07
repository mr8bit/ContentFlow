import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Badge } from '../../ui';
import { PostMetadataProps } from './types';
import { getStatusColor, getStatusText } from './utils';

export const PostMetadata = React.memo<PostMetadataProps>(({ post }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
      <div className="space-y-2 sm:space-y-3">
        <h3 className="text-sm sm:text-base font-semibold">Информация о посте</h3>
        <div className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">ID:</span>
            <span className="font-mono">{post.id}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Статус:</span>
            <Badge className={`text-xs ${getStatusColor(post.status)}`}>
              {getStatusText(post.status)}
            </Badge>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Создан:</span>
            <span className="text-right">{formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: ru })}</span>
          </div>
          {post.scheduled_at && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Запланирован:</span>
              <span className="text-right">{formatDistanceToNow(new Date(post.scheduled_at), { addSuffix: true, locale: ru })}</span>
            </div>
          )}
          {post.published_at && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Опубликован:</span>
              <span className="text-right">{formatDistanceToNow(new Date(post.published_at), { addSuffix: true, locale: ru })}</span>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-2 sm:space-y-3">
        <h3 className="text-sm sm:text-base font-semibold">Источник</h3>
        <div className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
          {post.source_channel && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Канал источник:</span>
              <span className="text-right max-w-32 sm:max-w-48 truncate">
                {post.source_channel.channel_name || post.source_channel.channel_username}
              </span>
            </div>
          )}
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">ID сообщения:</span>
            <span className="font-mono">{post.original_message_id}</span>
          </div>
        </div>
      </div>
    </div>
  );
});

PostMetadata.displayName = 'PostMetadata';