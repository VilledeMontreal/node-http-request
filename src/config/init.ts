import { ILogger } from '@villedemontreal/logger';
import * as _ from 'lodash';
import { configs } from './configs';

let libIsInited: boolean = false;

/**
 * Inits the library.
 */
export function init(
  loggerCreator: (name: string) => ILogger,
  correlationIdProvider: () => string,
  /**
   * The case sensitivity to use for the URLs.
   *
   * In an API based on "@villemontreal/generator-mtl-node-api",
   * you need to pass `configs.routing.caseSensitive` here!
   */
  urlCaseSensitive: boolean
): void {
  if (!loggerCreator) {
    throw new Error(`The Logger Creator is required.`);
  }

  if (!correlationIdProvider) {
    throw new Error(`The Correlation Id provider is required.`);
  }

  if (_.isNil(urlCaseSensitive)) {
    throw new Error(`The Case Sensitivity to use for the URLs is required.`);
  }

  configs.setLoggerCreator(loggerCreator);
  configs.setCorrelationIdProvider(correlationIdProvider);
  configs.setUrlCaseSensitive(urlCaseSensitive);

  // ==========================================
  // Set as being "properly initialized".
  // At the very end of the "init()" function!
  // ==========================================
  libIsInited = true;
}

/**
 * Is the library properly initialized?
 *
 * This function MUST be named "isInited()"!
 * Code using this library may loop over all its "@villemontreal"
 * dependencies and, if one of those exports a "isInited" fonction,
 * it will enforce that the lib has been properly initialized before
 * starting...
 */
export function isInited(): boolean {
  return libIsInited;
}
