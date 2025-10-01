import { useTheme } from '@/components/theme-provider';
import { ThemeToggleButton, useThemeTransition } from '@/components/ui/ThemeToggleButton';

export default function ModeToggle() {
  const { theme, setTheme } = useTheme();
  const { startTransition } = useThemeTransition();

  const toggleTheme = () => {
    let currentTheme = theme;
    if (theme === 'system') {
      currentTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    startTransition(() => {
      setTheme(currentTheme === 'dark' ? 'light' : 'dark');
    });
  };

  const currentTheme = theme === 'system' ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : theme;

  return (
    <ThemeToggleButton
      theme={currentTheme}
      onClick={toggleTheme}
      variant="circle"
      start="top-right"
      className="w-9 h-9"
      showLabel={false}
    />
  );
}
