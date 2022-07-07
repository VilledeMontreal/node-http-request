import { ILogger, initLogger, LazyLogger, Logger, LoggerConfigs, LogLevel } from '@villedemontreal/logger';
import { configs } from '../config/configs';

let testingLoggerLibInitialised = false;

/**
 * Creates a Logger.
 */
export function createLogger(name: string): ILogger {
  // ==========================================
  // We use a LazyLogger so the real Logger
  // is only created when the first
  // log is actually performed... At that point,
  // our "configs.loggerCreator" configuration
  // must have been set by the code using our library!
  //
  // This pattern allows calling code to import
  // modules from us in which a logger is
  // created in the global scope :
  //
  // let logger = createLogger('someName');
  //
  // Without a Lazy Logger, the library configurations
  // would at that moment *not* have been set yet
  // (by the calling code) and an Error would be thrown
  // because the "configs.loggerCreator" is required.
  // ==========================================
  return new LazyLogger(name, (nameArg: string) => {
    return configs.loggerCreator(nameArg);
  });
}

function initTestingLoggerConfigs() {
  const loggerConfig: LoggerConfigs = new LoggerConfigs(() => 'test-cid');
  loggerConfig.setLogLevel(LogLevel.DEBUG);
  initLogger(loggerConfig);
}

/**
 * A Logger that uses a dummy cid provider.
 *
 * Only use this when running the tests!
 */
export function getTestingLoggerCreator(): (name: string) => ILogger {
  return (name: string): ILogger => {
    if (!testingLoggerLibInitialised) {
      initTestingLoggerConfigs();
      testingLoggerLibInitialised = true;
    }

    return new Logger(name);
  };
}
