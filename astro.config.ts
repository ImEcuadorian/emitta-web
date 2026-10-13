import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import { scalarStarlight } from '@scalar/starlight';
export default defineConfig({
 site: 'https://emitta.nexorf.dev',
 cacheDir: './.astro-cache/', output: 'static', trailingSlash: 'always',
 integrations: [starlight({
  title: 'Emitta', defaultLocale: 'es', locales: { root: { label: 'Español', lang: 'es' } },
  favicon: '/favicon.svg', customCss: ['./src/styles/docs.css'],
  social: [{ icon: 'github', label: 'Backend en GitHub', href: 'https://github.com/ImEcuadorian/emitta' }],
  sidebar: [{ label: 'Documentación', items: [
   { label: 'Introducción', slug: 'docs' },
   { label: 'Primeros pasos', slug: 'docs/quickstart' },
   { label: 'Autenticación', slug: 'docs/authentication' },
   { label: 'Facturas', slug: 'docs/invoices' },
   { label: 'Documentos y descargas', slug: 'docs/documents' },
  ] }, { label: 'Volver a Emitta', link: '/' }],
  plugins: [scalarStarlight({ pathname: '/docs/api-reference', label: 'Referencia API',
   configuration: { url: '/openapi/emitta-integration-v1.yaml', theme: 'purple', darkMode: true,
    hideClientButton: true, hideTestRequestButton: true, telemetry: false, showDeveloperTools: 'never', agent: { disabled: true }, mcp: { disabled: true } } })],
 })],
});
