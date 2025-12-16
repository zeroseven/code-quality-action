import * as core from '@actions/core';
import { ToolRunner, RunnerConfig, ToolResult, Issue } from '../types';
import { executeCommand } from '../utils/exec';

export class ComposerNormalizeRunner implements ToolRunner {
  async run(config: RunnerConfig): Promise<ToolResult> {
    core.info('Running Composer Normalize...');

    const args = ['normalize', '--dry-run'];

    // Check if a specific composer.json path was provided
    if (config.configPath) {
      args.push(config.configPath);
    }

    const result = await executeCommand('composer', args, config.workingDirectory);

    const issues: Issue[] = [];

    // If exit code is not 0, composer.json needs normalization
    if (result.exitCode !== 0) {
      const composerPath = config.configPath || 'composer.json';

      // Parse the diff output to understand what needs to be normalized
      if (result.stdout || result.stderr) {
        const output = result.stdout + result.stderr;

        if (output.includes('is not normalized') || output.includes('Successfully normalized')) {
          issues.push({
            file: composerPath,
            line: 1,
            severity: 'warning',
            message: 'composer.json is not normalized. Run "composer normalize" to fix.',
            rule: 'composer-normalize',
          });
        }

        // Check for specific normalization issues in the diff
        if (output.includes('--- original') || output.includes('+++ normalized')) {
          issues.push({
            file: composerPath,
            line: 1,
            severity: 'warning',
            message: 'composer.json has formatting or ordering issues. See diff for details.',
            rule: 'composer-normalize',
          });
        }
      } else {
        // Generic issue if we don't have detailed output
        issues.push({
          file: composerPath,
          line: 1,
          severity: 'warning',
          message: 'composer.json requires normalization',
          rule: 'composer-normalize',
        });
      }
    }

    return {
      tool: 'Composer Normalize',
      success: result.exitCode === 0,
      issues,
      rawOutput: result.stdout + result.stderr,
    };
  }
}
