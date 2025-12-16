import * as fs from 'fs';
import * as path from 'path';
import * as core from '@actions/core';
import { ToolName } from '../types';

const CONFIG_FILENAMES: Record<ToolName, string[]> = {
  phpstan: ['phpstan.neon', 'phpstan.neon.dist'],
  phpmd: ['phpmd.xml', 'phpmd.xml.dist'],
  'php-cs-fixer': ['.php-cs-fixer.php', '.php-cs-fixer.dist.php'],
  eslint: ['.eslintrc.json', '.eslintrc.js', '.eslintrc.yml', 'eslint.config.js'],
  stylelint: ['.stylelintrc.json', '.stylelintrc.js', 'stylelint.config.js'],
  editorconfig: ['.editorconfig'],
  'composer-normalize': ['composer.json'],
  'typo3-rector': ['rector.php'],
};

const DEFAULT_CONFIGS: Record<ToolName, string> = {
  phpstan: path.join(__dirname, 'defaults', 'phpstan.neon'),
  phpmd: path.join(__dirname, 'defaults', 'phpmd.xml'),
  'php-cs-fixer': path.join(__dirname, 'defaults', '.php-cs-fixer.php'),
  eslint: path.join(__dirname, 'defaults', '.eslintrc.json'),
  stylelint: path.join(__dirname, 'defaults', '.stylelintrc.json'),
  editorconfig: '',
  'composer-normalize': '',
  'typo3-rector': '',
};

export function resolveConfig(
  tool: ToolName,
  customConfigPath?: string,
  workingDirectory: string = '.'
): string | undefined {
  // Priority 1: Custom config provided by user
  if (customConfigPath) {
    const fullPath = path.resolve(workingDirectory, customConfigPath);
    if (fs.existsSync(fullPath)) {
      core.info(`Using custom config for ${tool}: ${customConfigPath}`);
      return fullPath;
    } else {
      core.warning(`Custom config not found for ${tool}: ${customConfigPath}`);
    }
  }

  // Priority 2: Look for config in repository root
  const possibleConfigs = CONFIG_FILENAMES[tool];
  if (possibleConfigs) {
    for (const configFile of possibleConfigs) {
      const configPath = path.resolve(workingDirectory, configFile);
      if (fs.existsSync(configPath)) {
        core.info(`Found repository config for ${tool}: ${configFile}`);
        return configPath;
      }
    }
  }

  // Priority 3: Use default config
  const defaultConfig = DEFAULT_CONFIGS[tool];
  if (defaultConfig && fs.existsSync(defaultConfig)) {
    core.info(`Using default config for ${tool}`);
    return defaultConfig;
  }

  // No config found
  core.info(`No custom config for ${tool}, tool will use its own defaults`);
  return undefined;
}
