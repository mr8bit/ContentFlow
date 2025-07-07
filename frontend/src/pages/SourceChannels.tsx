import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, RefreshCw, CheckCircle, X, Radio, Hash, Clock } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { sourceChannelsAPI, SourceChannel, SourceChannelCreate } from '../services/api';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Alert,
  AlertDescription,
  Skeleton,
  Separator,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  useToast,
} from '../components/ui/index';

interface ChannelDialogProps {
  open: boolean;
  onClose: () => void;
  channel?: SourceChannel;
  onSubmit: (data: SourceChannelCreate) => void;
  loading: boolean;
}

function ChannelDialog({ open, onClose, channel, onSubmit, loading }: ChannelDialogProps) {
  const [formData, setFormData] = useState<SourceChannelCreate>({
    channel_id: '',
    channel_name: '',
    check_interval: 300,
  });

  useEffect(() => {
    if (channel) {
      setFormData({
        channel_id: channel.channel_id,
        channel_name: channel.channel_name,
        check_interval: channel.check_interval,
      });
    } else {
      setFormData({
        channel_id: '',
        channel_name: '',
        check_interval: 300,
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
        check_interval: 300,
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-[95vw] max-w-[425px] mx-auto">
        <DialogHeader className="px-1 sm:px-0">
          <DialogTitle className="flex items-center gap-1.5 sm:gap-2 text-base sm:text-lg">
            <Hash className="h-4 w-4 sm:h-5 sm:w-5" />
            {channel ? 'Редактировать канал' : 'Добавить канал'}
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            {channel ? 'Изменить настройки канала' : 'Добавить новый канал-источник для мониторинга'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4 px-1 sm:px-0">
          <div className="space-y-1.5 sm:space-y-2">
            <Label htmlFor="channel_id" className="text-xs sm:text-sm">ID канала</Label>
            <Input
              id="channel_id"
              placeholder="@channel_name или -1001234567890"
              value={formData.channel_id}
              onChange={(e) => setFormData({ ...formData, channel_id: e.target.value })}
              required
              disabled={loading || !!channel}
              className="text-xs sm:text-sm h-8 sm:h-10"
            />
            <p className="text-xs text-muted-foreground">
              Например: @channel_name или -1001234567890
            </p>
          </div>
          <div className="space-y-1.5 sm:space-y-2">
            <Label htmlFor="channel_name" className="text-xs sm:text-sm">Название канала</Label>
            <Input
              id="channel_name"
              placeholder="Мой канал"
              value={formData.channel_name}
              onChange={(e) => setFormData({ ...formData, channel_name: e.target.value })}
              required
              disabled={loading}
              className="text-xs sm:text-sm h-8 sm:h-10"
            />
          </div>
          <div className="space-y-1.5 sm:space-y-2">
            <Label htmlFor="check_interval" className="text-xs sm:text-sm">Интервал проверки (секунды)</Label>
            <Input
              id="check_interval"
              type="number"
              min="5"
              max="3600"
              value={formData.check_interval}
              onChange={(e) => setFormData({ ...formData, check_interval: parseInt(e.target.value) || 300 })}
              required
              disabled={loading}
              className="text-xs sm:text-sm h-8 sm:h-10"
            />
            <p className="text-xs text-muted-foreground">
              От 5 до 3600 секунд
            </p>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0 px-0">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
              className="w-full sm:w-auto text-xs sm:text-sm h-8 sm:h-9 order-2 sm:order-1"
            >
              Отмена
            </Button>
            <Button type="submit" disabled={loading} className="w-full sm:w-auto text-xs sm:text-sm h-8 sm:h-9 order-1 sm:order-2">
              {loading ? 'Сохранение...' : (channel ? 'Сохранить' : 'Добавить')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function SourceChannels() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingChannel, setEditingChannel] = useState<SourceChannel | undefined>();
  const [error, setError] = useState('');
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const {
    data: channels,
    isLoading,
    refetch,
  } = useQuery('source-channels', () =>
    sourceChannelsAPI.getAll().then((res: any) => res.data)
  );

  const createMutation = useMutation(
    (data: SourceChannelCreate) => sourceChannelsAPI.create(data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('source-channels');
        setDialogOpen(false);
        setError('');
        toast({
          title: "Канал добавлен",
          description: "Канал-источник успешно добавлен",
        });
      },
      onError: (err: any) => {
        setError(err.response?.data?.detail || 'Ошибка при создании канала');
        toast({
          title: "Ошибка",
          description: err.response?.data?.detail || 'Ошибка при создании канала',
          variant: "destructive",
        });
      },
    }
  );

  const updateMutation = useMutation(
    ({ id, data }: { id: number; data: SourceChannelCreate }) =>
      sourceChannelsAPI.update(id, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('source-channels');
        setDialogOpen(false);
        setEditingChannel(undefined);
        setError('');
        toast({
          title: "Канал обновлен",
          description: "Настройки канала успешно сохранены",
        });
      },
      onError: (err: any) => {
        setError(err.response?.data?.detail || 'Ошибка при обновлении канала');
        toast({
          title: "Ошибка",
          description: err.response?.data?.detail || 'Ошибка при обновлении канала',
          variant: "destructive",
        });
      },
    }
  );

  const deleteMutation = useMutation(
    (id: number) => sourceChannelsAPI.delete(id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('source-channels');
        toast({
          title: "Канал удален",
          description: "Канал-источник успешно удален",
        });
      },
      onError: (err: any) => {
        setError(err.response?.data?.detail || 'Ошибка при удалении канала');
        toast({
          title: "Ошибка",
          description: err.response?.data?.detail || 'Ошибка при удалении канала',
          variant: "destructive",
        });
      },
    }
  );

  const handleCreate = () => {
    setEditingChannel(undefined);
    setDialogOpen(true);
    setError('');
  };

  const handleEdit = (channel: SourceChannel) => {
    setEditingChannel(channel);
    setDialogOpen(true);
    setError('');
  };

  const handleDelete = (id: number) => {
    if (window.confirm('Вы уверены, что хотите удалить этот канал?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleSubmit = (data: SourceChannelCreate) => {
    if (editingChannel) {
      updateMutation.mutate({ id: editingChannel.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const formatInterval = (seconds: number) => {
    if (seconds < 60) return `${seconds}с`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}мин`;
    return `${Math.floor(seconds / 3600)}ч`;
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Каналы-источники</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Управляйте каналами, из которых будут копироваться посты
          </p>
        </div>
        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetch()}
                  disabled={isLoading}
                  className="px-2 sm:px-3"
                >
                  <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Обновить список</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Button onClick={handleCreate} className="text-xs sm:text-sm">
            <Plus className="h-4 w-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Добавить канал</span>
            <span className="sm:hidden">Добавить</span>
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {isLoading ? (
        <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2 sm:pb-3">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-16 sm:h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <>
          {channels?.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8 sm:py-12">
                <Hash className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mb-3 sm:mb-4" />
                <h3 className="text-base sm:text-lg font-semibold mb-2">Нет каналов-источников</h3>
                <p className="text-sm sm:text-base text-muted-foreground text-center mb-4 sm:mb-6">
                  Добавьте первый канал-источник для начала мониторинга постов
                </p>
                <Button onClick={handleCreate} className="text-xs sm:text-sm">
                  <Plus className="h-4 w-4 mr-1 sm:mr-2" />
                  Добавить канал
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {channels?.map((channel: SourceChannel) => (
                <Card key={channel.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base sm:text-lg flex items-center gap-1.5 sm:gap-2 min-w-0">
                        <Radio className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                        <span className="truncate">{channel.channel_name}</span>
                      </CardTitle>
                      <Badge variant={channel.is_active ? 'default' : 'secondary'} className="text-xs flex-shrink-0">
                        {channel.is_active ? (
                          <CheckCircle className="h-2 w-2 sm:h-3 sm:w-3 mr-1" />
                        ) : (
                          <X className="h-2 w-2 sm:h-3 sm:w-3 mr-1" />
                        )}
                        <span className="hidden sm:inline">{channel.is_active ? 'Активен' : 'Неактивен'}</span>
                        <span className="sm:hidden">{channel.is_active ? 'Акт.' : 'Неакт.'}</span>
                      </Badge>
                    </div>
                    <CardDescription className="flex items-center gap-1 text-xs sm:text-sm">
                      <Hash className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate">{channel.channel_id}</span>
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 sm:space-y-4 px-3 sm:px-6 pb-3 sm:pb-6">
                    <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-muted-foreground">
                      <Clock className="h-3 w-3 flex-shrink-0" />
                      <span>Проверка каждые {formatInterval(channel.check_interval)}</span>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 text-xs sm:text-sm">
                      <div>
                        <p className="text-muted-foreground">Всего постов</p>
                        <p className="font-semibold">{(channel as any).posts_count || 0}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Последняя проверка</p>
                        <p className="font-semibold text-xs sm:text-sm">
                          {channel.last_checked ? new Date(channel.last_checked).toLocaleString() : 'Никогда'}
                        </p>
                      </div>
                    </div>

                    <Separator />

                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(channel)}
                        disabled={updateMutation.isLoading}
                        className="flex-1 text-xs sm:text-sm px-2 sm:px-3 h-8 sm:h-9"
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        <span className="hidden sm:inline">Изменить</span>
                        <span className="sm:hidden">Изм.</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(channel.id)}
                        disabled={deleteMutation.isLoading}
                        className="flex-1 text-xs sm:text-sm px-2 sm:px-3 h-8 sm:h-9"
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        <span className="hidden sm:inline">Удалить</span>
                        <span className="sm:hidden">Удал.</span>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      <ChannelDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        channel={editingChannel}
        onSubmit={handleSubmit}
        loading={createMutation.isLoading || updateMutation.isLoading}
      />
    </div>
  );
}