// src/decorators/routing/UseGuards.ts

import { MetadataStore, type GuardCtor } from '../../core/MetadataStore';

/**
 * Applies guards to a controller class or individual method.
 *
 * @example
 * @Controller('admin')
 * @UseGuards(AuthGuard)
 * class AdminController { ... }
 *
 * @Post('secret')
 * @UseGuards(RoleGuard)
 * secretRoute(req: MikroRequest) { ... }
 */
export function UseGuards(...guards: GuardCtor[]): ClassDecorator & MethodDecorator {
  return (target: Object | Function, propertyKey?: string | symbol) => {
    if (propertyKey === undefined) {
      // Class decorator
      MetadataStore.setClassGuards(target as Function, guards);
    } else {
      // Method decorator
      MetadataStore.setMethodGuards(
        (target as Object).constructor,
        String(propertyKey),
        guards,
      );
    }
  };
}
