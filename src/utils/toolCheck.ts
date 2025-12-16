import * as core from '@actions/core';
import { executeCommand } from './exec';
import { ToolName } from '../types';

const TOOL_COMMANDS: Record<ToolName, string> = {
  phpstan: 'vendor/bin/phpstan',
  phpmd: 'vendor/bin/phpmd',
  'php-cs-fixer': 'vendor/bin/php-cs-fixer',
  eslint: 'npx eslint',
  stylelint: 'npx stylelint',
  editorconfig: 'vendor/bin/editorconfig-cli',
  'composer-normalize': 'composer',
  'typo3-rector': 'vendor/bin/rector',
};

const TOOL_INSTALL_INSTRUCTIONS: Record<ToolName, string> = {
  phpstan: 'Add "phpstan/phpstan" to composer.json require-dev and run composer install',
  phpmd: 'Add "phpmd/phpmd" to composer.json require-dev and run composer install',
  'php-cs-fixer':
    'Add "friendsofphp/php-cs-fixer" to composer.json require-dev and run composer install',
  eslint: 'Add "eslint" to package.json devDependencies and run npm install',
  stylelint: 'Add "stylelint" to package.json devDependencies and run npm install',
  editorconfig:
    'Add "armin/editorconfig-cli" to composer.json require-dev and run composer install',
  'composer-normalize':
    'Add "ergebnis/composer-normalize" to composer.json require-dev and run composer install',
  'typo3-rector':
    'Add "ssch/typo3-rector" to composer.json require-dev and run composer install',
};

export async function checkToolAvailability(
  tool: ToolName,
  workingDirectory: string
): Promise<boolean> {
  const command = TOOL_COMMANDS[tool];
  if (!command) {
    return true; // Unknown tool, assume available
  }

  try {
    // For npx commands, just check if the package exists
    if (command.startsWith('npx ')) {
      const packageName = command.replace('npx ', '').split(' ')[0];
      const result = await executeCommand('npx', [packageName, '--version'], workingDirectory);
      return result.exitCode === 0;
    }

    // For composer commands, check if the binary exists
    if (command === 'composer') {
      const result = await executeCommand('composer', ['--version'], workingDirectory);
      return result.exitCode === 0;
    }

    // For vendor binaries, check if the file exists
    const result = await executeCommand(command, ['--version'], workingDirectory);
    return result.exitCode === 0;
  } catch (error) {
    return false;
  }
}

export function logToolNotFound(tool: ToolName): void {
  const instructions = TOOL_INSTALL_INSTRUCTIONS[tool];
  core.warning(`Tool '${tool}' is not available. ${instructions}`);
  core.warning(`Skipping ${tool} checks.`);
}
