import React from 'react';
import { Card, CardContent } from '../ui';
import { FileText as FileIcon } from 'lucide-react';

interface EmptyStateProps {
  message?: string;
}

export function EmptyState({ message }: EmptyStateProps): JSX.Element {
  return (
    <Card className="border-dashed border-2 border-muted-foreground/20 bg-muted/5">
      <CardContent className="flex flex-col items-center justify-center py-8 sm:py-12 px-4 sm:px-6 text-center">
        <div className="mb-3 sm:mb-4 p-2 sm:p-3 bg-muted/50 rounded-full">
          <FileIcon className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground/60" />
        </div>
        <h3 className="text-base sm:text-lg font-semibold text-foreground mb-1 sm:mb-2">
          Постов не найдено
        </h3>
        <p className="text-xs sm:text-sm text-muted-foreground max-w-md leading-relaxed">
          {message || 'В данный момент нет постов для отображения'}
        </p>
      </CardContent>
    </Card>
  );
}