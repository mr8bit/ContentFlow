import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '../ui';
import { AlertCircle as AlertIcon } from 'lucide-react';

interface ErrorAlertProps {
  error: Error;
}

export function ErrorAlert({ error }: ErrorAlertProps): JSX.Element {
  return (
    <Alert variant="destructive" className="mb-6">
      <AlertIcon className="h-4 w-4" />
      <AlertTitle className="text-sm sm:text-base">Ошибка загрузки</AlertTitle>
      <AlertDescription className="text-xs sm:text-sm">
        {error.message || 'Произошла неизвестная ошибка при загрузке постов'}
      </AlertDescription>
    </Alert>
  );
}