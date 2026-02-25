# Ejemplos de Uso - Swagger con Autenticación

Este directorio contiene ejemplos de cómo usar las nuevas funcionalidades de documentación Swagger con autenticación básica.

## Ejemplo: swagger-with-auth.ts

Este ejemplo muestra cómo configurar una API completa con:

- ✅ Controladores con decoradores
- ✅ Validación de DTOs
- ✅ Documentación Swagger
- ✅ Autenticación básica para la documentación
- ✅ Página de documentación HTML multiidioma
- ✅ CORS habilitado

## Cómo Ejecutar

### Opción 1: Cloudflare Workers (Wrangler)

1. Instala Wrangler:
   ```bash
   npm install -g wrangler
   ```

2. Crea un archivo `wrangler.toml`:
   ```toml
   name = "my-api"
   main = "examples/swagger-with-auth.ts"
   compatibility_date = "2024-01-01"
   ```

3. Ejecuta en modo desarrollo:
   ```bash
   wrangler dev
   ```

4. Accede a la documentación:
   - Swagger UI: http://localhost:8787/docs
   - Documentación API: http://localhost:8787/docs/guide
   - Documentación Librería: http://localhost:8787/docs/library
   - OpenAPI JSON: http://localhost:8787/docs/json

### Opción 2: Bun Server

1. Descomenta la sección de Bun al final del archivo

2. Ejecuta con Bun:
   ```bash
   bun run examples/swagger-with-auth.ts
   ```

3. Accede a la documentación:
   - Swagger UI: http://localhost:8787/docs
   - Documentación API: http://localhost:8787/docs/guide
   - Documentación Librería: http://localhost:8787/docs/library
   - OpenAPI JSON: http://localhost:8787/docs/json

## Credenciales de Acceso

El ejemplo incluye tres usuarios configurados:

| Usuario    | Contraseña | Descripción                    |
|------------|------------|--------------------------------|
| admin      | admin123   | Acceso completo                |
| developer  | dev123     | Acceso para desarrolladores    |
| viewer     | view123    | Acceso solo lectura            |

## Probar la Autenticación

### Desde el Navegador

1. Abre http://localhost:8787/docs
2. El navegador mostrará un diálogo de autenticación
3. Ingresa usuario: `admin` y contraseña: `admin123`
4. Accederás a Swagger UI

### Desde cURL

```bash
# Acceder a Swagger UI
curl -u admin:admin123 http://localhost:8787/docs

# Acceder al JSON de OpenAPI
curl -u admin:admin123 http://localhost:8787/docs/json

# Acceder a la documentación en español
curl -u admin:admin123 http://localhost:8787/docs/guide?lang=es

# Acceder a la documentación en inglés
curl -u admin:admin123 http://localhost:8787/docs/guide?lang=en

# Acceder a la documentación de la librería en español
curl -u admin:admin123 http://localhost:8787/docs/library?lang=es

# Acceder a la documentación de la librería en inglés
curl -u admin:admin123 http://localhost:8787/docs/library?lang=en
```

### Desde JavaScript

```javascript
const username = 'admin';
const password = 'admin123';
const credentials = btoa(`${username}:${password}`);

const response = await fetch('http://localhost:8787/docs/json', {
  headers: {
    'Authorization': `Basic ${credentials}`
  }
});

const spec = await response.json();
console.log(spec);
```

## Características de la Documentación HTML

### Documentación de la API (`/docs/guide`)
La página de documentación de la API incluye:

### Navegación
- Tabla de contenidos interactiva
- Scroll suave entre secciones
- Cambio de idioma (ES/EN)

### Secciones
1. **Introducción**: Descripción general de la API
2. **Autenticación**: Cómo autenticarse con Bearer tokens
3. **Endpoints**: Lista visual de todos los endpoints con métodos HTTP
4. **Ejemplos**: Ejemplos completos de peticiones y respuestas
   - GET - Obtener recursos
   - POST - Crear recursos
   - PUT - Actualizar recursos
   - DELETE - Eliminar recursos
5. **Manejo de Errores**: Tabla de códigos de estado HTTP

### Diseño
- Responsive (móvil, tablet, desktop)
- Tailwind CSS para estilos modernos
- Bloques de código con sintaxis resaltada
- Colores por método HTTP (GET=azul, POST=verde, etc.)

## Personalización

### Cambiar Usuarios

```typescript
app.enableSwagger(
  { title: 'Mi API', version: '1.0.0' },
  {
    users: [
      { username: 'miusuario', password: 'micontraseña' }
    ]
  }
);
```

### Cambiar Rutas

```typescript
app.enableSwagger(
  { title: 'Mi API', version: '1.0.0' },
  {
    path: '/api-docs',           // Swagger UI
    jsonPath: '/api-docs/spec',  // OpenAPI JSON
    docsPath: '/api-docs/guide', // Documentación HTML
    users: [{ username: 'admin', password: 'admin123' }]
  }
);
```

### Deshabilitar Autenticación

Para deshabilitar la autenticación, simplemente no pases el array `users`:

```typescript
app.enableSwagger(
  { title: 'Mi API', version: '1.0.0' }
  // Sin opciones de usuarios = sin autenticación
);
```

### Solo Habilitar en Desarrollo

```typescript
if (process.env.NODE_ENV !== 'production') {
  app.enableSwagger(
    { title: 'API Dev', version: '1.0.0' },
    { users: [{ username: 'dev', password: 'dev123' }] }
  );
}
```

## Probar los Endpoints

Una vez que accedas a Swagger UI, puedes probar los endpoints:

### 1. Listar Usuarios
```bash
curl http://localhost:8787/users
```

### 2. Obtener Usuario por ID
```bash
curl http://localhost:8787/users/1
```

### 3. Crear Usuario
```bash
curl -X POST http://localhost:8787/users \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Nuevo Usuario",
    "email": "nuevo@example.com",
    "password": "password123"
  }'
```

## Estructura del Proyecto

```
examples/
├── swagger-with-auth.ts    # Ejemplo completo
└── README.md               # Esta documentación

src/
├── swagger/
│   ├── SwaggerAuth.ts      # Autenticación básica
│   ├── DocsPage.ts         # Generador de página HTML
│   ├── SwaggerUI.ts        # Servidor de Swagger UI
│   └── SwaggerGenerator.ts # Generador de OpenAPI
└── core/
    └── App.ts              # Aplicación principal
```

## Recursos Adicionales

- [Documentación completa](../SWAGGER_DOCS.md)
- [OpenAPI Specification](https://swagger.io/specification/)
- [Tailwind CSS](https://tailwindcss.com/)
- [HTTP Basic Authentication](https://developer.mozilla.org/en-US/docs/Web/HTTP/Authentication)

## Solución de Problemas

### Error: "Unauthorized"
- Verifica que las credenciales sean correctas
- Asegúrate de incluir el header `Authorization: Basic <credentials>`

### La página no carga
- Verifica que el servidor esté corriendo
- Comprueba que la ruta sea correcta (`/docs`, `/docs/guide`)
- Revisa la consola del navegador para errores

### Los estilos no se aplican
- Verifica tu conexión a internet (Tailwind CSS se carga desde CDN)
- Comprueba que no haya bloqueadores de contenido

---

¿Preguntas? Abre un issue en el repositorio del proyecto.


### Documentación de la Librería (`/docs/library`)
La página de documentación de la librería incluye:

#### Navegación
- Tabla de contenidos interactiva
- Scroll suave entre secciones
- Cambio de idioma (ES/EN)
- Resaltado de sintaxis con Highlight.js

#### Secciones
1. **Comenzando**: Instalación y configuración básica
2. **Controladores**: Cómo crear y usar controladores
3. **Enrutamiento**: Definir rutas con decoradores
4. **Validación**: Validar datos con DTOs
5. **Base de Datos**: Definir esquemas y usar drivers
6. **Repositorios**: Operaciones CRUD con query builder
7. **Guards**: Implementar autenticación y autorización
8. **Swagger**: Generar documentación automática
9. **Ejemplos**: Ejemplos completos de uso

#### Diseño
- Responsive (móvil, tablet, desktop)
- Tailwind CSS para estilos modernos
- Bloques de código con resaltado de sintaxis
- Navegación sticky con indicador de sección activa
- Hero section con gradiente
- Footer con enlaces a recursos
