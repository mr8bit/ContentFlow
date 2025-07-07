import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Textarea,
  Label,
  Badge,
  Alert,
  AlertDescription,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui';
import {
  Upload,
  X,
  Image as ImageIcon,
  Video,
  FileText,
  Wand2,
  Eye,
  Send,
  Loader2,
  AlertCircle,
  CheckCircle,
  Brain,
  Sparkles,
} from 'lucide-react';
import { postsAPI, targetChannelsAPI, aiModelsAPI } from '../services/api';
import { useQuery } from 'react-query';
import { motion, AnimatePresence } from 'framer-motion';

interface MediaFile {
  id: string;
  file: File;
  type: 'image' | 'video';
  preview: string;
}

interface TelegramPreviewProps {
  text: string;
  media: MediaFile[];
}

function TelegramPreview({ text, media }: TelegramPreviewProps) {
  return (
    <div className="max-w-md mx-auto bg-[#212121] rounded-lg overflow-hidden shadow-lg">
      {/* Telegram header */}
      <div className="bg-[#2b5278] px-4 py-3 flex items-center gap-3">
        <div className="w-8 h-8 bg-[#4a9eff] rounded-full flex items-center justify-center">
          <span className="text-white text-sm font-semibold">T</span>
        </div>
        <div>
          <div className="text-white font-medium text-sm">Тестовый канал</div>
          <div className="text-[#8bb3d9] text-xs">онлайн</div>
        </div>
      </div>
      
      {/* Message content */}
      <div className="p-4">
        <div className="bg-[#182533] rounded-lg p-3 max-w-[280px] ml-auto">
          {/* Media preview */}
          {media.length > 0 && (
            <div className="mb-3">
              {media.length === 1 ? (
                <div className="relative rounded-lg overflow-hidden">
                  {media[0].type === 'image' ? (
                    <img
                      src={media[0].preview}
                      alt="Preview"
                      className="w-full h-48 object-cover"
                    />
                  ) : (
                    <div className="w-full h-48 bg-black flex items-center justify-center">
                      <Video className="h-12 w-12 text-white/60" />
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-1">
                  {media.slice(0, 4).map((item, index) => (
                    <div key={item.id} className="relative rounded overflow-hidden aspect-square">
                      {item.type === 'image' ? (
                        <img
                          src={item.preview}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-black flex items-center justify-center">
                          <Video className="h-6 w-6 text-white/60" />
                        </div>
                      )}
                      {index === 3 && media.length > 4 && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                          <span className="text-white font-semibold">+{media.length - 4}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          
          {/* Text content */}
          {text && (
            <div className="text-white text-sm whitespace-pre-wrap break-words">
              {text}
            </div>
          )}
          
          {/* Message time */}
          <div className="text-[#8bb3d9] text-xs mt-2 text-right">
            {new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CreatePost() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [text, setText] = useState('');
  const [originalText, setOriginalText] = useState('');
  const [media, setMedia] = useState<MediaFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedTargetChannel, setSelectedTargetChannel] = useState<string>('');
  const [selectedAIModel, setSelectedAIModel] = useState<string>('');
  const [customPrompt, setCustomPrompt] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Fetch target channels
  const { data: targetChannels } = useQuery(
    'target-channels',
    () => targetChannelsAPI.getAll({ active_only: true }).then(res => res.data)
  );
  
  // Fetch AI models
  const { data: aiModels } = useQuery(
    'ai-models',
    () => aiModelsAPI.getAll({ active_only: true }).then(res => res.data)
  );
  
  const uploadFile = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      throw new Error('Ошибка загрузки файла');
    }
    
    const result = await response.json();
    return result.filename;
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    
    for (const file of files) {
      if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
        const mediaFile: MediaFile = {
          id: Math.random().toString(36).substr(2, 9),
          file,
          type: file.type.startsWith('image/') ? 'image' : 'video',
          preview: URL.createObjectURL(file),
        };
        
        setMedia(prev => [...prev, mediaFile]);
      }
    }
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  const removeMedia = (id: string) => {
    setMedia(prev => {
      const updated = prev.filter(item => item.id !== id);
      // Clean up preview URLs
      const removed = prev.find(item => item.id === id);
      if (removed) {
        URL.revokeObjectURL(removed.preview);
      }
      return updated;
    });
  };
  
  const handleImproveText = async (useCustomPrompt: boolean = false) => {
    if (!text.trim()) {
      setError('Введите текст для обработки');
      return;
    }
    
    setIsProcessing(true);
    setError(null);
    
    try {
      let response;
      const modelId = selectedAIModel ? parseInt(selectedAIModel) : undefined;
      
      if (useCustomPrompt && customPrompt.trim()) {
        response = await postsAPI.improveTextWithPrompt(text, customPrompt, modelId);
      } else {
        response = await postsAPI.improveText(text, modelId);
      }
      
      if (!originalText) {
        setOriginalText(text);
      }
      setText(response.data.improved_text);
      setSuccess('Текст успешно обработан с помощью ИИ');
    } catch (error: any) {
      console.error('Error improving text:', error);
      setError(error.response?.data?.detail || 'Ошибка при обработке текста');
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleResetText = () => {
    if (originalText) {
      setText(originalText);
      setSuccess('Текст восстановлен к исходному варианту');
    }
  };
  
  const handlePublish = async () => {
    if (!selectedTargetChannel) {
      setError('Выберите канал для публикации');
      return;
    }
    
    if (!text.trim() && media.length === 0) {
      setError('Добавьте текст или медиафайлы');
      return;
    }
    
    setIsProcessing(true);
    setError(null);
    setSuccess(null);
    
    try {
      // Create FormData for multipart request
      const formData = new FormData();
      
      // Add text if provided
      if (text.trim()) {
        formData.append('text', text.trim());
      }
      
      // Add target channel ID
      formData.append('target_channel_id', selectedTargetChannel);
      
      // Add media files
      for (const mediaFile of media) {
        formData.append('files', mediaFile.file);
      }
      
      // Send request to new endpoint
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/posts/create-with-media`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Ошибка при создании поста');
      }
      
      setSuccess('Пост успешно создан!');
      
      // Reset form
      setText('');
      setOriginalText('');
      setMedia([]);
      setSelectedTargetChannel('');
      setCustomPrompt('');
      
      // Navigate to posts page after a short delay
      setTimeout(() => {
        navigate('/posts');
      }, 2000);
      
    } catch (error) {
      console.error('Error creating post:', error);
      setError(error instanceof Error ? error.message : 'Ошибка при создании поста');
    } finally {
      setIsProcessing(false);
    }
  };
  
  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-primary/10 rounded-lg">
            <FileText className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Создать пост</h1>
            <p className="text-muted-foreground">Создайте новый пост с медиафайлами и текстом</p>
          </div>
        </div>
      </div>
      
      {/* Alerts */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-4"
          >
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </motion.div>
        )}
        
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-4"
          >
            <Alert className="border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200">
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          </motion.div>
        )}
      </AnimatePresence>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Content Creation */}
        <div className="space-y-6">
          {/* Media Upload */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5" />
                Медиафайлы
              </CardTitle>
              <CardDescription>
                Загрузите изображения или видео для поста
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Upload Area */}
              <div
                className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center hover:border-muted-foreground/50 transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground mb-1">
                  Нажмите для выбора файлов
                </p>
                <p className="text-xs text-muted-foreground">
                  Поддерживаются изображения и видео
                </p>
              </div>
              
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,video/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              
              {/* Media Preview */}
              {media.length > 0 && (
                <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {media.map((item) => (
                    <div key={item.id} className="relative group">
                      <div className="aspect-square rounded-lg overflow-hidden bg-muted">
                        {item.type === 'image' ? (
                          <img
                            src={item.preview}
                            alt="Preview"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-black flex items-center justify-center">
                            <Video className="h-8 w-8 text-white/60" />
                          </div>
                        )}
                      </div>
                      
                      <Button
                        size="sm"
                        variant="destructive"
                        className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => removeMedia(item.id)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                      
                      <Badge
                        variant="secondary"
                        className="absolute bottom-1 left-1 text-xs"
                      >
                        {item.type === 'image' ? 'IMG' : 'VID'}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Text Content */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Текст поста
              </CardTitle>
              <CardDescription>
                Напишите текст для поста или обработайте его с помощью ИИ
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="text">Содержание</Label>
                <Textarea
                  id="text"
                  placeholder="Введите текст поста..."
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={6}
                  className="mt-1"
                />
              </div>
              
              {/* AI Processing Controls */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Brain className="h-4 w-4 text-primary" />
                  <Label className="text-sm font-medium">Обработка с помощью ИИ</Label>
                </div>
                
                {/* AI Model Selection */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="ai-model" className="text-xs">Модель ИИ</Label>
                    <Select value={selectedAIModel} onValueChange={setSelectedAIModel}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Выберите модель" />
                      </SelectTrigger>
                      <SelectContent>
                        {aiModels?.map((model) => (
                          <SelectItem key={model.id} value={model.id.toString()}>
                            <div className="flex items-center gap-2">
                              <span>{model.name}</span>
                              {model.is_default && (
                                <Badge variant="secondary" className="text-xs">По умолчанию</Badge>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                {/* Custom Prompt */}
                <div>
                  <Label htmlFor="custom-prompt" className="text-xs">Дополнительные инструкции (опционально)</Label>
                  <Textarea
                    id="custom-prompt"
                    placeholder="Например: сделай текст более эмоциональным, добавь эмодзи..."
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    rows={2}
                    className="mt-1"
                  />
                </div>
                
                {/* AI Action Buttons */}
                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={() => handleImproveText(false)}
                    disabled={isProcessing || !text.trim()}
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    {isProcessing ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Wand2 className="h-3 w-3" />
                    )}
                    Улучшить текст
                  </Button>
                  
                  {customPrompt.trim() && (
                    <Button
                      onClick={() => handleImproveText(true)}
                      disabled={isProcessing || !text.trim()}
                      size="sm"
                      variant="outline"
                      className="flex items-center gap-2"
                    >
                      {isProcessing ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Sparkles className="h-3 w-3" />
                      )}
                      С инструкциями
                    </Button>
                  )}
                  
                  {originalText && (
                    <Button
                      onClick={handleResetText}
                      disabled={isProcessing}
                      size="sm"
                      variant="ghost"
                    >
                      Вернуть исходный
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Publishing Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5" />
                Настройки публикации
              </CardTitle>
              <CardDescription>
                Выберите канал для публикации поста
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="target-channel">Целевой канал</Label>
                <Select value={selectedTargetChannel} onValueChange={setSelectedTargetChannel}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Выберите канал" />
                  </SelectTrigger>
                  <SelectContent>
                    {targetChannels?.map((channel) => (
                      <SelectItem key={channel.id} value={channel.id.toString()}>
                        <div className="flex items-center gap-2">
                          <span>{channel.channel_name}</span>
                          {channel.channel_username && (
                            <span className="text-muted-foreground text-sm">@{channel.channel_username}</span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex gap-2">
                <Dialog open={showPreview} onOpenChange={setShowPreview}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="flex items-center gap-2">
                      <Eye className="h-4 w-4" />
                      Предварительный просмотр
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Предварительный просмотр</DialogTitle>
                      <DialogDescription>
                        Так будет выглядеть ваш пост в Telegram
                      </DialogDescription>
                    </DialogHeader>
                    <TelegramPreview text={text} media={media} />
                  </DialogContent>
                </Dialog>
                
                <Button
                  onClick={handlePublish}
                  disabled={isProcessing || (!text.trim() && media.length === 0) || !selectedTargetChannel}
                  className="flex items-center gap-2"
                >
                  {isProcessing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  Создать пост
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Right Column - Live Preview */}
        <div className="lg:sticky lg:top-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Предварительный просмотр
              </CardTitle>
              <CardDescription>
                Так будет выглядеть ваш пост в Telegram
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TelegramPreview text={text} media={media} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}