// examples/swagger-with-auth.ts
// Ejemplo completo de uso de Swagger con autenticación básica

import { 
  App, 
  Controller, 
  Get, 
  Post, 
  Body,
  ApiDoc,
  ApiTag,
  RequestDto,
  Required,
  IsString,
  IsEmail,
  MinLength
} from '../src/index';

// DTO para crear usuario
class CreateUserDto extends RequestDto {
  @Required()
  @IsString()
  @MinLength(3)
  name!: string;

  @Required()
  @IsEmail()
  email!: string;

  @Required()
  @IsString()
  @MinLength(6)
  password!: string;
}

// Controlador de usuarios
@Controller('users')
@ApiTag('Users', 'Gestión de usuarios del sistema')
class UserController {
  @Get()
  @ApiDoc({
    summary: 'Listar todos los usuarios',
    description: 'Obtiene una lista paginada de todos los usuarios registrados',
    responses: {
      200: 'Lista de usuarios obtenida exitosamente',
      401: 'No autorizado'
    }
  })
  async list() {
    return {
      users: [
        { id: 1, name: 'Juan Pérez', email: 'juan@example.com' },
        { id: 2, name: 'María García', email: 'maria@example.com' }
      ],
      total: 2
    };
  }

  @Get(':id')
  @ApiDoc({
    summary: 'Obtener usuario por ID',
    description: 'Obtiene los detalles de un usuario específico',
    responses: {
      200: 'Usuario encontrado',
      404: 'Usuario no encontrado',
      401: 'No autorizado'
    }
  })
  async getById() {
    return {
      id: 1,
      name: 'Juan Pérez',
      email: 'juan@example.com',
      createdAt: '2024-01-15T10:30:00Z'
    };
  }

  @Post()
  @Body(CreateUserDto)
  @ApiDoc({
    summary: 'Crear nuevo usuario',
    description: 'Crea un nuevo usuario en el sistema',
    responses: {
      201: 'Usuario creado exitosamente',
      422: 'Error de validación',
      401: 'No autorizado'
    }
  })
  async create() {
    return {
      id: 3,
      name: 'Nuevo Usuario',
      email: 'nuevo@example.com',
      createdAt: new Date().toISOString()
    };
  }
}

// Configuración de la aplicación
const app = new App();

// Registrar controladores
app.useController(UserController);

// Habilitar CORS
app.enableCORS({
  origin: '*',
  credentials: true
});

// Habilitar Swagger con autenticación básica
app.enableSwagger(
  {
    title: 'API de Gestión de Usuarios',
    version: '1.0.0',
    description: 'API RESTful para la gestión de usuarios con autenticación y validación',
    servers: [
      { url: 'https://api.example.com', description: 'Producción' },
      { url: 'http://localhost:8787', description: 'Desarrollo' }
    ]
  },
  {
    // Configurar usuarios para acceso a la documentación
    users: [
      { username: 'admin', password: 'admin123' },
      { username: 'developer', password: 'dev123' },
      { username: 'viewer', password: 'view123' }
    ],
    
    // Rutas personalizadas (opcional)
    path: '/docs',
    jsonPath: '/docs/json',
    docsPath: '/docs/guide'
  }
);

// Habilitar documentación de la librería
app.enableLibraryDocs('/docs/library', [
  { username: 'admin', password: 'admin123' },
  { username: 'developer', password: 'dev123' }
]);

// Exportar para Cloudflare Workers
export default app;

// Para Bun Server (descomentar si usas Bun)
/*
Bun.serve({
  port: 8787,
  fetch: app.fetch
});

console.log('🚀 Servidor iniciado en http://localhost:8787');
console.log('📚 Swagger UI: http://localhost:8787/docs');
console.log('📖 Documentación API: http://localhost:8787/docs/guide');
console.log('📘 Documentación Librería: http://localhost:8787/docs/library');
console.log('🔐 Usuarios: admin/admin123, developer/dev123, viewer/view123');
*/
