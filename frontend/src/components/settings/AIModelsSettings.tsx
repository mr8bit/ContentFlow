import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Alert, AlertDescription } from '../ui/alert';
import { Badge } from '../ui/badge';
import { Switch } from '../ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Plus, Edit, Trash2, Star, Brain, AlertCircle, CheckCircle, Zap, Shield, Clock, Activity } from 'lucide-react';
import { AIModel, AIModelCreate, AIModelUpdate, aiModelsAPI } from '../../services/api';

interface AIModelFormData {
  name: string;
  provider: string;
  model_id: string;
  description: string;
  is_active: boolean;
  is_default: boolean;
}

const initialFormData: AIModelFormData = {
  name: '',
  provider: 'openrouter',
  model_id: '',
  description: '',
  is_active: true,
  is_default: false,
};

const PROVIDERS = [
  { value: 'openrouter', label: 'OpenRouter' },
  { value: 'openai', label: 'OpenAI' },
  { value: 'anthropic', label: 'Anthropic' },
  { value: 'google', label: 'Google' },
];

export const AIModelsSettings: React.FC = () => {
  const [models, setModels] = useState<AIModel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingModel, setEditingModel] = useState<AIModel | null>(null);
  const [formData, setFormData] = useState<AIModelFormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadModels();
  }, []);

  const loadModels = async () => {
    try {
      setIsLoading(true);
      const response = await aiModelsAPI.getAll();
      setModels(response.data);
      setError(null);
    } catch (err) {
      setError('Ошибка при загрузке моделей AI');
      console.error('Error loading AI models:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenDialog = (model?: AIModel) => {
    if (model) {
      setEditingModel(model);
      setFormData({
        name: model.name,
        provider: model.provider,
        model_id: model.model_id,
        description: model.description || '',
        is_active: model.is_active,
        is_default: model.is_default,
      });
    } else {
      setEditingModel(null);
      setFormData(initialFormData);
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingModel(null);
    setFormData(initialFormData);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      if (editingModel) {
        await aiModelsAPI.update(editingModel.id, formData);
        setSuccess('Модель успешно обновлена');
      } else {
        await aiModelsAPI.create(formData);
        setSuccess('Модель успешно создана');
      }
      
      await loadModels();
      handleCloseDialog();
    } catch (err) {
      setError(editingModel ? 'Ошибка при обновлении модели' : 'Ошибка при создании модели');
      console.error('Error saving AI model:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Вы уверены, что хотите удалить эту модель?')) {
      return;
    }

    try {
      await aiModelsAPI.delete(id);
      setSuccess('Модель успешно удалена');
      await loadModels();
    } catch (err) {
      setError('Ошибка при удалении модели');
      console.error('Error deleting AI model:', err);
    }
  };

  const handleSetDefault = async (id: number) => {
    try {
      await aiModelsAPI.setDefault(id);
      setSuccess('Модель по умолчанию установлена');
      await loadModels();
    } catch (err) {
      setError('Ошибка при установке модели по умолчанию');
      console.error('Error setting default AI model:', err);
    }
  };

  const handleToggleActive = async (model: AIModel) => {
    try {
      await aiModelsAPI.update(model.id, { is_active: !model.is_active });
      await loadModels();
    } catch (err) {
      setError('Ошибка при изменении статуса модели');
      console.error('Error toggling AI model status:', err);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI Модели
          </CardTitle>
          <CardDescription>
            Загрузка моделей...
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Add Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/50 dark:to-indigo-900/50 rounded-xl">
            <Brain className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Управление моделями</h3>
            <p className="text-sm text-muted-foreground">
              {models.length} {models.length === 1 ? 'модель настроена' : models.length < 5 ? 'модели настроено' : 'моделей настроено'}
            </p>
          </div>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()} className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
              <Plus className="h-4 w-4" />
              Добавить модель
            </Button>
          </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <form onSubmit={handleSubmit}>
                <DialogHeader className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Brain className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <DialogTitle className="text-xl">
                        {editingModel ? 'Редактировать модель' : 'Добавить новую модель'}
                      </DialogTitle>
                      <DialogDescription className="text-sm">
                        {editingModel 
                          ? 'Измените параметры модели AI'
                          : 'Настройте новую модель AI для использования в системе'
                        }
                      </DialogDescription>
                    </div>
                  </div>
                </DialogHeader>
                
                <div className="space-y-6 py-4">
                  {/* Basic Information */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Основная информация</h4>
                    
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-sm font-medium">
                        Название модели
                      </Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Например, GPT-4 Turbo"
                        className="h-10"
                        required
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="provider" className="text-sm font-medium">
                          Провайдер
                        </Label>
                        <Select
                          value={formData.provider}
                          onValueChange={(value) => setFormData({ ...formData, provider: value })}
                        >
                          <SelectTrigger className="h-10">
                            <SelectValue placeholder="Выберите провайдера" />
                          </SelectTrigger>
                          <SelectContent>
                            {PROVIDERS.map((provider) => (
                              <SelectItem key={provider.value} value={provider.value}>
                                {provider.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="model_id" className="text-sm font-medium">
                          ID модели
                        </Label>
                        <Input
                          id="model_id"
                          value={formData.model_id}
                          onChange={(e) => setFormData({ ...formData, model_id: e.target.value })}
                          placeholder="gpt-4-turbo-preview"
                          className="h-10 font-mono text-sm"
                          required
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="description" className="text-sm font-medium">
                        Описание
                      </Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Краткое описание возможностей модели"
                        className="min-h-20"
                      />
                    </div>
                  </div>
                  
                  {/* Settings */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Настройки</h4>
                    
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Activity className="h-4 w-4 text-green-600" />
                            <Label htmlFor="is_active" className="font-medium">
                              Активная модель
                            </Label>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Модель будет доступна для использования
                          </p>
                        </div>
                        <Switch
                          id="is_active"
                          checked={formData.is_active}
                          onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Star className="h-4 w-4 text-yellow-600" />
                            <Label htmlFor="is_default" className="font-medium">
                              Модель по умолчанию
                            </Label>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Будет использоваться как основная модель
                          </p>
                        </div>
                        <Switch
                          id="is_default"
                          checked={formData.is_default}
                          onCheckedChange={(checked) => setFormData({ ...formData, is_default: checked })}
                        />
                      </div>
                    </div>
                  </div>
                </div>
                
                <DialogFooter className="gap-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={handleCloseDialog}
                    disabled={isSubmitting}
                  >
                    Отмена
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <Clock className="h-4 w-4 animate-spin" />
                        Сохранение...
                      </>
                    ) : (
                      <>
                        {editingModel ? <Edit className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                        {editingModel ? 'Сохранить изменения' : 'Добавить модель'}
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      
      {/* Status Messages */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {success && (
        <Alert className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
          <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
          <AlertDescription className="text-green-800 dark:text-green-200">{success}</AlertDescription>
        </Alert>
      )}
      
      {/* Models Grid */}
      {models.length === 0 ? (
        <Card className="border-dashed border-2">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="p-4 bg-muted/50 rounded-full mb-4">
              <Brain className="h-12 w-12 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Нет настроенных моделей AI</h3>
            <p className="text-muted-foreground text-center mb-6 max-w-md">
              Добавьте первую модель для начала работы с искусственным интеллектом
            </p>
            <Button onClick={() => handleOpenDialog()} className="gap-2">
              <Plus className="h-4 w-4" />
              Добавить первую модель
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {models.map((model) => {
            const getProviderIcon = (provider: string) => {
               if (!provider) {
                 return <Brain className="h-4 w-4" />;
               }
               switch (provider.toLowerCase()) {
                 case 'openrouter': return <Zap className="h-4 w-4" />;
                 case 'openai': return <Brain className="h-4 w-4" />;
                 case 'anthropic': return <Shield className="h-4 w-4" />;
                 case 'google': return <Activity className="h-4 w-4" />;
                 default: return <Brain className="h-4 w-4" />;
               }
             };

            const getProviderColor = (provider: string) => {
               if (!provider) {
                 return 'from-gray-50 to-slate-50 dark:from-gray-950/20 dark:to-slate-950/20 border-gray-200 dark:border-gray-800';
               }
               switch (provider.toLowerCase()) {
                 case 'openrouter': return 'from-orange-50 to-red-50 dark:from-orange-950/20 dark:to-red-950/20 border-orange-200 dark:border-orange-800';
                 case 'openai': return 'from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-green-200 dark:border-green-800';
                 case 'anthropic': return 'from-purple-50 to-violet-50 dark:from-purple-950/20 dark:to-violet-950/20 border-purple-200 dark:border-purple-800';
                 case 'google': return 'from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20 border-blue-200 dark:border-blue-800';
                 default: return 'from-gray-50 to-slate-50 dark:from-gray-950/20 dark:to-slate-950/20 border-gray-200 dark:border-gray-800';
               }
             };

            return (
              <Card key={model.id} className={`bg-gradient-to-br ${getProviderColor(model.provider)} transition-all hover:shadow-md`}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 bg-white/50 dark:bg-black/20 rounded-lg">
                          {getProviderIcon(model.provider)}
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg">{model.name}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {model.provider}
                            </Badge>
                            {model.is_default && (
                              <Badge className="gap-1 bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200">
                                <Star className="h-3 w-3" />
                                По умолчанию
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-2 mb-4">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <code className="bg-black/10 dark:bg-white/10 px-2 py-1 rounded text-xs font-mono">
                            {model.model_id}
                          </code>
                        </div>
                        {model.description && (
                          <p className="text-sm text-muted-foreground">
                            {model.description}
                          </p>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={model.is_active}
                            onCheckedChange={() => handleToggleActive(model)}
                          />
                          <span className="text-sm font-medium">
                            {model.is_active ? (
                              <span className="text-green-700 dark:text-green-300">Активна</span>
                            ) : (
                              <span className="text-gray-500">Неактивна</span>
                            )}
                          </span>
                        </div>
                        
                        {!model.is_default && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSetDefault(model.id)}
                            className="gap-1 text-xs"
                          >
                            <Star className="h-3 w-3" />
                            Сделать основной
                          </Button>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1 ml-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenDialog(model)}
                        className="h-8 w-8 p-0"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(model.id)}
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};