import React, { useState, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Button, Badge, Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../../ui';
import { AlertTriangle, CheckCircle, Eye, Code, ChevronDown, ChevronUp } from 'lucide-react';
import { validateMarkdown, getMarkdownStats, MarkdownValidationError } from './markdownUtils';

interface MarkdownRendererProps {
  text: string;
  showValidator?: boolean;
  className?: string;
}

const ValidationMessage = ({ error }: { error: MarkdownValidationError }) => {
  const icon = error.severity === 'error' ? (
    <AlertTriangle className="h-4 w-4 text-red-500" />
  ) : (
    <AlertTriangle className="h-4 w-4 text-yellow-500" />
  );

  const bgColor = error.severity === 'error' 
    ? 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800'
    : 'bg-yellow-50 border-yellow-200 dark:bg-yellow-950/20 dark:border-yellow-800';

  return (
    <div className={`flex items-start gap-2 p-3 rounded-lg border ${bgColor}`}>
      {icon}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">
          Строка {error.line}, колонка {error.column}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {error.message}
        </p>
      </div>
    </div>
  );
};

export const MarkdownRenderer = ({ 
  text, 
  showValidator = true, 
  className = '' 
}: MarkdownRendererProps) => {
  const [activeTab, setActiveTab] = useState<'preview' | 'raw'>('preview');
  const [showValidation] = useState(false);

  const validation = useMemo(() => validateMarkdown(text), [text]);
  const stats = useMemo(() => getMarkdownStats(text), [text]);

  const hasIssues = validation.errors.length > 0 || validation.warnings.length > 0;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Заголовок с переключателями */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant={activeTab === 'preview' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('preview')}
            className="gap-2"
          >
            <Eye className="h-4 w-4" />
            Превью
          </Button>
          <Button
            variant={activeTab === 'raw' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('raw')}
            className="gap-2"
          >
            <Code className="h-4 w-4" />
            Исходный код
          </Button>
        </div>

        {showValidator && (
          <div className="flex items-center gap-2">
            {/* Статус валидации */}
            {validation.isValid ? (
              <Badge className="bg-green-100 text-green-800 border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-800">
                <CheckCircle className="h-3 w-3 mr-1" />
                Валидный
              </Badge>
            ) : (
              <Badge className="bg-red-100 text-red-800 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800">
                <AlertTriangle className="h-3 w-3 mr-1" />
                {validation.errors.length} ошибок
              </Badge>
            )}

            {validation.warnings.length > 0 && (
              <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-400 dark:border-yellow-800">
                <AlertTriangle className="h-3 w-3 mr-1" />
                {validation.warnings.length} предупреждений
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Контент */}
      <div className="border rounded-lg overflow-hidden">
        {activeTab === 'preview' ? (
          <div className="p-4 bg-background">
            {text ? (
              <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown 
                remarkPlugins={[remarkGfm]}
                components={{
                  // Кастомные компоненты для лучшего отображения
                  h1: ({ children }) => <h1 className="text-xl font-bold mb-4">{children}</h1>,
                  h2: ({ children }) => <h2 className="text-lg font-semibold mb-3">{children}</h2>,
                  h3: ({ children }) => <h3 className="text-base font-medium mb-2">{children}</h3>,
                  p: ({ children }) => <p className="mb-3 leading-relaxed">{children}</p>,
                  code: ({ children, className }) => {
                    const isInline = !className;
                    return isInline ? (
                      <code className="bg-muted px-1 py-0.5 rounded text-sm font-mono">
                        {children}
                      </code>
                    ) : (
                      <code className={className}>{children}</code>
                    );
                  },
                  pre: ({ children }) => (
                    <pre className="bg-muted p-4 rounded-lg overflow-x-auto mb-4">
                      {children}
                    </pre>
                  ),
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-4 border-primary pl-4 italic mb-4">
                      {children}
                    </blockquote>
                  ),
                  ul: ({ children }) => <ul className="list-disc pl-6 mb-4">{children}</ul>,
                  ol: ({ children }) => <ol className="list-decimal pl-6 mb-4">{children}</ol>,
                  li: ({ children }) => <li className="mb-1">{children}</li>,
                  a: ({ href, children }) => (
                    <a 
                      href={href} 
                      className="text-primary hover:underline" 
                      target="_blank" 
                      rel="noopener noreferrer"
                    >
                      {children}
                    </a>
                  )
                }}
              >
                {text}
              </ReactMarkdown>
            </div>
            ) : (
              <p className="text-muted-foreground italic text-center py-8">
                Нет текста для отображения
              </p>
            )}
          </div>
        ) : (
          <div className="p-4 bg-muted/30">
            <pre className="text-sm font-mono whitespace-pre-wrap break-words">
              {text || 'Нет текста'}
            </pre>
          </div>
        )}
      </div>

      {/* Статистика */}
      {showValidator && text && (
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-xs">
          <div className="bg-muted/30 p-2 rounded text-center">
            <div className="font-medium">{stats.characters}</div>
            <div className="text-muted-foreground">символов</div>
          </div>
          <div className="bg-muted/30 p-2 rounded text-center">
            <div className="font-medium">{stats.words}</div>
            <div className="text-muted-foreground">слов</div>
          </div>
          <div className="bg-muted/30 p-2 rounded text-center">
            <div className="font-medium">{stats.lines}</div>
            <div className="text-muted-foreground">строк</div>
          </div>
          <div className="bg-muted/30 p-2 rounded text-center">
            <div className="font-medium">{stats.headings}</div>
            <div className="text-muted-foreground">заголовков</div>
          </div>
          <div className="bg-muted/30 p-2 rounded text-center">
            <div className="font-medium">{stats.links}</div>
            <div className="text-muted-foreground">ссылок</div>
          </div>
          <div className="bg-muted/30 p-2 rounded text-center">
            <div className="font-medium">{stats.images}</div>
            <div className="text-muted-foreground">изображений</div>
          </div>
        </div>
      )}

      {/* Валидация */}
      {showValidator && hasIssues && (
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="validation">
            <AccordionTrigger className="text-sm">
              <div className="flex items-center gap-2">
                Проблемы валидации
                <Badge variant="secondary">
                  {validation.errors.length + validation.warnings.length}
                </Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-3">
              {validation.errors.map((error, index) => (
                <ValidationMessage key={`error-${index}`} error={error} />
              ))}
              {validation.warnings.map((warning, index) => (
                <ValidationMessage key={`warning-${index}`} error={warning} />
              ))}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}
    </div>
  );
};

export default MarkdownRenderer;