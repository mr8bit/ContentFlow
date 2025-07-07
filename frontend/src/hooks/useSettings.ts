import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { settingsAPI, SettingUpdate } from '../services/api';

export const useSettings = () => {
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const queryClient = useQueryClient();

  const {
    data: settings,
    isLoading,
    error: fetchError,
    refetch,
  } = useQuery('settings', () =>
    settingsAPI.getAll().then((res) => res.data)
  );

  const updateMutation = useMutation(
    ({ key, data }: { key: string; data: SettingUpdate }) =>
      settingsAPI.update(key, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('settings');
        setSuccess('Настройки успешно сохранены');
        setError('');
        setTimeout(() => setSuccess(''), 3000);
      },
      onError: (err: any) => {
        setError(err.response?.data?.detail || 'Ошибка при сохранении настроек');
        setSuccess('');
      },
    }
  );

  const handleSave = async (key: string, value: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      updateMutation.mutate(
        { key, data: { value } },
        {
          onSuccess: () => resolve(),
          onError: (error) => reject(error),
        }
      );
    });
  };

  const clearMessages = () => {
    setError('');
    setSuccess('');
  };

  return {
    settings,
    isLoading,
    fetchError,
    error,
    success,
    refetch,
    handleSave,
    updateMutation,
    clearMessages,
  };
};