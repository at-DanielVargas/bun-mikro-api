// src/docs/LibraryDocsPage.ts
// HTML documentation page for Mikro API library usage

export class LibraryDocsPage {
  constructor(private readonly basePath: string = '/library-docs') {}

  /**
   * Generate the HTML documentation page
   */
  generate(lang: 'es' | 'en' = 'en'): string {
    const content = lang === 'es' ? this.getSpanishContent() : this.getEnglishContent();
    
    return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${content.title}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css">
  <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/languages/typescript.min.js"></script>
  <style>
    .nav-link:hover { background: #f1f5f9; }
    .nav-link.active { background: #e0e7ff; color: #4f46e5; font-weight: 600; }
    pre code { border-radius: 0.5rem; }
    .feature-card:hover { transform: translateY(-2px); transition: all 0.2s; }
  </style>
</head>
<body class="bg-gray-50">
  ${this.generateNavigation(content, lang)}
  ${this.generateHero(content)}
  ${this.generateContent(content, lang)}
  ${this.generateFooter(content)}
  
  <script>
    hljs.highlightAll();
    
    // Smooth scroll
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          
          // Update active nav link
          document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
          this.classList.add('active');
        }
      });
    });
    
    // Highlight active section on scroll
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const id = entry.target.getAttribute('id');
          document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === '#' + id) {
              link.classList.add('active');
            }
          });
        }
      });
    }, { threshold: 0.5 });
    
    document.querySelectorAll('section[id]').forEach(section => observer.observe(section));
  </script>
</body>
</html>`;
  }

  private generateNavigation(content: any, lang: string): string {
    return `
  <nav class="bg-white shadow-sm border-b sticky top-0 z-50">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex justify-between h-16">
        <div class="flex items-center">
          <h1 class="text-xl font-bold text-gray-900">Mikro API</h1>
          <span class="ml-3 px-2 py-1 text-xs font-semibold text-blue-600 bg-blue-100 rounded">${content.documentation}</span>
        </div>
        <div class="flex items-center space-x-4">
          <a href="?lang=en" class="text-sm ${lang === 'en' ? 'font-bold text-blue-600' : 'text-gray-600 hover:text-gray-900'}">English</a>
          <a href="?lang=es" class="text-sm ${lang === 'es' ? 'font-bold text-blue-600' : 'text-gray-600 hover:text-gray-900'}">Español</a>
        </div>
      </div>
    </div>
  </nav>`;
  }

  private generateHero(content: any): string {
    return `
  <div class="bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <h1 class="text-4xl font-bold mb-4">${content.heroTitle}</h1>
      <p class="text-xl text-blue-100 mb-8">${content.heroSubtitle}</p>
      <div class="flex space-x-4">
        <a href="#getting-started" class="px-6 py-3 bg-white text-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition">
          ${content.getStarted}
        </a>
        <a href="#examples" class="px-6 py-3 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-400 transition">
          ${content.viewExamples}
        </a>
      </div>
    </div>
  </div>`;
  }

  private generateContent(content: any, lang: string): string {
    return `
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <div class="grid grid-cols-1 lg:grid-cols-4 gap-8">
      ${this.generateSidebar(content)}
      ${this.generateMainContent(content, lang)}
    </div>
  </div>`;
  }

  private generateSidebar(content: any): string {
    return `
      <aside class="lg:col-span-1">
        <div class="sticky top-24 bg-white rounded-lg shadow p-4">
          <h2 class="text-lg font-semibold text-gray-900 mb-4">${content.tableOfContents}</h2>
          <nav class="space-y-1">
            <a href="#getting-started" class="nav-link block px-3 py-2 text-sm text-gray-700 rounded-md">${content.gettingStarted}</a>
            <a href="#controllers" class="nav-link block px-3 py-2 text-sm text-gray-700 rounded-md">${content.controllers}</a>
            <a href="#routing" class="nav-link block px-3 py-2 text-sm text-gray-700 rounded-md">${content.routing}</a>
            <a href="#validation" class="nav-link block px-3 py-2 text-sm text-gray-700 rounded-md">${content.validation}</a>
            <a href="#database" class="nav-link block px-3 py-2 text-sm text-gray-700 rounded-md">${content.database}</a>
            <a href="#repository" class="nav-link block px-3 py-2 text-sm text-gray-700 rounded-md">${content.repository}</a>
            <a href="#guards" class="nav-link block px-3 py-2 text-sm text-gray-700 rounded-md">${content.guards}</a>
            <a href="#swagger" class="nav-link block px-3 py-2 text-sm text-gray-700 rounded-md">${content.swagger}</a>
            <a href="#examples" class="nav-link block px-3 py-2 text-sm text-gray-700 rounded-md">${content.examples}</a>
          </nav>
        </div>
      </aside>`;
  }

  private generateMainContent(content: any, lang: string): string {
    return `
      <main class="lg:col-span-3 space-y-8">
        ${this.sectionGettingStarted(content)}
        ${this.sectionControllers(content)}
        ${this.sectionRouting(content)}
        ${this.sectionValidation(content)}
        ${this.sectionDatabase(content)}
        ${this.sectionRepository(content)}
        ${this.sectionGuards(content)}
        ${this.sectionSwagger(content)}
        ${this.sectionExamples(content)}
      </main>`;
  }

  private sectionGettingStarted(content: any): string {
    return `
        <section id="getting-started" class="bg-white rounded-lg shadow p-6">
          <h2 class="text-2xl font-bold text-gray-900 mb-4">${content.gettingStarted}</h2>
          <p class="text-gray-700 mb-4">${content.gettingStartedText}</p>
          
          <h3 class="text-lg font-semibold text-gray-900 mb-3">${content.installation}</h3>
          <pre><code class="language-bash">npm install mikro-api
# or
bun add mikro-api</code></pre>

          <h3 class="text-lg font-semibold text-gray-900 mb-3 mt-6">${content.basicSetup}</h3>
          <pre><code class="language-typescript">import { App, Controller, Get } from 'mikro-api';

@Controller('hello')
class HelloController {
  @Get()
  sayHello() {
    return { message: 'Hello World!' };
  }
}

const app = new App();
app.useController(HelloController);

export default app;</code></pre>
        </section>`;
  }

  private sectionControllers(content: any): string {
    return `
        <section id="controllers" class="bg-white rounded-lg shadow p-6">
          <h2 class="text-2xl font-bold text-gray-900 mb-4">${content.controllers}</h2>
          <p class="text-gray-700 mb-4">${content.controllersText}</p>
          
          <pre><code class="language-typescript">import { Controller, Get, Post, Put, Delete } from 'mikro-api';

@Controller('users')
class UserController {
  @Get()
  list() {
    return { users: [] };
  }

  @Get(':id')
  getById() {
    return { id: 1, name: 'John' };
  }

  @Post()
  create() {
    return { id: 1, created: true };
  }

  @Put(':id')
  update() {
    return { id: 1, updated: true };
  }

  @Delete(':id')
  delete() {
    return { deleted: true };
  }
}</code></pre>
        </section>`;
  }

  private sectionRouting(content: any): string {
    return `
        <section id="routing" class="bg-white rounded-lg shadow p-6">
          <h2 class="text-2xl font-bold text-gray-900 mb-4">${content.routing}</h2>
          <p class="text-gray-700 mb-4">${content.routingText}</p>
          
          <h3 class="text-lg font-semibold text-gray-900 mb-3">${content.routeDecorators}</h3>
          <pre><code class="language-typescript">import { Controller, Get, Post, Route } from 'mikro-api';

@Controller('api/v1/products')
class ProductController {
  // GET /api/v1/products
  @Get()
  list() {
    return { products: [] };
  }

  // GET /api/v1/products/123
  @Get(':id')
  getById() {
    return { id: 123 };
  }

  // POST /api/v1/products/search
  @Post('search')
  search() {
    return { results: [] };
  }

  // Custom route with any HTTP method
  @Route('PATCH', ':id/status')
  updateStatus() {
    return { updated: true };
  }
}</code></pre>
        </section>`;
  }

  private sectionValidation(content: any): string {
    return `
        <section id="validation" class="bg-white rounded-lg shadow p-6">
          <h2 class="text-2xl font-bold text-gray-900 mb-4">${content.validation}</h2>
          <p class="text-gray-700 mb-4">${content.validationText}</p>
          
          <pre><code class="language-typescript">import { 
  RequestDto, Body, Post, Controller,
  Required, IsString, IsEmail, MinLength, IsInt, Min, Max
} from 'mikro-api';

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
  @MinLength(8)
  password!: string;

  @Required()
  @IsInt()
  @Min(18)
  @Max(120)
  age!: number;
}

@Controller('users')
class UserController {
  @Post()
  @Body(CreateUserDto)
  create() {
    // Body is automatically validated
    return { created: true };
  }
}</code></pre>

          <h3 class="text-lg font-semibold text-gray-900 mb-3 mt-6">${content.availableValidators}</h3>
          <div class="grid grid-cols-2 gap-4">
            <div class="border rounded p-3">
              <code class="text-sm text-blue-600">@Required()</code>
              <p class="text-xs text-gray-600 mt-1">${content.validatorRequired}</p>
            </div>
            <div class="border rounded p-3">
              <code class="text-sm text-blue-600">@Optional()</code>
              <p class="text-xs text-gray-600 mt-1">${content.validatorOptional}</p>
            </div>
            <div class="border rounded p-3">
              <code class="text-sm text-blue-600">@IsString()</code>
              <p class="text-xs text-gray-600 mt-1">${content.validatorIsString}</p>
            </div>
            <div class="border rounded p-3">
              <code class="text-sm text-blue-600">@IsInt()</code>
              <p class="text-xs text-gray-600 mt-1">${content.validatorIsInt}</p>
            </div>
            <div class="border rounded p-3">
              <code class="text-sm text-blue-600">@IsEmail()</code>
              <p class="text-xs text-gray-600 mt-1">${content.validatorIsEmail}</p>
            </div>
            <div class="border rounded p-3">
              <code class="text-sm text-blue-600">@MinLength(n)</code>
              <p class="text-xs text-gray-600 mt-1">${content.validatorMinLength}</p>
            </div>
          </div>
        </section>`;
  }

  private sectionDatabase(content: any): string {
    return `
        <section id="database" class="bg-white rounded-lg shadow p-6">
          <h2 class="text-2xl font-bold text-gray-900 mb-4">${content.database}</h2>
          <p class="text-gray-700 mb-4">${content.databaseText}</p>
          
          <h3 class="text-lg font-semibold text-gray-900 mb-3">${content.schemaDefinition}</h3>
          <pre><code class="language-typescript">import { Table, Column, PrimaryKey, Timestamps } from 'mikro-api';

@Table('users')
@Timestamps()
class User {
  @PrimaryKey()
  @Column({ type: 'integer', autoIncrement: true })
  id!: number;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email!: string;

  @Column({ type: 'varchar', length: 255 })
  password!: string;

  createdAt?: Date;
  updatedAt?: Date;
}</code></pre>

          <h3 class="text-lg font-semibold text-gray-900 mb-3 mt-6">${content.databaseDrivers}</h3>
          <div class="space-y-4">
            <div class="border-l-4 border-blue-500 pl-4">
              <h4 class="font-semibold text-gray-900">Cloudflare D1</h4>
              <pre class="mt-2"><code class="language-typescript">import { D1Driver } from 'mikro-api';

const driver = new D1Driver(env.DB);</code></pre>
            </div>
            
            <div class="border-l-4 border-green-500 pl-4">
              <h4 class="font-semibold text-gray-900">PostgreSQL</h4>
              <pre class="mt-2"><code class="language-typescript">import { PostgresDriver } from 'mikro-api';
import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL);
const driver = new PostgresDriver(sql);</code></pre>
            </div>
            
            <div class="border-l-4 border-yellow-500 pl-4">
              <h4 class="font-semibold text-gray-900">SQLite (Bun)</h4>
              <pre class="mt-2"><code class="language-typescript">import { SqliteDriver } from 'mikro-api';
import { Database } from 'bun:sqlite';

const db = new Database('mydb.sqlite');
const driver = new SqliteDriver(db);</code></pre>
            </div>
          </div>
        </section>`;
  }

  private sectionRepository(content: any): string {
    return `
        <section id="repository" class="bg-white rounded-lg shadow p-6">
          <h2 class="text-2xl font-bold text-gray-900 mb-4">${content.repository}</h2>
          <p class="text-gray-700 mb-4">${content.repositoryText}</p>
          
          <pre><code class="language-typescript">import { BaseRepository } from 'mikro-api';

class UserRepository extends BaseRepository<User> {
  constructor(driver: DatabaseDriver) {
    super(driver, User);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.query()
      .where('email', '=', email)
      .first();
  }

  async findActive(): Promise<User[]> {
    return this.query()
      .where('status', '=', 'active')
      .orderBy('createdAt', 'desc')
      .get();
  }
}

// Usage
const repo = new UserRepository(driver);

// Find all
const users = await repo.findAll();

// Find by ID
const user = await repo.findById(1);

// Create
const newUser = await repo.create({
  name: 'John',
  email: 'john@example.com'
});

// Update
await repo.update(1, { name: 'John Updated' });

// Delete
await repo.delete(1);</code></pre>
        </section>`;
  }

  private sectionGuards(content: any): string {
    return `
        <section id="guards" class="bg-white rounded-lg shadow p-6">
          <h2 class="text-2xl font-bold text-gray-900 mb-4">${content.guards}</h2>
          <p class="text-gray-700 mb-4">${content.guardsText}</p>
          
          <pre><code class="language-typescript">import { BaseGuard, MikroRequest, UseGuards } from 'mikro-api';

class AuthGuard extends BaseGuard {
  async canActivate(request: MikroRequest): Promise<boolean> {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return false;
    }

    // Verify token logic here
    const isValid = await this.verifyToken(token);
    return isValid;
  }

  private async verifyToken(token: string): Promise<boolean> {
    // Your token verification logic
    return true;
  }
}

@Controller('users')
@UseGuards(AuthGuard) // Apply to all routes
class UserController {
  @Get()
  list() {
    return { users: [] };
  }

  @Post()
  @UseGuards(AdminGuard) // Additional guard for this route
  create() {
    return { created: true };
  }
}</code></pre>
        </section>`;
  }

  private sectionSwagger(content: any): string {
    return `
        <section id="swagger" class="bg-white rounded-lg shadow p-6">
          <h2 class="text-2xl font-bold text-gray-900 mb-4">${content.swagger}</h2>
          <p class="text-gray-700 mb-4">${content.swaggerText}</p>
          
          <h3 class="text-lg font-semibold text-gray-900 mb-3">${content.basicSwagger}</h3>
          <pre><code class="language-typescript">const app = new App();

app.enableSwagger({
  title: 'My API',
  version: '1.0.0',
  description: 'API Documentation',
  servers: [
    { url: 'https://api.example.com', description: 'Production' }
  ]
});</code></pre>

          <h3 class="text-lg font-semibold text-gray-900 mb-3 mt-6">${content.swaggerWithAuth}</h3>
          <pre><code class="language-typescript">app.enableSwagger(
  {
    title: 'Protected API',
    version: '1.0.0'
  },
  {
    users: [
      { username: 'admin', password: 'admin123' },
      { username: 'dev', password: 'dev123' }
    ]
  }
);</code></pre>

          <h3 class="text-lg font-semibold text-gray-900 mb-3 mt-6">${content.apiDocumentation}</h3>
          <pre><code class="language-typescript">import { ApiDoc, ApiTag } from 'mikro-api';

@Controller('users')
@ApiTag('Users', 'User management endpoints')
class UserController {
  @Get()
  @ApiDoc({
    summary: 'List all users',
    description: 'Returns a paginated list of users',
    responses: {
      200: 'Success',
      401: 'Unauthorized'
    }
  })
  list() {
    return { users: [] };
  }
}</code></pre>

          <div class="bg-blue-50 border-l-4 border-blue-500 p-4 mt-4">
            <p class="text-sm text-blue-700">
              <strong>${content.swaggerRoutes}:</strong><br>
              • <code>/docs</code> - Swagger UI<br>
              • <code>/docs/json</code> - OpenAPI JSON<br>
              • <code>/docs/guide</code> - ${content.apiGuide}
            </p>
          </div>
        </section>`;
  }

  private sectionExamples(content: any): string {
    return `
        <section id="examples" class="bg-white rounded-lg shadow p-6">
          <h2 class="text-2xl font-bold text-gray-900 mb-4">${content.examples}</h2>
          
          <h3 class="text-lg font-semibold text-gray-900 mb-3">${content.completeExample}</h3>
          <pre><code class="language-typescript">import { 
  App, Controller, Get, Post, Body,
  RequestDto, Required, IsString, IsEmail,
  BaseRepository, UseGuards, ApiDoc
} from 'mikro-api';

// DTO
class CreateUserDto extends RequestDto {
  @Required() @IsString() name!: string;
  @Required() @IsEmail() email!: string;
}

// Repository
class UserRepository extends BaseRepository<User> {
  async findByEmail(email: string) {
    return this.query().where('email', '=', email).first();
  }
}

// Controller
@Controller('users')
@UseGuards(AuthGuard)
class UserController {
  constructor(private repo: UserRepository) {}

  @Get()
  @ApiDoc({ summary: 'List users' })
  async list() {
    return await this.repo.findAll();
  }

  @Post()
  @Body(CreateUserDto)
  @ApiDoc({ summary: 'Create user' })
  async create() {
    return await this.repo.create({ /* data */ });
  }
}

// App
const app = new App();
app.useController(UserController);
app.enableCORS();
app.enableSwagger({ title: 'My API', version: '1.0.0' });

export default app;</code></pre>
        </section>`;
  }

  private generateFooter(content: any): string {
    return `
  <footer class="bg-white border-t mt-12">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div>
          <h3 class="font-semibold text-gray-900 mb-3">${content.resources}</h3>
          <ul class="space-y-2 text-sm text-gray-600">
            <li><a href="https://github.com" class="hover:text-blue-600">GitHub</a></li>
            <li><a href="#" class="hover:text-blue-600">NPM</a></li>
            <li><a href="#" class="hover:text-blue-600">${content.changelog}</a></li>
          </ul>
        </div>
        <div>
          <h3 class="font-semibold text-gray-900 mb-3">${content.community}</h3>
          <ul class="space-y-2 text-sm text-gray-600">
            <li><a href="#" class="hover:text-blue-600">${content.discussions}</a></li>
            <li><a href="#" class="hover:text-blue-600">${content.issues}</a></li>
            <li><a href="#" class="hover:text-blue-600">${content.contributing}</a></li>
          </ul>
        </div>
        <div>
          <h3 class="font-semibold text-gray-900 mb-3">${content.support}</h3>
          <ul class="space-y-2 text-sm text-gray-600">
            <li><a href="#" class="hover:text-blue-600">${content.documentation}</a></li>
            <li><a href="#examples" class="hover:text-blue-600">${content.examples}</a></li>
            <li><a href="#" class="hover:text-blue-600">FAQ</a></li>
          </ul>
        </div>
      </div>
      <div class="mt-8 pt-8 border-t text-center text-sm text-gray-500">
        <p>${content.poweredBy} <span class="font-semibold">Mikro API</span> • MIT License</p>
      </div>
    </div>
  </footer>`;
  }

  private getSpanishContent() {
    return {
      title: 'Mikro API - Documentación',
      documentation: 'Documentación',
      heroTitle: 'Framework Minimalista para Cloudflare Workers y Bun',
      heroSubtitle: 'Construye APIs RESTful con decoradores al estilo NestJS',
      getStarted: 'Comenzar',
      viewExamples: 'Ver Ejemplos',
      tableOfContents: 'Contenido',
      gettingStarted: 'Comenzando',
      controllers: 'Controladores',
      routing: 'Enrutamiento',
      validation: 'Validación',
      database: 'Base de Datos',
      repository: 'Repositorios',
      guards: 'Guards',
      swagger: 'Swagger',
      examples: 'Ejemplos',
      gettingStartedText: 'Mikro API es un framework minimalista inspirado en NestJS, diseñado específicamente para Cloudflare Workers y Bun. Utiliza decoradores TypeScript para definir controladores, rutas, validaciones y más.',
      installation: 'Instalación',
      basicSetup: 'Configuración Básica',
      controllersText: 'Los controladores manejan las peticiones HTTP y devuelven respuestas. Usa el decorador @Controller para definir el prefijo de ruta.',
      routingText: 'Define rutas usando decoradores como @Get, @Post, @Put, @Delete o @Route para métodos HTTP personalizados.',
      routeDecorators: 'Decoradores de Ruta',
      validationText: 'Valida automáticamente el cuerpo de las peticiones usando DTOs (Data Transfer Objects) con decoradores de validación.',
      availableValidators: 'Validadores Disponibles',
      validatorRequired: 'Campo requerido',
      validatorOptional: 'Campo opcional',
      validatorIsString: 'Debe ser string',
      validatorIsInt: 'Debe ser entero',
      validatorIsEmail: 'Debe ser email válido',
      validatorMinLength: 'Longitud mínima',
      databaseText: 'Define esquemas de base de datos usando decoradores. Soporta múltiples drivers: D1, PostgreSQL, SQLite.',
      schemaDefinition: 'Definición de Esquema',
      databaseDrivers: 'Drivers de Base de Datos',
      repositoryText: 'Los repositorios proporcionan una capa de abstracción para operaciones de base de datos con un query builder fluido.',
      guardsText: 'Los guards controlan el acceso a las rutas. Implementa lógica de autenticación y autorización.',
      swaggerText: 'Genera documentación OpenAPI automáticamente desde tus controladores y DTOs.',
      basicSwagger: 'Configuración Básica',
      swaggerWithAuth: 'Swagger con Autenticación',
      apiDocumentation: 'Documentar Endpoints',
      swaggerRoutes: 'Rutas Disponibles',
      apiGuide: 'Guía de la API',
      completeExample: 'Ejemplo Completo',
      resources: 'Recursos',
      changelog: 'Registro de Cambios',
      community: 'Comunidad',
      discussions: 'Discusiones',
      issues: 'Problemas',
      contributing: 'Contribuir',
      support: 'Soporte',
      poweredBy: 'Desarrollado con'
    };
  }

  private getEnglishContent() {
    return {
      title: 'Mikro API - Documentation',
      documentation: 'Documentation',
      heroTitle: 'Minimalist Framework for Cloudflare Workers and Bun',
      heroSubtitle: 'Build RESTful APIs with NestJS-style decorators',
      getStarted: 'Get Started',
      viewExamples: 'View Examples',
      tableOfContents: 'Table of Contents',
      gettingStarted: 'Getting Started',
      controllers: 'Controllers',
      routing: 'Routing',
      validation: 'Validation',
      database: 'Database',
      repository: 'Repositories',
      guards: 'Guards',
      swagger: 'Swagger',
      examples: 'Examples',
      gettingStartedText: 'Mikro API is a minimalist framework inspired by NestJS, designed specifically for Cloudflare Workers and Bun. It uses TypeScript decorators to define controllers, routes, validations, and more.',
      installation: 'Installation',
      basicSetup: 'Basic Setup',
      controllersText: 'Controllers handle HTTP requests and return responses. Use the @Controller decorator to define the route prefix.',
      routingText: 'Define routes using decorators like @Get, @Post, @Put, @Delete, or @Route for custom HTTP methods.',
      routeDecorators: 'Route Decorators',
      validationText: 'Automatically validate request bodies using DTOs (Data Transfer Objects) with validation decorators.',
      availableValidators: 'Available Validators',
      validatorRequired: 'Required field',
      validatorOptional: 'Optional field',
      validatorIsString: 'Must be string',
      validatorIsInt: 'Must be integer',
      validatorIsEmail: 'Must be valid email',
      validatorMinLength: 'Minimum length',
      databaseText: 'Define database schemas using decorators. Supports multiple drivers: D1, PostgreSQL, SQLite.',
      schemaDefinition: 'Schema Definition',
      databaseDrivers: 'Database Drivers',
      repositoryText: 'Repositories provide an abstraction layer for database operations with a fluent query builder.',
      guardsText: 'Guards control access to routes. Implement authentication and authorization logic.',
      swaggerText: 'Automatically generate OpenAPI documentation from your controllers and DTOs.',
      basicSwagger: 'Basic Setup',
      swaggerWithAuth: 'Swagger with Authentication',
      apiDocumentation: 'Document Endpoints',
      swaggerRoutes: 'Available Routes',
      apiGuide: 'API Guide',
      completeExample: 'Complete Example',
      resources: 'Resources',
      changelog: 'Changelog',
      community: 'Community',
      discussions: 'Discussions',
      issues: 'Issues',
      contributing: 'Contributing',
      support: 'Support',
      poweredBy: 'Powered by'
    };
  }

  private escapeHtml(text: string): string {
    return text.replace(/[<>"&]/g, (c) => 
      ({ '<': '&lt;', '>': '&gt;', '"': '&quot;', '&': '&amp;' }[c] ?? c)
    );
  }
}
