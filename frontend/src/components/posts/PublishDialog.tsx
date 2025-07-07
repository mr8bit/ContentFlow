import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, Button, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Textarea } from '../ui';
import { Post, TargetChannel } from '../../types';
import { useMutation, useQueryClient, useQuery } from 'react-query';
import { postsAPI, targetChannelsAPI } from '../../services/api';
import { useToast } from '../../hooks/use-toast';
import { Send, Loader2 } from 'lucide-react';

interface PublishDialogProps {
  post: Post | null;
  onClose: () => void;
}

export function PublishDialog({ post, onClose }: PublishDialogProps): JSX.Element {
  const [selectedChannelId, setSelectedChannelId] = useState<string>('');
  const [processedText, setProcessedText] = useState<string>(post?.processed_text || '');
  const [adminNotes, setAdminNotes] = useState<string>('');
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch target channels
  const { data: targetChannels } = useQuery(
    'target-channels',
    () => targetChannelsAPI.getAll({ active_only: true }).then(res => res.data),
    { enabled: !!post }
  );

  const publishPostMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => postsAPI.publish(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      toast({
        title: 'Пост опубликован',
        description: 'Пост успешно опубликован в выбранный канал',
      });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: 'Ошибка публикации',
        description: error.response?.data?.detail || 'Не удалось опубликовать пост',
        variant: 'destructive',
      });
    },
  });

  const handlePublish = () => {
    if (!post || !selectedChannelId) {
      toast({
        title: 'Ошибка',
        description: 'Выберите канал для публикации',
        variant: 'destructive',
      });
      return;
    }

    publishPostMutation.mutate({
      id: post.id,
      data: {
        target_channel_id: parseInt(selectedChannelId),
        admin_notes: adminNotes || undefined,
        processed_text: processedText || undefined,
      },
    });
  };

  if (!post) {
    return <></>;
  }

  return (
    <Dialog open={!!post} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5 text-primary" />
            Опубликовать пост
          </DialogTitle>
          <DialogDescription>
            Опубликовать пост #{post.id} немедленно в выбранный канал
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Выбор канала */}
          <div className="space-y-2">
            <Label htmlFor="channel">Канал для публикации *</Label>
            <Select value={selectedChannelId} onValueChange={setSelectedChannelId}>
              <SelectTrigger>
                <SelectValue placeholder="Выберите канал" />
              </SelectTrigger>
              <SelectContent>
                {targetChannels?.map((channel) => (
                  <SelectItem key={channel.id} value={channel.id.toString()}>
                    {channel.channel_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Текст поста */}
          <div className="space-y-2">
            <Label htmlFor="text">Текст поста</Label>
            <Textarea
              id="text"
              value={processedText}
              onChange={(e) => setProcessedText(e.target.value)}
              placeholder="Отредактируйте текст поста при необходимости..."
              rows={4}
            />
          </div>

          {/* Заметки администратора */}
          <div className="space-y-2">
            <Label htmlFor="notes">Заметки администратора</Label>
            <Textarea
              id="notes"
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder="Дополнительные заметки..."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Отмена
          </Button>
          <Button 
            onClick={handlePublish}
            disabled={publishPostMutation.isLoading || !selectedChannelId}
            className="gap-2"
          >
            {publishPostMutation.isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Публикация...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Опубликовать
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}