# Soporte de Versiones de Swagger UI

Este documento explica cómo el sistema soporta diferentes versiones de Swagger UI, incluyendo versiones legacy (2.x) y modernas (3.x+).

## Detección Automática de Versiones

El sistema detecta automáticamente si estás usando una versión legacy o moderna basándose en el número de versión:

```typescript
private isLegacySwaggerVersion(version: string): boolean {
  const majorVersion = parseInt(version.split('.')[0], 10);
  return majorVersion < 3;
}
```

- **Versión Legacy**: < 3.0.0 (ejemplo: 2.2.10, 2.2.8, 2.1.3)
- **Versión Moderna**: >= 3.0.0 (ejemplo: 3.52.0, 4.18.3, 5.17.14)

## Diferencias entre Versiones

### Versiones Modernas (3.x - 5.x)

#### Archivos CDN
```html
<!-- CSS -->
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.17.14/swagger-ui.min.css">

<!-- JavaScript -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.17.14/swagger-ui-bundle.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.17.14/swagger-ui-standalone-preset.min.js"></script>
```

#### Inicialización
```javascript
SwaggerUIBundle({
  url: '/docs/json',
  dom_id: '#swagger-ui',
  presets: [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset],
  layout: 'StandaloneLayout',
  deepLinking: true,
  tryItOutEnabled: true,
  filter: true,
  persistAuthorization: true,
});
```

#### Características
- ✅ Módulos ES6
- ✅ SwaggerUIBundle como función principal
- ✅ Presets y layouts configurables
- ✅ Deep linking
- ✅ Persistencia de autorización
- ✅ Filtrado de operaciones
- ✅ Diseño moderno y responsive
- ✅ Sin dependencias externas

### Versiones Legacy (2.x)

**IMPORTANTE**: Las versiones 2.x requieren jQuery, Underscore, Backbone y Handlebars como dependencias externas. El sistema las carga automáticamente desde CDN en el orden correcto.

**Orden de carga crítico:**
1. jQuery 1.8.0 (base para todo)
2. jQuery BBQ 1.2.1 (plugin para manejo de query strings)
3. Handlebars 4.0.5 (motor de plantillas)
4. Lodash 4.17.21 (utilidades funcionales - reemplaza Underscore)
5. Backbone 1.1.2 (framework MVC - depende de jQuery y Lodash)
6. Swagger UI (archivo principal)
7. Highlight.js 9.1.0 (resaltado de sintaxis de código)
8. JSON Editor (jdorn/json-editor - editor de JSON compatible con Swagger UI 2.x)
9. Marked 0.3.2 (renderizador de Markdown)

#### Archivos CDN
```html
<!-- CSS -->
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/2.2.10/css/typography.css">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/2.2.10/css/reset.css">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/2.2.10/css/screen.css">

<!-- JavaScript Dependencies (must be loaded in this order) -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/jquery/1.8.0/jquery.min.js" type="text/javascript"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/jquery.ba-bbq/1.2.1/jquery.ba-bbq.min.js" type="text/javascript"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/handlebars.js/4.0.5/handlebars.min.js" type="text/javascript"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/lodash.js/4.17.21/lodash.min.js" type="text/javascript"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/backbone.js/1.1.2/backbone-min.js" type="text/javascript"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/2.2.10/swagger-ui.min.js" type="text/javascript"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/9.1.0/highlight.min.js" type="text/javascript"></script>
<script src="https://raw.githubusercontent.com/jdorn/json-editor/refs/heads/master/dist/jsoneditor.js" type="text/javascript"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/marked/0.3.2/marked.min.js" type="text/javascript"></script>
```

#### Inicialización
```javascript
$(function() {
  window.swaggerUi = new SwaggerUi({
    url: '/docs/json',
    dom_id: 'swagger-ui-container',
    supportedSubmitMethods: ['get', 'post', 'put', 'delete', 'patch'],
    onComplete: function(swaggerApi, swaggerUi) {
      console.log('Swagger UI loaded');
    },
    onFailure: function(data) {
      console.error('Unable to load Swagger UI', data);
    },
    docExpansion: 'list',
    apisSorter: 'alpha',
    showRequestHeaders: false
  });
  window.swaggerUi.load();
});
```

#### Características
- ✅ Constructor `new SwaggerUi()`
- ✅ Método `.load()` para inicializar
- ✅ Callbacks `onComplete` y `onFailure`
- ✅ DOM ID diferente: `swagger-ui-container`
- ✅ Dependencias (en orden): jQuery 1.8.0, jQuery BBQ 1.2.1, Handlebars 4.0.5, Lodash 4.17.21, Backbone 1.1.2, Highlight.js 9.1.0, Marked 0.3.2
- ✅ Inicialización con `$(function() {...})` (jQuery ready)
- ✅ Configuración de Highlight.js para resaltado de sintaxis
- ⚠️ Sin deep linking
- ⚠️ Sin persistencia de autorización
- ⚠️ Diseño más antiguo

## Uso en el Código

### Configuración Básica

```typescript
import { App } from 'mikro-api';

const app = new App();

// Versión moderna (por defecto)
app.enableSwagger(
  { title: 'Mi API', version: '1.0.0' },
  { swaggerVersion: '5.17.14' }
);

// Versión legacy
app.enableSwagger(
  { title: 'Mi API', version: '1.0.0' },
  { swaggerVersion: '2.2.10' }
);
```

### Implementación Interna

El método `serveHtml()` en `SwaggerUI.ts` detecta la versión y genera el HTML apropiado:

```typescript
private serveHtml(): Response {
  const isLegacyVersion = this.isLegacySwaggerVersion(this.swaggerVersion);
  
  const html = isLegacyVersion 
    ? this.generateLegacyHtml(title, version, jsonUrl)
    : this.generateModernHtml(title, version, jsonUrl);
  
  return new Response(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
```

## Versiones Recomendadas

### Para Proyectos Nuevos
Usa la versión más reciente estable:
```typescript
swaggerVersion: '5.17.14'  // Por defecto
```

### Para Compatibilidad con Navegadores Antiguos
Usa versiones 4.x:
```typescript
swaggerVersion: '4.18.3'
```

### Para Proyectos Legacy
Si necesitas mantener compatibilidad con código antiguo:
```typescript
swaggerVersion: '2.2.10'
```

## Tabla de Compatibilidad

| Versión | Navegadores | OpenAPI | Características |
|---------|-------------|---------|-----------------|
| 5.x | Modernos (ES6+) | 3.0, 3.1 | Todas las características modernas |
| 4.x | Modernos (ES6+) | 3.0 | Características modernas |
| 3.x | Modernos (ES5+) | 3.0 | Características básicas modernas |
| 2.x | Antiguos (ES5) | 2.0 | Características legacy |

## Verificar Versiones Disponibles

Puedes verificar todas las versiones disponibles en:
- [CDN de Cloudflare - Swagger UI](https://cdnjs.com/libraries/swagger-ui)

## Migración de Legacy a Moderna

Si estás migrando de una versión legacy a una moderna, simplemente cambia el número de versión:

```typescript
// Antes (legacy)
app.enableSwagger(
  { title: 'Mi API', version: '1.0.0' },
  { swaggerVersion: '2.2.10' }
);

// Después (moderna)
app.enableSwagger(
  { title: 'Mi API', version: '1.0.0' },
  { swaggerVersion: '5.17.14' }
);
```

El sistema se encarga automáticamente de:
- ✅ Cargar los archivos CDN correctos
- ✅ Usar la inicialización apropiada
- ✅ Aplicar los estilos correctos
- ✅ Configurar las opciones disponibles

## Solución de Problemas

### La versión legacy no carga

**Problema**: La página muestra errores en la consola como "Handlebars is not defined" o "SwaggerUi is not defined".

**Solución**: Verifica que:
1. La versión existe en el CDN: https://cdnjs.com/libraries/swagger-ui/2.2.10
2. Las dependencias se cargan en el orden correcto (CRÍTICO):
   - jQuery 1.8.0 (primero)
   - Underscore 1.8.3 (segundo)
   - Backbone 1.1.2 (tercero - depende de jQuery y Underscore)
   - Handlebars 4.0.5 (cuarto)
   - Marked 0.3.2 (quinto - renderizador de Markdown)
   - swagger-ui.min.js (sexto)
3. El DOM ID es `swagger-ui-container` (no `swagger-ui`)
4. Los scripts tienen el atributo `type="text/javascript"`
5. La inicialización usa `$(function() {...})` en lugar de `window.onload`

### La versión moderna no funciona

**Problema**: SwaggerUIBundle no está definido.

**Solución**: Verifica que:
1. La versión existe en el CDN
2. Los archivos `swagger-ui-bundle.min.js` y `swagger-ui-standalone-preset.min.js` se cargan
3. El DOM ID es `swagger-ui` (no `swagger-ui-container`)

### Errores de CORS

**Problema**: No se puede cargar el JSON de OpenAPI.

**Solución**: Asegúrate de que CORS esté habilitado:
```typescript
app.enableCORS({
  origin: '*',
  allowedHeaders: ['Content-Type', 'Authorization']
});
```

## Referencias

- [Swagger UI GitHub](https://github.com/swagger-api/swagger-ui)
- [OpenAPI Specification](https://swagger.io/specification/)
- [CDN de Cloudflare](https://cdnjs.com/libraries/swagger-ui)
- [Documentación de Swagger UI](https://swagger.io/docs/open-source-tools/swagger-ui/)

---

Para más información, consulta [SWAGGER_DOCS.md](./SWAGGER_DOCS.md)
