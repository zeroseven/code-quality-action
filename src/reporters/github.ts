import * as core from '@actions/core';
import { ToolResult } from '../types';

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
};

export class GitHubReporter {
  private results: ToolResult[];

  constructor(results: ToolResult[]) {
    this.results = results;
  }

  async generateAnnotations(): Promise<void> {
    for (const result of this.results) {
      for (const issue of result.issues) {
        const properties = {
          file: issue.file,
          startLine: issue.line,
          ...(issue.column && { startColumn: issue.column }),
        };

        const message = `[${result.tool}${issue.rule ? ` - ${issue.rule}` : ''}] ${issue.message}`;

        if (issue.severity === 'error') {
          core.error(message, properties);
        } else {
          core.warning(message, properties);
        }
      }
    }
  }

  async generateSummary(): Promise<void> {
    const totalIssues = this.results.reduce((sum, r) => sum + r.issues.length, 0);

    await core.summary
      .addHeading('Code Quality Report')
      .addRaw('\n')
      .addTable([
        [
          { data: 'Tool', header: true },
          { data: 'Status', header: true },
          { data: 'Issues', header: true },
        ],
        ...this.results.map((result) => [
          result.tool,
          result.success
            ? `${colors.green}PASS${colors.reset}`
            : `${colors.red}FAIL${colors.reset}`,
          result.issues.length.toString(),
        ]),
        ['', 'Total', totalIssues.toString()],
      ])
      .write();

    if (totalIssues > 0) {
      core.info(`${colors.yellow}Found ${totalIssues} code quality issues across all tools${colors.reset}`);

      // Add detailed breakdown by tool
      for (const result of this.results) {
        if (result.issues.length > 0) {
          core.startGroup(`${colors.cyan}${result.tool}: ${result.issues.length} issues${colors.reset}`);

          const errorCount = result.issues.filter((i) => i.severity === 'error').length;
          const warningCount = result.issues.filter((i) => i.severity === 'warning').length;

          core.info(
            `${colors.red}Errors: ${errorCount}${colors.reset}, ${colors.yellow}Warnings: ${warningCount}${colors.reset}`
          );

          // Group issues by file
          const issuesByFile = result.issues.reduce(
            (acc, issue) => {
              if (!acc[issue.file]) {
                acc[issue.file] = [];
              }
              acc[issue.file].push(issue);
              return acc;
            },
            {} as Record<string, typeof result.issues>
          );

          for (const [file, issues] of Object.entries(issuesByFile)) {
            core.info(`  ${colors.dim}${file}: ${issues.length} issue(s)${colors.reset}`);
          }

          core.endGroup();
        }
      }
    } else {
      core.info(`${colors.green}No code quality issues found!${colors.reset}`);
    }
  }

  getReport(): string {
    const report = {
      totalIssues: this.results.reduce((sum, r) => sum + r.issues.length, 0),
      results: this.results.map((result) => ({
        tool: result.tool,
        success: result.success,
        issueCount: result.issues.length,
        errors: result.issues.filter((i) => i.severity === 'error').length,
        warnings: result.issues.filter((i) => i.severity === 'warning').length,
        issues: result.issues,
      })),
    };

    return JSON.stringify(report, null, 2);
  }
}
