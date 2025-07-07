import React, { useState } from 'react';
import { Button, Textarea, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui';
import { Edit3, Save, X, Sparkles } from 'lucide-react';
import { TelegramPost } from './TelegramPost';
import { Post } from '../../../types';
import { postsAPI } from '../../../services/api';
import { useAIModels } from '../../../hooks/useAIModels';

interface EditableTextSectionProps {
  post: Post;
  text: string;
  type: 'original' | 'processed';
  onSave: (newText: string) => void;
  isLoading?: boolean;
}

interface AIAssistantProps {
  currentText: string;
  onApplyAI: (improvedText: string) => void;
  isLoading: boolean;
}

const AIAssistant: React.FC<AIAssistantProps> = ({ currentText, onApplyAI, isLoading }) => {
  const [aiPrompt, setAiPrompt] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedModelId, setSelectedModelId] = useState<string>('');
  const { models, getDefaultModel, getActiveModels } = useAIModels();

  // Устанавливаем модель по умолчанию при загрузке
  React.useEffect(() => {
    const defaultModel = getDefaultModel();
    if (defaultModel && !selectedModelId) {
      setSelectedModelId(defaultModel.id.toString());
    }
  }, [models, selectedModelId, getDefaultModel]);

  const handleAIRequest = async () => {
    if (!aiPrompt.trim()) return;
    
    setIsProcessing(true);
    try {
      const modelId = selectedModelId ? parseInt(selectedModelId) : undefined;
      const response = await postsAPI.improveTextWithPrompt(currentText, aiPrompt, modelId);
      onApplyAI(response.data.improved_text);
      setAiPrompt('');
    } catch (error) {
      console.error('Ошибка при обработке ИИ:', error);
      // В случае ошибки можно показать уведомление пользователю
    } finally {
      setIsProcessing(false);
    }
  };

  const activeModels = getActiveModels();

  return (
    <div className="space-y-3 p-4 bg-muted/50 rounded-lg border">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-purple-500" />
        <span className="font-medium text-sm">ИИ-помощник</span>
      </div>
      
      {/* Выбор модели AI */}
      {activeModels.length > 0 && (
        <div className="space-y-2">
          <label className="text-sm font-medium">Модель AI:</label>
          <Select value={selectedModelId} onValueChange={setSelectedModelId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Выберите модель AI" />
            </SelectTrigger>
            <SelectContent>
              {activeModels.map((model) => (
                <SelectItem key={model.id} value={model.id.toString()}>
                  <div className="flex items-center gap-2">
                    <span>{model.name}</span>
                    {model.is_default && (
                      <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                        По умолчанию
                      </span>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      
      <Textarea
        value={aiPrompt}
        onChange={(e) => setAiPrompt(e.target.value)}
        placeholder="Опишите, что нужно сделать с текстом (например: 'сделать более эмоциональным', 'добавить призыв к действию', 'сократить до 100 слов')..."
        className="min-h-20 text-sm"
        disabled={isProcessing || isLoading}
      />
      
      <div className="flex gap-2">
        <Button
          onClick={handleAIRequest}
          disabled={!aiPrompt.trim() || isProcessing || isLoading || !selectedModelId}
          size="sm"
          className="gap-2"
        >
          <Sparkles className="h-4 w-4" />
          {isProcessing ? 'Обрабатываю...' : 'Применить ИИ'}
        </Button>
      </div>
    </div>
  );
};

export const EditableTextSection: React.FC<EditableTextSectionProps> = ({
  post,
  text,
  type,
  onSave,
  isLoading = false
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(text);
  const [showAI, setShowAI] = useState(false);

  const handleStartEdit = () => {
    setEditedText(text);
    setIsEditing(true);
    setShowAI(false);
  };

  const handleSave = () => {
    onSave(editedText);
    setIsEditing(false);
    setShowAI(false);
  };

  const handleCancel = () => {
    setEditedText(text);
    setIsEditing(false);
    setShowAI(false);
  };

  const handleAIApply = (improvedText: string) => {
    setEditedText(improvedText);
    setShowAI(false);
  };

  if (isEditing) {
    return (
      <div className="space-y-4">
        <Textarea
          value={editedText}
          onChange={(e) => setEditedText(e.target.value)}
          className="min-h-32 text-sm"
          placeholder="Редактировать текст поста..."
          disabled={isLoading}
        />
        
        <div className="flex flex-col gap-3">
          <div className="flex gap-2">
            <Button
              onClick={handleSave}
              disabled={isLoading}
              size="sm"
              className="gap-2"
            >
              <Save className="h-4 w-4" />
              {isLoading ? 'Сохраняю...' : 'Сохранить'}
            </Button>
            
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={isLoading}
              size="sm"
              className="gap-2"
            >
              <X className="h-4 w-4" />
              Отменить
            </Button>
            
            <Button
              variant="outline"
              onClick={() => setShowAI(!showAI)}
              disabled={isLoading}
              size="sm"
              className="gap-2"
            >
              <Sparkles className="h-4 w-4" />
              Использовать ИИ
            </Button>
          </div>
          
          {showAI && (
            <AIAssistant
              currentText={editedText}
              onApplyAI={handleAIApply}
              isLoading={isLoading}
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <TelegramPost 
        text={text} 
        type={type} 
        post={post} 
        onMediaClick={() => {}} // Media click не нужен в режиме просмотра
      />
      
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={handleStartEdit}
          className="gap-2"
        >
          <Edit3 className="h-4 w-4" />
          Редактировать
        </Button>
      </div>
    </div>
  );
};

EditableTextSection.displayName = 'EditableTextSection';