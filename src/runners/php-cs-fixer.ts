import * as core from '@actions/core';
import { ToolRunner, RunnerConfig, ToolResult, Issue } from '../types';
import { executeCommand } from '../utils/exec';

export class PHPCSFixerRunner implements ToolRunner {
  async run(config: RunnerConfig): Promise<ToolResult> {
    core.info('Running PHP-CS-Fixer...');

    const args = ['fix', '--dry-run', '--format=json', '--diff'];

    if (config.configPath) {
      args.push(`--config=${config.configPath}`);
    }

    if (config.filePaths.length > 0) {
      args.push(...config.filePaths);
    }

    const result = await executeCommand('vendor/bin/php-cs-fixer', args, config.workingDirectory);

    const issues: Issue[] = [];

    if (result.stdout) {
      try {
        const output = JSON.parse(result.stdout);

        if (output.files) {
          for (const fileData of output.files) {
            if (fileData.diff) {
              issues.push({
                file: fileData.name,
                line: 1,
                severity: 'warning',
                message: `Code style issues found. ${fileData.appliedFixers?.join(', ') || 'See diff for details'}`,
                rule: 'php-cs-fixer',
              });
            }
          }
        }
      } catch (error) {
        core.warning(`Failed to parse PHP-CS-Fixer output: ${error}`);
      }
    }

    return {
      tool: 'PHP-CS-Fixer',
      success: result.exitCode === 0,
      issues,
      rawOutput: result.stdout + result.stderr,
    };
  }
}
