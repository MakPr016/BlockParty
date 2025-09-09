// src/components/mode-toggle.jsx
import { Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTheme } from '@/components/theme-provider'

export default function ModeToggle() {
  const { theme, setTheme } = useTheme()

  const toggleTheme = () => {
    // Get the current effective theme
    let currentTheme = theme
    if (theme === 'system') {
      currentTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    }
    
    // Toggle between light and dark only
    setTheme(currentTheme === 'dark' ? 'light' : 'dark')
  }

  const isDark = () => {
    if (theme === 'dark') return true
    if (theme === 'light') return false
    // System theme
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggleTheme}
      className="w-9 h-9 p-0 transition-all duration-200 hover:scale-105"
      title={isDark() ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark() ? (
        <Sun className="h-4 w-4 transition-all duration-300 rotate-0 scale-100" />
      ) : (
        <Moon className="h-4 w-4 transition-all duration-300 rotate-0 scale-100" />
      )}
      <span className="sr-only">
        {isDark() ? 'Switch to light mode' : 'Switch to dark mode'}
      </span>
    </Button>
  )
}
