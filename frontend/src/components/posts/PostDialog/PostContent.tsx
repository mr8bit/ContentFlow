import React, { useState } from 'react';
import { Button, Badge, Tabs, TabsList, TabsTrigger, TabsContent } from '../../ui';
import { Copy, ExternalLink, Info, Eye, CheckCircle, Send, Calendar, Brain } from 'lucide-react';
import { Post } from '../../../types';
import { usePostDialog } from './hooks';
import { getStatusColor, getStatusText } from './utils';
import { TelegramPost } from './TelegramPost';
import { PostMetadata } from './PostMetadata';
import { EditableTextSection } from './EditableTextSection';
import { FullscreenMediaModal } from './FullscreenMediaModal';
import { ScheduleDialog } from '../ScheduleDialog';
import { PublishDialog } from '../PublishDialog';
import { useMutation, useQueryClient, useQuery } from 'react-query';
import { postsAPI, targetChannelsAPI } from '../../../services/api';
import { useToast } from '../../../hooks/use-toast';

interface PostContentProps {
  post: Post;
  onClose: () => void;
}

export const PostContent = React.memo<PostContentProps>(({ post, onClose }) => {
  const {
    improvedText,
    setImprovedText,
    fullscreenMedia,
    handleSaveImprovedText,
    handleMediaClick,
    handleCloseFullscreen,
    updatePostMutation,
  } = usePostDialog(post, onClose);
  
  const [activeTab, setActiveTab] = useState('preview');
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // LLM Classification mutation
  const classifyPostMutation = useMutation({
    mutationFn: (postId: number) => postsAPI.classify(postId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      toast({
        title: 'Классификация завершена',
        description: 'Пост успешно классифицирован с помощью LLM',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Ошибка классификации',
        description: error.response?.data?.detail || 'Не удалось классифицировать пост',
        variant: 'destructive',
      });
    },
  });

  const handleClassify = () => {
    if (!post) return;
    classifyPostMutation.mutate(post.id);
  };

  // Fetch target channels
  const { data: targetChannels } = useQuery(
    'target-channels',
    () => targetChannelsAPI.getAll({ active_only: true }).then(res => res.data),
    { enabled: !!post }
  );

  // Approve post mutation
  const approvePostMutation = useMutation({
    mutationFn: ({ postId, data }: { postId: number; data: { target_channel_id: number; admin_notes?: string } }) => 
      postsAPI.approve(postId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      toast({
        title: 'Пост одобрен',
        description: 'Пост успешно одобрен и готов к публикации',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Ошибка одобрения',
        description: error.response?.data?.detail || 'Не удалось одобрить пост',
        variant: 'destructive',
      });
    },
  });

  const handleApprove = () => {
    if (!post || !targetChannels || targetChannels.length === 0) {
      toast({
        title: 'Ошибка',
        description: 'Нет доступных каналов для публикации',
        variant: 'destructive',
      });
      return;
    }
    
    // Используем первый доступный канал по умолчанию
    const defaultChannelId = targetChannels[0].id;
    
    approvePostMutation.mutate({
      postId: post.id,
      data: {
        target_channel_id: defaultChannelId,
        admin_notes: 'Одобрено через интерфейс',
      },
    });
  };

  const handleScheduleDialogClose = () => {
    setShowScheduleDialog(false);
  };

  const handlePublishDialogClose = () => {
    setShowPublishDialog(false);
  };

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const getTelegramPostUrl = () => {
    if (!post.source_channel || !post.original_message_id) {
      return null;
    }
    
    const channelUsername = post.source_channel.channel_username;
    if (channelUsername) {
      // Убираем @ если есть
      const cleanUsername = channelUsername.startsWith('@') ? channelUsername.slice(1) : channelUsername;
      return `https://t.me/${cleanUsername}/${post.original_message_id}`;
    }
    
    return null;
  };

  return (
    <>
      <div className="flex-shrink-0 px-4 sm:px-6 py-3 sm:py-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-foreground">
              Пост #{post?.id}
            </h1>
            <Badge className={`text-xs font-medium ${getStatusColor(post?.status || '')}`}>
              {getStatusText(post?.status || '')}
            </Badge>
          </div>
        </div>
        
        {/* Кнопки управления статусом */}
        <div className="flex flex-wrap items-center gap-2 mt-3 p-2 sm:p-3 bg-muted/30 rounded-lg">
          {/* Кнопка LLM классификации для статусов scraped и processed */}
          {(post.status === 'scraped' || post.status === 'processed') && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleClassify}
              disabled={classifyPostMutation.isLoading}
              className="gap-2 border-orange-200 text-orange-700 hover:bg-orange-50 dark:border-orange-800 dark:text-orange-400 dark:hover:bg-orange-950"
            >
              <Brain className="h-4 w-4" />
              {classifyPostMutation.isLoading ? 'Классифицирую...' : 'Классифицировать'}
            </Button>
          )}
          
          {/* Кнопка "Одобрить" для статусов pending и processed */}
          {(post.status === 'pending' || post.status === 'processed') && (
            <Button
              size="sm"
              onClick={handleApprove}
              disabled={approvePostMutation.isLoading}
              className="gap-2 bg-green-600 hover:bg-green-700 text-white"
            >
              <CheckCircle className="h-4 w-4" />
              {approvePostMutation.isLoading ? 'Одобряю...' : 'Одобрить'}
            </Button>
          )}
          
          {/* Кнопки для статуса approved */}
          {post.status === 'approved' && (
            <>
              <Button
                size="sm"
                onClick={() => setShowPublishDialog(true)}
                className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Send className="h-4 w-4" />
                Опубликовать
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowScheduleDialog(true)}
                className="gap-2 border-purple-200 text-purple-700 hover:bg-purple-50 dark:border-purple-800 dark:text-purple-400 dark:hover:bg-purple-950"
              >
                <Calendar className="h-4 w-4" />
                Запланировать
              </Button>
            </>
          )}
          
          {/* Кнопки действий */}
          <div className="flex items-center gap-2 ml-auto">
            {/* Копировать текст */}
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleCopyText(post.processed_text || post.original_text || '')}
              className="gap-2"
            >
              <Copy className="h-4 w-4" />
              Копировать
            </Button>
            
            {/* Открыть в Telegram */}
            {getTelegramPostUrl() && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => window.open(getTelegramPostUrl()!, '_blank')}
                className="gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                Telegram
              </Button>
            )}
          </div>
        </div>
      </div>
      
      {/* Основной контент */}
      <div className="flex-1 overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <div className="flex-shrink-0 px-4 sm:px-6 py-2 border-b bg-muted/20">
            <TabsList className="grid w-full grid-cols-2 max-w-md">
              <TabsTrigger value="preview" className="gap-2 text-xs sm:text-sm">
                <Eye className="h-4 w-4" />
                Просмотр
              </TabsTrigger>
              <TabsTrigger value="info" className="gap-2 text-xs sm:text-sm">
                <Info className="h-4 w-4" />
                Информация
              </TabsTrigger>
            </TabsList>
          </div>
          
          <div className="flex-1 overflow-hidden">
            <TabsContent value="preview" className="h-full flex flex-col m-0 p-0">
              <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 h-full">
                  {/* Оригинальный пост */}
                  <div className="space-y-3 sm:space-y-4">
                    <h3 className="text-base sm:text-lg font-semibold text-foreground flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      Оригинальный пост
                    </h3>
                    <TelegramPost 
                      text={post.original_text || ''} 
                      type="original" 
                      post={post} 
                      onMediaClick={handleMediaClick}
                    />
                  </div>
                  
                  {/* Обработанный пост */}
                  <div className="space-y-3 sm:space-y-4">
                    <h3 className="text-base sm:text-lg font-semibold text-foreground flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      Обработанный пост
                    </h3>
                    {post.processed_text ? (
                      <EditableTextSection
                        post={post}
                        text={post.processed_text}
                        type="processed"
                        onSave={(newText) => {
                          updatePostMutation.mutate({ id: post.id, text: newText });
                        }}
                        isLoading={updatePostMutation.isLoading}
                      />
                    ) : (
                      <div className="p-4 border border-dashed border-muted-foreground/30 rounded-lg text-center text-muted-foreground">
                        <p>Обработанный текст отсутствует</p>
                        <p className="text-sm mt-1">Пост еще не был обработан</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="info" className="h-full flex flex-col m-0 p-0">
              <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                <PostMetadata post={post} />
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </div>

      {/* Модальные окна */}
      <FullscreenMediaModal
        mediaUrl={fullscreenMedia}
        onClose={handleCloseFullscreen}
      />

      {showScheduleDialog && (
        <ScheduleDialog
          post={post}
          targetChannels={targetChannels || []}
          onClose={handleScheduleDialogClose}
        />
      )}

      {showPublishDialog && (
        <PublishDialog
          post={post}
          onClose={handlePublishDialogClose}
        />
      )}
    </>
  );
});

PostContent.displayName = 'PostContent';