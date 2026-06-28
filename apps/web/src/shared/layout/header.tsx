import { useNavigate } from '@tanstack/react-router';
import {
  ChevronDown,
  LogOut,
  Menu,
  Moon,
  PanelLeft,
  PanelLeftClose,
  Settings,
  Sun,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { authClient } from '@/shared/api/client';
import { AccountSwitcher } from '@/shared/components/account-switcher';
import { Button } from '@/shared/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
import { useTheme } from '@/shared/stores/theme';

const LOCALES = [
  { code: 'en', label: 'EN' },
  { code: 'th', label: 'TH' },
] as const;

interface HeaderProps {
  onMenuToggle: () => void;
  sidebarCollapsed: boolean;
  onSidebarToggle: () => void;
}

export function Header({ onMenuToggle, sidebarCollapsed, onSidebarToggle }: HeaderProps) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { data: session } = authClient.useSession();
  const { theme, toggle: toggleTheme } = useTheme();

  const handleSignOut = async () => {
    try {
      await authClient.signOut();
    } catch {
      /* ignore */
    }
    window.location.replace('/login');
  };

  const handleLangChange = (code: string) => {
    i18n.changeLanguage(code);
    localStorage.setItem('locale', code);
  };

  const currentLocale = LOCALES.find((l) => l.code === i18n.language) ?? LOCALES[0];

  return (
    <header className="flex h-14 items-center gap-3 border-b bg-background/80 backdrop-blur px-4">
      <Button variant="ghost" size="icon-md" className="lg:hidden" onClick={onMenuToggle}>
        <Menu className="h-5 w-5" />
      </Button>

      <Button
        variant="ghost"
        size="icon-md"
        className="hidden lg:flex"
        onClick={onSidebarToggle}
        title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {sidebarCollapsed ? (
          <PanelLeft className="h-5 w-5" />
        ) : (
          <PanelLeftClose className="h-5 w-5" />
        )}
      </Button>

      <AccountSwitcher />

      <div className="flex-1" />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-md" className="gap-1 px-2 w-auto">
            <span className="text-xs font-semibold">{currentLocale.label}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[80px]">
          {LOCALES.map((locale) => (
            <DropdownMenuItem
              key={locale.code}
              onClick={() => handleLangChange(locale.code)}
              disabled={locale.code === i18n.language}
              className="gap-2 text-xs font-medium justify-between"
            >
              <span>{locale.label}</span>
              {locale.code === i18n.language && (
                <span className="text-primary font-semibold">✓</span>
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Button variant="ghost" size="icon-md" onClick={toggleTheme} aria-label="Toggle theme">
        {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
      </Button>

      {session?.user && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-md" className="gap-1.5 px-2 w-auto">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                {session.user.name?.charAt(0)?.toUpperCase() ?? '?'}
              </div>
              <span className="hidden lg:inline text-sm max-w-[80px] truncate">
                {session.user.name}
              </span>
              <ChevronDown size={12} className="hidden lg:block opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium truncate">{session.user.name}</p>
              <p className="text-xs text-muted-foreground truncate">{session.user.email}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate({ to: '/settings' })} className="gap-2">
              <Settings size={15} />
              {t('nav.settings')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="gap-2 text-destructive">
              <LogOut size={15} />
              {t('hub.sign_out')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </header>
  );
}
