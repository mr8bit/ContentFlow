import React, { useState, useEffect } from 'react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Badge } from '../components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '../components/ui/tooltip';
import {
  Plus as AddIcon,
  Edit as EditIcon,
  Trash2 as DeleteIcon,
  RefreshCw as RefreshIcon,
  CheckCircle as CheckCircleIcon,
  XCircle as CancelIcon,
  Send as PublishIcon,
  Loader2,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { targetChannelsAPI, TargetChannel, TargetChannelCreate } from '../services/api';

interface ChannelDialogProps {
  open: boolean;
  onClose: () => void;
  channel?: TargetChannel;
  onSubmit: (data: TargetChannelCreate) => void;
  loading: boolean;
}

function ChannelDialog({ open, onClose, channel, onSubmit, loading }: ChannelDialogProps) {
  const [formData, setFormData] = useState<TargetChannelCreate>({
    channel_id: '',
    channel_name: '',
  });

  useEffect(() => {
    if (channel) {
      setFormData({
        channel_id: channel.channel_id,
        channel_name: channel.channel_name,
      });
    } else {
      setFormData({
        channel_id: '',
        channel_name: '',
      });
    }
  }, [channel]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
      setFormData({
        channel_id: '',
        channel_name: '',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="w-[95vw] max-w-[425px] mx-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader className="px-1 sm:px-0">
            <DialogTitle className="text-base sm:text-lg">
              {channel ? 'Редактировать канал' : 'Добавить канал'}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 sm:gap-4 py-3 sm:py-4 px-1 sm:px-0">
            <div className="grid gap-1.5 sm:gap-2">
              <label htmlFor="channel_id" className="text-xs sm:text-sm font-medium">
                ID канала
              </label>
              <Input
                id="channel_id"
                value={formData.channel_id}
                onChange={(e) => setFormData({ ...formData, channel_id: e.target.value })}
                required
                disabled={loading || !!channel}
                placeholder="@channel_name или -1001234567890"
                className="text-xs sm:text-sm h-8 sm:h-10"
              />
            </div>
            <div className="grid gap-1.5 sm:gap-2">
              <label htmlFor="channel_name" className="text-xs sm:text-sm font-medium">
                Название канала
              </label>
              <Input
                id="channel_name"
                value={formData.channel_name}
                onChange={(e) => setFormData({ ...formData, channel_name: e.target.value })}
                required
                disabled={loading}
                className="text-xs sm:text-sm h-8 sm:h-10"
              />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0 px-1 sm:px-0">
            <Button type="button" variant="outline" onClick={handleClose} disabled={loading} className="w-full sm:w-auto text-xs sm:text-sm h-8 sm:h-9 order-2 sm:order-1">
              Отмена
            </Button>
            <Button type="submit" disabled={loading} className="w-full sm:w-auto text-xs sm:text-sm h-8 sm:h-9 order-1 sm:order-2">
              {loading ? <Loader2 className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4 animate-spin" /> : null}
              {channel ? 'Сохранить' : 'Добавить'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function TargetChannels() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingChannel, setEditingChannel] = useState<TargetChannel | undefined>();
  const [error, setError] = useState('');
  const queryClient = useQueryClient();

  const {
    data: channels,
    isLoading,
    error: fetchError,
    refetch,
  } = useQuery('target-channels', () =>
    targetChannelsAPI.getAll().then((res: any) => res.data)
  );

  const createMutation = useMutation(
    (data: TargetChannelCreate) => targetChannelsAPI.create(data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('target-channels');
        setDialogOpen(false);
        setError('');
      },
      onError: (err: any) => {
        setError(err.response?.data?.detail || 'Ошибка при создании канала');
      },
    }
  );

  const updateMutation = useMutation(
    ({ id, data }: { id: number; data: TargetChannelCreate }) =>
      targetChannelsAPI.update(id, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('target-channels');
        setDialogOpen(false);
        setEditingChannel(undefined);
        setError('');
      },
      onError: (err: any) => {
        setError(err.response?.data?.detail || 'Ошибка при обновлении канала');
      },
    }
  );

  const deleteMutation = useMutation(
    (id: number) => targetChannelsAPI.delete(id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('target-channels');
      },
      onError: (err: any) => {
        setError(err.response?.data?.detail || 'Ошибка при удалении канала');
      },
    }
  );

  const handleCreate = () => {
    setEditingChannel(undefined);
    setDialogOpen(true);
    setError('');
  };

  const handleEdit = (channel: TargetChannel) => {
    setEditingChannel(channel);
    setDialogOpen(true);
    setError('');
  };

  const handleDelete = (id: number) => {
    if (window.confirm('Вы уверены, что хотите удалить этот канал?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleSubmit = (data: TargetChannelCreate) => {
    if (editingChannel) {
      updateMutation.mutate({ id: editingChannel.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center mt-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="px-3 sm:px-4 py-4 sm:py-8">
      <>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0 mb-4 sm:mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">Целевые каналы</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">Управление каналами для публикации</p>
        </div>
        <div className="flex gap-1.5 sm:gap-2 w-full sm:w-auto">
          <Tooltip>
            <>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" onClick={() => refetch()} className="flex-1 sm:flex-none h-8 sm:h-9">
                  <>
                    <RefreshIcon className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="ml-1 sm:hidden text-xs">Обновить</span>
                  </>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Обновить</p>
              </TooltipContent>
            </>
          </Tooltip>
          <Button onClick={handleCreate} size="sm" className="flex-1 sm:flex-none h-8 sm:h-9 text-xs sm:text-sm">
            <>
              <AddIcon className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Добавить канал</span>
              <span className="sm:hidden">Добавить</span>
            </>
          </Button>
        </div>
      </div>

      {error && (
        <Alert className="mb-3 sm:mb-4">
          <AlertDescription className="text-xs sm:text-sm">{error}</AlertDescription>
        </Alert>
      )}

      {fetchError && (
        <Alert className="mb-3 sm:mb-4">
          <AlertDescription className="text-xs sm:text-sm">Ошибка загрузки каналов</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {channels?.map((channel: TargetChannel) => (
          <Card key={channel.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6">
              <div className="flex justify-between items-start gap-2">
                <CardTitle className="text-base sm:text-lg min-w-0">
                  <span className="truncate">{channel.channel_name}</span>
                </CardTitle>
                <div className="flex gap-1 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(channel)}
                    disabled={updateMutation.isLoading}
                    className="h-7 w-7 sm:h-8 sm:w-8 p-0"
                  >
                    <EditIcon className="h-3 w-3 sm:h-4 sm:w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(channel.id)}
                    disabled={deleteMutation.isLoading}
                    className="h-7 w-7 sm:h-8 sm:w-8 p-0"
                  >
                    <DeleteIcon className="h-3 w-3 sm:h-4 sm:w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 sm:space-y-3 px-3 sm:px-6 pb-3 sm:pb-6">
              <p className="text-xs sm:text-sm text-muted-foreground">
                <span className="font-medium">ID:</span> <span className="break-all">{channel.channel_id}</span>
              </p>

              <div className="flex items-center gap-1.5 sm:gap-2">
                <Badge variant={channel.is_active ? 'default' : 'secondary'} className="flex items-center gap-1 text-xs">
                  <>
                    {channel.is_active ? <CheckCircleIcon className="h-2 w-2 sm:h-3 sm:w-3" /> : <CancelIcon className="h-2 w-2 sm:h-3 sm:w-3" />}
                    <span className="hidden sm:inline">{channel.is_active ? 'Активен' : 'Неактивен'}</span>
                    <span className="sm:hidden">{channel.is_active ? 'Акт.' : 'Неакт.'}</span>
                  </>
                </Badge>
              </div>

              <div className="flex items-start gap-1.5 sm:gap-2">
                <PublishIcon className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                <p className="text-xs sm:text-sm text-muted-foreground leading-tight">
                  Канал для публикации одобренных постов
                </p>
              </div>

              {channel.created_at && (
                <p className="text-xs text-muted-foreground">
                  Добавлен: {new Date(channel.created_at).toLocaleString('ru-RU')}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {channels?.length === 0 && (
        <div className="text-center mt-6 sm:mt-8 px-4">
          <AddIcon className="h-12 w-12 sm:h-16 sm:w-16 mx-auto text-muted-foreground/50 mb-3 sm:mb-4" />
          <h3 className="text-base sm:text-lg font-semibold text-muted-foreground mb-1 sm:mb-2">
            Нет настроенных каналов
          </h3>
          <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4 max-w-md mx-auto">
            Добавьте целевые каналы для публикации одобренных постов
          </p>
          <Button onClick={handleCreate} size="sm" className="h-8 sm:h-9 text-xs sm:text-sm">
            <>
              <AddIcon className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
              Добавить первый канал
            </>
          </Button>
        </div>
      )}

        <ChannelDialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          channel={editingChannel}
          onSubmit={handleSubmit}
          loading={createMutation.isLoading || updateMutation.isLoading}
        />
      </>
    </div>
  );
}