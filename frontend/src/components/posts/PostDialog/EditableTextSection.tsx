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
  const [isExpanded, setIsExpanded] = useState(false);

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
    <div className="space-y-4 p-4 bg-gradient-to-br from-purple-50/50 to-blue-50/50 dark:from-purple-950/20 dark:to-blue-950/20 rounded-xl border border-purple-200/50 dark:border-purple-800/50 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg shadow-sm">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <span className="font-semibold text-sm text-foreground">ИИ-помощник</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-muted-foreground hover:text-foreground"
        >
          {isExpanded ? 'Свернуть' : 'Развернуть'}
        </Button>
      </div>
      
      {isExpanded && (
        <div className="space-y-4 animate-in slide-in-from-top-2 duration-200">
          {/* Выбор модели AI */}
          {activeModels.length > 0 && (
            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground">Модель AI:</label>
              <Select value={selectedModelId} onValueChange={setSelectedModelId}>
                <SelectTrigger className="h-9 text-xs border-purple-200/50 dark:border-purple-800/50 focus:ring-purple-500/20">
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
          
          <div className="space-y-2">
            <label className="text-xs font-semibold text-foreground">Инструкция для ИИ</label>
            <Textarea
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="Опишите, что нужно сделать с текстом (например: 'сделать более эмоциональным', 'добавить призыв к действию', 'сократить до 100 слов')..."
              className="min-h-[80px] text-xs resize-none border-purple-200/50 dark:border-purple-800/50 focus:ring-purple-500/20 bg-white/50 dark:bg-gray-900/50"
              disabled={isProcessing || isLoading}
            />
          </div>
          
          <Button
            onClick={handleAIRequest}
            disabled={!aiPrompt.trim() || isProcessing || isLoading || !selectedModelId}
            className="w-full h-9 text-xs bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white shadow-sm transition-all duration-200"
            size="sm"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            {isProcessing ? 'Обрабатываю...' : 'Применить ИИ'}
          </Button>
        </div>
      )}
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
      <div className="space-y-6 p-6 bg-gradient-to-br from-muted/30 to-card rounded-xl border">
        <div className="space-y-3">
          <label className="text-sm font-semibold text-foreground">Редактирование текста</label>
          <Textarea
            value={editedText}
            onChange={(e) => setEditedText(e.target.value)}
            className="min-h-40 text-sm border-muted-foreground/20 focus:ring-primary/20 bg-background/50"
            placeholder="Редактировать текст поста..."
            disabled={isLoading}
          />
        </div>
        
        <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
          <div className="flex items-center gap-3">
            <Button
              onClick={handleSave}
              disabled={isLoading}
              size="sm"
              className="gap-2 bg-green-600 hover:bg-green-700 text-white transition-all duration-200"
            >
              <Save className="h-4 w-4" />
              {isLoading ? 'Сохраняю...' : 'Сохранить'}
            </Button>
            
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={isLoading}
              size="sm"
              className="gap-2 transition-all duration-200"
            >
              <X className="h-4 w-4" />
              Отменить
            </Button>
            
            <Button
              variant="outline"
              onClick={() => setShowAI(!showAI)}
              disabled={isLoading}
              size="sm"
              className="gap-2 transition-all duration-200"
            >
              <Sparkles className="h-4 w-4" />
              Использовать ИИ
            </Button>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="text-xs text-muted-foreground bg-background/50 px-2 py-1 rounded">
              {editedText.length} символов
            </div>
          </div>
        </div>
        
        {showAI && (
          <AIAssistant
            currentText={editedText}
            onApplyAI={handleAIApply}
            isLoading={isLoading}
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="p-4 bg-gradient-to-r from-card to-muted/20 rounded-xl border">
        <TelegramPost 
          text={text} 
          type={type} 
          post={post} 
          onMediaClick={() => {}} // Media click не нужен в режиме просмотра
        />
      </div>
      
      <div className="flex justify-end">
        <Button
          variant="default"
          size="sm"
          onClick={handleStartEdit}
          className="gap-2 transition-all duration-200"
        >
          <Edit3 className="h-4 w-4" />
          Редактировать
        </Button>
      </div>
    </div>
  );
};

EditableTextSection.displayName = 'EditableTextSection';