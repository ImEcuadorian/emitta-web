# Emitta Web
Web estática de Emitta, desarrollada por NEXORF. Astro + TypeScript + Starlight + Scalar.

```powershell
npm ci
npm run check
npm run build
npm run dev
```

Local: http://localhost:4321. Producción estática: `dist/`, compatible con Nginx. No despliegue configurado.

La copia pública del contrato está en `public/openapi/emitta-v1.yaml`. Base: `feature/certificate-signing`, commit `0f0a7c7d31e119fb5a1f4fd938211d0d890ce405`. Incluye dos operaciones GET añadidas en la rama local `codex/ride-consolidation`, aún sin commit ni publicación. No depende del backend encendido. Scalar tiene solicitudes interactivas deshabilitadas.

No se configura un dominio oficial ni canonical hasta confirmarlo. Ningún ejemplo contiene datos del piloto. No hay página de webhooks porque no existen.
