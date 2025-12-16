import * as core from '@actions/core';
import { ToolRunner, RunnerConfig, ToolResult, Issue } from '../types';
import { executeCommand } from '../utils/exec';

export class EditorConfigRunner implements ToolRunner {
  async run(config: RunnerConfig): Promise<ToolResult> {
    core.info('Running EditorConfig CLI...');

    const args = ['check'];

    // EditorConfig CLI checks all files by default based on .editorconfig
    // We can pass specific paths if needed
    if (config.filePaths.length > 0) {
      args.push(...config.filePaths);
    }

    const result = await executeCommand(
      'vendor/bin/editorconfig-cli',
      args,
      config.workingDirectory
    );

    const issues: Issue[] = [];

    // Parse output for violations
    // EditorConfig CLI outputs violations in format: "filename: line: message"
    if (result.stdout || result.stderr) {
      const output = result.stdout + result.stderr;
      const lines = output.split('\n');

      for (const line of lines) {
        // Match patterns like: "path/to/file.php:123: violation message"
        const match = line.match(/^(.+?):(\d+):\s*(.+)$/);
        if (match) {
          issues.push({
            file: match[1],
            line: parseInt(match[2], 10),
            severity: 'warning',
            message: match[3],
            rule: 'editorconfig',
          });
        } else if (line.includes('✗') || line.toLowerCase().includes('error')) {
          // Fallback for general error messages
          const fileMatch = line.match(/(.+?\.(php|js|ts|css|scss|html|json|yaml|yml))/);
          if (fileMatch) {
            issues.push({
              file: fileMatch[1],
              line: 1,
              severity: 'warning',
              message: line.trim(),
              rule: 'editorconfig',
            });
          }
        }
      }
    }

    return {
      tool: 'EditorConfig',
      success: result.exitCode === 0,
      issues,
      rawOutput: result.stdout + result.stderr,
    };
  }
}
