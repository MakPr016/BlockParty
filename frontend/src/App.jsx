import React from 'react'
import { createBrowserRouter, RouterProvider } from "react-router-dom"
import AppLayout from './components/layout/AppLayout'
import { ThemeProvider } from "@/components/theme-provider"
import { Dashboard, LandingPage, CreateWebhook } from './pages';

const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { path: '/', element: <LandingPage /> },
      { path: '/dashboard', element: <Dashboard /> },
      { path: '/createWebhook', element: <CreateWebhook /> },
    ]
  }
])


const App = () => {
  return (
    <ThemeProvider defaultTheme='dark' storageKey="vite-ui-theme" >
      <RouterProvider router={router} />
    </ThemeProvider>
  )
}

export default App
