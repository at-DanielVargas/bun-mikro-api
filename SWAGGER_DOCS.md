# Documentación Swagger con Autenticación

Esta guía explica cómo usar las nuevas funcionalidades de documentación Swagger con autenticación básica y páginas de documentación multiidioma.

## Características

✨ **Autenticación Básica**: Protege tu documentación Swagger con usuarios y contraseñas
📚 **Documentación HTML**: Página de documentación detallada con ejemplos
🌍 **Multiidioma**: Soporte para español e inglés
🎨 **Diseño Moderno**: Interfaz con Tailwind CSS

## Rutas Disponibles

- `/docs` - Swagger UI interactivo
- `/docs/json` - Especificación OpenAPI en JSON
- `/docs/guide` - Guía de documentación de la API (ES/EN)
- `/docs/library` - Documentación de la librería Mikro API (ES/EN)

## Uso Básico

### Sin Autenticación

```typescript
import { App } from 'mikro-api';

const app = new App();

app.enableSwagger({
  title: 'Mi API',
  version: '1.0.0',
  description: 'API para gestión de usuarios',
  servers: [
    { url: 'https://api.example.com', description: 'Producción' },
    { url: 'http://localhost:8787', description: 'Desarrollo' }
  ]
});

export default app;
```

### Con Autenticación Básica

```typescript
import { App } from 'mikro-api';

const app = new App();

app.enableSwagger(
  {
    title: 'Mi API Protegida',
    version: '2.0.0',
    description: 'API con documentación protegida'
  },
  {
    // Usuarios autorizados para acceder a la documentación
    users: [
      { username: 'admin', password: 'admin123' },
      { username: 'developer', password: 'dev123' },
      { username: 'viewer', password: 'view123' }
    ]
  }
);

export default app;
```

### Configuración Avanzada

```typescript
import { App } from 'mikro-api';
import { UserController } from './controllers/UserController';
import { AdminController } from './controllers/AdminController';
import { AuthGuard } from './guards/AuthGuard';

const app = new App();

app.useController(UserController, AdminController);

app.enableSwagger(
  {
    title: 'API Completa',
    version: '3.0.0',
    description: 'Documentación completa de la API',
    servers: [
      { url: 'https://api.example.com', description: 'Producción' },
      { url: 'https://staging.api.example.com', description: 'Staging' },
      { url: 'http://localhost:8787', description: 'Local' }
    ]
  },
  {
    // Rutas personalizadas
    path: '/api-docs',
    jsonPath: '/api-docs/openapi.json',
    docsPath: '/api-docs/guide',
    
    // Autenticación
    users: [
      { username: 'admin', password: process.env.ADMIN_PASSWORD || 'changeme' }
    ],
    
    // Excluir controladores de la documentación
    excludeControllers: [AdminController],
    
    // Guards que indican autenticación Bearer
    authGuards: [AuthGuard]
  }
);

export default app;
```

## Acceso a la Documentación

### Desde el Navegador

1. Navega a `https://tu-api.com/docs`
2. Se mostrará un diálogo de autenticación básica
3. Ingresa usuario y contraseña configurados
4. Accede a Swagger UI

### Desde cURL

```bash
# Acceder a Swagger UI
curl -u admin:admin123 https://tu-api.com/docs

# Acceder al JSON de OpenAPI
curl -u admin:admin123 https://tu-api.com/docs/json

# Acceder a la guía de documentación en español
curl -u admin:admin123 https://tu-api.com/docs/guide?lang=es

# Acceder a la guía de documentación en inglés
curl -u admin:admin123 https://tu-api.com/docs/guide?lang=en
```

### Desde JavaScript/Fetch

```javascript
const username = 'admin';
const password = 'admin123';
const credentials = btoa(`${username}:${password}`);

const response = await fetch('https://tu-api.com/docs/json', {
  headers: {
    'Authorization': `Basic ${credentials}`
  }
});

const spec = await response.json();
console.log(spec);
```

## Página de Documentación HTML

La página de documentación (`/docs/guide`) incluye:

- **Introducción**: Descripción general de la API
- **Autenticación**: Cómo autenticarse con la API
- **Endpoints**: Lista de todos los endpoints disponibles
- **Ejemplos**: Ejemplos detallados de peticiones y respuestas
  - GET - Obtener recursos
  - POST - Crear recursos
  - PUT - Actualizar recursos
  - DELETE - Eliminar recursos
- **Manejo de Errores**: Tabla de códigos de estado HTTP

### Cambiar Idioma

Agrega el parámetro `lang` a la URL:

- Español: `/docs/guide?lang=es`
- Inglés: `/docs/guide?lang=en` (por defecto)

## Seguridad

### Mejores Prácticas

1. **Usa variables de entorno** para las contraseñas:
   ```typescript
   users: [
     { 
       username: 'admin', 
       password: process.env.SWAGGER_PASSWORD || 'changeme' 
     }
   ]
   ```

2. **Contraseñas fuertes**: Usa contraseñas complejas en producción

3. **HTTPS**: Siempre usa HTTPS en producción para proteger las credenciales

4. **Limita el acceso**: Solo habilita Swagger en entornos de desarrollo/staging si es posible

### Deshabilitar en Producción

```typescript
const app = new App();

// Solo habilitar Swagger en desarrollo
if (process.env.ENVIRONMENT !== 'production') {
  app.enableSwagger(
    { title: 'API Dev', version: '1.0.0' },
    { users: [{ username: 'dev', password: 'dev123' }] }
  );
}

export default app;
```

## Integración con CORS

La autenticación funciona correctamente con CORS:

```typescript
const app = new App();

app.enableCORS({
  origin: ['https://example.com', 'http://localhost:3000'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization']
});

app.enableSwagger(
  { title: 'API con CORS', version: '1.0.0' },
  { users: [{ username: 'admin', password: 'admin123' }] }
);

export default app;
```

## Personalización

### Usar SwaggerAuth Directamente

```typescript
import { SwaggerAuth } from 'mikro-api';

const auth = new SwaggerAuth();
auth.addUser('user1', 'pass1');
auth.addUser('user2', 'pass2');

// Verificar autenticación
const isValid = auth.verify(request);
if (!isValid) {
  return auth.unauthorizedResponse();
}
```

### Generar Documentación Personalizada

```typescript
import { DocsPage } from 'mikro-api';

const docsPage = new DocsPage(openApiSpec, '/docs');

// Generar en español
const htmlEs = docsPage.generate('es');

// Generar en inglés
const htmlEn = docsPage.generate('en');
```

## Ejemplos Completos

### Cloudflare Workers

```typescript
// src/index.ts
import { App } from 'mikro-api';
import { UserController } from './controllers/UserController';

export interface Env {
  SWAGGER_USERNAME: string;
  SWAGGER_PASSWORD: string;
}

const app = new App<Env>();

app.useController(UserController);

app.enableSwagger(
  {
    title: 'User Management API',
    version: '1.0.0',
    description: 'API para gestión de usuarios',
    servers: [{ url: '/', description: 'Cloudflare Worker' }]
  },
  {
    users: [
      { 
        username: 'admin', 
        password: 'secure-password-here' 
      }
    ]
  }
);

export default app;
```

### Bun Server

```typescript
// server.ts
import { App } from 'mikro-api';
import { UserController } from './controllers/UserController';

const app = new App();

app.useController(UserController);

app.enableSwagger(
  {
    title: 'Bun API',
    version: '1.0.0',
    servers: [{ url: 'http://localhost:3000' }]
  },
  {
    users: [
      { username: 'dev', password: 'dev123' }
    ]
  }
);

Bun.serve({
  port: 3000,
  fetch: app.fetch
});

console.log('Server running on http://localhost:3000');
console.log('Swagger UI: http://localhost:3000/docs');
console.log('Docs Guide: http://localhost:3000/docs/guide');
```

## Solución de Problemas

### La autenticación no funciona

- Verifica que las credenciales sean correctas
- Asegúrate de usar el formato `Basic base64(username:password)`
- Revisa que el header `Authorization` se esté enviando

### La página de documentación no carga

- Verifica que la ruta `/docs/guide` esté configurada
- Comprueba que Tailwind CSS se cargue desde el CDN
- Revisa la consola del navegador para errores

### Los ejemplos no muestran la URL correcta

- Configura el campo `servers` en la configuración de Swagger
- La URL base se toma del primer servidor en el array

## Recursos Adicionales

- [Documentación de OpenAPI 3.0](https://swagger.io/specification/)
- [Tailwind CSS](https://tailwindcss.com/)
- [HTTP Basic Authentication](https://developer.mozilla.org/en-US/docs/Web/HTTP/Authentication)

---

¿Necesitas ayuda? Abre un issue en el repositorio del proyecto.


## Documentación de la Librería

Además de la documentación de la API, puedes habilitar una página de documentación completa sobre cómo usar la librería Mikro API.

### Habilitar Documentación de la Librería

```typescript
import { App } from 'mikro-api';

const app = new App();

// Habilitar documentación de la librería
app.enableLibraryDocs('/docs/library', [
  { username: 'admin', password: 'admin123' }
]);

// También puedes habilitarla sin autenticación
app.enableLibraryDocs('/docs/library');

export default app;
```

### Contenido de la Documentación

La documentación de la librería incluye:

1. **Comenzando**: Instalación y configuración básica
2. **Controladores**: Cómo crear y usar controladores con decoradores
3. **Enrutamiento**: Definir rutas HTTP con @Get, @Post, etc.
4. **Validación**: Validar datos de entrada con DTOs
5. **Base de Datos**: Definir esquemas y usar diferentes drivers (D1, PostgreSQL, SQLite)
6. **Repositorios**: Operaciones CRUD con query builder fluido
7. **Guards**: Implementar autenticación y autorización
8. **Swagger**: Generar documentación OpenAPI automática
9. **Ejemplos**: Ejemplos completos de aplicaciones

### Características

- ✅ Multiidioma (Español e Inglés)
- ✅ Resaltado de sintaxis con Highlight.js
- ✅ Navegación interactiva con scroll suave
- ✅ Diseño responsive con Tailwind CSS
- ✅ Ejemplos de código completos y funcionales
- ✅ Protección con autenticación básica (opcional)

### Acceso

```bash
# Acceder en español
curl -u admin:admin123 https://tu-api.com/docs/library?lang=es

# Acceder en inglés
curl -u admin:admin123 https://tu-api.com/docs/library?lang=en
```

### Personalización

```typescript
// Ruta personalizada
app.enableLibraryDocs('/documentation');

// Con autenticación
app.enableLibraryDocs('/documentation', [
  { username: 'dev', password: 'dev123' }
]);

// Sin autenticación (público)
app.enableLibraryDocs('/documentation', []);
```
