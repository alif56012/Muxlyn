import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
import { ChevronDown } from 'lucide-react';

const LOCALES = [
  { code: 'en', label: 'EN', flag: '🇺🇸' },
  { code: 'th', label: 'TH', flag: '🇹🇭' },
] as const;

export function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const currentLocale = LOCALES.find((l) => l.code === i18n.language) ?? LOCALES[0];

  const handleChange = (code: string) => {
    i18n.changeLanguage(code);
    localStorage.setItem('locale', code);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1 px-2">
          <span>{currentLocale.flag}</span>
          <span className="text-xs font-medium">{currentLocale.label}</span>
          <ChevronDown size={12} className="opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[80px]">
        {LOCALES.map((locale) => (
          <DropdownMenuItem
            key={locale.code}
            onClick={() => handleChange(locale.code)}
            disabled={locale.code === i18n.language}
            className="gap-2"
          >
            <span>{locale.flag}</span>
            <span>{locale.label}</span>
            {locale.code === i18n.language && (
              <span className="ml-auto text-xs text-primary">✓</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
