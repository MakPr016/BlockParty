import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { ClerkProvider } from '@clerk/clerk-react'
import { dark, light } from '@clerk/themes'
import { ThemeProvider, useTheme } from './components/theme-provider'

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

if (!PUBLISHABLE_KEY) {
  throw new Error('Add your Clerk Publishable Key to the .env file')
}

// Background wrapper that uses theme context
function BackgroundWrapper({ children }) {
  const { theme } = useTheme()
  
  // Determine if dark mode is active
  const isDarkMode = theme === 'dark' || 
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)

  return (
    <div
      className="min-h-screen bg-cover bg-center transition-all duration-300"
      style={{
        backgroundImage: `url(${isDarkMode ? '/background.png' : '/background-light.jpg'})`
      }}
    >
      {children}
    </div>
  )
}

// Clerk theme wrapper
function ClerkThemeWrapper({ children }) {
  const { theme } = useTheme()
  
  const isDarkMode = theme === 'dark' || 
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)

  return (
    <ClerkProvider
      appearance={{
        baseTheme: isDarkMode ? dark : light,
      }}
      publishableKey={PUBLISHABLE_KEY}
      signInFallbackRedirectUrl="/dashboard"
      signUpFallbackRedirectUrl="/dashboard"
    >
      <BackgroundWrapper>
        {children}
      </BackgroundWrapper>
    </ClerkProvider>
  )
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <ClerkThemeWrapper>
        <App />
      </ClerkThemeWrapper>
    </ThemeProvider>
  </StrictMode>
)
