import { useState, useEffect } from 'react';
import { useMutation } from 'react-query';
import { scrapperAPI, publisherAPI, llmWorkerAPI, ServiceStatus } from '../services/api';

export const useScrapper = () => {
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [scrapperStatus, setScrapperStatus] = useState<ServiceStatus | null>(null);

  const getScrapperStatusMutation = useMutation(
    () => scrapperAPI.getStatus(),
    {
      onSuccess: (response) => {
        setScrapperStatus(response.data);
      },
      onError: (err: any) => {
        console.error('Failed to get scrapper status:', err);
        setError(err.response?.data?.detail || 'Ошибка при получении статуса scrapper');
      },
    }
  );

  const startScrapperMutation = useMutation(
    () => scrapperAPI.start(),
    {
      onSuccess: (response) => {
        setSuccess(response.data.message || 'Scrapper запущен');
        setError('');
        setTimeout(() => setSuccess(''), 3000);
        // Обновляем статус через небольшую задержку
        setTimeout(() => getScrapperStatusMutation.mutate(), 1000);
      },
      onError: (err: any) => {
        setError(err.response?.data?.detail || 'Ошибка при запуске scrapper');
        setSuccess('');
      },
    }
  );

  const stopScrapperMutation = useMutation(
    () => scrapperAPI.stop(),
    {
      onSuccess: (response) => {
        setSuccess(response.data.message || 'Scrapper остановлен');
        setError('');
        setTimeout(() => setSuccess(''), 3000);
        // Обновляем статус через небольшую задержку
        setTimeout(() => getScrapperStatusMutation.mutate(), 1000);
      },
      onError: (err: any) => {
        setError(err.response?.data?.detail || 'Ошибка при остановке scrapper');
        setSuccess('');
      },
    }
  );

  const restartScrapperMutation = useMutation(
    () => scrapperAPI.restart(),
    {
      onSuccess: (response) => {
        setSuccess(response.data.message || 'Scrapper перезапущен');
        setError('');
        setTimeout(() => setSuccess(''), 3000);
        // Обновляем статус через небольшую задержку
        setTimeout(() => getScrapperStatusMutation.mutate(), 2000);
      },
      onError: (err: any) => {
        setError(err.response?.data?.detail || 'Ошибка при перезапуске scrapper');
        setSuccess('');
      },
    }
  );

  const clearMessages = () => {
    setError('');
    setSuccess('');
  };

  // Auto-fetch scrapper status on mount
  useEffect(() => {
    getScrapperStatusMutation.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    // State
    error,
    success,
    scrapperStatus,
    
    // Mutations
    getScrapperStatusMutation,
    startScrapperMutation,
    stopScrapperMutation,
    restartScrapperMutation,
    
    // Actions
    clearMessages,
  };
};

export const usePublisher = () => {
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [publisherStatus, setPublisherStatus] = useState<ServiceStatus | null>(null);

  const getPublisherStatusMutation = useMutation(
    () => publisherAPI.getStatus(),
    {
      onSuccess: (response) => {
        setPublisherStatus(response.data);
      },
      onError: (err: any) => {
        console.error('Failed to get publisher status:', err);
        setError(err.response?.data?.detail || 'Ошибка при получении статуса publisher');
      },
    }
  );

  const startPublisherMutation = useMutation(
    () => publisherAPI.start(),
    {
      onSuccess: (response) => {
        setSuccess(response.data.message || 'Publisher запущен');
        setError('');
        setTimeout(() => setSuccess(''), 3000);
        // Обновляем статус через небольшую задержку
        setTimeout(() => getPublisherStatusMutation.mutate(), 1000);
      },
      onError: (err: any) => {
        setError(err.response?.data?.detail || 'Ошибка при запуске publisher');
        setSuccess('');
      },
    }
  );

  const stopPublisherMutation = useMutation(
    () => publisherAPI.stop(),
    {
      onSuccess: (response) => {
        setSuccess(response.data.message || 'Publisher остановлен');
        setError('');
        setTimeout(() => setSuccess(''), 3000);
        // Обновляем статус через небольшую задержку
        setTimeout(() => getPublisherStatusMutation.mutate(), 1000);
      },
      onError: (err: any) => {
        setError(err.response?.data?.detail || 'Ошибка при остановке publisher');
        setSuccess('');
      },
    }
  );

  const restartPublisherMutation = useMutation(
    () => publisherAPI.restart(),
    {
      onSuccess: (response) => {
        setSuccess(response.data.message || 'Publisher перезапущен');
        setError('');
        setTimeout(() => setSuccess(''), 3000);
        // Обновляем статус через небольшую задержку
        setTimeout(() => getPublisherStatusMutation.mutate(), 2000);
      },
      onError: (err: any) => {
        setError(err.response?.data?.detail || 'Ошибка при перезапуске publisher');
        setSuccess('');
      },
    }
  );

  const clearMessages = () => {
    setError('');
    setSuccess('');
  };

  // Auto-fetch publisher status on mount
  useEffect(() => {
    getPublisherStatusMutation.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    // State
    error,
    success,
    publisherStatus,
    
    // Mutations
    getPublisherStatusMutation,
    startPublisherMutation,
    stopPublisherMutation,
    restartPublisherMutation,
    
    // Actions
    clearMessages,
  };
};

export const useLLMWorker = () => {
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [llmWorkerStatus, setLLMWorkerStatus] = useState<ServiceStatus | null>(null);

  const getLLMWorkerStatusMutation = useMutation(
    () => llmWorkerAPI.getStatus(),
    {
      onSuccess: (response) => {
        setLLMWorkerStatus(response.data);
      },
      onError: (err: any) => {
        console.error('Failed to get LLM worker status:', err);
        setError(err.response?.data?.detail || 'Ошибка при получении статуса LLM worker');
      },
    }
  );

  const startLLMWorkerMutation = useMutation(
    () => llmWorkerAPI.start(),
    {
      onSuccess: (response) => {
        setSuccess(response.data.message || 'LLM Worker запущен');
        setError('');
        setTimeout(() => setSuccess(''), 3000);
        // Обновляем статус через небольшую задержку
        setTimeout(() => getLLMWorkerStatusMutation.mutate(), 1000);
      },
      onError: (err: any) => {
        setError(err.response?.data?.detail || 'Ошибка при запуске LLM worker');
        setSuccess('');
      },
    }
  );

  const stopLLMWorkerMutation = useMutation(
    () => llmWorkerAPI.stop(),
    {
      onSuccess: (response) => {
        setSuccess(response.data.message || 'LLM Worker остановлен');
        setError('');
        setTimeout(() => setSuccess(''), 3000);
        // Обновляем статус через небольшую задержку
        setTimeout(() => getLLMWorkerStatusMutation.mutate(), 1000);
      },
      onError: (err: any) => {
        setError(err.response?.data?.detail || 'Ошибка при остановке LLM worker');
        setSuccess('');
      },
    }
  );

  const restartLLMWorkerMutation = useMutation(
    () => llmWorkerAPI.restart(),
    {
      onSuccess: (response) => {
        setSuccess(response.data.message || 'LLM Worker перезапущен');
        setError('');
        setTimeout(() => setSuccess(''), 3000);
        // Обновляем статус через небольшую задержку
        setTimeout(() => getLLMWorkerStatusMutation.mutate(), 2000);
      },
      onError: (err: any) => {
        setError(err.response?.data?.detail || 'Ошибка при перезапуске LLM worker');
        setSuccess('');
      },
    }
  );

  const clearMessages = () => {
    setError('');
    setSuccess('');
  };

  // Auto-fetch LLM worker status on mount
  useEffect(() => {
    getLLMWorkerStatusMutation.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    // State
    error,
    success,
    llmWorkerStatus,
    
    // Mutations
    getLLMWorkerStatusMutation,
    startLLMWorkerMutation,
    stopLLMWorkerMutation,
    restartLLMWorkerMutation,
    
    // Actions
    clearMessages,
  };
};