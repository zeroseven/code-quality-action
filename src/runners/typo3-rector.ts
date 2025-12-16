import * as core from '@actions/core';
import { ToolRunner, RunnerConfig, ToolResult, Issue } from '../types';
import { executeCommand } from '../utils/exec';

export class Typo3RectorRunner implements ToolRunner {
  async run(config: RunnerConfig): Promise<ToolResult> {
    core.info('Running TYPO3 Rector...');

    const args = ['process', '--dry-run', '--output-format=json'];

    if (config.configPath) {
      args.push('--config', config.configPath);
    }

    if (config.filePaths.length > 0) {
      args.push(...config.filePaths);
    }

    const result = await executeCommand('vendor/bin/rector', args, config.workingDirectory);

    const issues: Issue[] = [];

    if (result.stdout) {
      try {
        const output = JSON.parse(result.stdout);

        // Rector JSON output has a structure with file diffs
        if (output.totals && output.totals.changed_files > 0) {
          // Parse file changes
          if (output.file_diffs) {
            for (const fileDiff of output.file_diffs) {
              if (fileDiff.diffs && fileDiff.diffs.length > 0) {
                for (const diff of fileDiff.diffs) {
                  issues.push({
                    file: fileDiff.file,
                    line: 1,
                    severity: 'warning',
                    message: `Rector suggests changes: ${diff.message || 'Code can be refactored'}`,
                    rule: diff.rector_class || 'typo3-rector',
                  });
                }
              } else {
                // If no detailed diffs, just report the file needs changes
                issues.push({
                  file: fileDiff.file,
                  line: 1,
                  severity: 'warning',
                  message: 'File has refactoring opportunities',
                  rule: 'typo3-rector',
                });
              }
            }
          }
        }
      } catch (error) {
        // If JSON parsing fails, try to parse text output
        core.warning(`Failed to parse Rector JSON output: ${error}`);

        // Fallback to text parsing
        const lines = result.stdout.split('\n');
        for (const line of lines) {
          if (line.includes('[FILE]') || line.match(/^\s*\d+\)/)) {
            const fileMatch = line.match(/([^\s]+\.php)/);
            if (fileMatch) {
              issues.push({
                file: fileMatch[1],
                line: 1,
                severity: 'warning',
                message: 'Rector suggests refactoring for this file',
                rule: 'typo3-rector',
              });
            }
          }
        }
      }
    }

    return {
      tool: 'TYPO3 Rector',
      success: result.exitCode === 0,
      issues,
      rawOutput: result.stdout + result.stderr,
    };
  }
}
