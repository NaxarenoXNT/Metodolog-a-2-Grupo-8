import { Navigate, Route, Routes } from 'react-router-dom'

import RutaProtegida from '../auth/RutaProtegida.jsx'
import Layout from '../components/layout/Layout.jsx'
import LoginPage from '../features/auth/LoginPage.jsx'
import RegistroPage from '../features/auth/RegistroPage.jsx'
import ViajesPage from '../features/viajes/ViajesPage.jsx'
import NotFoundPage from '../pages/NotFoundPage.jsx'
import PlaceholderPage from '../pages/PlaceholderPage.jsx'

export default function AppRouter() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Navigate to="/viajes" replace />} />
        <Route path="/viajes" element={<ViajesPage />} />
        <Route
          path="/viajes/:id"
          element={
            <PlaceholderPage
              eyebrow="Detalle del viaje"
              title="Información de la ruta"
              description="Este punto de integración queda preparado para el detalle y la reserva de pasajeros."
            />
          }
        />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/registro" element={<RegistroPage />} />

        <Route element={<RutaProtegida />}>
          <Route
            path="/viajes/nuevo"
            element={
              <PlaceholderPage
                eyebrow="Publicar un viaje"
                title="Compartí tu próxima ruta"
                description="La ruta ya exige una sesión válida y está lista para recibir el formulario de publicación."
                action={{ to: '/vehiculos', label: 'Revisar mis vehículos' }}
              />
            }
          />
          <Route
            path="/vehiculos"
            element={
              <PlaceholderPage
                eyebrow="Mis vehículos"
                title="Gestioná con qué vehículo viajás"
                description="La ruta ya exige una sesión válida y está preparada para integrar altas y listados."
                action={{ to: '/viajes/nuevo', label: 'Publicar un viaje' }}
              />
            }
          />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
