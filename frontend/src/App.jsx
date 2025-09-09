import React from 'react'
import { createBrowserRouter, RouterProvider } from "react-router-dom"
import AppLayout from './components/layout/AppLayout'
import { ThemeProvider } from "@/components/theme-provider"
import { Dashboard, LandingPage, CreateBounty, Bounties, BountyDetail  } from './pages';

const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { path: '/', element: <LandingPage /> },
      { path: '/dashboard', element: <Dashboard /> },
      { path: '/bounties', element: <Bounties /> },
      { path: '/bounties/:id', element: <BountyDetail /> },
      { path: '/createBounty', element: <CreateBounty /> },
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
