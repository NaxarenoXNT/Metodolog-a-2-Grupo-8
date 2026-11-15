import { Outlet } from 'react-router-dom'

import Navbar from './Navbar.jsx'

export default function Layout() {
  return (
    <div className="app-shell">
      <Navbar />
      <main className="main-content">
        <Outlet />
      </main>
      <footer className="site-footer">
        <div className="container">
          <span>Viajes Grupo 8</span>
          <span>Compartimos ruta, gastos y kilómetros.</span>
        </div>
      </footer>
    </div>
  )
}
