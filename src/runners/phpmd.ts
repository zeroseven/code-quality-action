import * as core from '@actions/core';
import { ToolRunner, RunnerConfig, ToolResult, Issue } from '../types';
import { executeCommand } from '../utils/exec';

export class PHPMDRunner implements ToolRunner {
  async run(config: RunnerConfig): Promise<ToolResult> {
    core.info('Running PHPMD...');

    const paths = config.filePaths.length > 0 ? config.filePaths.join(',') : '.';
    const args = [paths, 'json'];

    if (config.configPath) {
      args.push(config.configPath);
    } else {
      args.push('cleancode,codesize,controversial,design,naming,unusedcode');
    }

    const result = await executeCommand('vendor/bin/phpmd', args, config.workingDirectory);

    const issues: Issue[] = [];

    if (result.stdout) {
      try {
        const output = JSON.parse(result.stdout);

        if (output.files) {
          for (const fileData of output.files) {
            if (fileData.violations) {
              for (const violation of fileData.violations) {
                issues.push({
                  file: fileData.file,
                  line: violation.beginLine || 1,
                  column: violation.beginColumn,
                  severity: violation.priority <= 3 ? 'error' : 'warning',
                  message: violation.description,
                  rule: violation.rule,
                });
              }
            }
          }
        }
      } catch (error) {
        core.warning(`Failed to parse PHPMD output: ${error}`);
      }
    }

    return {
      tool: 'PHPMD',
      success: result.exitCode === 0,
      issues,
      rawOutput: result.stdout + result.stderr,
    };
  }
}
