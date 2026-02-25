# Documentación de la Librería Mikro API

## Resumen de Funcionalidades Implementadas

Se han integrado exitosamente las siguientes funcionalidades en Mikro API:

### 1. ✅ Autenticación Básica para Swagger

- **Clase `SwaggerAuth`**: Maneja autenticación HTTP Basic para proteger la documentación
- **Configuración flexible**: Permite definir múltiples usuarios con username/password
- **Integración con Swagger UI**: Protege automáticamente todas las rutas de documentación
- **Soporte para contraseñas con caracteres especiales**: Maneja correctamente contraseñas con dos puntos

**Ejemplo de uso:**
```typescript
app.enableSwagger(
  { title: 'Mi API', version: '1.0.0' },
  {
    users: [
      { username: 'admin', password: 'admin123' },
      { username: 'dev', password: 'dev123' }
    ]
  }
);
```

### 2. ✅ Página de Documentación de la API (DocsPage)

- **Página HTML con ejemplos de uso de la API**: Muestra cómo consumir los endpoints
- **Multiidioma**: Español e Inglés
- **Diseño moderno**: Tailwind CSS desde CDN
- **Secciones incluidas**:
  - Introducción
  - Autenticación
  - Lista de endpoints
  - Ejemplos de peticiones (GET, POST, PUT, DELETE)
  - Tabla de códigos de error HTTP

**Ruta:** `/docs/guide?lang=es` o `/docs/guide?lang=en`

### 3. ✅ Página de Documentación de la Librería (LibraryDocsPage)

- **Guía completa de uso de Mikro API**: Enseña cómo usar la librería
- **Multiidioma**: Español e Inglés
- **Diseño profesional**: Tailwind CSS + Highlight.js para resaltado de código
- **Navegación interactiva**: Scroll suave y tabla de contenidos sticky
- **Secciones incluidas**:
  1. Comenzando (instalación y setup básico)
  2. Controladores (cómo crear controladores)
  3. Enrutamiento (decoradores de rutas)
  4. Validación (DTOs y validadores)
  5. Base de Datos (esquemas y drivers)
  6. Repositorios (CRUD y query builder)
  7. Guards (autenticación y autorización)
  8. Swagger (documentación automática)
  9. Ejemplos completos

**Ejemplo de uso:**
```typescript
app.enableLibraryDocs('/docs/library', [
  { username: 'admin', password: 'admin123' }
]);
```

**Ruta:** `/docs/library?lang=es` o `/docs/library?lang=en`

## Rutas Disponibles

| Ruta | Descripción | Protección |
|------|-------------|------------|
| `/docs` | Swagger UI interactivo | Opcional (Basic Auth) |
| `/docs/json` | Especificación OpenAPI JSON | Opcional (Basic Auth) |
| `/docs/guide` | Documentación de la API (cómo consumirla) | Opcional (Basic Auth) |
| `/docs/library` | Documentación de la librería (cómo usarla) | Opcional (Basic Auth) |

## Archivos Creados/Modificados

### Nuevos Archivos

1. **`src/swagger/SwaggerAuth.ts`**: Autenticación básica HTTP
2. **`src/swagger/DocsPage.ts`**: Página de documentación de la API
3. **`src/docs/LibraryDocsPage.ts`**: Página de documentación de la librería
4. **`tests/SwaggerAuth.test.ts`**: Tests unitarios para autenticación
5. **`examples/swagger-with-auth.ts`**: Ejemplo completo de uso
6. **`examples/README.md`**: Guía de uso de los ejemplos
7. **`SWAGGER_DOCS.md`**: Documentación completa de Swagger
8. **`LIBRARY_DOCS_README.md`**: Este archivo

### Archivos Modificados

1. **`src/swagger/SwaggerUI.ts`**: Integración de autenticación y DocsPage
2. **`src/core/App.ts`**: Métodos `enableSwagger()` y `enableLibraryDocs()`
3. **`src/index.ts`**: Exportaciones de nuevas clases

## Características Técnicas

### Diseño y UX

- ✅ **Responsive**: Funciona en móvil, tablet y desktop
- ✅ **Tailwind CSS**: Estilos modernos desde CDN (sin dependencias)
- ✅ **Highlight.js**: Resaltado de sintaxis para código TypeScript
- ✅ **Navegación sticky**: Tabla de contenidos siempre visible
- ✅ **Scroll suave**: Navegación fluida entre secciones
- ✅ **Indicador de sección activa**: Muestra dónde estás en la página

### Seguridad

- ✅ **HTTP Basic Authentication**: Protección estándar
- ✅ **Múltiples usuarios**: Soporte para varios usuarios con diferentes credenciales
- ✅ **Opcional**: Puede habilitarse o deshabilitarse fácilmente
- ✅ **Escape de HTML**: Prevención de XSS en contenido dinámico
- ✅ **Manejo seguro de contraseñas**: Soporte para caracteres especiales

### Internacionalización

- ✅ **Español**: Contenido completo en español
- ✅ **Inglés**: Contenido completo en inglés
- ✅ **Cambio fácil**: Parámetro `?lang=es` o `?lang=en`
- ✅ **Selector visible**: Botones en la navegación

## Ejemplos de Uso

### Configuración Básica

```typescript
import { App } from 'mikro-api';

const app = new App();

// Swagger sin autenticación
app.enableSwagger({
  title: 'Mi API',
  version: '1.0.0'
});

// Documentación de la librería sin autenticación
app.enableLibraryDocs('/docs/library');

export default app;
```

### Configuración con Autenticación

```typescript
import { App } from 'mikro-api';

const app = new App();

// Swagger con autenticación
app.enableSwagger(
  {
    title: 'API Protegida',
    version: '1.0.0',
    description: 'API con documentación protegida'
  },
  {
    users: [
      { username: 'admin', password: process.env.ADMIN_PASSWORD || 'changeme' },
      { username: 'dev', password: process.env.DEV_PASSWORD || 'changeme' }
    ]
  }
);

// Documentación de la librería con autenticación
app.enableLibraryDocs('/docs/library', [
  { username: 'admin', password: process.env.ADMIN_PASSWORD || 'changeme' }
]);

export default app;
```

### Configuración Avanzada

```typescript
import { App } from 'mikro-api';

const app = new App();

// Solo habilitar en desarrollo
if (process.env.ENVIRONMENT !== 'production') {
  app.enableSwagger(
    {
      title: 'API Dev',
      version: '1.0.0',
      servers: [
        { url: 'http://localhost:8787', description: 'Local' }
      ]
    },
    {
      path: '/api-docs',
      jsonPath: '/api-docs/spec',
      docsPath: '/api-docs/guide',
      users: [{ username: 'dev', password: 'dev123' }]
    }
  );

  app.enableLibraryDocs('/api-docs/library', [
    { username: 'dev', password: 'dev123' }
  ]);
}

export default app;
```

## Acceso desde el Navegador

1. Navega a `http://localhost:8787/docs/library`
2. Se mostrará un diálogo de autenticación básica
3. Ingresa usuario y contraseña
4. Accede a la documentación completa
5. Cambia el idioma con los botones en la navegación

## Acceso desde cURL

```bash
# Documentación de la librería en español
curl -u admin:admin123 http://localhost:8787/docs/library?lang=es

# Documentación de la librería en inglés
curl -u admin:admin123 http://localhost:8787/docs/library?lang=en

# Documentación de la API en español
curl -u admin:admin123 http://localhost:8787/docs/guide?lang=es

# Swagger UI
curl -u admin:admin123 http://localhost:8787/docs

# OpenAPI JSON
curl -u admin:admin123 http://localhost:8787/docs/json
```

## Tests

Se incluyen 13 tests unitarios para `SwaggerAuth`:

```bash
bun test tests/SwaggerAuth.test.ts
```

**Cobertura:**
- ✅ Creación de instancias con/sin usuarios
- ✅ Agregar usuarios dinámicamente
- ✅ Verificación de credenciales válidas
- ✅ Rechazo de credenciales inválidas
- ✅ Manejo de headers faltantes
- ✅ Manejo de formatos inválidos
- ✅ Múltiples usuarios
- ✅ Respuesta 401 Unauthorized
- ✅ Contraseñas con caracteres especiales
- ✅ Case sensitivity

## Próximos Pasos

Para usar estas funcionalidades en tu proyecto:

1. **Actualiza tu aplicación** para incluir las nuevas rutas
2. **Configura usuarios** para proteger la documentación
3. **Personaliza las rutas** según tus necesidades
4. **Prueba en desarrollo** antes de desplegar a producción
5. **Considera deshabilitar** en producción si no es necesario

## Soporte

- Ver ejemplos en `examples/swagger-with-auth.ts`
- Leer documentación completa en `SWAGGER_DOCS.md`
- Revisar tests en `tests/SwaggerAuth.test.ts`

---

**Desarrollado con Mikro API** • MIT License
