export interface ToolRunner {
  run(config: RunnerConfig): Promise<ToolResult>;
}

export interface RunnerConfig {
  configPath?: string;
  filePaths: string[];
  workingDirectory: string;
}

export interface ToolResult {
  tool: string;
  success: boolean;
  issues: Issue[];
  rawOutput: string;
}

export interface Issue {
  file: string;
  line: number;
  column?: number;
  severity: 'error' | 'warning';
  message: string;
  rule?: string;
}

export type ToolName =
  | 'phpstan'
  | 'phpmd'
  | 'php-cs-fixer'
  | 'eslint'
  | 'stylelint'
  | 'editorconfig'
  | 'composer-normalize'
  | 'typo3-rector';

// Tool-specific output types
export interface PHPStanOutput {
  totals?: {
    errors: number;
    file_errors: number;
  };
  files?: Record<string, PHPStanFileData>;
}

export interface PHPStanFileData {
  errors: number;
  messages: PHPStanMessage[];
}

export interface PHPStanMessage {
  message: string;
  line: number;
  column?: number;
  ignorable?: boolean;
}

export interface PHPMDOutput {
  files?: PHPMDFile[];
}

export interface PHPMDFile {
  file: string;
  violations: PHPMDViolation[];
}

export interface PHPMDViolation {
  beginLine: number;
  beginColumn?: number;
  endLine?: number;
  endColumn?: number;
  rule: string;
  ruleset: string;
  priority: number;
  description: string;
}

export interface ESLintOutput {
  filePath: string;
  messages: ESLintMessage[];
  errorCount: number;
  warningCount: number;
}

export interface ESLintMessage {
  ruleId: string;
  severity: number;
  message: string;
  line: number;
  column: number;
}

export interface StylelintOutput {
  source: string;
  warnings: StylelintWarning[];
  errored: boolean;
}

export interface StylelintWarning {
  line: number;
  column: number;
  rule: string;
  severity: string;
  text: string;
}
