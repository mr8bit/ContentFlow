import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Alert, AlertDescription } from '../ui/alert';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';

import { 
  Loader2, 
  Bot, 
  Key, 
  Hash, 
  MessageSquare, 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  Save,
  Eye,
  EyeOff,
  Phone,
  Lock,
  User,
  Info
} from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import { useToast } from '../../hooks/use-toast';
import { useTelegramSession } from '../../hooks/useTelegramSession';
import { telegramSettingsAPI, TelegramSettingsData } from '../../services/api';

export const TelegramSettings: React.FC = () => {
  const [botToken, setBotToken] = useState('');
  const [apiId, setApiId] = useState('');
  const [apiHash, setApiHash] = useState('');
  const [showBotToken, setShowBotToken] = useState(false);
  const [showApiHash, setShowApiHash] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // Session management states
  const [phoneError, setPhoneError] = useState('');
  const [codeError, setCodeError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Telegram session hook
  const {
    error: sessionError,
    currentUserInfo,
    sessionGenerationStep,
    sessionId,
    phoneNumber,
    verificationCode,
    twoFactorPassword,
    isInitializing,
    testSessionMutation,
    startSessionGenerationMutation,
    verifySessionCodeMutation,
    cancelSessionGenerationMutation,
    setPhoneNumber,
    setVerificationCode,
    setTwoFactorPassword,
    startNewSession,
    clearMessages,
  } = useTelegramSession();
  
  // Загрузка настроек
  const { data: settings, isLoading, error } = useQuery({
    queryKey: ['telegram-settings'],
    queryFn: () => telegramSettingsAPI.getSettings().then(res => res.data),
  });
  
  // Мутация для сохранения настроек
  const saveSettingsMutation = useMutation({
    mutationFn: (settings: TelegramSettingsData) => telegramSettingsAPI.saveSettings(settings),
    onSuccess: () => {
      toast({
        title: 'Успешно',
        description: 'Настройки Telegram сохранены',
      });
      setHasUnsavedChanges(false);
      queryClient.invalidateQueries({ queryKey: ['telegram-settings'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Ошибка',
        description: error.response?.data?.detail || error.message,
        variant: 'destructive',
      });
    },
  });
  

  
  // Загрузка данных в форму при получении настроек
  useEffect(() => {
    if (settings && settings.settings) {
      // Извлекаем значения из объектов настроек
      const botTokenValue = settings.settings.telegram_bot_token?.value || '';
      const apiIdValue = settings.settings.telegram_api_id?.value || '';
      const apiHashValue = settings.settings.telegram_api_hash?.value || '';
      
      setBotToken(botTokenValue);
      setApiId(apiIdValue);
      setApiHash(apiHashValue);
      setHasUnsavedChanges(false);
    }
  }, [settings]);
  
  // Отслеживание изменений
  useEffect(() => {
    if (settings && settings.settings) {
      const currentBotToken = settings.settings.telegram_bot_token?.value || '';
      const currentApiId = settings.settings.telegram_api_id?.value || '';
      const currentApiHash = settings.settings.telegram_api_hash?.value || '';
      
      const hasChanges = 
        botToken !== currentBotToken ||
        apiId !== currentApiId ||
        apiHash !== currentApiHash;
      setHasUnsavedChanges(hasChanges);
    }
  }, [botToken, apiId, apiHash, settings]);
  
  const handleSave = () => {
    const settingsToSave: TelegramSettingsData = {};
    
    if (botToken.trim()) {
      settingsToSave.telegram_bot_token = botToken.trim();
    }
    
    if (apiId.trim()) {
      settingsToSave.telegram_api_id = apiId.trim();
    }
    
    if (apiHash.trim()) {
      settingsToSave.telegram_api_hash = apiHash.trim();
    }
    
    saveSettingsMutation.mutate(settingsToSave);
  };
  
  const validateApiId = (value: string): boolean => {
    return /^\d+$/.test(value) && value.length > 0;
  };
  
  const isFormValid = () => {
    return (
      botToken.trim().length > 0 &&
      validateApiId(apiId) &&
      apiHash.trim().length > 0
    );
  };
  
  // Session validation functions
  const validatePhoneNumber = (phone: string): boolean => {
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    if (!phone.trim()) {
      setPhoneError('Номер телефона обязателен');
      return false;
    }
    if (!phoneRegex.test(phone)) {
      setPhoneError('Неверный формат. Используйте международный формат (+7XXXXXXXXXX)');
      return false;
    }
    setPhoneError('');
    return true;
  };

  const validateCode = (code: string): boolean => {
    if (!code.trim()) {
      setCodeError('Код подтверждения обязателен');
      return false;
    }
    if (!/^\d{5}$/.test(code)) {
      setCodeError('Код должен содержать 5 цифр');
      return false;
    }
    setCodeError('');
    return true;
  };

  const validatePassword = (password: string): boolean => {
    if (!password.trim()) {
      setPasswordError('Пароль двухфакторной аутентификации обязателен');
      return false;
    }
    setPasswordError('');
    return true;
  };
  
  // Session handlers
  const handleStartSession = () => {
    if (validatePhoneNumber(phoneNumber)) {
      clearMessages();
      startSessionGenerationMutation.mutate(phoneNumber);
    }
  };

  const handleVerifyCode = () => {
    if (validateCode(verificationCode)) {
      clearMessages();
      verifySessionCodeMutation.mutate({
        sessionId,
        code: verificationCode,
      });
    }
  };

  const handleVerifyPassword = () => {
    if (validatePassword(twoFactorPassword)) {
      clearMessages();
      verifySessionCodeMutation.mutate({
        sessionId,
        code: verificationCode,
        password: twoFactorPassword,
      });
    }
  };

  const handleCancelSession = () => {
    if (sessionId) {
      cancelSessionGenerationMutation.mutate(sessionId);
    }
  };
  
  // Render functions
  const renderCurrentUser = () => {
    if (!currentUserInfo || currentUserInfo.status !== 'success') return null;

    return (
      <div className="p-4 rounded-lg border bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex items-center space-x-2">
                <span className="font-medium text-green-900 dark:text-green-100">
                  {currentUserInfo.user_info?.first_name} {currentUserInfo.user_info?.last_name}
                </span>
                <Badge variant="secondary" className="text-xs">
                  Активна
                </Badge>
              </div>
              {currentUserInfo.user_info?.username && (
                <div className="text-sm text-green-700 dark:text-green-300">
                  @{currentUserInfo.user_info.username}
                </div>
              )}
              <div className="text-xs text-green-600 dark:text-green-400">
                ID: {currentUserInfo.user_info?.id}
              </div>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              // Запуск процесса создания новой сессии
              startNewSession();
              setPhoneError('');
              setCodeError('');
              setPasswordError('');
            }}
            className="text-green-700 dark:text-green-300 border-green-300 dark:border-green-700 hover:bg-green-100 dark:hover:bg-green-900/20"
          >
            Изменить
          </Button>
        </div>
      </div>
    );
  };


  
  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          Загрузка настроек...
        </CardContent>
      </Card>
    );
  }
  
  if (error) {
    return (
      <Card>
        <CardContent>
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              Ошибка загрузки настроек: {(error as Error).message}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Bot className="h-5 w-5" />
            <span>Настройки Telegram</span>
          </CardTitle>
          <CardDescription>
            Настройте параметры для работы с Telegram API и ботом
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            {/* Bot Token */}
            <div className="space-y-2">
              <Label htmlFor="bot-token" className="flex items-center space-x-2">
                <Bot className="h-4 w-4" />
                <span>Telegram Bot Token</span>
              </Label>
              <div className="relative">
                <Input
                  id="bot-token"
                  type={showBotToken ? 'text' : 'password'}
                  placeholder="1234567890:ABCdefGHIjklMNOpqrsTUVwxyz"
                  value={botToken}
                  onChange={(e) => setBotToken(e.target.value)}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowBotToken(!showBotToken)}
                >
                  {showBotToken ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Получите токен у @BotFather в Telegram
              </p>
            </div>

            {/* API ID */}
            <div className="space-y-2">
              <Label htmlFor="api-id" className="flex items-center space-x-2">
                <Key className="h-4 w-4" />
                <span>Telegram API ID</span>
              </Label>
              <Input
                id="api-id"
                type="text"
                placeholder="12345678"
                value={apiId}
                onChange={(e) => setApiId(e.target.value)}
              />
              <p className="text-sm text-muted-foreground">
                Получите на my.telegram.org
              </p>
            </div>

            {/* API Hash */}
            <div className="space-y-2">
              <Label htmlFor="api-hash" className="flex items-center space-x-2">
                <Hash className="h-4 w-4" />
                <span>Telegram API Hash</span>
              </Label>
              <div className="relative">
                <Input
                  id="api-hash"
                  type={showApiHash ? 'text' : 'password'}
                  placeholder="abcdef1234567890abcdef1234567890"
                  value={apiHash}
                  onChange={(e) => setApiHash(e.target.value)}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowApiHash(!showApiHash)}
                >
                  {showApiHash ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Получите на my.telegram.org
              </p>
            </div>

            {/* Save Button */}
            <div className="flex items-center space-x-2">
              <Button
                onClick={handleSave}
                disabled={!isFormValid() || !hasUnsavedChanges || saveSettingsMutation.isLoading}
                className="flex items-center space-x-2"
              >
                {saveSettingsMutation.isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                <span>Сохранить настройки</span>
              </Button>
              {hasUnsavedChanges && (
                <Badge variant="outline" className="text-orange-600 border-orange-300">
                  Есть несохраненные изменения
                </Badge>
              )}
            </div>

            {/* Settings Status */}
            {settings && settings.settings && (
              <div className="space-y-2">
                <div className="text-sm font-medium">Статус настроек:</div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <div className={`p-2 rounded border text-xs ${
                    settings.settings.telegram_bot_token?.value 
                      ? 'bg-green-50 border-green-200 text-green-800 dark:bg-green-950/20 dark:border-green-800 dark:text-green-300'
                      : 'bg-red-50 border-red-200 text-red-800 dark:bg-red-950/20 dark:border-red-800 dark:text-red-300'
                  }`}>
                    <div className="flex items-center space-x-1">
                      {settings.settings.telegram_bot_token?.value ? (
                        <CheckCircle className="h-3 w-3" />
                      ) : (
                        <XCircle className="h-3 w-3" />
                      )}
                      <span>Bot Token</span>
                    </div>
                  </div>
                  <div className={`p-2 rounded border text-xs ${
                    settings.settings.telegram_api_id?.value 
                      ? 'bg-green-50 border-green-200 text-green-800 dark:bg-green-950/20 dark:border-green-800 dark:text-green-300'
                      : 'bg-red-50 border-red-200 text-red-800 dark:bg-red-950/20 dark:border-red-800 dark:text-red-300'
                  }`}>
                    <div className="flex items-center space-x-1">
                      {settings.settings.telegram_api_id?.value ? (
                        <CheckCircle className="h-3 w-3" />
                      ) : (
                        <XCircle className="h-3 w-3" />
                      )}
                      <span>API ID</span>
                    </div>
                  </div>
                  <div className={`p-2 rounded border text-xs ${
                    settings.settings.telegram_api_hash?.value 
                      ? 'bg-green-50 border-green-200 text-green-800 dark:bg-green-950/20 dark:border-green-800 dark:text-green-300'
                      : 'bg-red-50 border-red-200 text-red-800 dark:bg-red-950/20 dark:border-red-800 dark:text-red-300'
                  }`}>
                    <div className="flex items-center space-x-1">
                      {settings.settings.telegram_api_hash?.value ? (
                        <CheckCircle className="h-3 w-3" />
                      ) : (
                        <XCircle className="h-3 w-3" />
                      )}
                      <span>API Hash</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Session Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <User className="h-5 w-5" />
            <span>Управление сессией</span>
          </CardTitle>
          <CardDescription>
            Создайте или управляйте пользовательской сессией для доступа к каналам
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Loading State */}
          {isInitializing && (
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center space-x-3">
                <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                <span className="text-lg font-medium">Проверка сессии...</span>
              </div>
            </div>
          )}

          {/* Content after initialization */}
          {!isInitializing && (
            <>
              {/* Error Messages */}
              {sessionError && (
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>{sessionError}</AlertDescription>
                </Alert>
              )}

              {/* Current User Info */}
              {renderCurrentUser()}

              {/* Session Generation Steps */}
              {sessionGenerationStep === 'phone' && !currentUserInfo && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg border bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
                <div className="flex items-start space-x-3">
                  <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                  <div className="space-y-2">
                    <div className="font-medium text-blue-900 dark:text-blue-100">
                      Создание пользовательской сессии
                    </div>
                    <div className="text-sm text-blue-700 dark:text-blue-300">
                      Для доступа к каналам Telegram необходимо создать пользовательскую сессию.
                      Введите номер телефона, привязанный к вашему аккаунту Telegram.
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="phone-number" className="flex items-center space-x-2">
                  <Phone className="h-4 w-4" />
                  <span>Номер телефона</span>
                </Label>
                <Input
                  id="phone-number"
                  type="tel"
                  placeholder="+7XXXXXXXXXX"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className={phoneError ? 'border-red-500' : ''}
                />
                {phoneError && (
                  <p className="text-sm text-red-600">{phoneError}</p>
                )}
                <p className="text-sm text-muted-foreground">
                  Используйте международный формат (+7XXXXXXXXXX)
                </p>
              </div>
              
              <Button
                onClick={handleStartSession}
                disabled={startSessionGenerationMutation.isLoading}
                className="w-full"
              >
                {startSessionGenerationMutation.isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Отправка кода...
                  </>
                ) : (
                  <>
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Отправить код подтверждения
                  </>
                )}
              </Button>
            </div>
          )}

              {/* Code Verification Step */}
              {sessionGenerationStep === 'code' && (
                <div className="space-y-4">
              <Alert className="border-blue-500/20">
                <MessageSquare className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <AlertDescription className="text-blue-800 dark:text-blue-200">
                  Код подтверждения отправлен на номер {phoneNumber}
                </AlertDescription>
              </Alert>
              
              <div className="space-y-2">
                <Label htmlFor="verification-code" className="flex items-center space-x-2">
                  <Key className="h-4 w-4" />
                  <span>Код подтверждения</span>
                </Label>
                <Input
                  id="verification-code"
                  type="text"
                  placeholder="12345"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  className={codeError ? 'border-red-500' : ''}
                  maxLength={5}
                />
                {codeError && (
                  <p className="text-sm text-red-600">{codeError}</p>
                )}
                <p className="text-sm text-muted-foreground">
                  Введите 5-значный код из Telegram
                </p>
              </div>
              
              <div className="flex space-x-2">
                <Button
                  onClick={handleVerifyCode}
                  disabled={verifySessionCodeMutation.isLoading}
                  className="flex-1"
                >
                  {verifySessionCodeMutation.isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Проверка...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Подтвердить код
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleCancelSession}
                  disabled={cancelSessionGenerationMutation.isLoading}
                >
                  Отмена
                </Button>
              </div>
                </div>
              )}

              {/* 2FA Password Step */}
              {sessionGenerationStep === 'password' && (
                <div className="space-y-4">
              <Alert className="border-orange-500/20">
                <Lock className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                <AlertDescription className="text-orange-800 dark:text-orange-200">
                  Требуется пароль двухфакторной аутентификации
                </AlertDescription>
              </Alert>
              
              <div className="space-y-2">
                <Label htmlFor="two-factor-password" className="flex items-center space-x-2">
                  <Lock className="h-4 w-4" />
                  <span>Пароль 2FA</span>
                </Label>
                <Input
                  id="two-factor-password"
                  type="password"
                  placeholder="Введите пароль"
                  value={twoFactorPassword}
                  onChange={(e) => setTwoFactorPassword(e.target.value)}
                  className={passwordError ? 'border-red-500' : ''}
                />
                {passwordError && (
                  <p className="text-sm text-red-600">{passwordError}</p>
                )}
                <p className="text-sm text-muted-foreground">
                  Введите пароль двухфакторной аутентификации
                </p>
              </div>
              
              <div className="flex space-x-2">
                <Button
                  onClick={handleVerifyPassword}
                  disabled={verifySessionCodeMutation.isLoading}
                  className="flex-1"
                >
                  {verifySessionCodeMutation.isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Проверка...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Подтвердить пароль
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleCancelSession}
                  disabled={cancelSessionGenerationMutation.isLoading}
                >
                  Отмена
                </Button>
              </div>
                </div>
              )}

              {/* Test Session Button */}
              {currentUserInfo && currentUserInfo.status === 'success' && (
                <>
                  <Separator />
                  <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Тестирование подключения</h4>
                    <p className="text-sm text-muted-foreground">
                      Проверьте работоспособность текущей сессии
                    </p>
                  </div>
                  <Button
                    onClick={() => testSessionMutation.mutate()}
                    disabled={testSessionMutation.isLoading}
                    variant="outline"
                  >
                    {testSessionMutation.isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Тестирование...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Тестировать подключение
                      </>
                    )}
                  </Button>
                </div>
                  </div>
                </>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};