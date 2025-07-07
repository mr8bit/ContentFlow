import { useState, useEffect } from 'react';
import { useMutation } from 'react-query';
import { workerAPI, WorkerResponse } from '../services/api';

export const useWorker = () => {
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [workerStatus, setWorkerStatus] = useState<WorkerResponse | null>(null);

  const getWorkerStatusMutation = useMutation(
    () => workerAPI.getStatus(),
    {
      onSuccess: (response) => {
        setWorkerStatus(response.data);
      },
      onError: (err: any) => {
        console.error('Failed to get worker status:', err);
      },
    }
  );

  const startWorkerMutation = useMutation(
    () => workerAPI.start(),
    {
      onSuccess: (response) => {
        setSuccess(response.data.message || 'Worker запущен');
        setError('');
        setTimeout(() => setSuccess(''), 3000);
        getWorkerStatusMutation.mutate();
      },
      onError: (err: any) => {
        setError(err.response?.data?.detail || 'Ошибка при запуске worker');
        setSuccess('');
      },
    }
  );

  const stopWorkerMutation = useMutation(
    () => workerAPI.stop(),
    {
      onSuccess: (response) => {
        setSuccess(response.data.message || 'Worker остановлен');
        setError('');
        setTimeout(() => setSuccess(''), 3000);
        getWorkerStatusMutation.mutate();
      },
      onError: (err: any) => {
        setError(err.response?.data?.detail || 'Ошибка при остановке worker');
        setSuccess('');
      },
    }
  );

  const clearMessages = () => {
    setError('');
    setSuccess('');
  };

  // Auto-fetch worker status on mount
  useEffect(() => {
    getWorkerStatusMutation.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    // State
    error,
    success,
    workerStatus,
    
    // Mutations
    getWorkerStatusMutation,
    startWorkerMutation,
    stopWorkerMutation,
    
    // Actions
    clearMessages,
  };
};