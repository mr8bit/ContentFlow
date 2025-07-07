import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from 'react-query';
import { telegramAPI, TelegramSessionTestResponse } from '../services/api';
import { useToast } from './use-toast';

type SessionGenerationStep = 'idle' | 'phone' | 'code' | 'password';

export const useTelegramSession = () => {
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [sessionTestResult, setSessionTestResult] = useState<TelegramSessionTestResponse | null>(null);
  const [currentUserInfo, setCurrentUserInfo] = useState<TelegramSessionTestResponse | null>(null);
  const [isLoadingSessionInfo, setIsLoadingSessionInfo] = useState(true);
  const [isInitializing, setIsInitializing] = useState(true);
  
  // Session generation state
  const [sessionGenerationStep, setSessionGenerationStep] = useState<SessionGenerationStep>('idle');
  const [sessionId, setSessionId] = useState<string>('');
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [verificationCode, setVerificationCode] = useState<string>('');
  const [twoFactorPassword, setTwoFactorPassword] = useState<string>('');

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const testSessionMutation = useMutation(
    () => telegramAPI.testSession(),
    {
      onSuccess: (response) => {
        setSessionTestResult(response.data);
        if (response.data.status === 'success') {
          setCurrentUserInfo(response.data);
          setSessionGenerationStep('idle');
          toast({
            title: 'Успешно',
            description: 'Подключение к Telegram работает корректно',
          });
        } else {
          setCurrentUserInfo(null);
          setSessionGenerationStep('phone');
          toast({
            title: 'Ошибка подключения',
            description: 'Не удалось подключиться к Telegram. Проверьте настройки.',
            variant: 'destructive',
          });
        }
        setError('');
        setIsLoadingSessionInfo(false);
        setIsInitializing(false);
      },
      onError: (err: any) => {
        console.error('Telegram session test error:', err);
        let errorMessage = 'Ошибка при тестировании сессии';
        
        if (err.response?.status === 500) {
          errorMessage = 'Ошибка сервера. Проверьте настройки Telegram API или попробуйте позже.';
        } else if (err.response?.status === 401) {
          errorMessage = 'Неавторизованный доступ. Проверьте токен авторизации.';
        } else if (err.response?.status === 404) {
          errorMessage = 'Сессия не найдена. Создайте новую сессию.';
        } else if (err.response?.data?.detail) {
          errorMessage = err.response.data.detail;
        } else if (err.message) {
          errorMessage = `Ошибка соединения: ${err.message}`;
        }
        
        toast({
          title: 'Ошибка тестирования',
          description: errorMessage,
          variant: 'destructive',
        });
        
        setError(errorMessage);
        setSuccess('');
        setCurrentUserInfo(null);
        setIsLoadingSessionInfo(false);
        setIsInitializing(false);
        setSessionGenerationStep('phone');
      },
    }
  );

  const startSessionGenerationMutation = useMutation(
    (phoneNumber: string) => telegramAPI.startSessionGeneration(phoneNumber),
    {
      onSuccess: (response) => {
        setSessionId(response.data.session_id);
        setSessionGenerationStep('code');
        setSuccess(response.data.message);
        setError('');
      },
      onError: (err: any) => {
        console.error('Start session generation error:', err);
        let errorMessage = 'Ошибка при отправке кода';
        
        if (err.response?.status === 400) {
          errorMessage = 'Неверный формат номера телефона. Используйте международный формат (+7XXXXXXXXXX).';
        } else if (err.response?.status === 429) {
          errorMessage = 'Слишком много попыток. Попробуйте позже.';
        } else if (err.response?.status === 500) {
          errorMessage = 'Ошибка сервера. Проверьте настройки Telegram API.';
        } else if (err.response?.data?.detail) {
          errorMessage = err.response.data.detail;
        }
        
        setError(errorMessage);
        setSuccess('');
        setSessionGenerationStep('idle');
      },
    }
  );

  const verifySessionCodeMutation = useMutation(
    ({ sessionId, code, password }: { sessionId: string; code: string; password?: string }) =>
      telegramAPI.verifySessionCode(sessionId, code, password),
    {
      onSuccess: (response) => {
        if (response.data.status === 'password_required') {
          setSessionGenerationStep('password');
          setSuccess(response.data.message);
        } else {
          setSuccess(response.data.message);
          setSessionGenerationStep('idle');
          if (response.data.user_info) {
            setCurrentUserInfo(response.data);
          }
          queryClient.invalidateQueries('settings');
          resetSessionForm();
        }
        setError('');
      },
      onError: (err: any) => {
        console.error('Verify session code error:', err);
        let errorMessage = 'Ошибка при подтверждении кода';
        
        if (err.response?.status === 400) {
          errorMessage = 'Неверный код подтверждения или пароль. Проверьте введенные данные.';
        } else if (err.response?.status === 404) {
          errorMessage = 'Сессия не найдена или истекла. Начните процесс заново.';
        } else if (err.response?.status === 429) {
          errorMessage = 'Слишком много попыток. Подождите перед следующей попыткой.';
        } else if (err.response?.data?.detail) {
          errorMessage = err.response.data.detail;
        }
        
        setError(errorMessage);
        setSuccess('');
      },
    }
  );

  const cancelSessionGenerationMutation = useMutation(
    (sessionId: string) => telegramAPI.cancelSessionGeneration(sessionId),
    {
      onSuccess: (response) => {
        setSessionGenerationStep('idle');
        resetSessionForm();
        setSuccess(response.data.message);
        setError('');
      },
      onError: (err: any) => {
        console.error('Cancel session generation error:', err);
        let errorMessage = 'Ошибка при отмене';
        
        if (err.response?.data?.detail) {
          errorMessage = err.response.data.detail;
        }
        
        setError(errorMessage);
        setSuccess('');
        // Все равно сбрасываем форму при ошибке отмены
        setSessionGenerationStep('idle');
        resetSessionForm();
      },
    }
  );

  const resetSessionForm = () => {
    setPhoneNumber('');
    setVerificationCode('');
    setTwoFactorPassword('');
    setSessionId('');
  };

  const startNewSession = () => {
    setSessionGenerationStep('phone');
    setCurrentUserInfo(null);
  };

  const clearMessages = () => {
    setError('');
    setSuccess('');
  };

  // Auto-test session on mount
  useEffect(() => {
    testSessionMutation.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    // State
    error,
    success,
    sessionTestResult,
    currentUserInfo,
    sessionGenerationStep,
    sessionId,
    phoneNumber,
    verificationCode,
    twoFactorPassword,
    isLoadingSessionInfo,
    isInitializing,
    
    // Mutations
    testSessionMutation,
    startSessionGenerationMutation,
    verifySessionCodeMutation,
    cancelSessionGenerationMutation,
    
    // Actions
    setSessionGenerationStep,
    setPhoneNumber,
    setVerificationCode,
    setTwoFactorPassword,
    resetSessionForm,
    startNewSession,
    clearMessages,
  };
};