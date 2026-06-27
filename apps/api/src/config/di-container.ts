import 'reflect-metadata';
import { container } from 'tsyringe';

export { container };

export function registerDependencies(): void {
  // Register DI tokens here as modules are built
  // Example: container.register('LOGGER', { useValue: logger });
}
