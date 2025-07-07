import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Loader2, Bot, Brain, Edit, Settings as SettingsIcon, CheckCircle, XCircle, Palette, Sun, Moon, MessageSquare, Cog, Users, AlertCircle } from 'lucide-react';
import { useSettings } from '../hooks/useSettings';
import { useTheme } from '../contexts/ThemeContext';
import { SettingsSection } from '../components/settings/SettingsSection';
import { TelegramSettings } from '../components/settings/TelegramSettings';
import { WorkerManager } from '../components/settings/WorkerManager';
import { ServiceManager } from '../components/settings/ServiceManager';
import { AIModelsSettings } from '../components/settings/AIModelsSettings';
import { categorizeSettings } from '../utils/settingsUtils';

const ThemeSettings = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="h-5 w-5" />
          Настройки темы
        </CardTitle>
        <CardDescription>
          Выберите цветовую схему для интерфейса
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex gap-4">
          <Button
            variant={theme === 'light' ? 'default' : 'outline'}
            onClick={() => theme === 'dark' && toggleTheme()}
            className="flex items-center gap-2"
          >
            <Sun className="h-4 w-4" />
            Светлая тема
          </Button>
          <Button
            variant={theme === 'dark' ? 'default' : 'outline'}
            onClick={() => theme === 'light' && toggleTheme()}
            className="flex items-center gap-2"
          >
            <Moon className="h-4 w-4" />
            Темная тема
          </Button>
        </div>
        
        <div className="p-4 rounded-lg border bg-card">
          <h4 className="font-medium mb-2">Предварительный просмотр</h4>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-primary"></div>
              <span className="text-sm">Основной цвет</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-secondary"></div>
              <span className="text-sm">Вторичный цвет</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-muted"></div>
              <span className="text-sm">Приглушенный цвет</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const Settings: React.FC = () => {
  const { settings, isLoading, error, success, handleSave } = useSettings();
  const [models, setModels] = React.useState<any[]>([]);

  // Загружаем модели для отображения в обзоре
  React.useEffect(() => {
    const loadModels = async () => {
      try {
        const { aiModelsAPI } = await import('../services/api');
        const response = await aiModelsAPI.getAll();
        setModels(response.data);
      } catch (error) {
        console.error('Error loading models for overview:', error);
      }
    };
    loadModels();
  }, []);

































  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const {
    telegramSettings,
    openrouterSettings,
    promptSettings,
    systemSettings,
  } = categorizeSettings(settings);

  return (
    <div className="max-w-6xl mx-auto p-3 sm:p-6 space-y-4 sm:space-y-6 overflow-x-hidden">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">Настройки системы</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Управление конфигурацией Auto Poster Bot
          </p>
        </div>
      </div>

      {/* Status Messages */}
      <div>
        {success && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </div>

      <Tabs defaultValue="telegram" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-0.5 sm:gap-1 h-auto">
          <TabsTrigger 
            value="telegram" 
            className="text-xs sm:text-sm px-1 sm:px-3 py-2 sm:py-2.5 flex-1 min-w-0 flex flex-col sm:flex-row items-center gap-1 sm:gap-2"
          >
            <MessageSquare className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="truncate hidden sm:inline">Telegram</span>
            <span className="truncate sm:hidden">TG</span>
          </TabsTrigger>
          <TabsTrigger 
            value="ai" 
            className="text-xs sm:text-sm px-1 sm:px-3 py-2 sm:py-2.5 flex-1 min-w-0 flex flex-col sm:flex-row items-center gap-1 sm:gap-2"
          >
            <Brain className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="truncate hidden sm:inline">AI</span>
            <span className="truncate sm:hidden">AI</span>
          </TabsTrigger>
          <TabsTrigger 
            value="system" 
            className="text-xs sm:text-sm px-1 sm:px-3 py-2 sm:py-2.5 flex-1 min-w-0 flex flex-col sm:flex-row items-center gap-1 sm:gap-2"
          >
            <Cog className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="truncate hidden sm:inline">Система</span>
            <span className="truncate sm:hidden">Сис</span>
          </TabsTrigger>
          <TabsTrigger 
            value="theme" 
            className="text-xs sm:text-sm px-1 sm:px-3 py-2 sm:py-2.5 flex-1 min-w-0 flex flex-col sm:flex-row items-center gap-1 sm:gap-2"
          >
            <Palette className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="truncate hidden sm:inline">Тема</span>
            <span className="truncate sm:hidden">Тема</span>
          </TabsTrigger>
           <TabsTrigger 
             value="services" 
             className="text-xs sm:text-sm px-1 sm:px-3 py-2 sm:py-2.5 flex-1 min-w-0 flex flex-col sm:flex-row items-center gap-1 sm:gap-2"
           >
             <Cog className="h-3 w-3 sm:h-4 sm:w-4" />
             <span className="truncate hidden sm:inline">Сервисы</span>
             <span className="truncate sm:hidden">Сер</span>
           </TabsTrigger>
           <TabsTrigger 
             value="worker" 
             className="text-xs sm:text-sm px-1 sm:px-3 py-2 sm:py-2.5 flex-1 min-w-0 flex flex-col sm:flex-row items-center gap-1 sm:gap-2"
           >
             <Users className="h-3 w-3 sm:h-4 sm:w-4" />
             <span className="truncate hidden sm:inline">Worker</span>
             <span className="truncate sm:hidden">Wrk</span>
           </TabsTrigger>
        </TabsList>

        {/* Telegram Settings */}
        <TabsContent value="telegram" className="space-y-6">
          <TelegramSettings />
        </TabsContent>

        {/* AI & Prompts Settings */}
        <TabsContent value="ai" className="space-y-8">
          {/* AI Overview Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-200 dark:border-blue-800">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                    <Brain className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-blue-900 dark:text-blue-100">AI Модели</h3>
                    <p className="text-sm text-blue-700 dark:text-blue-300">{models?.length || 0} настроено</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-green-200 dark:border-green-800">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 dark:bg-green-900/50 rounded-lg">
                    <Edit className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-green-900 dark:text-green-100">Промпты</h3>
                    <p className="text-sm text-green-700 dark:text-green-300">Настройки обработки</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-950/20 dark:to-violet-950/20 border-purple-200 dark:border-purple-800">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/50 rounded-lg">
                    <SettingsIcon className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-purple-900 dark:text-purple-100">API Ключи</h3>
                    <p className="text-sm text-purple-700 dark:text-purple-300">OpenRouter настройки</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* AI Models Section */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Brain className="h-6 w-6 text-primary" />
                  </div>
                  AI Модели
                </h2>
                <p className="text-muted-foreground mt-1">
                  Управление моделями искусственного интеллекта для обработки контента
                </p>
              </div>
            </div>
            <AIModelsSettings />
          </div>

          {/* OpenRouter Settings */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <SettingsIcon className="h-6 w-6 text-primary" />
                  </div>
                  Настройки OpenRouter
                </h2>
                <p className="text-muted-foreground mt-1">
                  Конфигурация API ключей и параметров подключения
                </p>
              </div>
            </div>
            <SettingsSection
              title=""
              icon={<></>}
              settings={openrouterSettings}
              onSave={handleSave}
            />
          </div>

          {/* AI Prompts Settings */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Edit className="h-6 w-6 text-primary" />
                  </div>
                  AI Промпты
                </h2>
                <p className="text-muted-foreground mt-1">
                  Настройка шаблонов для обработки текстов с помощью ИИ
                </p>
              </div>
            </div>
            <Card className="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="p-1 bg-amber-100 dark:bg-amber-900/50 rounded">
                    <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div className="text-sm">
                    <p className="font-medium text-amber-900 dark:text-amber-100 mb-1">Доступные переменные:</p>
                    <ul className="text-amber-800 dark:text-amber-200 space-y-1">
                      <li><code className="bg-amber-100 dark:bg-amber-900/50 px-1 rounded text-xs">{'{original_text}'}</code> - исходный текст поста</li>
                      <li><code className="bg-amber-100 dark:bg-amber-900/50 px-1 rounded text-xs">{'{user_prompt}'}</code> - пользовательские инструкции</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
            <SettingsSection
              title=""
              icon={<></>}
              settings={promptSettings}
              onSave={handleSave}
            />
          </div>
        </TabsContent>



        {/* System Settings */}
        <TabsContent value="system" className="space-y-6">
          <SettingsSection
            title="Системные настройки"
            icon={<SettingsIcon className="h-5 w-5" />}
            settings={systemSettings}
            onSave={handleSave}
          />
        </TabsContent>

        {/* Appearance Settings */}
        <TabsContent value="appearance" className="space-y-6">
          <ThemeSettings />
        </TabsContent>

        {/* Services Management */}
        <TabsContent value="services" className="space-y-6">
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Cog className="h-6 w-6 text-primary" />
                </div>
                Управление сервисами
              </h2>
              <p className="text-muted-foreground mt-1">
                Контроль состояния и управление Scrapper и Publisher сервисами
              </p>
            </div>
            <ServiceManager />
          </div>
        </TabsContent>

        {/* Worker Management */}
        <TabsContent value="worker" className="space-y-6">
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                Управление Worker
              </h2>
              <p className="text-muted-foreground mt-1">
                Контроль состояния основного рабочего процесса
              </p>
            </div>
            <WorkerManager />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;