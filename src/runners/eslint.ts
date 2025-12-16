import * as core from '@actions/core';
import { ToolRunner, RunnerConfig, ToolResult, Issue } from '../types';
import { executeCommand } from '../utils/exec';

export class ESLintRunner implements ToolRunner {
  async run(config: RunnerConfig): Promise<ToolResult> {
    core.info('Running ESLint...');

    const args = ['--format=json'];

    if (config.configPath) {
      args.push('-c', config.configPath);
    }

    if (config.filePaths.length > 0) {
      args.push(...config.filePaths);
    } else {
      args.push('.');
    }

    const result = await executeCommand('npx', ['eslint', ...args], config.workingDirectory);

    const issues: Issue[] = [];

    if (result.stdout) {
      try {
        const output = JSON.parse(result.stdout);

        if (Array.isArray(output)) {
          for (const fileData of output) {
            if (fileData.messages) {
              for (const message of fileData.messages) {
                issues.push({
                  file: fileData.filePath,
                  line: message.line || 1,
                  column: message.column,
                  severity: message.severity === 2 ? 'error' : 'warning',
                  message: message.message,
                  rule: message.ruleId,
                });
              }
            }
          }
        }
      } catch (error) {
        core.warning(`Failed to parse ESLint output: ${error}`);
      }
    }

    return {
      tool: 'ESLint',
      success: result.exitCode === 0,
      issues,
      rawOutput: result.stdout + result.stderr,
    };
  }
}
