import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, Button, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Input } from '../ui';
import { Post, TargetChannel } from '../../types';
import { useMutation, useQueryClient } from 'react-query';
import { postsAPI } from '../../services/api';

interface ScheduleDialogProps {
  post: Post | null;
  targetChannels: TargetChannel[];
  onClose: () => void;
}

export function ScheduleDialog({ post, targetChannels, onClose }: ScheduleDialogProps): JSX.Element {
  const [selectedChannelId, setSelectedChannelId] = useState<string>('');
  const [scheduledDateTime, setScheduledDateTime] = useState('');
  const queryClient = useQueryClient();

  const schedulePostMutation = useMutation(
    ({ postId, channelId, scheduledAt }: { postId: number; channelId: number; scheduledAt: string }) =>
      postsAPI.schedule(postId, { target_channel_id: channelId, scheduled_at: scheduledAt }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['posts']);
        onClose();
      },
    }
  );

  const handleSchedule = (): void => {
    if (!post || !selectedChannelId || !scheduledDateTime) {
      return;
    }

    schedulePostMutation.mutate({
      postId: post.id,
      channelId: parseInt(selectedChannelId),
      scheduledAt: scheduledDateTime,
    });
  };

  // Получаем минимальную дату (текущее время + 1 минута)
  const getMinDateTime = (): string => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 1);
    return now.toISOString().slice(0, 16);
  };

  if (!post) return <></>;

  return (
    <Dialog open={!!post} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-md sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">Запланировать публикацию</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 sm:space-y-4">
          {(post.processed_text || post.original_text) && (
            <div className="p-3 sm:p-4 bg-muted rounded-lg max-h-24 sm:max-h-32 overflow-y-auto">
              <p className="text-xs sm:text-sm whitespace-pre-wrap">{post.processed_text || post.original_text}</p>
            </div>
          )}

          <div className="space-y-1 sm:space-y-2">
            <Label htmlFor="target-channel" className="text-sm sm:text-base">Целевой канал</Label>
            <Select value={selectedChannelId} onValueChange={setSelectedChannelId}>
              <SelectTrigger id="target-channel" className="text-sm sm:text-base">
                <SelectValue placeholder="Выберите канал" />
              </SelectTrigger>
              <SelectContent>
                {targetChannels.map((channel) => (
                  <SelectItem key={channel.id} value={channel.id.toString()} className="text-sm sm:text-base">
                    {channel.channel_name || channel.channel_username || `Канал ${channel.id}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1 sm:space-y-2">
            <Label htmlFor="scheduled-datetime" className="text-sm sm:text-base">Дата и время публикации</Label>
            <Input
              id="scheduled-datetime"
              type="datetime-local"
              value={scheduledDateTime}
              onChange={(e) => setScheduledDateTime(e.target.value)}
              min={getMinDateTime()}
              className="text-sm sm:text-base"
            />
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
            Отмена
          </Button>
          <Button 
            onClick={handleSchedule}
            disabled={schedulePostMutation.isLoading || !selectedChannelId || !scheduledDateTime}
            className="w-full sm:w-auto"
          >
            {schedulePostMutation.isLoading ? 'Планирую...' : 'Запланировать'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}