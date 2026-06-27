import { Moon, Sun } from 'lucide-react';
import { useEffect } from 'react';
import { Button } from '@/shared/components/ui/button';
import { useTheme } from '@/shared/stores/theme';

export function ThemeToggle() {
  const { theme, toggle } = useTheme();

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  return (
    <Button
      variant="ghost"
      size="icon-md"
      onClick={toggle}
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
    </Button>
  );
}
