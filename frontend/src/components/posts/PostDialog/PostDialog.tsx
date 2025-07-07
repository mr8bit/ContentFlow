import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, Button, Badge, Separator, Tabs, TabsList, TabsTrigger, TabsContent } from '../../ui';
import { Sparkles as SparklesIcon, Copy, ExternalLink, MessageSquare, Info, Edit3, Eye, CheckCircle, Send, Calendar } from 'lucide-react';
import { PostDialogProps } from './types';
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

export const PostDialog = React.memo<PostDialogProps>(({ post, onClose }) => {
  const {
    improvedText,
    setImprovedText,
    isImproving,
    fullscreenMedia,
    handleImproveText,
    handleSaveImprovedText,
    handleMediaClick,
    handleCloseFullscreen,
    handleCancelImprovement,
    updatePostMutation,
  } = usePostDialog(post, onClose);
  
  const [activeTab, setActiveTab] = useState('preview');
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

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

  if (!post) {
    return null;
  }

  const canImproveText = post.processed_text || post.original_text;
  
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
      <Dialog open={!!post} onOpenChange={(open) => {
        // Предотвращаем закрытие диалога, если открыто модальное окно медиа
        if (!open && fullscreenMedia) {
          return;
        }
        onClose();
      }}>
        <DialogContent className="w-[95vw] max-w-md sm:max-w-[90vw] max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" />
                <span className="text-lg sm:text-xl">Пост #{post.id}</span>
                <Badge className={getStatusColor(post.status)}>
                  {getStatusText(post.status)}
                </Badge>
              </div>
              
              {/* Кнопки управления статусом */}
              <div className="flex items-center gap-2">
                {/* Кнопка "Одобрить" для статусов pending и processed */}
                {(post.status === 'pending' || post.status === 'processed') && (
                  <Button
                    size="sm"
                    onClick={handleApprove}
                    disabled={approvePostMutation.isLoading}
                    className="gap-2"
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
                      className="gap-2"
                    >
                      <Send className="h-4 w-4" />
                      Опубликовать
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowScheduleDialog(true)}
                      className="gap-2"
                    >
                      <Calendar className="h-4 w-4" />
                      Отложенная публикация
                    </Button>
                  </>
                )}
              </div>
            </DialogTitle>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="grid w-full grid-cols-2 flex-shrink-0">
              <TabsTrigger value="preview" className="gap-2">
                <Eye className="h-4 w-4" />
                Просмотр
              </TabsTrigger>
    
              <TabsTrigger value="info" className="gap-2">
                <Info className="h-4 w-4" />
                Информация
              </TabsTrigger>
            </TabsList>

            {/* Вкладка просмотра */}
            <TabsContent value="preview" className="flex-1 overflow-y-auto mt-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
                {/* Оригинальный пост */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                      Оригинальный пост
                    </h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopyText(post.original_text || '')}
                      className="gap-2"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <TelegramPost 
                    text={post.original_text || ''} 
                    type="original" 
                    post={post} 
                    onMediaClick={handleMediaClick}
                  />
                  
                  {/* Кнопка открытия в Telegram */}
                  {getTelegramPostUrl() && (
                    <div className="flex justify-center pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                        className="gap-2"
                      >
                        <a
                          href={getTelegramPostUrl()!}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="h-4 w-4" />
                          Открыть оригинал в Telegram
                        </a>
                      </Button>
                    </div>
                  )}
                </div>

                {/* Улучшенный пост */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                      Улучшенный пост
                    </h3>
                    {(improvedText || post.processed_text) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopyText(improvedText || post.processed_text || '')}
                        className="gap-2"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  
                  <EditableTextSection
                    post={post}
                    text={improvedText || post.processed_text || ''}
                    type="processed"
                    onSave={(newText) => {
                      setImprovedText(newText);
                      // Используем setTimeout чтобы дать время на обновление состояния
                      setTimeout(() => handleSaveImprovedText(), 0);
                    }}
                    isLoading={updatePostMutation.isLoading}
                  />
                </div>
              </div>
            </TabsContent>

  
            {/* Вкладка информации */}
            <TabsContent value="info" className="flex-1 overflow-y-auto mt-4">
              <div className="space-y-6">
                <PostMetadata post={post} />
                
                {post.source_channel && (
                  <div className="bg-card rounded-lg border p-4">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                      <ExternalLink className="h-5 w-5" />
                      Источник
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Канал:</span>
                        <span className="font-medium">
                          {post.source_channel.channel_name || post.source_channel.channel_username}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">ID сообщения:</span>
                        <span className="font-mono">{post.original_message_id}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
      
      {/* Schedule Dialog */}
      {showScheduleDialog && targetChannels && (
        <ScheduleDialog
          post={post}
          targetChannels={targetChannels}
          onClose={handleScheduleDialogClose}
        />
      )}
      
      {/* Publish Dialog */}
      {showPublishDialog && (
        <PublishDialog
          post={post}
          onClose={handlePublishDialogClose}
        />
      )}
      
      {/* Fullscreen Media Modal - рендерится отдельно через Portal */}
      {fullscreenMedia && (
        <FullscreenMediaModal 
          mediaUrl={fullscreenMedia} 
          onClose={handleCloseFullscreen} 
        />
      )}
    </>
  );
});

PostDialog.displayName = 'PostDialog';