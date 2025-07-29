import React from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { Loader2, Play, Square, Activity, CheckCircle, XCircle, RefreshCw, RotateCcw } from 'lucide-react';
import { useScrapper, usePublisher, useLLMWorker } from '../../hooks/useServices';
import { ServiceStatus } from '../../services/api';

interface ServiceCardProps {
  title: string;
  icon: React.ReactNode;
  status: ServiceStatus | null;
  error: string;
  success: string;
  isLoading: {
    status: boolean;
    start: boolean;
    stop: boolean;
    restart: boolean;
  };
  onRefresh: () => void;
  onStart: () => void;
  onStop: () => void;
  onRestart: () => void;
}

const ServiceCard: React.FC<ServiceCardProps> = ({
  title,
  icon,
  status,
  error,
  success,
  isLoading,
  onRefresh,
  onStart,
  onStop,
  onRestart,
}) => {
  const getStatusBadge = () => {
    if (!status) {
      return <Badge variant="secondary">Неизвестно</Badge>;
    }

    if (status.is_running && status.should_run) {
      return <Badge className="bg-green-500/10 text-green-700 border-green-500/20 dark:text-green-400">Запущен</Badge>;
    } else if (!status.is_running && !status.should_run) {
      return <Badge variant="destructive">Остановлен</Badge>;
    } else if (!status.is_running && status.should_run) {
      return <Badge className="bg-yellow-500/10 text-yellow-700 border-yellow-500/20 dark:text-yellow-400">Запускается</Badge>;
    } else {
      return <Badge className="bg-orange-500/10 text-orange-700 border-orange-500/20 dark:text-orange-400">Останавливается</Badge>;
    }
  };

  const renderServiceInfo = () => {
    if (!status) return null;

    return (
      <div className="space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Статус:</span>
          {getStatusBadge()}
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Должен работать:</span>
          <span>{status.should_run ? 'Да' : 'Нет'}</span>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Активен:</span>
          <span>{status.is_running ? 'Да' : 'Нет'}</span>
        </div>
        
        {status.last_heartbeat && (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Последний сигнал:</span>
            <span>{new Date(status.last_heartbeat).toLocaleString()}</span>
          </div>
        )}
        
        {status.started_at && (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Запущен:</span>
            <span>{new Date(status.started_at).toLocaleString()}</span>
          </div>
        )}
        
        {status.stopped_at && (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Остановлен:</span>
            <span>{new Date(status.stopped_at).toLocaleString()}</span>
          </div>
        )}
      </div>
    );
  };

  const isRunning = status?.is_running && status?.should_run;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          {icon}
          <span>{title}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {success && (
          <Alert className="border-green-500/20">
            <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        {renderServiceInfo()}

        <div className="flex flex-wrap gap-2">
          <Button
            onClick={onRefresh}
            disabled={isLoading.status}
            variant="outline"
            size="sm"
          >
            {isLoading.status ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Обновить
          </Button>

          {isRunning ? (
            <Button
              onClick={onStop}
              disabled={isLoading.stop}
              variant="destructive"
              size="sm"
            >
              {isLoading.stop ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Square className="h-4 w-4 mr-2" />
              )}
              Остановить
            </Button>
          ) : (
            <Button
              onClick={onStart}
              disabled={isLoading.start}
              variant="default"
              size="sm"
            >
              {isLoading.start ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              Запустить
            </Button>
          )}

          <Button
            onClick={onRestart}
            disabled={isLoading.restart}
            variant="outline"
            size="sm"
          >
            {isLoading.restart ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <RotateCcw className="h-4 w-4 mr-2" />
            )}
            Перезапустить
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export const ServiceManager: React.FC = () => {
  const {
    error: scrapperError,
    success: scrapperSuccess,
    scrapperStatus,
    getScrapperStatusMutation,
    startScrapperMutation,
    stopScrapperMutation,
    restartScrapperMutation,
  } = useScrapper();

  const {
    error: publisherError,
    success: publisherSuccess,
    publisherStatus,
    getPublisherStatusMutation,
    startPublisherMutation,
    stopPublisherMutation,
    restartPublisherMutation,
  } = usePublisher();

  const {
    error: llmWorkerError,
    success: llmWorkerSuccess,
    llmWorkerStatus,
    getLLMWorkerStatusMutation,
    startLLMWorkerMutation,
    stopLLMWorkerMutation,
    restartLLMWorkerMutation,
  } = useLLMWorker();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        <ServiceCard
          title="Scrapper"
          icon={<Activity className="h-5 w-5" />}
          status={scrapperStatus}
          error={scrapperError}
          success={scrapperSuccess}
          isLoading={{
            status: getScrapperStatusMutation.isLoading,
            start: startScrapperMutation.isLoading,
            stop: stopScrapperMutation.isLoading,
            restart: restartScrapperMutation.isLoading,
          }}
          onRefresh={() => getScrapperStatusMutation.mutate()}
          onStart={() => startScrapperMutation.mutate()}
          onStop={() => stopScrapperMutation.mutate()}
          onRestart={() => restartScrapperMutation.mutate()}
        />

        <ServiceCard
          title="Publisher"
          icon={<Activity className="h-5 w-5" />}
          status={publisherStatus}
          error={publisherError}
          success={publisherSuccess}
          isLoading={{
            status: getPublisherStatusMutation.isLoading,
            start: startPublisherMutation.isLoading,
            stop: stopPublisherMutation.isLoading,
            restart: restartPublisherMutation.isLoading,
          }}
          onRefresh={() => getPublisherStatusMutation.mutate()}
          onStart={() => startPublisherMutation.mutate()}
          onStop={() => stopPublisherMutation.mutate()}
          onRestart={() => restartPublisherMutation.mutate()}
        />

        <ServiceCard
          title="LLM Worker"
          icon={<Activity className="h-5 w-5" />}
          status={llmWorkerStatus}
          error={llmWorkerError}
          success={llmWorkerSuccess}
          isLoading={{
            status: getLLMWorkerStatusMutation.isLoading,
            start: startLLMWorkerMutation.isLoading,
            stop: stopLLMWorkerMutation.isLoading,
            restart: restartLLMWorkerMutation.isLoading,
          }}
          onRefresh={() => getLLMWorkerStatusMutation.mutate()}
          onStart={() => startLLMWorkerMutation.mutate()}
          onStop={() => stopLLMWorkerMutation.mutate()}
          onRestart={() => restartLLMWorkerMutation.mutate()}
        />
      </div>
    </div>
  );
};