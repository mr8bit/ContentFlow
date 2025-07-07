import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Badge } from '../../ui';
import { PostMetadataProps } from './types';
import { getStatusColor, getStatusText } from './utils';
import { Clock, Hash, Calendar, CheckCircle, ExternalLink } from 'lucide-react';

export const PostMetadata = React.memo<PostMetadataProps>(({ post }) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Информация о посте */}
      <div className="bg-gradient-to-br from-card to-muted/20 rounded-xl border p-6 shadow-sm">
        <h3 className="text-base font-semibold mb-4 flex items-center gap-3">
          <div className="p-2 bg-blue-500/10 rounded-lg">
            <Hash className="h-5 w-5 text-blue-500" />
          </div>
          Информация о посте
        </h3>
        <div className="space-y-4 text-sm">
          <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
            <span className="text-muted-foreground font-medium flex items-center gap-2">
              <Hash className="h-4 w-4" />
              ID:
            </span>
            <span className="font-mono bg-background/50 px-2 py-1 rounded text-xs">{post.id}</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
            <span className="text-muted-foreground font-medium flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Статус:
            </span>
            <Badge className={`text-xs ${getStatusColor(post.status)}`}>
              {getStatusText(post.status)}
            </Badge>
          </div>
          <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
            <span className="text-muted-foreground font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Создан:
            </span>
            <span className="text-right font-medium">{formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: ru })}</span>
          </div>
          {post.scheduled_at && (
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <span className="text-muted-foreground font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Запланирован:
              </span>
              <span className="text-right font-medium">{formatDistanceToNow(new Date(post.scheduled_at), { addSuffix: true, locale: ru })}</span>
            </div>
          )}
          {post.published_at && (
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <span className="text-muted-foreground font-medium flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Опубликован:
              </span>
              <span className="text-right font-medium">{formatDistanceToNow(new Date(post.published_at), { addSuffix: true, locale: ru })}</span>
            </div>
          )}
        </div>
      </div>

      {/* Источник */}
      <div className="bg-gradient-to-br from-card to-muted/20 rounded-xl border p-6 shadow-sm">
        <h3 className="text-base font-semibold mb-4 flex items-center gap-3">
          <div className="p-2 bg-green-500/10 rounded-lg">
            <ExternalLink className="h-5 w-5 text-green-500" />
          </div>
          Источник
        </h3>
        <div className="space-y-4 text-sm">
          {post.source_channel && (
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <span className="text-muted-foreground font-medium flex items-center gap-2">
                <ExternalLink className="h-4 w-4" />
                Канал источник:
              </span>
              <span className="text-right font-medium max-w-40 truncate">
                {post.source_channel.channel_name || post.source_channel.channel_username}
              </span>
            </div>
          )}
          <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
            <span className="text-muted-foreground font-medium flex items-center gap-2">
              <Hash className="h-4 w-4" />
              ID сообщения:
            </span>
            <span className="font-mono bg-background/50 px-2 py-1 rounded text-xs">{post.original_message_id}</span>
          </div>
        </div>
      </div>
    </div>
  );
});

PostMetadata.displayName = 'PostMetadata';