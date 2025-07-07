import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Alert, AlertDescription } from '../ui/alert';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { Loader2, Phone, MessageSquare, Lock, User, CheckCircle, XCircle, AlertTriangle, RefreshCw, Info } from 'lucide-react';
import { useTelegramSession } from '../../hooks/useTelegramSession';

export const TelegramSessionManager: React.FC = () => {
  const [phoneError, setPhoneError] = useState('');
  const [codeError, setCodeError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const {
    error,
    success,
    sessionTestResult,
    currentUserInfo,
    sessionGenerationStep,
    sessionId,
    phoneNumber,
    verificationCode,
    twoFactorPassword,
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

  const renderCurrentUser = () => {
    if (!currentUserInfo || currentUserInfo.status !== 'success') return null;

    return (
      <div className="p-4 rounded-lg border bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
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
      </div>
    );
  };

  const renderTestResult = () => {
    if (!sessionTestResult) return null;

    return (
      <Alert className={sessionTestResult.status === 'success' ? 'border-green-500/20' : 'border-destructive/20'}>
        <div className="flex items-center space-x-2">
          {sessionTestResult.status === 'success' ? (
            <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
          ) : (
            <XCircle className="h-4 w-4 text-destructive" />
          )}
          <AlertDescription>
            <div className="space-y-1">
              <div>Статус: {sessionTestResult.status}</div>
              {sessionTestResult.message && (
                <div>Сообщение: {sessionTestResult.message}</div>
              )}
              {sessionTestResult.user_info && (
                <div>
                  Пользователь: {sessionTestResult.user_info.first_name} {sessionTestResult.user_info.last_name}
                  {sessionTestResult.user_info.username && ` (@${sessionTestResult.user_info.username})`}
                </div>
              )}
            </div>
          </AlertDescription>
        </div>
      </Alert>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <MessageSquare className="h-5 w-5" />
          <span>Управление Telegram сессией</span>
        </CardTitle>
        <CardDescription>
          Настройте подключение к Telegram для автоматической публикации постов
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <div className="flex items-start space-x-2">
              <XCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <AlertDescription className="font-medium mb-1">
                  Ошибка
                </AlertDescription>
                <AlertDescription className="text-sm opacity-90">
                  {error}
                </AlertDescription>
              </div>
            </div>
          </Alert>
        )}
        
        {success && (
          <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/20">
            <div className="flex items-start space-x-2">
              <CheckCircle className="h-4 w-4 mt-0.5 text-green-600 dark:text-green-400 flex-shrink-0" />
              <div className="flex-1">
                <AlertDescription className="text-green-800 dark:text-green-200">
                  {success}
                </AlertDescription>
              </div>
            </div>
          </Alert>
        )}

        {renderTestResult()}
        {renderCurrentUser()}
        
        <Separator />
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Управление сессией</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => testSessionMutation.mutate()}
              disabled={testSessionMutation.isLoading}
            >
              {testSessionMutation.isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Проверка...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Проверить сессию
                </>
              )}
            </Button>
          </div>
          
          {sessionGenerationStep === 'idle' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone" className="flex items-center space-x-2">
                  <Phone className="h-4 w-4" />
                  <span>Номер телефона</span>
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+7XXXXXXXXXX"
                  value={phoneNumber}
                  onChange={(e) => {
                    setPhoneNumber(e.target.value);
                    if (phoneError) setPhoneError('');
                  }}
                  className={phoneError ? 'border-destructive' : ''}
                />
                {phoneError && (
                  <div className="flex items-center space-x-1 text-sm text-destructive">
                    <AlertTriangle className="h-3 w-3" />
                    <span>{phoneError}</span>
                  </div>
                )}
              </div>
              
              <div className="flex space-x-2">
                <Button
                  onClick={handleStartSession}
                  disabled={startSessionGenerationMutation.isLoading || !phoneNumber.trim()}
                  className="min-w-[140px]"
                >
                  {startSessionGenerationMutation.isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Отправка...
                    </>
                  ) : (
                    <>
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Отправить код
                    </>
                  )}
                </Button>
                
                <Button
                  variant="outline"
                  onClick={startNewSession}
                >
                  <User className="h-4 w-4 mr-2" />
                  Новая сессия
                </Button>
              </div>
            </div>
          )}
          
          {sessionGenerationStep === 'code' && (
            <div className="space-y-4">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Код подтверждения отправлен на номер {phoneNumber}. Введите полученный код.
                </AlertDescription>
              </Alert>
              
              <div className="space-y-2">
                <Label htmlFor="code" className="flex items-center space-x-2">
                  <MessageSquare className="h-4 w-4" />
                  <span>Код подтверждения</span>
                </Label>
                <Input
                  id="code"
                  type="text"
                  placeholder="12345"
                  value={verificationCode}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 5);
                    setVerificationCode(value);
                    if (codeError) setCodeError('');
                  }}
                  className={codeError ? 'border-destructive' : ''}
                  maxLength={5}
                />
                {codeError && (
                  <div className="flex items-center space-x-1 text-sm text-destructive">
                    <AlertTriangle className="h-3 w-3" />
                    <span>{codeError}</span>
                  </div>
                )}
              </div>
              
              <div className="flex space-x-2">
                <Button
                  onClick={handleVerifyCode}
                  disabled={verifySessionCodeMutation.isLoading || verificationCode.length !== 5}
                  className="min-w-[120px]"
                >
                  {verifySessionCodeMutation.isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Проверка...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Подтвердить
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
          
          {sessionGenerationStep === 'password' && (
            <div className="space-y-4">
              <Alert>
                <Lock className="h-4 w-4" />
                <AlertDescription>
                  Требуется пароль двухфакторной аутентификации для завершения входа.
                </AlertDescription>
              </Alert>
              
              <div className="space-y-2">
                <Label htmlFor="password" className="flex items-center space-x-2">
                  <Lock className="h-4 w-4" />
                  <span>Пароль 2FA</span>
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Введите пароль"
                  value={twoFactorPassword}
                  onChange={(e) => {
                    setTwoFactorPassword(e.target.value);
                    if (passwordError) setPasswordError('');
                  }}
                  className={passwordError ? 'border-destructive' : ''}
                />
                {passwordError && (
                  <div className="flex items-center space-x-1 text-sm text-destructive">
                    <AlertTriangle className="h-3 w-3" />
                    <span>{passwordError}</span>
                  </div>
                )}
              </div>
              
              <div className="flex space-x-2">
                <Button
                  onClick={handleVerifyPassword}
                  disabled={verifySessionCodeMutation.isLoading || !twoFactorPassword.trim()}
                  className="min-w-[120px]"
                >
                  {verifySessionCodeMutation.isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Проверка...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Подтвердить
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
          
          {(sessionGenerationStep === 'code' || sessionGenerationStep === 'password') && (
            <div className="pt-4 border-t">
              <Button
                variant="destructive"
                onClick={handleCancelSession}
                disabled={cancelSessionGenerationMutation.isLoading}
                className="w-full"
              >
                {cancelSessionGenerationMutation.isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <XCircle className="h-4 w-4 mr-2" />
                )}
                Отменить создание сессии
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};