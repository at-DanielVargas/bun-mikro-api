// src/swagger/DocsPage.ts
// HTML documentation page with examples in Spanish and English

export class DocsPage {
  constructor(
    private readonly spec: Record<string, unknown>,
    private readonly docsPath: string,
  ) {}

  /**
   * Generate the HTML documentation page
   */
  generate(lang: 'es' | 'en' = 'en'): string {
    const info = this.spec['info'] as Record<string, unknown>;
    const title = String(info?.['title'] ?? 'API Documentation');
    const version = String(info?.['version'] ?? '1.0.0');
    const description = String(info?.['description'] ?? '');

    const content = lang === 'es' ? this.getSpanishContent() : this.getEnglishContent();

    return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${this.escapeHtml(title)} - ${content.documentation}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    .code-block {
      background: #1e293b;
      color: #e2e8f0;
      border-radius: 0.5rem;
      padding: 1rem;
      overflow-x: auto;
    }
    .nav-link:hover {
      background: #f1f5f9;
    }
  </style>
</head>
<body class="bg-gray-50">
  <!-- Navigation -->
  <nav class="bg-white shadow-sm border-b">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex justify-between h-16">
        <div class="flex items-center">
          <h1 class="text-xl font-bold text-gray-900">${this.escapeHtml(title)}</h1>
          <span class="ml-3 px-2 py-1 text-xs font-semibold text-blue-600 bg-blue-100 rounded">v${this.escapeHtml(version)}</span>
        </div>
        <div class="flex items-center space-x-4">
          <a href="?lang=en" class="text-sm ${lang === 'en' ? 'font-bold text-blue-600' : 'text-gray-600 hover:text-gray-900'}">English</a>
          <a href="?lang=es" class="text-sm ${lang === 'es' ? 'font-bold text-blue-600' : 'text-gray-600 hover:text-gray-900'}">Español</a>
          <a href="${this.docsPath}" class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">
            Swagger UI
          </a>
        </div>
      </div>
    </div>
  </nav>

  <!-- Main Content -->
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <div class="grid grid-cols-1 lg:grid-cols-4 gap-8">
      <!-- Sidebar -->
      <aside class="lg:col-span-1">
        <div class="sticky top-8 bg-white rounded-lg shadow p-4">
          <h2 class="text-lg font-semibold text-gray-900 mb-4">${content.tableOfContents}</h2>
          <nav class="space-y-1">
            <a href="#introduction" class="nav-link block px-3 py-2 text-sm text-gray-700 rounded-md">${content.introduction}</a>
            <a href="#authentication" class="nav-link block px-3 py-2 text-sm text-gray-700 rounded-md">${content.authentication}</a>
            <a href="#endpoints" class="nav-link block px-3 py-2 text-sm text-gray-700 rounded-md">${content.endpoints}</a>
            <a href="#examples" class="nav-link block px-3 py-2 text-sm text-gray-700 rounded-md">${content.examples}</a>
            <a href="#errors" class="nav-link block px-3 py-2 text-sm text-gray-700 rounded-md">${content.errorHandling}</a>
          </nav>
        </div>
      </aside>

      <!-- Content -->
      <main class="lg:col-span-3 space-y-8">
        <!-- Introduction -->
        <section id="introduction" class="bg-white rounded-lg shadow p-6">
          <h2 class="text-2xl font-bold text-gray-900 mb-4">${content.introduction}</h2>
          ${description ? `<p class="text-gray-700 mb-4">${this.escapeHtml(description)}</p>` : ''}
          <p class="text-gray-700">${content.introText}</p>
        </section>

        <!-- Authentication -->
        <section id="authentication" class="bg-white rounded-lg shadow p-6">
          <h2 class="text-2xl font-bold text-gray-900 mb-4">${content.authentication}</h2>
          <p class="text-gray-700 mb-4">${content.authText}</p>
          
          <div class="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">
            <p class="text-sm text-blue-700">${content.authNote}</p>
          </div>

          <h3 class="text-lg font-semibold text-gray-900 mb-3">${content.exampleTitle}</h3>
          <pre class="code-block"><code>curl -X GET "${this.getBaseUrl()}/api/users" \\
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \\
  -H "Content-Type: application/json"</code></pre>
        </section>

        <!-- Endpoints -->
        <section id="endpoints" class="bg-white rounded-lg shadow p-6">
          <h2 class="text-2xl font-bold text-gray-900 mb-4">${content.endpoints}</h2>
          <p class="text-gray-700 mb-4">${content.endpointsText}</p>
          ${this.generateEndpointsList(content, lang)}
        </section>

        <!-- Examples -->
        <section id="examples" class="bg-white rounded-lg shadow p-6">
          <h2 class="text-2xl font-bold text-gray-900 mb-4">${content.examples}</h2>
          ${this.generateExamples(content, lang)}
        </section>

        <!-- Error Handling -->
        <section id="errors" class="bg-white rounded-lg shadow p-6">
          <h2 class="text-2xl font-bold text-gray-900 mb-4">${content.errorHandling}</h2>
          <p class="text-gray-700 mb-4">${content.errorText}</p>
          ${this.generateErrorTable(content)}
        </section>
      </main>
    </div>
  </div>

  <!-- Footer -->
  <footer class="bg-white border-t mt-12">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <p class="text-center text-sm text-gray-500">
        ${content.poweredBy} <span class="font-semibold">Mikro API</span> • ${content.version} ${this.escapeHtml(version)}
      </p>
    </div>
  </footer>

  <script>
    // Smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });
  </script>
</body>
</html>`;
  }

  private getSpanishContent() {
    return {
      documentation: 'Documentación',
      tableOfContents: 'Contenido',
      introduction: 'Introducción',
      authentication: 'Autenticación',
      endpoints: 'Endpoints',
      examples: 'Ejemplos',
      errorHandling: 'Manejo de Errores',
      introText: 'Esta API proporciona acceso a los recursos del sistema mediante endpoints RESTful. Todos los endpoints devuelven respuestas en formato JSON.',
      authText: 'La mayoría de los endpoints requieren autenticación mediante Bearer Token. Incluye el token en el header Authorization de tus peticiones.',
      authNote: 'Nota: Obtén tu token de acceso mediante el endpoint de autenticación antes de realizar peticiones a endpoints protegidos.',
      exampleTitle: 'Ejemplo de petición autenticada',
      endpointsText: 'A continuación se muestran los principales endpoints disponibles en la API:',
      errorText: 'La API utiliza códigos de estado HTTP estándar para indicar el éxito o fracaso de una petición.',
      statusCode: 'Código',
      description: 'Descripción',
      poweredBy: 'Desarrollado con',
      version: 'Versión',
      method: 'Método',
      path: 'Ruta',
      getExample: 'Obtener Recurso',
      postExample: 'Crear Recurso',
      putExample: 'Actualizar Recurso',
      deleteExample: 'Eliminar Recurso',
      request: 'Petición',
      response: 'Respuesta',
      successResponse: 'Respuesta exitosa',
    };
  }

  private getEnglishContent() {
    return {
      documentation: 'Documentation',
      tableOfContents: 'Table of Contents',
      introduction: 'Introduction',
      authentication: 'Authentication',
      endpoints: 'Endpoints',
      examples: 'Examples',
      errorHandling: 'Error Handling',
      introText: 'This API provides access to system resources through RESTful endpoints. All endpoints return JSON responses.',
      authText: 'Most endpoints require authentication using a Bearer Token. Include the token in the Authorization header of your requests.',
      authNote: 'Note: Obtain your access token through the authentication endpoint before making requests to protected endpoints.',
      exampleTitle: 'Authenticated request example',
      endpointsText: 'Below are the main endpoints available in the API:',
      errorText: 'The API uses standard HTTP status codes to indicate the success or failure of a request.',
      statusCode: 'Status Code',
      description: 'Description',
      poweredBy: 'Powered by',
      version: 'Version',
      method: 'Method',
      path: 'Path',
      getExample: 'Get Resource',
      postExample: 'Create Resource',
      putExample: 'Update Resource',
      deleteExample: 'Delete Resource',
      request: 'Request',
      response: 'Response',
      successResponse: 'Successful response',
    };
  }

  private generateEndpointsList(content: any, lang: string): string {
    const paths = this.spec['paths'] as Record<string, Record<string, any>> || {};
    
    let html = '<div class="space-y-4">';
    
    for (const [path, methods] of Object.entries(paths)) {
      for (const [method, operation] of Object.entries(methods)) {
        const methodUpper = method.toUpperCase();
        const summary = operation.summary || path;
        const methodColor = this.getMethodColor(methodUpper);
        
        html += `
          <div class="border rounded-lg p-4 hover:shadow-md transition-shadow">
            <div class="flex items-center space-x-3">
              <span class="px-3 py-1 text-xs font-bold text-white ${methodColor} rounded">${methodUpper}</span>
              <code class="text-sm text-gray-700">${this.escapeHtml(path)}</code>
            </div>
            <p class="mt-2 text-sm text-gray-600">${this.escapeHtml(summary)}</p>
          </div>
        `;
      }
    }
    
    html += '</div>';
    return html;
  }

  private generateExamples(content: any, lang: string): string {
    const baseUrl = this.getBaseUrl();
    
    return `
      <!-- GET Example -->
      <div class="mb-6">
        <h3 class="text-lg font-semibold text-gray-900 mb-3">${content.getExample}</h3>
        <p class="text-sm text-gray-600 mb-2">${content.request}:</p>
        <pre class="code-block mb-4"><code>curl -X GET "${baseUrl}/api/users/123" \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  -H "Content-Type: application/json"</code></pre>
        
        <p class="text-sm text-gray-600 mb-2">${content.response}:</p>
        <pre class="code-block"><code>{
  "id": 123,
  "name": "John Doe",
  "email": "john@example.com",
  "createdAt": "2024-01-15T10:30:00Z"
}</code></pre>
      </div>

      <!-- POST Example -->
      <div class="mb-6">
        <h3 class="text-lg font-semibold text-gray-900 mb-3">${content.postExample}</h3>
        <p class="text-sm text-gray-600 mb-2">${content.request}:</p>
        <pre class="code-block mb-4"><code>curl -X POST "${baseUrl}/api/users" \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Jane Smith",
    "email": "jane@example.com"
  }'</code></pre>
        
        <p class="text-sm text-gray-600 mb-2">${content.response}:</p>
        <pre class="code-block"><code>{
  "id": 124,
  "name": "Jane Smith",
  "email": "jane@example.com",
  "createdAt": "2024-01-15T11:00:00Z"
}</code></pre>
      </div>

      <!-- PUT Example -->
      <div class="mb-6">
        <h3 class="text-lg font-semibold text-gray-900 mb-3">${content.putExample}</h3>
        <p class="text-sm text-gray-600 mb-2">${content.request}:</p>
        <pre class="code-block mb-4"><code>curl -X PUT "${baseUrl}/api/users/123" \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "John Updated",
    "email": "john.updated@example.com"
  }'</code></pre>
        
        <p class="text-sm text-gray-600 mb-2">${content.response}:</p>
        <pre class="code-block"><code>{
  "id": 123,
  "name": "John Updated",
  "email": "john.updated@example.com",
  "updatedAt": "2024-01-15T12:00:00Z"
}</code></pre>
      </div>

      <!-- DELETE Example -->
      <div class="mb-6">
        <h3 class="text-lg font-semibold text-gray-900 mb-3">${content.deleteExample}</h3>
        <p class="text-sm text-gray-600 mb-2">${content.request}:</p>
        <pre class="code-block mb-4"><code>curl -X DELETE "${baseUrl}/api/users/123" \\
  -H "Authorization: Bearer YOUR_TOKEN"</code></pre>
        
        <p class="text-sm text-gray-600 mb-2">${content.response}:</p>
        <pre class="code-block"><code>{
  "message": "${content.successResponse}",
  "deleted": true
}</code></pre>
      </div>
    `;
  }

  private generateErrorTable(content: any): string {
    const errors = [
      { code: '200', desc: content.statusCode === 'Código' ? 'Petición exitosa' : 'Successful request' },
      { code: '201', desc: content.statusCode === 'Código' ? 'Recurso creado exitosamente' : 'Resource created successfully' },
      { code: '400', desc: content.statusCode === 'Código' ? 'Petición inválida' : 'Bad request' },
      { code: '401', desc: content.statusCode === 'Código' ? 'No autorizado - Token inválido o ausente' : 'Unauthorized - Invalid or missing token' },
      { code: '403', desc: content.statusCode === 'Código' ? 'Prohibido - Sin permisos suficientes' : 'Forbidden - Insufficient permissions' },
      { code: '404', desc: content.statusCode === 'Código' ? 'Recurso no encontrado' : 'Resource not found' },
      { code: '422', desc: content.statusCode === 'Código' ? 'Error de validación' : 'Validation error' },
      { code: '500', desc: content.statusCode === 'Código' ? 'Error interno del servidor' : 'Internal server error' },
    ];

    let html = `
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">${content.statusCode}</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">${content.description}</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
    `;

    for (const error of errors) {
      const colorClass = error.code.startsWith('2') ? 'text-green-600' : 
                        error.code.startsWith('4') ? 'text-yellow-600' : 'text-red-600';
      html += `
            <tr>
              <td class="px-6 py-4 whitespace-nowrap text-sm font-mono ${colorClass}">${error.code}</td>
              <td class="px-6 py-4 text-sm text-gray-700">${error.desc}</td>
            </tr>
      `;
    }

    html += `
          </tbody>
        </table>
      </div>
    `;

    return html;
  }

  private getMethodColor(method: string): string {
    const colors: Record<string, string> = {
      'GET': 'bg-blue-500',
      'POST': 'bg-green-500',
      'PUT': 'bg-yellow-500',
      'PATCH': 'bg-orange-500',
      'DELETE': 'bg-red-500',
    };
    return colors[method] || 'bg-gray-500';
  }

  private getBaseUrl(): string {
    const servers = this.spec['servers'] as Array<{ url: string }> || [];
    return servers[0]?.url || 'https://api.example.com';
  }

  private escapeHtml(text: string): string {
    return text.replace(/[<>"&]/g, (c) => 
      ({ '<': '&lt;', '>': '&gt;', '"': '&quot;', '&': '&amp;' }[c] ?? c)
    );
  }
}
