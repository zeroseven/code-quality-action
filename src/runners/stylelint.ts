import * as core from '@actions/core';
import { ToolRunner, RunnerConfig, ToolResult, Issue } from '../types';
import { executeCommand } from '../utils/exec';

export class StylelintRunner implements ToolRunner {
  async run(config: RunnerConfig): Promise<ToolResult> {
    core.info('Running Stylelint...');

    const args = ['--formatter=json'];

    if (config.configPath) {
      args.push('--config', config.configPath);
    }

    if (config.filePaths.length > 0) {
      args.push(...config.filePaths);
    } else {
      args.push('**/*.{css,scss}');
    }

    const result = await executeCommand('npx', ['stylelint', ...args], config.workingDirectory);

    const issues: Issue[] = [];

    if (result.stdout) {
      try {
        const output = JSON.parse(result.stdout);

        if (Array.isArray(output)) {
          for (const fileData of output) {
            if (fileData.warnings) {
              for (const warning of fileData.warnings) {
                issues.push({
                  file: fileData.source,
                  line: warning.line || 1,
                  column: warning.column,
                  severity: warning.severity === 'error' ? 'error' : 'warning',
                  message: warning.text,
                  rule: warning.rule,
                });
              }
            }
          }
        }
      } catch (error) {
        core.warning(`Failed to parse Stylelint output: ${error}`);
      }
    }

    return {
      tool: 'Stylelint',
      success: result.exitCode === 0,
      issues,
      rawOutput: result.stdout + result.stderr,
    };
  }
}
