# Cómo subir SOFF 1.0.17 a GitHub, paso a paso

**Este archivo no debe publicarse directamente en `main` sin pruebas.** Se integraron P015 + P016 + P017 sobre la descarga GitHub versión 1.0.14.

## Pasos para el titular (GitHub Desktop, sin usar consola)
1. Instalar [GitHub Desktop](https://desktop.github.com/) e iniciar sesión con tu cuenta autorizada.
2. En la página de tu proyecto de GitHub pulsar **Code → Open with GitHub Desktop**. Si no aparece, en GitHub Desktop usar **File → Clone repository**, elegir el proyecto y confirmar.
3. En GitHub Desktop pulsar **Fetch origin** y después **Pull origin** si ofrece actualizaciones. Si alguien cambió la rama principal desde que se descargó el ZIP base, revisar la diferencia con tu amigo ANTES de copiar archivos.
4. En **Current Branch → New Branch**, crear `integracion-p015-p017` sobre la última rama principal.
5. Elegir **Repository → Show in Explorer**: se abre la carpeta del proyecto clonada (la que tiene `src`, `package.json` y la carpeta oculta `.git`).
6. Descomprimir **SOFF_GITHUB_CAMBIOS_P015_P017_v1.0.17.zip** en esa carpeta. Deben mezclarse las carpetas `src`, `qa`, `supabase`, etc.; aceptar reemplazar archivos **solo si tu amigo comprobó que no hay nuevas modificaciones incompatibles**. No borrar `.git`, no copiar `node_modules` ni subir el ZIP como archivo.
7. Volver a GitHub Desktop. Revisar el listado de cambios; deben ser aprox. **46 archivos nuevos/modificados** (sin `node_modules` ni `.env`). Si aparecen eliminaciones de archivos desconocidos o muchos archivos inesperados, detenerse.
8. Escribir como comentario del commit: `Integrar P015-P017 — SOFF 1.0.17`. Pulsar **Commit to integracion-p015-p017** y **Publish branch** (o **Push origin**).
9. En GitHub crear un **Pull Request** hacia `main`, **sin fusionarlo todavía**. Pasarle el enlace a tu amigo para que haga la revisión técnica.
10. Pedirle que verifique la configuración de Vercel: `Root Directory` debe ser raíz del repositorio, y la rama de prueba debe conectarse a un Supabase de **staging**, no a producción.
11. Tu amigo verifica y aplica, primero en Supabase staging, los scripts SQL faltantes y, especialmente, `20261016_p015_commercial_management.sql` y `20261016_p017_channel_terms.sql`. También debe revisar las migraciones P002/P004/P005/P006/P007/P011 que podrían estar pendientes. No ejecutar SQL sin respaldo.
12. Probar la vista previa de Vercel y una compra completa con usuarios de los cuatro tipos. Una vez que la aplicación compile y la base de producción esté preparada, fusionar el PR a `main` y verificar el despliegue de producción.

## Si no tenés permisos para publicar la rama
Necesitás autorización **Write** en el repositorio. Si solo podés descargar el código, pedile a tu amigo acceso de escritura o entregale el ZIP de cambios y este instructivo.

## Verificación técnica antes del merge
Desde la carpeta del proyecto con las dependencias instaladas:
- `npm ci`
- `npx tsc --noEmit`
- `node qa/test_p016_prices.cjs`
- `node qa/test_p017_terms.cjs`
- `npm run build`
- `python qa/soff_final_check.py`

Los chequeos de código realizados para esta integración pasaron TypeScript, pruebas P016/P017 e integridad. **El build completo no se certificó en el entorno de preparación, por falta del binario SWC de Linux.** Verificar en máquina del técnico/Vercel.

## Importante
- Nunca subir `.env.local`, claves privadas, comprobantes personales ni `node_modules`.
- Los precios y permisos definitivos dependen de migraciones SQL y políticas RLS aplicadas en Supabase.
- Se eliminó el fallback de cuenta bancaria en el código: configurar los datos bancarios verdaderos mediante variables de Vercel.
- GitHub guarda el código; Vercel lo publica; Supabase guarda los datos. **El commit en GitHub no ejecuta automáticamente las migraciones SQL**.
- Para nuevas versiones P018+, el actualizador recuperado utiliza `.soff/state.json` con rutas a nivel de raíz. Trabajar en ramas dedicadas para evitar perder cambios de colaboradores.
