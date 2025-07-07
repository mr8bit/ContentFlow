import React from 'react';
import { Button, Textarea } from '../../ui';
import { ImprovedTextSectionProps } from './types';
import { TelegramPost } from './TelegramPost';

export const ImprovedTextSection = React.memo<ImprovedTextSectionProps>(({ 
  post, 
  improvedText, 
  setImprovedText, 
  onSave, 
  onCancel, 
  isLoading 
}) => {
  if (improvedText) {
    return (
      <div className="space-y-3 sm:space-y-4">
        <TelegramPost 
          text={improvedText} 
          type="improved" 
          post={post} 
          onMediaClick={() => {}} // Media click не нужен для улучшенного поста
        />
        <Textarea
          value={improvedText}
          onChange={(e) => setImprovedText(e.target.value)}
          className="min-h-24 sm:min-h-32 text-xs sm:text-sm"
          placeholder="Редактировать улучшенный текст..."
        />
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            onClick={onSave}
            disabled={isLoading}
            size="sm"
            className="w-full sm:w-auto"
          >
            {isLoading ? 'Сохраняю...' : 'Сохранить'}
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onCancel}
            disabled={isLoading}
            className="w-full sm:w-auto"
          >
            Отменить
          </Button>
        </div>
      </div>
    );
  }

  return (
    <TelegramPost 
      text={post.processed_text || ''} 
      type="processed" 
      post={post} 
      onMediaClick={() => {}} // Media click не нужен для обработанного поста
    />
  );
});

ImprovedTextSection.displayName = 'ImprovedTextSection';