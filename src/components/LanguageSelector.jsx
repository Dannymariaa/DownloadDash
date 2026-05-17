import React from 'react';
import { Check, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useI18n } from '@/lib/i18n';

export default function LanguageSelector() {
  const { language, setLanguage, languages, t } = useI18n();
  const currentLanguage = languages.find((item) => item.code === language) || languages[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          aria-label={t('language.change')}
          title={t('language.change')}
          className="flex items-center gap-2 text-purple-400 hover:text-purple-300 hover:bg-purple-500/20 transition-all duration-300"
        >
          <Globe className="h-4 w-4" />
          <span className="hidden sm:inline text-sm">{currentLanguage.nativeName}</span>
          <span className="sm:hidden text-sm font-semibold uppercase">{currentLanguage.code}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="bg-gray-900 border-purple-500/30 max-h-80 overflow-y-auto"
        align="end"
      >
        <DropdownMenuLabel className="text-gray-400">{t('language.change')}</DropdownMenuLabel>
        {languages.map((item) => {
          const isSelected = language === item.code;
          return (
            <DropdownMenuItem
              key={item.code}
              onClick={() => setLanguage(item.code)}
              className={`flex items-center justify-between gap-3 cursor-pointer hover:bg-purple-500/20 ${
                isSelected ? 'bg-purple-500/30 text-purple-300' : 'text-gray-300'
              }`}
            >
              <span className="flex min-w-0 flex-col">
                <span className="truncate">{item.nativeName}</span>
                <span className="text-xs text-gray-500">{item.name}</span>
              </span>
              {isSelected && <Check className="h-4 w-4 flex-shrink-0" aria-label={t('language.selected')} />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
