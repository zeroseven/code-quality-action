import * as core from '@actions/core';
import { ToolName, ToolResult } from './types';
import { resolveConfig } from './config/resolver';
import { findFiles } from './utils/glob';
import { checkToolAvailability, logToolNotFound } from './utils/toolCheck';
import { PHPStanRunner } from './runners/phpstan';
import { PHPMDRunner } from './runners/phpmd';
import { PHPCSFixerRunner } from './runners/php-cs-fixer';
import { ESLintRunner } from './runners/eslint';
import { StylelintRunner } from './runners/stylelint';
import { EditorConfigRunner } from './runners/editorconfig';
import { ComposerNormalizeRunner } from './runners/composer-normalize';
import { Typo3RectorRunner } from './runners/typo3-rector';
import { GitHubReporter } from './reporters/github';
import { CacheManager } from './cache/CacheManager';
import { Logger } from './utils/logger';

interface ActionInputs {
  tools: ToolName[];
  phpPaths: string;
  jsPaths: string;
  stylePaths: string;
  phpstanConfig?: string;
  phpmdConfig?: string;
  phpCsFixerConfig?: string;
  eslintConfig?: string;
  stylelintConfig?: string;
  editorconfigConfig?: string;
  composerNormalizeConfig?: string;
  typo3RectorConfig?: string;
  failOnErrors: boolean;
  workingDirectory: string;
  cacheEnabled: boolean;
  cacheKeyPrefix: string;
  cacheComposerCache: boolean;
  cacheComposerVendor: boolean;
  cacheNpmCache: boolean;
  cacheNodeModules: boolean;
}

function parseInputs(): ActionInputs {
  const toolsInput = core.getInput('tools').toLowerCase();
  // Note: typo3-rector is not included in 'all' - it must be explicitly specified
  const allTools: ToolName[] = [
    'phpstan',
    'phpmd',
    'php-cs-fixer',
    'eslint',
    'stylelint',
    'editorconfig',
    'composer-normalize',
  ];

  let tools: ToolName[];
  if (toolsInput === 'all' || toolsInput === '') {
    tools = allTools;
  } else {
    tools = toolsInput.split(',').map((t) => t.trim() as ToolName);
  }

  return {
    tools,
    phpPaths: core.getInput('php-paths') || '**/*.php',
    jsPaths: core.getInput('js-paths') || '**/*.{js,ts,jsx,tsx}',
    stylePaths: core.getInput('style-paths') || '**/*.{css,scss}',
    phpstanConfig: core.getInput('phpstan-config') || undefined,
    phpmdConfig: core.getInput('phpmd-config') || undefined,
    phpCsFixerConfig: core.getInput('php-cs-fixer-config') || undefined,
    eslintConfig: core.getInput('eslint-config') || undefined,
    stylelintConfig: core.getInput('stylelint-config') || undefined,
    editorconfigConfig: core.getInput('editorconfig-config') || undefined,
    composerNormalizeConfig: core.getInput('composer-normalize-config') || undefined,
    typo3RectorConfig: core.getInput('typo3-rector-config') || undefined,
    failOnErrors: core.getInput('fail-on-errors').toLowerCase() !== 'false',
    workingDirectory: core.getInput('working-directory') || '.',
    cacheEnabled: core.getInput('cache-enabled').toLowerCase() !== 'false',
    cacheKeyPrefix: core.getInput('cache-key-prefix') || 'code-quality-action',
    cacheComposerCache: core.getInput('cache-composer-cache').toLowerCase() !== 'false',
    cacheComposerVendor: core.getInput('cache-composer-vendor').toLowerCase() === 'true',
    cacheNpmCache: core.getInput('cache-npm-cache').toLowerCase() !== 'false',
    cacheNodeModules: core.getInput('cache-node-modules').toLowerCase() === 'true',
  };
}

async function runTool(tool: ToolName, inputs: ActionInputs): Promise<ToolResult | null> {
  try {
    // Check if tool is available
    const isAvailable = await checkToolAvailability(tool, inputs.workingDirectory);
    if (!isAvailable) {
      logToolNotFound(tool);
      return null;
    }

    let runner;
    let filePaths: string[] = [];
    let configPath: string | undefined;

    switch (tool) {
      case 'phpstan':
        runner = new PHPStanRunner();
        filePaths = await findFiles(inputs.phpPaths, inputs.workingDirectory);
        configPath = resolveConfig('phpstan', inputs.phpstanConfig, inputs.workingDirectory);
        break;

      case 'phpmd':
        runner = new PHPMDRunner();
        filePaths = await findFiles(inputs.phpPaths, inputs.workingDirectory);
        configPath = resolveConfig('phpmd', inputs.phpmdConfig, inputs.workingDirectory);
        break;

      case 'php-cs-fixer':
        runner = new PHPCSFixerRunner();
        filePaths = await findFiles(inputs.phpPaths, inputs.workingDirectory);
        configPath = resolveConfig(
          'php-cs-fixer',
          inputs.phpCsFixerConfig,
          inputs.workingDirectory
        );
        break;

      case 'eslint':
        runner = new ESLintRunner();
        filePaths = await findFiles(inputs.jsPaths, inputs.workingDirectory);
        configPath = resolveConfig('eslint', inputs.eslintConfig, inputs.workingDirectory);
        break;

      case 'stylelint':
        runner = new StylelintRunner();
        filePaths = await findFiles(inputs.stylePaths, inputs.workingDirectory);
        configPath = resolveConfig('stylelint', inputs.stylelintConfig, inputs.workingDirectory);
        break;

      case 'editorconfig':
        runner = new EditorConfigRunner();
        // EditorConfig checks all files based on .editorconfig rules
        // We can pass specific paths or let it check everything
        filePaths = ['.']; // Check working directory
        configPath = resolveConfig(
          'editorconfig',
          inputs.editorconfigConfig,
          inputs.workingDirectory
        );
        break;

      case 'composer-normalize':
        runner = new ComposerNormalizeRunner();
        // Composer normalize works on composer.json
        filePaths = ['composer.json'];
        configPath = resolveConfig(
          'composer-normalize',
          inputs.composerNormalizeConfig,
          inputs.workingDirectory
        );
        break;

      case 'typo3-rector':
        runner = new Typo3RectorRunner();
        filePaths = await findFiles(inputs.phpPaths, inputs.workingDirectory);
        configPath = resolveConfig(
          'typo3-rector',
          inputs.typo3RectorConfig,
          inputs.workingDirectory
        );
        break;

      default:
        core.warning(`Unknown tool: ${tool}`);
        return null;
    }

    if (filePaths.length === 0) {
      core.info(`No files found for ${tool}, skipping...`);
      return {
        tool,
        success: true,
        issues: [],
        rawOutput: '',
      };
    }

    core.info(`Found ${filePaths.length} files to check with ${tool}`);

    return await runner.run({
      configPath,
      filePaths,
      workingDirectory: inputs.workingDirectory,
    });
  } catch (error) {
    core.error(`Error running ${tool}: ${error}`);
    return {
      tool,
      success: false,
      issues: [],
      rawOutput: error instanceof Error ? error.message : String(error),
    };
  }
}

async function run(): Promise<void> {
  const logger = new Logger();
  let cacheManager: CacheManager | null = null;

  try {
    const inputs = parseInputs();

    // Initialize cache manager
    if (inputs.cacheEnabled) {
      cacheManager = new CacheManager(
        {
          enabled: inputs.cacheEnabled,
          keyPrefix: inputs.cacheKeyPrefix,
          composerCache: inputs.cacheComposerCache,
          composerVendor: inputs.cacheComposerVendor,
          npmCache: inputs.cacheNpmCache,
          nodeModules: inputs.cacheNodeModules,
        },
        inputs.workingDirectory,
        logger
      );

      // Restore cache before running tools
      await cacheManager.restore();
    }

    core.info('Starting code quality checks...');
    core.info(`Tools to run: ${inputs.tools.join(', ')}`);

    const results: ToolResult[] = [];

    for (const tool of inputs.tools) {
      const result = await runTool(tool, inputs);
      if (result) {
        results.push(result);
      }
    }

    const reporter = new GitHubReporter(results);
    await reporter.generateAnnotations();
    await reporter.generateSummary();

    const totalIssues = results.reduce((sum, r) => sum + r.issues.length, 0);
    const report = reporter.getReport();

    core.setOutput('total-issues', totalIssues);
    core.setOutput('status', totalIssues > 0 ? 'failed' : 'success');
    core.setOutput('report', report);

    // Save cache after running tools (only if no cache hit)
    if (cacheManager) {
      await cacheManager.save();
    }

    if (inputs.failOnErrors && totalIssues > 0) {
      core.setFailed(`Found ${totalIssues} code quality issues`);
    } else if (totalIssues > 0) {
      core.warning(`Found ${totalIssues} code quality issues (not failing due to configuration)`);
    } else {
      core.info('All code quality checks passed!');
    }
  } catch (error) {
    core.setFailed(`Action failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

run();
