/**
 * Dependency Injection container setup
 * Uses TSyringe for DI
 */

import 'reflect-metadata';
import { container } from 'tsyringe';
import { ILogger, ConsoleLogger } from '../logger/Logger';
import { InMemoryEventBus } from '../events/EventBus';

// Register core services
container.registerSingleton<ILogger>('ILogger', ConsoleLogger);
container.registerSingleton<InMemoryEventBus>(
  'IEventBus',
  InMemoryEventBus
);

export { container };

