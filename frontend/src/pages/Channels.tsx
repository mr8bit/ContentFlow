import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, RefreshCw, CheckCircle, X, Radio, Hash, Clock, Send } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { sourceChannelsAPI, targetChannelsAPI, SourceChannel, TargetChannel, SourceChannelCreate, TargetChannelCreate } from '../services/api';
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../components/ui/index';

type ChannelType = 'source' | 'target';

interface SourceChannelDialogProps {
  open: boolean;
  onClose: () => void;
  channel?: SourceChannel;
  onSubmit: (data: SourceChannelCreate) => void;
  loading: boolean;
}

interface TargetChannelDialogProps {
  open: boolean;
  onClose: () => void;
  channel?: TargetChannel;
  onSubmit: (data: TargetChannelCreate) => void;
  loading: boolean;
}

function SourceChannelDialog({ open, onClose, channel, onSubmit, loading }: SourceChannelDialogProps) {
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
            {channel ? 'Редактировать канал-источник' : 'Добавить канал-источник'}
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            {channel ? 'Изменить настройки канала-источника' : 'Добавить новый канал-источник для мониторинга'}
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

function TargetChannelDialog({ open, onClose, channel, onSubmit, loading }: TargetChannelDialogProps) {
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
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-[95vw] max-w-[425px] mx-auto">
        <DialogHeader className="px-1 sm:px-0">
          <DialogTitle className="flex items-center gap-1.5 sm:gap-2 text-base sm:text-lg">
            <Send className="h-4 w-4 sm:h-5 sm:w-5" />
            {channel ? 'Редактировать целевой канал' : 'Добавить целевой канал'}
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            {channel ? 'Изменить настройки целевого канала' : 'Добавить новый канал для публикации постов'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4 px-1 sm:px-0">
          <div className="space-y-1.5 sm:space-y-2">
            <Label htmlFor="target_channel_id" className="text-xs sm:text-sm">ID канала</Label>
            <Input
              id="target_channel_id"
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
            <Label htmlFor="target_channel_name" className="text-xs sm:text-sm">Название канала</Label>
            <Input
              id="target_channel_name"
              placeholder="Мой канал"
              value={formData.channel_name}
              onChange={(e) => setFormData({ ...formData, channel_name: e.target.value })}
              required
              disabled={loading}
              className="text-xs sm:text-sm h-8 sm:h-10"
            />
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

export default function Channels() {
  const [activeTab, setActiveTab] = useState<ChannelType>('source');
  const [sourceDialogOpen, setSourceDialogOpen] = useState(false);
  const [targetDialogOpen, setTargetDialogOpen] = useState(false);
  const [editingSourceChannel, setEditingSourceChannel] = useState<SourceChannel | undefined>();
  const [editingTargetChannel, setEditingTargetChannel] = useState<TargetChannel | undefined>();
  const [error, setError] = useState('');
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Source channels queries
  const {
    data: sourceChannels,
    isLoading: sourceLoading,
    refetch: refetchSource,
  } = useQuery('source-channels', () =>
    sourceChannelsAPI.getAll().then((res: any) => res.data)
  );

  // Target channels queries
  const {
    data: targetChannels,
    isLoading: targetLoading,
    refetch: refetchTarget,
  } = useQuery('target-channels', () =>
    targetChannelsAPI.getAll().then((res: any) => res.data)
  );

  // Source channel mutations
  const createSourceMutation = useMutation(
    (data: SourceChannelCreate) => sourceChannelsAPI.create(data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('source-channels');
        setSourceDialogOpen(false);
        setError('');
        toast({
          title: "Канал-источник добавлен",
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

  const updateSourceMutation = useMutation(
    ({ id, data }: { id: number; data: SourceChannelCreate }) =>
      sourceChannelsAPI.update(id, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('source-channels');
        setSourceDialogOpen(false);
        setEditingSourceChannel(undefined);
        setError('');
        toast({
          title: "Канал-источник обновлен",
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

  const deleteSourceMutation = useMutation(
    (id: number) => sourceChannelsAPI.delete(id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('source-channels');
        toast({
          title: "Канал-источник удален",
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

  // Target channel mutations
  const createTargetMutation = useMutation(
    (data: TargetChannelCreate) => targetChannelsAPI.create(data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('target-channels');
        setTargetDialogOpen(false);
        setError('');
        toast({
          title: "Целевой канал добавлен",
          description: "Целевой канал успешно добавлен",
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

  const updateTargetMutation = useMutation(
    ({ id, data }: { id: number; data: TargetChannelCreate }) =>
      targetChannelsAPI.update(id, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('target-channels');
        setTargetDialogOpen(false);
        setEditingTargetChannel(undefined);
        setError('');
        toast({
          title: "Целевой канал обновлен",
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

  const deleteTargetMutation = useMutation(
    (id: number) => targetChannelsAPI.delete(id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('target-channels');
        toast({
          title: "Целевой канал удален",
          description: "Целевой канал успешно удален",
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

  // Handlers
  const handleCreateSource = () => {
    setEditingSourceChannel(undefined);
    setSourceDialogOpen(true);
    setError('');
  };

  const handleEditSource = (channel: SourceChannel) => {
    setEditingSourceChannel(channel);
    setSourceDialogOpen(true);
    setError('');
  };

  const handleDeleteSource = (id: number) => {
    if (window.confirm('Вы уверены, что хотите удалить этот канал-источник?')) {
      deleteSourceMutation.mutate(id);
    }
  };

  const handleSubmitSource = (data: SourceChannelCreate) => {
    if (editingSourceChannel) {
      updateSourceMutation.mutate({ id: editingSourceChannel.id, data });
    } else {
      createSourceMutation.mutate(data);
    }
  };

  const handleCreateTarget = () => {
    setEditingTargetChannel(undefined);
    setTargetDialogOpen(true);
    setError('');
  };

  const handleEditTarget = (channel: TargetChannel) => {
    setEditingTargetChannel(channel);
    setTargetDialogOpen(true);
    setError('');
  };

  const handleDeleteTarget = (id: number) => {
    if (window.confirm('Вы уверены, что хотите удалить этот целевой канал?')) {
      deleteTargetMutation.mutate(id);
    }
  };

  const handleSubmitTarget = (data: TargetChannelCreate) => {
    if (editingTargetChannel) {
      updateTargetMutation.mutate({ id: editingTargetChannel.id, data });
    } else {
      createTargetMutation.mutate(data);
    }
  };

  const formatInterval = (seconds: number) => {
    if (seconds < 60) return `${seconds}с`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}мин`;
    return `${Math.floor(seconds / 3600)}ч`;
  };

  const handleRefresh = () => {
    if (activeTab === 'source') {
      refetchSource();
    } else {
      refetchTarget();
    }
  };

  const isLoading = activeTab === 'source' ? sourceLoading : targetLoading;

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Управление каналами</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Настройка каналов-источников и целевых каналов для публикации
          </p>
        </div>
        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefresh}
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
          <Button 
            onClick={activeTab === 'source' ? handleCreateSource : handleCreateTarget} 
            className="text-xs sm:text-sm"
          >
            <Plus className="h-4 w-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">
              {activeTab === 'source' ? 'Добавить источник' : 'Добавить целевой'}
            </span>
            <span className="sm:hidden">Добавить</span>
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as ChannelType)} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="source" className="flex items-center gap-2">
            <Radio className="h-4 w-4" />
            <span className="hidden sm:inline">Каналы-источники</span>
            <span className="sm:hidden">Источники</span>
            {sourceChannels?.length > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs">
                {sourceChannels.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="target" className="flex items-center gap-2">
            <Send className="h-4 w-4" />
            <span className="hidden sm:inline">Целевые каналы</span>
            <span className="sm:hidden">Целевые</span>
            {targetChannels?.length > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs">
                {targetChannels.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="source" className="space-y-4">
          {sourceLoading ? (
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
              {sourceChannels?.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-8 sm:py-12">
                    <Radio className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mb-3 sm:mb-4" />
                    <h3 className="text-base sm:text-lg font-semibold mb-2">Нет каналов-источников</h3>
                    <p className="text-sm sm:text-base text-muted-foreground text-center mb-4 sm:mb-6">
                      Добавьте первый канал-источник для начала мониторинга постов
                    </p>
                    <Button onClick={handleCreateSource} className="text-xs sm:text-sm">
                      <Plus className="h-4 w-4 mr-1 sm:mr-2" />
                      Добавить канал-источник
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {sourceChannels?.map((channel: SourceChannel) => (
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
                            onClick={() => handleEditSource(channel)}
                            disabled={updateSourceMutation.isLoading}
                            className="flex-1 text-xs sm:text-sm px-2 sm:px-3 h-8 sm:h-9"
                          >
                            <Edit className="h-3 w-3 mr-1" />
                            <span className="hidden sm:inline">Изменить</span>
                            <span className="sm:hidden">Изм.</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteSource(channel.id)}
                            disabled={deleteSourceMutation.isLoading}
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
        </TabsContent>

        <TabsContent value="target" className="space-y-4">
          {targetLoading ? (
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
              {targetChannels?.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-8 sm:py-12">
                    <Send className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mb-3 sm:mb-4" />
                    <h3 className="text-base sm:text-lg font-semibold mb-2">Нет целевых каналов</h3>
                    <p className="text-sm sm:text-base text-muted-foreground text-center mb-4 sm:mb-6">
                      Добавьте первый целевой канал для публикации одобренных постов
                    </p>
                    <Button onClick={handleCreateTarget} className="text-xs sm:text-sm">
                      <Plus className="h-4 w-4 mr-1 sm:mr-2" />
                      Добавить целевой канал
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {targetChannels?.map((channel: TargetChannel) => (
                    <Card key={channel.id} className="hover:shadow-md transition-shadow">
                      <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6">
                        <div className="flex items-start justify-between gap-2">
                          <CardTitle className="text-base sm:text-lg flex items-center gap-1.5 sm:gap-2 min-w-0">
                            <Send className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
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
                          <Send className="h-3 w-3 flex-shrink-0" />
                          <span>Канал для публикации одобренных постов</span>
                        </div>
                        
                        {channel.created_at && (
                          <div className="text-xs sm:text-sm">
                            <p className="text-muted-foreground">Добавлен</p>
                            <p className="font-semibold">
                              {new Date(channel.created_at).toLocaleString('ru-RU')}
                            </p>
                          </div>
                        )}

                        <Separator />

                        <div className="flex items-center gap-1.5 sm:gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditTarget(channel)}
                            disabled={updateTargetMutation.isLoading}
                            className="flex-1 text-xs sm:text-sm px-2 sm:px-3 h-8 sm:h-9"
                          >
                            <Edit className="h-3 w-3 mr-1" />
                            <span className="hidden sm:inline">Изменить</span>
                            <span className="sm:hidden">Изм.</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteTarget(channel.id)}
                            disabled={deleteTargetMutation.isLoading}
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
        </TabsContent>
      </Tabs>

      <SourceChannelDialog
        open={sourceDialogOpen}
        onClose={() => setSourceDialogOpen(false)}
        channel={editingSourceChannel}
        onSubmit={handleSubmitSource}
        loading={createSourceMutation.isLoading || updateSourceMutation.isLoading}
      />

      <TargetChannelDialog
        open={targetDialogOpen}
        onClose={() => setTargetDialogOpen(false)}
        channel={editingTargetChannel}
        onSubmit={handleSubmitTarget}
        loading={createTargetMutation.isLoading || updateTargetMutation.isLoading}
      />
    </div>
  );
}