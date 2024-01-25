import * as path from 'path';

/**
 * Configurations for the application.
 */
class Configs {
  /**
   * Absolute path to the root of the project.
   */
  public root: string;

  /**
   * Absolute path to a directory to use for tests.
   */
  public dataDirPath: string;

  constructor() {
    this.root = path.normalize(`${__dirname}/..`);
    this.dataDirPath = `${this.root}/test-data`;
  }
}

export const configs: Configs = new Configs();
