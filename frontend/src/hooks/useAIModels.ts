import { useState, useEffect } from 'react';
import { AIModel, aiModelsAPI } from '../services/api';

export const useAIModels = () => {
  const [models, setModels] = useState<AIModel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadModels = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await aiModelsAPI.getAll({ active_only: true });
      setModels(response.data);
    } catch (err) {
      setError('Ошибка при загрузке моделей AI');
      console.error('Error loading AI models:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadModels();
  }, []);

  const getDefaultModel = (): AIModel | undefined => {
    return models.find(model => model.is_default && model.is_active);
  };

  const getActiveModels = (): AIModel[] => {
    return models.filter(model => model.is_active);
  };

  return {
    models,
    isLoading,
    error,
    loadModels,
    getDefaultModel,
    getActiveModels,
  };
};