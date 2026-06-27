import { Link, useRouterState } from '@tanstack/react-router';
import { LayoutDashboard, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { registry } from '@/shared/core/plugin-registry';
import { LogoIcon } from '@/shared/components/logo';
import { Button } from '@/shared/components/ui/button';
import { cn } from '@/shared/lib/utils';

interface SidebarProps {
  open: boolean;
  collapsed: boolean;
  onClose: () => void;
}

export function Sidebar({ open, collapsed, onClose }: SidebarProps) {
  const { t } = useTranslation();
  const currentPath = useRouterState({ select: (s) => s.location.pathname });
  const navItems = registry.getNavItems();
  const isActive = (path: string) => currentPath === path || currentPath.startsWith(`${path}/`);
  const isDesktopCollapsed = collapsed;

  return (
    <>
      {open && <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={onClose} />}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex flex-col border-r bg-background transition-transform duration-200',
          'lg:relative lg:z-0 lg:translate-x-0',
          isDesktopCollapsed ? 'lg:w-16' : 'lg:w-60',
          open ? 'translate-x-0 w-60' : '-translate-x-full',
        )}
      >
        <div
          className={cn(
            'flex h-14 items-center border-b px-3',
            isDesktopCollapsed ? 'lg:justify-center' : 'lg:justify-start',
            'justify-between',
          )}
        >
          <Link to="/hub" className="flex items-center gap-2" onClick={onClose}>
            <LogoIcon className="h-7 w-7 shrink-0" />
            <span
              className={cn(
                'font-bold text-lg transition-opacity',
                isDesktopCollapsed && 'lg:hidden',
              )}
            >
              Muxlyn
            </span>
          </Link>
          <Button variant="ghost" size="icon-md" className="lg:hidden" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <nav className="flex-1 overflow-auto p-2">
          <div className="space-y-0.5">
            <Link
              to="/hub"
              className={cn(
                'flex items-center gap-3 rounded-md py-2 text-sm font-medium transition-colors hover:bg-accent',
                isDesktopCollapsed ? 'lg:justify-center lg:px-0' : 'px-3',
                isActive('/hub')
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
              onClick={onClose}
              title={isDesktopCollapsed ? t('nav.dashboard') : undefined}
            >
              <LayoutDashboard className="h-5 w-5 shrink-0" />
              <span className={cn(isDesktopCollapsed && 'lg:hidden')}>{t('nav.dashboard')}</span>
            </Link>

            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'flex items-center gap-3 rounded-md py-2 text-sm font-medium transition-colors hover:bg-accent',
                  isDesktopCollapsed ? 'lg:justify-center lg:px-0' : 'px-3',
                  isActive(item.path)
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
                onClick={onClose}
                title={isDesktopCollapsed ? t(item.label) : undefined}
              >
                {item.icon && <item.icon className="h-5 w-5 shrink-0" />}
                <span className={cn(isDesktopCollapsed && 'lg:hidden')}>{t(item.label)}</span>
              </Link>
            ))}
          </div>
        </nav>
      </aside>
    </>
  );
}
