import { Setting } from '../services/api';
import {
  Bot,
  Key,
  Lock,
  Brain,
  Zap,
  Play,
  Edit,
  Settings as SettingsIcon,
} from 'lucide-react';

export const getSettingDescription = (key: string): string => {
  const descriptions: Record<string, string> = {
    'telegram_bot_token': 'Токен Telegram бота для взаимодействия с API',
    'telegram_api_id': 'API ID приложения Telegram (получить на my.telegram.org)',
    'telegram_api_hash': 'API Hash приложения Telegram (получить на my.telegram.org)',
    'openrouter_api_key': 'API ключ для сервиса OpenRouter',
    'openrouter_model': 'Модель OpenRouter для обработки текстов',
    'default_check_interval': 'Интервал проверки каналов по умолчанию (секунды)',
    'max_posts_per_check': 'Максимальное количество постов за одну проверку',
    'auto_publish_enabled': 'Автоматическая публикация одобренных постов',
    'rewrite_prompt': 'Промпт для переписывания текстов. Используйте {original_text} для вставки исходного текста',
    'improve_prompt': 'Промпт для улучшения текстов. Используйте {original_text} и {user_prompt} для вставки исходного текста и пользовательских инструкций',
  };
  return descriptions[key] || 'Настройка системы';
};

export const isSecretSetting = (key: string): boolean => {
  return key.includes('token') || key.includes('key') || key.includes('password');
};

export const isBooleanSetting = (key: string): boolean => {
  return key.includes('enabled') || key.includes('active');
};

export const isNumberSetting = (key: string): boolean => {
  return key.includes('interval') || key.includes('max_') || key.includes('limit');
};

export const isPromptSetting = (key: string): boolean => {
  return key.includes('prompt');
};

export const getSettingIcon = (key: string) => {
  if (key.includes('bot_token')) return Bot;
  if (key.includes('api_id') || key.includes('api_hash')) return Key;
  if (key.includes('openrouter_api_key')) return Lock;
  if (key.includes('openrouter_model')) return Brain;
  if (key.includes('interval')) return Zap;
  if (key.includes('auto_publish')) return Play;
  if (key.includes('prompt')) return Edit;
  return SettingsIcon;
};

export const formatSettingName = (key: string): string => {
  return key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

export const categorizeSettings = (settings: Setting[] | undefined) => {
  if (!settings) {
    return {
      telegramSettings: [],
      openrouterSettings: [],
      promptSettings: [],
      systemSettings: [],
    };
  }

  return {
    telegramSettings: settings.filter(s => s.key.includes('telegram') && s.key !== 'telegram_session_string'),
    openrouterSettings: settings.filter(s => s.key.includes('openrouter')),
    promptSettings: settings.filter(s => s.key.includes('prompt')),
    systemSettings: settings.filter(s => 
      !s.key.includes('telegram') && 
      !s.key.includes('openrouter') && 
      !s.key.includes('prompt')
    ),
  };
};