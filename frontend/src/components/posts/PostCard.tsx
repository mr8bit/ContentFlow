import React from 'react';
import { Card, CardContent, CardHeader, Badge, Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, Avatar, AvatarFallback, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger, Separator } from '../ui';
import { MoreVertical as MoreIcon, Eye as EyeIcon, Edit as EditIcon, Check as CheckIcon, X as XIcon, Send as SendIcon, Calendar as CalendarIcon, Image as ImageIcon, Video as VideoIcon, File as FileIcon, Clock, User, Play } from 'lucide-react';
import { Post } from '../../types';
import { formatDistanceToNow, format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { MediaItem, OriginalMedia } from '../../services/api';

interface PostCardProps {
  post: Post;
  onView: (post: Post) => void;
  onEdit: (post: Post) => void;
  onApprove: (post: Post) => void;
  onReject: (post: Post) => void;
  onPublish: (post: Post) => void;
  onSchedule: (post: Post) => void;
  onImageClick: (imageUrl: string) => void;
}



function getStatusColor(status: string): string {
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

function getStatusText(status: string): string {
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

export function PostCard({
  post,
  onView,
  onEdit,
  onApprove,
  onReject,
  onPublish,
  onSchedule,
  onImageClick,
}: PostCardProps): JSX.Element {
  const renderMedia = (): JSX.Element | null => {
    if (!post.original_media) {
      return null;
    }

    const media = post.original_media as OriginalMedia;
    let firstMediaItem: MediaItem | null = null;
    let mediaCount = 0;

    if ('media_list' in media) {
      // MediaGroup
      firstMediaItem = media.media_list[0] || null;
      mediaCount = media.media_list.length;
    } else {
      // SingleMedia
      firstMediaItem = media;
      mediaCount = 1;
    }

    if (!firstMediaItem) {
      return null;
    }

    const getMediaIcon = (type: string) => {
      switch (type) {
        case 'photo':
          return <ImageIcon className="h-6 w-6 text-white/90" />;
        case 'video':
          return <VideoIcon className="h-6 w-6 text-white/90" />;
        default:
          return <FileIcon className="h-6 w-6 text-white/90" />;
      }
    };

    const mediaPath = firstMediaItem.file_path || firstMediaItem.path;
    const isImage = firstMediaItem.type === 'photo';
    const isVideo = firstMediaItem.type === 'video';

    return (
      <div className="relative h-32 sm:h-40 lg:h-48 overflow-hidden rounded-t-lg bg-gradient-to-br from-muted/50 to-muted border-b group">
        {mediaPath && isImage ? (
          <>
            <img
              src={`http://localhost:8000/api/media/${mediaPath.split('/').pop()}`}
              alt="Post media"
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              onClick={() => onImageClick(`http://localhost:8000/api/media/${mediaPath.split('/').pop()}`)}
              style={{ cursor: 'pointer' }}
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
          </>
        ) : mediaPath && isVideo ? (
          <>
            <video
              className="w-full h-full object-cover"
              poster={`http://localhost:8000/api/media/${mediaPath.split('/').pop()}`}
            >
              <source src={`http://localhost:8000/api/media/${mediaPath.split('/').pop()}`} type="video/mp4" />
            </video>
            <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
              <div className="bg-black/50 rounded-full p-2 sm:p-3">
                <Play className="h-6 w-6 sm:h-8 sm:w-8 text-white fill-white" />
              </div>
            </div>
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-muted/50 to-muted">
            {getMediaIcon(firstMediaItem.type)}
            <span className="text-sm text-muted-foreground/80 font-medium mt-2">
              {firstMediaItem.type === 'photo' ? 'Изображение' : 
               firstMediaItem.type === 'video' ? 'Видео' : 'Файл'}
            </span>
          </div>
        )}
        
        {/* Media count badge */}
        {mediaCount > 1 && (
          <div className="absolute top-1 right-1 sm:top-2 sm:right-2 bg-black/70 text-white text-xs px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-full flex items-center gap-1">
            <div className="h-3 w-3 sm:h-4 sm:w-4">{getMediaIcon(firstMediaItem.type)}</div>
            <span className="text-xs">{mediaCount}</span>
          </div>
        )}
        
        {/* Media type indicator */}
        <div className="absolute bottom-1 left-1 sm:bottom-2 sm:left-2 bg-black/70 text-white text-xs px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-full flex items-center gap-1">
          <div className="h-3 w-3 sm:h-4 sm:w-4">{getMediaIcon(firstMediaItem.type)}</div>
          <span className="capitalize hidden sm:inline">{firstMediaItem.type}</span>
        </div>
      </div>
    );
  };

  const getChannelInitials = (channel: any): string => {
    if (!channel) return 'UN';
    const name = channel.channel_name || channel.channel_username || 'Unknown';
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <TooltipProvider>
      <Card className="group hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 border-border/50 hover:border-primary/20 overflow-hidden">
        {renderMedia()}
        
        <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6 pt-3 sm:pt-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              <Avatar className="h-6 w-6 sm:h-8 sm:w-8 flex-shrink-0">
                <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">
                  {getChannelInitials(post.source_channel)}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col min-w-0">
                <Badge className={`${getStatusColor(post.status)} text-xs font-medium w-fit`}>
                  {getStatusText(post.status)}
                </Badge>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-xs text-muted-foreground mt-1 truncate max-w-16 sm:max-w-24">
                      #{post.id}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>ID поста: {post.id}</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6 sm:h-8 sm:w-8 opacity-60 sm:opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-primary/10 flex-shrink-0">
                  <MoreIcon className="h-3 w-3 sm:h-4 sm:w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => onView(post)}>
                  <EyeIcon className="h-4 w-4 mr-2" />
                  Просмотр
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onEdit(post)}>
                  <EditIcon className="h-4 w-4 mr-2" />
                  Редактировать
                </DropdownMenuItem>
                {post.status === 'processed' && (
                  <>
                    <Separator className="my-1" />
                    <DropdownMenuItem onClick={() => onApprove(post)} className="text-green-600 focus:text-green-600">
                      <CheckIcon className="h-4 w-4 mr-2" />
                      Одобрить
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onReject(post)} className="text-destructive focus:text-destructive">
                      <XIcon className="h-4 w-4 mr-2" />
                      Отклонить
                    </DropdownMenuItem>
                  </>
                )}
                {(post.status === 'approved' || post.status === 'scheduled') && (
                  <>
                    <Separator className="my-1" />
                    <DropdownMenuItem onClick={() => onPublish(post)} className="text-blue-600 focus:text-blue-600">
                      <SendIcon className="h-4 w-4 mr-2" />
                      Опубликовать
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onSchedule(post)}>
                      <CalendarIcon className="h-4 w-4 mr-2" />
                      Запланировать
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>

        <CardContent className="pt-0 px-3 sm:px-6 pb-3 sm:pb-6">
          {(post.processed_text || post.original_text) && (
            <div className="mb-3 sm:mb-4">
              <p className="text-xs sm:text-sm text-foreground/80 line-clamp-2 sm:line-clamp-3 leading-relaxed">
                {post.processed_text || post.original_text}
              </p>
            </div>
          )}

          <div className="space-y-2 sm:space-y-3">
            <div className="flex items-center gap-1.5 sm:gap-2 text-xs text-muted-foreground">
              <Clock className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">Создан {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: ru })}</span>
            </div>
            
            {post.scheduled_at && (
              <div className="flex items-center gap-1.5 sm:gap-2 text-xs text-purple-600 dark:text-purple-400">
                <CalendarIcon className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">Запланирован на {format(new Date(post.scheduled_at), 'dd.MM.yyyy HH:mm', { locale: ru })}</span>
              </div>
            )}
            
            {post.published_at && (
              <div className="flex items-center gap-1.5 sm:gap-2 text-xs text-green-600 dark:text-green-400">
                <SendIcon className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">Опубликован {formatDistanceToNow(new Date(post.published_at), { addSuffix: true, locale: ru })}</span>
              </div>
            )}
            
            {post.source_channel && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1.5 sm:gap-2 text-xs text-muted-foreground">
                    <User className="h-3 w-3 flex-shrink-0" />
                    <span className="truncate">{post.source_channel.channel_name || post.source_channel.channel_username}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Источник: {post.source_channel.channel_name || post.source_channel.channel_username}</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>

          <Separator className="my-3 sm:my-4" />

          <div className="flex gap-1.5 sm:gap-2">
            <Button variant="outline" size="sm" onClick={() => onView(post)} className="flex-1 hover:bg-primary/5 text-xs sm:text-sm px-2 sm:px-3 h-8 sm:h-9">
              <EyeIcon className="h-3 w-3 mr-1" />
              <span className="hidden sm:inline">Просмотр</span>
              <span className="sm:hidden">Вид</span>
            </Button>
            
            {(post.status === 'approved' || post.status === 'scheduled') && (
              <Button size="sm" onClick={() => onPublish(post)} className="flex-1 text-xs sm:text-sm px-2 sm:px-3 h-8 sm:h-9">
                <SendIcon className="h-3 w-3 mr-1" />
                <span className="hidden sm:inline">Опубликовать</span>
                <span className="sm:hidden">Опубл.</span>
              </Button>
            )}
            
            {post.status === 'processed' && (
              <Button size="sm" onClick={() => onApprove(post)} className="flex-1 bg-green-600 hover:bg-green-700 text-xs sm:text-sm px-2 sm:px-3 h-8 sm:h-9">
                <CheckIcon className="h-3 w-3 mr-1" />
                <span className="hidden sm:inline">Одобрить</span>
                <span className="sm:hidden">Одобр.</span>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}