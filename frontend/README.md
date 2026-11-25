# Frontend

Frontend de la **Plataforma de Logística para Viajes Frecuentes**, construido con React + Vite + Tailwind CSS.

Para instrucciones completas de instalación y ejecución, ver el [README principal](../README.md).

## Levantar en modo desarrollo

Desde `frontend/`, con la API en ejecución y Node.js 22.13 o superior,
copiar `.env.example` a `.env` con `Copy-Item .env.example .env` en
PowerShell o `cp .env.example .env` en Bash. La URL predeterminada de la API
es `http://localhost:3000`.

```bash
npm ci
npm run dev
```

La app corre en `http://localhost:5173`.

## Scripts disponibles

* `npm run dev` — servidor de desarrollo con HMR.
* `npm run build` — build de producción.
* `npm run lint` — lint con ESLint.
* `npm run preview` — previsualiza el build.
