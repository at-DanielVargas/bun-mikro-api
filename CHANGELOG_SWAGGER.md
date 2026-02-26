# Changelog - Swagger

## [Unreleased]

### Added
- **Versión de Swagger UI Configurable**: Ahora puedes especificar qué versión de Swagger UI quieres usar mediante la opción `swaggerVersion` en `enableSwagger()`.
  - Por defecto usa la versión `5.17.14`
  - Soporta cualquier versión disponible en el CDN de Cloudflare
  - Ejemplo: `app.enableSwagger(config, { swaggerVersion: '5.10.0' })`
- **Soporte para Swagger UI 2.x (Legacy)**: Detección automática y soporte completo para versiones legacy de Swagger UI (2.x).
  - Detecta automáticamente si la versión es < 3.0.0
  - Carga todas las dependencias requeridas en orden: jQuery 1.8.0, Underscore 1.8.3, Backbone 1.1.2, Handlebars 4.0.5, Marked 0.3.2
  - Carga el archivo principal: `swagger-ui.min.js`
  - Usa `css/screen.css` para estilos
  - Usa la inicialización legacy: `new SwaggerUi()` con `.load()` dentro de `$(function() {...})`
  - Ejemplo: `app.enableSwagger(config, { swaggerVersion: '2.2.10' })`

### Changed
- Actualizado `SwaggerUI` para aceptar un parámetro opcional `swaggerVersion` en el constructor
- Actualizado `SwaggerOptions` interface para incluir el campo `swaggerVersion`
- Los enlaces CDN ahora usan la versión especificada dinámicamente
- Refactorizado `serveHtml()` para detectar versiones legacy y generar HTML apropiado
- Agregados métodos privados: `isLegacySwaggerVersion()`, `generateModernHtml()`, `generateLegacyHtml()`

### Documentation
- Actualizado `SWAGGER_DOCS.md` con ejemplos de uso de versiones personalizadas
- Agregada sección sobre soporte de versiones legacy (2.x)
- Actualizado `examples/swagger-with-auth.ts` con ejemplo de configuración de versión
- Agregada sección "Versión de Swagger UI" en la documentación de personalización
- Documentadas las diferencias entre versiones legacy y modernas

## Uso

```typescript
import { App } from 'mikro-api';

const app = new App();

app.enableSwagger(
  {
    title: 'Mi API',
    version: '1.0.0'
  },
  {
    // Especificar versión de Swagger UI
    swaggerVersion: '5.17.14'  // Opcional, por defecto: 5.17.14
  }
);

export default app;
```

## Versiones Soportadas

Puedes usar cualquier versión disponible en:
- [CDN de Cloudflare - Swagger UI](https://cdnjs.com/libraries/swagger-ui)

### Versiones Modernas (3.x - 5.x):
- `5.17.14` (por defecto)
- `5.10.0`
- `5.0.0`
- `4.18.3`
- `3.52.0`

### Versiones Legacy (2.x):
- `2.2.10`
- `2.2.8`
- `2.1.3`

El sistema detecta automáticamente si estás usando una versión legacy (< 3.0.0) y carga los archivos y la inicialización correcta.
