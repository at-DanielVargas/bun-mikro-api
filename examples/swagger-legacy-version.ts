// examples/swagger-legacy-version.ts
// Ejemplo de uso de Swagger UI con versión legacy (2.x)

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
  IsEmail
} from '../src/index';

// DTO simple
class CreateProductDto extends RequestDto {
  @Required()
  @IsString()
  name!: string;

  @Required()
  @IsString()
  description!: string;
}

// Controlador de productos
@Controller('products')
@ApiTag('Products', 'Gestión de productos')
class ProductController {
  @Get()
  @ApiDoc({
    summary: 'Listar productos',
    description: 'Obtiene todos los productos disponibles'
  })
  async list() {
    return {
      products: [
        { id: 1, name: 'Producto A', description: 'Descripción A' },
        { id: 2, name: 'Producto B', description: 'Descripción B' }
      ]
    };
  }

  @Post()
  @Body(CreateProductDto)
  @ApiDoc({
    summary: 'Crear producto',
    description: 'Crea un nuevo producto'
  })
  async create() {
    return {
      id: 3,
      name: 'Nuevo Producto',
      description: 'Nueva descripción',
      createdAt: new Date().toISOString()
    };
  }
}

// Configuración de la aplicación
const app = new App();

app.useController(ProductController);

// Habilitar Swagger con versión legacy 2.2.10
// El sistema detecta automáticamente que es una versión legacy
// y carga los archivos correctos (swagger-ui.min.js, lib/shred.bundle.js, etc.)
app.enableSwagger(
  {
    title: 'API con Swagger UI Legacy',
    version: '1.0.0',
    description: 'Ejemplo de API usando Swagger UI versión 2.2.10',
    servers: [
      { url: 'http://localhost:8787', description: 'Desarrollo' }
    ]
  },
  {
    // Usar versión legacy de Swagger UI (2.x)
    // Detección automática: versión < 3.0.0 = legacy
    swaggerVersion: '2.2.10',
    
    // Autenticación opcional
    users: [
      { username: 'admin', password: 'admin123' }
    ]
  }
);

export default app;

// Para Bun Server (descomentar si usas Bun)
/*
Bun.serve({
  port: 8787,
  fetch: app.fetch
});

console.log('🚀 Servidor iniciado en http://localhost:8787');
console.log('📚 Swagger UI (Legacy 2.2.10): http://localhost:8787/docs');
console.log('🔐 Usuario: admin / Contraseña: admin123');
console.log('');
console.log('Nota: Esta versión usa Swagger UI 2.2.10 (legacy)');
console.log('- Usa window.SwaggerUi en lugar de SwaggerUIBundle');
console.log('- Requiere dependencias: jQuery, Underscore, Backbone, Handlebars');
console.log('- Orden de carga: jQuery → Underscore → Backbone → Handlebars → Swagger UI');
console.log('- Usa css/screen.css en lugar de swagger-ui.min.css');
*/
