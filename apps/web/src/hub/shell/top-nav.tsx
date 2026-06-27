import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useRouterState } from '@tanstack/react-router';
import { Menu } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/shared/components/ui/sheet';
import { Logo, LogoIcon } from '@/shared/components/logo';
import { registry } from '@/hub/core/plugin-registry';

interface TopNavProps {
  accountSwitcher?: React.ReactNode;
  languageSwitcher?: React.ReactNode;
  userMenu?: React.ReactNode;
}

export function TopNav({ accountSwitcher, languageSwitcher, userMenu }: TopNavProps) {
  const { t } = useTranslation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const currentPath = useRouterState({ select: (s) => s.location.pathname });
  const navItems = registry.getNavItems();

  const isActive = (path: string) => currentPath === path || currentPath.startsWith(path + '/');

  const navLinks = (
    <nav className="flex flex-col gap-1 md:flex-row md:items-center md:gap-1">
      {navItems.map((item) => (
        <Link
          key={item.path}
          to={item.path}
          className={`rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground ${
            isActive(item.path)
              ? 'bg-accent text-accent-foreground'
              : 'text-muted-foreground'
          }`}
          onClick={() => setMobileOpen(false)}
        >
          {item.icon && <item.icon className="mr-2 inline h-4 w-4" />}
          {t(item.label)}
        </Link>
      ))}
    </nav>
  );

  return (
    <header className="sticky top-0 z-50 border-b bg-background">
      <div className="flex h-14 items-center gap-4 px-4">
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <LogoIcon className="h-6 w-6" />
          <Logo className="hidden h-5 md:block" />
        </Link>

        <div className="hidden md:flex md:flex-1 md:items-center md:gap-4">
          {navLinks}
        </div>

        <div className="flex flex-1 items-center justify-end gap-2 md:flex-none">
          {languageSwitcher}
          {accountSwitcher}
          {userMenu}

          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon-md">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 pt-12">
              {navLinks}
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
