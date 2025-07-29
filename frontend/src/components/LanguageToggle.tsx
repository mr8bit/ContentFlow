import React from 'react';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Button
} from './ui';
import { cn } from '../lib/utils';

const languages = [
  { code: 'ru', name: 'Русский', flag: '🇷🇺' },
  { code: 'en', name: 'English', flag: '🇺🇸' }
];

export function LanguageToggle() {
  const { i18n, t } = useTranslation();

  const currentLanguage = languages.find(lang => lang.code === i18n.language) || languages[0];

  const changeLanguage = (languageCode: string) => {
    i18n.changeLanguage(languageCode);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm"
          className="gap-2 px-2 sm:px-3"
          title={t('language.switchLanguage')}
        >
          <Globe className="h-4 w-4" />
          <span className="hidden sm:inline text-sm">
            {currentLanguage.flag} {currentLanguage.name}
          </span>
          <span className="sm:hidden text-sm">
            {currentLanguage.flag}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[150px]">
        {languages.map((language) => (
          <DropdownMenuItem
            key={language.code}
            onClick={() => changeLanguage(language.code)}
            className={cn(
              "flex items-center gap-2 cursor-pointer",
              i18n.language === language.code && "bg-accent"
            )}
          >
            <span className="text-base">{language.flag}</span>
            <span className="flex-1">{language.name}</span>
            {i18n.language === language.code && (
              <div className="w-2 h-2 bg-primary rounded-full" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}