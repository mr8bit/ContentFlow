// Простая валидация markdown без внешних зависимостей

export interface MarkdownValidationError {
  line: number;
  column: number;
  message: string;
  severity: 'error' | 'warning';
}

export interface MarkdownValidationResult {
  isValid: boolean;
  errors: MarkdownValidationError[];
  warnings: MarkdownValidationError[];
}

/**
 * Валидирует markdown текст и возвращает ошибки и предупреждения
 */
export function validateMarkdown(text: string): MarkdownValidationResult {
  const errors: MarkdownValidationError[] = [];
  const warnings: MarkdownValidationError[] = [];

  if (!text || text.trim() === '') {
    return { isValid: true, errors, warnings };
  }

  const lines = text.split('\n');

  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    
    // Проверка на незакрытые markdown элементы
    const boldMatches = (line.match(/\*\*/g) || []).length;
    const italicMatches = (line.match(/(?<!\*)\*(?!\*)/g) || []).length;
    const codeMatches = (line.match(/`/g) || []).length;
    
    if (boldMatches % 2 !== 0) {
      warnings.push({
        line: lineNumber,
        column: line.lastIndexOf('**') + 1,
        message: 'Незакрытый жирный текст (**)',
        severity: 'warning'
      });
    }
    
    if (italicMatches % 2 !== 0) {
      warnings.push({
        line: lineNumber,
        column: line.lastIndexOf('*') + 1,
        message: 'Незакрытый курсив (*)',
        severity: 'warning'
      });
    }
    
    if (codeMatches % 2 !== 0) {
      warnings.push({
        line: lineNumber,
        column: line.lastIndexOf('`') + 1,
        message: 'Незакрытый код (`)',
        severity: 'warning'
      });
    }

    // Проверка на неправильные ссылки
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    let linkMatch;
    while ((linkMatch = linkRegex.exec(line)) !== null) {
      const url = linkMatch[2];
      if (!isValidUrl(url)) {
        errors.push({
          line: lineNumber,
          column: linkMatch.index + 1,
          message: `Неверный URL: ${url}`,
          severity: 'error'
        });
      }
    }

    // Проверка на неправильные изображения
    const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
    let imageMatch;
    while ((imageMatch = imageRegex.exec(line)) !== null) {
      const url = imageMatch[2];
      if (!isValidUrl(url)) {
        errors.push({
          line: lineNumber,
          column: imageMatch.index + 1,
          message: `Неверный URL изображения: ${url}`,
          severity: 'error'
        });
      }
    }

    // Проверка на слишком длинные строки (предупреждение)
    if (line.length > 120) {
      warnings.push({
        line: lineNumber,
        column: 121,
        message: 'Строка слишком длинная (>120 символов)',
        severity: 'warning'
      });
    }
  });

  // Проверка на базовые ошибки структуры
  const unclosedCodeBlocks = (text.match(/```/g) || []).length % 2;
  if (unclosedCodeBlocks !== 0) {
    errors.push({
      line: text.split('\n').length,
      column: 1,
      message: 'Незакрытый блок кода (```)',
      severity: 'error'
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Проверяет, является ли строка валидным URL
 */
function isValidUrl(string: string): boolean {
  try {
    new URL(string);
    return true;
  } catch {
    // Проверяем относительные пути
    return /^(\/|\.\/|\.\.\/|[a-zA-Z0-9])/i.test(string);
  }
}

/**
 * Получает статистику markdown документа
 */
export function getMarkdownStats(text: string) {
  if (!text) {
    return {
      characters: 0,
      words: 0,
      lines: 0,
      headings: 0,
      links: 0,
      images: 0
    };
  }

  const lines = text.split('\n');
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const headings = (text.match(/^#+\s/gm) || []).length;
  const links = (text.match(/\[([^\]]+)\]\(([^)]+)\)/g) || []).length;
  const images = (text.match(/!\[([^\]]*)\]\(([^)]+)\)/g) || []).length;

  return {
    characters: text.length,
    words,
    lines: lines.length,
    headings,
    links,
    images
  };
}