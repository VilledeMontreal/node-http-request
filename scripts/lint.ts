import { ScriptBase } from '@villedemontreal/scripting/dist/src';
import { resolve } from 'path';
import { configs } from '../config/configs';
export class LintScript extends ScriptBase {
  get name(): string {
    return 'lint';
  }

  get description(): string {
    return `Run the ESLint validation (including ESLint and Prettier rules).`;
  }

  protected async main() {
    const projectRoot = resolve(`${configs.root}/..`);
    await this.invokeShellCommand(`${projectRoot}/node_modules/.bin/eslint`, [projectRoot]);
  }
}
