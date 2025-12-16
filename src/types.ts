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
