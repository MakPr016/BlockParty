import { Outlet } from "react-router-dom"
import Header from "./Header"

const AppLayout = () => {
  return (
    <main>
        <Header />
        <Outlet />
    </main>
  )
}

export default AppLayout
