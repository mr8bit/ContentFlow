import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, Button, Badge, Separator, Tabs, TabsList, TabsTrigger, TabsContent, ScrollArea } from '../../ui';
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
      <Dialog open={!!post} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl max-h-[95vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="flex-shrink-0 px-6 py-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <DialogTitle className="text-xl font-semibold text-foreground">
                  Пост #{post?.id}
                </DialogTitle>
                <Badge className={`text-xs font-medium ${getStatusColor(post?.status || '')}`}>
                  {getStatusText(post?.status || '')}
                </Badge>
              </div>

            </div>
            
            {/* Кнопки управления статусом */}
            <div className="flex flex-wrap items-center gap-2 mt-4 p-3 bg-muted/30 rounded-lg">
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
            </div>
          </DialogHeader>

          <div className="flex-1 flex flex-col overflow-hidden">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
              <div className="px-6 py-2 border-b bg-muted/20">
                <TabsList className="grid w-full max-w-md grid-cols-2 mx-auto">
                  <TabsTrigger value="preview" className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                    <Eye className="h-4 w-4" />
                    Просмотр
                  </TabsTrigger>
        
                  <TabsTrigger value="info" className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                    <Info className="h-4 w-4" />
                    Информация
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* Вкладка просмотра */}
              <TabsContent value="preview" className="flex-1 overflow-hidden">
                <ScrollArea className="h-full">
                  <div className="p-6">
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                      {/* Оригинальный пост */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold text-lg flex items-center gap-3">
                            <div className="w-4 h-4 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 shadow-sm"></div>
                            Оригинальный пост
                          </h3>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCopyText(post.original_text || '')}
                              className="gap-2 text-muted-foreground hover:text-foreground"
                            >
                              <Copy className="h-4 w-4" />
                              Копировать
                            </Button>
                          </div>
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
                              className="gap-2 border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-950"
                            >
                              <a
                                href={getTelegramPostUrl()!}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <ExternalLink className="h-4 w-4" />
                                Открыть в Telegram
                              </a>
                            </Button>
                          </div>
                        )}
                      </div>

                      {/* Улучшенный пост */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold text-lg flex items-center gap-3">
                            <div className="w-4 h-4 rounded-full bg-gradient-to-r from-purple-500 to-purple-600 shadow-sm"></div>
                            Улучшенный пост
                          </h3>
                          {(improvedText || post.processed_text) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCopyText(improvedText || post.processed_text || '')}
                              className="gap-2 text-muted-foreground hover:text-foreground"
                            >
                              <Copy className="h-4 w-4" />
                              Копировать
                            </Button>
                          )}
                        </div>
                        
                        <EditableTextSection
                          post={post}
                          text={improvedText || post.processed_text || ''}
                          type="processed"
                          onSave={(newText) => {
                            setImprovedText(newText);
                            setTimeout(() => handleSaveImprovedText(), 0);
                          }}
                          isLoading={updatePostMutation.isLoading}
                        />
                      </div>
                    </div>
                  </div>
                </ScrollArea>
              </TabsContent>

  
              {/* Вкладка информации */}
              <TabsContent value="info" className="flex-1 overflow-hidden">
                <ScrollArea className="h-full">
                  <div className="p-6">
                    <div className="space-y-6">
                      <PostMetadata post={post} />
                      
                      {post.source_channel && (
                        <div className="bg-gradient-to-br from-card to-muted/20 rounded-xl border p-6 shadow-sm">
                          <h3 className="font-semibold mb-4 flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg">
                              <ExternalLink className="h-5 w-5 text-primary" />
                            </div>
                            Источник
                          </h3>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                            <div className="space-y-2">
                              <span className="text-muted-foreground font-medium">Канал:</span>
                              <p className="font-medium text-foreground">
                                {post.source_channel.channel_name || post.source_channel.channel_username}
                              </p>
                            </div>
                            <div className="space-y-2">
                              <span className="text-muted-foreground font-medium">ID сообщения:</span>
                              <p className="font-mono text-foreground bg-muted/50 px-2 py-1 rounded text-xs">
                                {post.original_message_id}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </ScrollArea>
              </TabsContent>
             </Tabs>
           </div>
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