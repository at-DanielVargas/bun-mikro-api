// src/core/Router.ts

import { MetadataStore } from './MetadataStore';
import { MikroRequest } from './MikroRequest';
import { MikroResponse } from './MikroResponse';
import { Validator } from '../validation/Validator';

interface RouteEntry {
  method: string;
  pattern: string;
  regex: RegExp;
  paramNames: string[];
  Controller: new () => Record<string, (req: MikroRequest<unknown>) => unknown>;
  action: string;
  guards: Array<new () => { canActivate(req: MikroRequest<unknown>): boolean | Promise<boolean>; deny(): Response }>;
  DtoClass: (new () => import('../validation/RequestDto').RequestDto) | null;
}

export class Router<Env = {}> {
  private routes: RouteEntry[] = [];

  /* ------------------------------------------------------------------ */
  /*  Registration                                                        */
  /* ------------------------------------------------------------------ */

  registerController(ControllerClass: new () => unknown): void {
    const ctrlMeta  = MetadataStore.getController(ControllerClass);
    const prefix    = ctrlMeta ? `/${ctrlMeta.prefix}` : '';
    const classGs   = MetadataStore.getClassGuards(ControllerClass);
    const routeMap  = MetadataStore.getRoutes(ControllerClass);

    for (const [methodName, routeMeta] of routeMap) {
      const methodGs  = MetadataStore.getMethodGuards(ControllerClass, methodName);
      const DtoClass  = MetadataStore.getBody(ControllerClass, methodName) ?? null;

      const path = routeMeta.path ? `${prefix}/${routeMeta.path}` : prefix || '/';
      const normalised = path.replace(/\/+/g, '/').replace(/\/$/, '') || '/';

      const [regex, paramNames] = this.buildRegex(normalised);

      this.routes.push({
        method:      routeMeta.method,
        pattern:     normalised,
        regex,
        paramNames,
        Controller:  ControllerClass as new () => Record<string, (req: MikroRequest<unknown>) => unknown>,
        action:      methodName,
        guards:      [...classGs, ...methodGs] as RouteEntry['guards'],
        DtoClass,
      });
    }

    // Sort so specific (static) routes are matched before parameterised ones.
    // Fewer params = higher priority; tie-break by longer pattern first.
    this.routes.sort((a, b) => {
      if (a.paramNames.length !== b.paramNames.length) {
        return a.paramNames.length - b.paramNames.length;
      }
      return b.pattern.length - a.pattern.length;
    });
  }

  /* ------------------------------------------------------------------ */
  /*  Dispatch                                                            */
  /* ------------------------------------------------------------------ */

  async dispatch(request: MikroRequest<Env>): Promise<Response> {
    for (const route of this.routes) {
      if (route.method !== request.method) continue;

      const match = route.regex.exec(request.path);
      if (!match) continue;

      // Extract path params
      for (const name of route.paramNames) {
        request.params[name] = match.groups?.[name] ?? '';
      }

      // Run guards
      for (const GuardClass of route.guards) {
        const guard = new GuardClass();
        const allowed = await guard.canActivate(request as unknown as MikroRequest<unknown>);
        if (!allowed) return guard.deny();
      }

      // Validate body DTO
      if (route.DtoClass !== null) {
        const validator = new Validator();
        const dto = validator.validate(route.DtoClass, request.body);

        if (validator.hasErrors()) {
          return MikroResponse.json(
            { error: 'Validation failed', errors: validator.getErrors() },
            422,
          );
        }

        request.dto = dto;
      }

      // Invoke controller method
      const controller = new route.Controller();
      const result = await Promise.resolve(controller[route.action](request as unknown as MikroRequest<unknown>));

      if (result instanceof Response) return result;
      return MikroResponse.json(result);
    }

    return MikroResponse.error('Not Found', 404);
  }

  /* ------------------------------------------------------------------ */
  /*  Helpers                                                             */
  /* ------------------------------------------------------------------ */

  /**
   * Convert /users/:id/posts/:postId
   * into a named-group regex: /users/(?<id>[^/]+)/posts/(?<postId>[^/]+)
   */
  private buildRegex(pattern: string): [RegExp, string[]] {
    const paramNames: string[] = [];
    const regexStr = pattern.replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g, (_, name) => {
      paramNames.push(name);
      return `(?<${name}>[^/]+)`;
    });
    return [new RegExp(`^${regexStr}$`), paramNames];
  }
}
