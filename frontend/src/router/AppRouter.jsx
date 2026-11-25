import { Navigate, Route, Routes } from 'react-router-dom'

import RutaProtegida from '../auth/RutaProtegida.jsx'
import Layout from '../components/layout/Layout.jsx'
import LoginPage from '../features/auth/LoginPage.jsx'
import RegistroPage from '../features/auth/RegistroPage.jsx'
import PublicarViajePage from '../features/publicacion/PublicarViajePage.jsx'
import VehiculosPage from '../features/vehiculos/VehiculosPage.jsx'
import ViajeDetallePage from '../features/viajes/ViajeDetallePage.jsx'
import ViajesPage from '../features/viajes/ViajesPage.jsx'
import NotFoundPage from '../pages/NotFoundPage.jsx'

export default function AppRouter() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Navigate to="/viajes" replace />} />
        <Route path="/viajes" element={<ViajesPage />} />
        <Route path="/viajes/:id" element={<ViajeDetallePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/registro" element={<RegistroPage />} />

        <Route element={<RutaProtegida />}>
          <Route path="/viajes/nuevo" element={<PublicarViajePage />} />
          <Route path="/vehiculos" element={<VehiculosPage />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
