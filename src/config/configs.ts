import { ILogger } from '@villedemontreal/logger';
import * as _ from 'lodash';

/**
 * Http Client Config
 */
export class Configs {
  private _correlationIdProvider: () => string;
  private _loggerCreator: (name: string) => ILogger;
  private _urlCaseSensitive: boolean;

  /**
   * Sets the Logger creator.
   */
  public setLoggerCreator(loggerCreator: (name: string) => ILogger) {
    this._loggerCreator = loggerCreator;
  }

  /**
   * The Logger creator
   */
  get loggerCreator(): (name: string) => ILogger {
    if (!this._loggerCreator) {
      throw new Error(`The Logger Creator HAS to be set as a configuration! Please call the init(...) function first.`);
    }
    return this._loggerCreator;
  }

  /**
   * Sets the Correlation Id provider.
   */
  public setCorrelationIdProvider(correlationIdProvider: () => string) {
    this._correlationIdProvider = correlationIdProvider;
  }

  /**
   * The Correlation Id provider
   */
  get correlationIdProvider(): () => string {
    if (!this._correlationIdProvider) {
      throw new Error(
        `The Correlation Id provider HAS to be set as a configuration! Please call the init(...) function first.`
      );
    }
    return this._correlationIdProvider;
  }

  /**
   * The current Correlation Id.
   */
  get correlationId(): string {
    return this.correlationIdProvider();
  }

  /**
   * Sets the case sensitivity to use for the URLs.
   */
  public setUrlCaseSensitive(urlCaseSensitive: boolean) {
    this._urlCaseSensitive = urlCaseSensitive;
  }

  /**
   * Routing info
   */
  get isUrlCaseSensitive() {
    if (_.isNil(this._urlCaseSensitive)) {
      throw new Error(
        `The Case Sensitivity to use for the URLs HAS to be set as a configuration! Please call the init(...) function first.`
      );
    }
    return this._urlCaseSensitive;
  }
}
export let configs: Configs = new Configs();
