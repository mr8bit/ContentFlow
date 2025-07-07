import React from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { Loader2, Play, Square, Activity, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { useWorker } from '../../hooks/useWorker';
import { useTelegramSession } from '../../hooks/useTelegramSession';

export const WorkerManager: React.FC = () => {
  const {
    error: workerError,
    success: workerSuccess,
    workerStatus,
    getWorkerStatusMutation,
    startWorkerMutation,
    stopWorkerMutation,
  } = useWorker();

  const {
    error: sessionError,
    success: sessionSuccess,
    sessionTestResult,
    testSessionMutation,
  } = useTelegramSession();

  const getStatusBadge = () => {
    if (!workerStatus) {
      return <Badge variant="secondary">Неизвестно</Badge>;
    }

    switch (workerStatus.status) {
      case 'running':
        return <Badge className="bg-green-500/10 text-green-700 border-green-500/20 dark:text-green-400">Запущен</Badge>;
      case 'stopped':
        return <Badge variant="destructive">Остановлен</Badge>;
      case 'error':
        return <Badge variant="destructive">Ошибка</Badge>;
      default:
        return <Badge variant="secondary">{workerStatus.status}</Badge>;
    }
  };

  const renderWorkerInfo = () => {
    if (!workerStatus) return null;

    return (
      <div className="space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Статус:</span>
          {getStatusBadge()}
        </div>
        
        {workerStatus.should_run !== undefined && (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Должен работать:</span>
            <span>{workerStatus.should_run ? 'Да' : 'Нет'}</span>
          </div>
        )}
        
        {workerStatus.is_running !== undefined && (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Активен:</span>
            <span>{workerStatus.is_running ? 'Да' : 'Нет'}</span>
          </div>
        )}
        
        {workerStatus.stopped_at && (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Остановлен:</span>
            <span>{new Date(workerStatus.stopped_at).toLocaleString()}</span>
          </div>
        )}
        
        {workerStatus.last_heartbeat && (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Последний сигнал:</span>
            <span>{new Date(workerStatus.last_heartbeat).toLocaleString()}</span>
          </div>
        )}
        
        {workerStatus.started_at && (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Запущен:</span>
            <span>{new Date(workerStatus.started_at).toLocaleString()}</span>
          </div>
        )}
      </div>
    );
  };

  const renderSessionTestResult = () => {
    if (!sessionTestResult) return null;

    return (
      <Alert className={sessionTestResult.status === 'success' ? 'border-green-500/20' : 'border-destructive/20'}>
        <div className="flex items-center space-x-2">
          {sessionTestResult.status === 'success' ? (
            <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
          ) : (
            <XCircle className="h-4 w-4 text-destructive" />
          )}
          <AlertDescription>
            <div className="space-y-1">
              <div>Статус сессии: {sessionTestResult.status}</div>
              {sessionTestResult.message && (
                <div>Сообщение: {sessionTestResult.message}</div>
              )}
              {sessionTestResult.user_info && (
                <div>
                  Пользователь: {sessionTestResult.user_info.first_name} {sessionTestResult.user_info.last_name}
                  {sessionTestResult.user_info.username && ` (@${sessionTestResult.user_info.username})`}
                </div>
              )}
            </div>
          </AlertDescription>
        </div>
      </Alert>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Activity className="h-5 w-5" />
          <span>Управление Worker</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {workerError && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>{workerError}</AlertDescription>
          </Alert>
        )}
        
        {workerSuccess && (
          <Alert className="border-green-500/20">
            <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
            <AlertDescription>{workerSuccess}</AlertDescription>
          </Alert>
        )}

        {sessionError && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>{sessionError}</AlertDescription>
          </Alert>
        )}
        
        {sessionSuccess && (
          <Alert className="border-green-500/20">
          <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
            <AlertDescription>{sessionSuccess}</AlertDescription>
          </Alert>
        )}

        {renderWorkerInfo()}

        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => getWorkerStatusMutation.mutate()}
            disabled={getWorkerStatusMutation.isLoading}
            variant="outline"
            size="sm"
          >
            {getWorkerStatusMutation.isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Обновить статус
          </Button>

          {workerStatus?.status === 'running' ? (
            <Button
              onClick={() => stopWorkerMutation.mutate()}
              disabled={stopWorkerMutation.isLoading}
              variant="destructive"
              size="sm"
            >
              {stopWorkerMutation.isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Square className="h-4 w-4 mr-2" />
              )}
              Остановить
            </Button>
          ) : (
            <Button
              onClick={() => startWorkerMutation.mutate()}
              disabled={startWorkerMutation.isLoading}
              variant="default"
              size="sm"
            >
              {startWorkerMutation.isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              Запустить
            </Button>
          )}

          <Button
            onClick={() => testSessionMutation.mutate()}
            disabled={testSessionMutation.isLoading}
            variant="outline"
            size="sm"
          >
            {testSessionMutation.isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <CheckCircle className="h-4 w-4 mr-2" />
            )}
            Тест сессии
          </Button>
        </div>

        {renderSessionTestResult()}
      </CardContent>
    </Card>
  );
};