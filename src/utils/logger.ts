import * as core from '@actions/core';

export class Logger {
  debug(message: string): void {
    core.debug(message);
  }

  info(message: string): void {
    core.info(message);
  }

  warning(message: string): void {
    core.warning(message);
  }

  error(message: string): void {
    core.error(message);
  }

  group(name: string): void {
    core.startGroup(name);
  }

  endGroup(): void {
    core.endGroup();
  }
}
