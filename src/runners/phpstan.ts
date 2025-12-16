import * as core from '@actions/core';
import { ToolRunner, RunnerConfig, ToolResult, Issue, PHPStanOutput } from '../types';
import { executeCommand } from '../utils/exec';

export class PHPStanRunner implements ToolRunner {
  async run(config: RunnerConfig): Promise<ToolResult> {
    core.info('Running PHPStan...');

    const args = ['analyze', '--error-format=json', '--no-progress'];

    if (config.configPath) {
      args.push('-c', config.configPath);
    }

    if (config.filePaths.length > 0) {
      args.push(...config.filePaths);
    }

    const result = await executeCommand('vendor/bin/phpstan', args, config.workingDirectory);

    const issues: Issue[] = [];

    if (result.stdout) {
      try {
        const output: PHPStanOutput = JSON.parse(result.stdout);

        if (output.files) {
          for (const [file, fileData] of Object.entries(output.files)) {
            if (fileData.messages) {
              for (const message of fileData.messages) {
                issues.push({
                  file,
                  line: message.line || 1,
                  column: message.column,
                  severity: 'error',
                  message: message.message,
                  rule: 'phpstan',
                });
              }
            }
          }
        }
      } catch (error) {
        core.warning(`Failed to parse PHPStan output: ${error}`);
      }
    }

    return {
      tool: 'PHPStan',
      success: result.exitCode === 0,
      issues,
      rawOutput: result.stdout + result.stderr,
    };
  }
}
