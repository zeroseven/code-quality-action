# Contributing to Code Quality Action

Thank you for your interest in contributing! This document provides guidelines and instructions for contributing to this project.

## Getting Started

1. **Fork the repository**
2. **Clone your fork**:
   ```bash
   git clone https://github.com/YOUR_USERNAME/code-quality-action.git
   cd code-quality-action
   ```
3. **Install dependencies**:
   ```bash
   npm install
   ```

## Development Workflow

### Making Changes

1. **Create a new branch**:
   ```bash
   git checkout -b feat/my-new-feature
   # or
   git checkout -b fix/my-bug-fix
   ```

2. **Make your changes** in the `src/` directory

3. **Build and test**:
   ```bash
   npm run all
   ```
   This will:
   - Compile TypeScript
   - Format code with Prettier
   - Lint code with ESLint
   - Package to `dist/`

4. **Commit your changes** using Conventional Commits:
   ```bash
   git add .
   git commit -m "feat: add new feature"
   ```

### Conventional Commits

We use [Conventional Commits](https://www.conventionalcommits.org/) for all commit messages. This enables automatic versioning and changelog generation.

**Format:**
```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

**Types:**
- `feat:` - New feature (minor version bump)
- `fix:` - Bug fix (patch version bump)
- `docs:` - Documentation only changes
- `style:` - Code style changes (formatting, missing semi-colons, etc)
- `refactor:` - Code refactoring without feature changes
- `perf:` - Performance improvements
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks, dependency updates
- `ci:` - CI/CD configuration changes
- `build:` - Build system or external dependency changes

**Breaking Changes:**
Add `!` after the type or include `BREAKING CHANGE:` in the footer:
```bash
git commit -m "feat!: redesign API

BREAKING CHANGE: The old API is no longer supported"
```

**Examples:**
```bash
# Feature
git commit -m "feat: add TYPO3 Rector support"

# Bug fix
git commit -m "fix: resolve PHPStan config resolution"

# Documentation
git commit -m "docs: update README with new examples"

# Refactoring
git commit -m "refactor: simplify config resolver logic"

# Breaking change
git commit -m "feat!: change action to composite

BREAKING CHANGE: Action now requires actions/checkout@v4"
```

## Code Standards

### TypeScript

- Use TypeScript for all source code
- Follow existing code style
- Add type annotations where needed
- Use interfaces for type definitions

### Formatting

Code is automatically formatted with Prettier. Run:
```bash
npm run format
```

### Linting

Code is linted with ESLint. Run:
```bash
npm run lint
```

## Adding a New Tool Runner

To add support for a new code quality tool:

1. **Create the runner** in `src/runners/your-tool.ts`:
   ```typescript
   import * as core from '@actions/core';
   import { ToolRunner, RunnerConfig, ToolResult } from '../types';
   import { executeCommand } from '../utils/exec';

   export class YourToolRunner implements ToolRunner {
     async run(config: RunnerConfig): Promise<ToolResult> {
       core.info('Running Your Tool...');
       // Implementation
     }
   }
   ```

2. **Update types** in `src/types.ts`:
   ```typescript
   export type ToolName = 'existing-tools' | 'your-tool';
   ```

3. **Update config resolver** in `src/config/resolver.ts`

4. **Update main.ts** to import and integrate the new runner

5. **Update action.yml** to add new inputs if needed

6. **Update README.md** with documentation

## Testing

Before submitting a PR:

1. **Build successfully**:
   ```bash
   npm run build
   ```

2. **Pass linting**:
   ```bash
   npm run lint
   ```

3. **Format code**:
   ```bash
   npm run format
   ```

4. **Package successfully**:
   ```bash
   npm run package
   ```

5. **Commit dist/ changes**:
   The `dist/` directory must be committed with your changes.

## Pull Request Process

1. **Push your branch** to your fork:
   ```bash
   git push origin feat/my-new-feature
   ```

2. **Create a Pull Request** on GitHub

3. **Describe your changes**:
   - What does this PR do?
   - Why is this change needed?
   - How has it been tested?

4. **Wait for CI checks** to pass

5. **Address review feedback** if any

6. **Merge**: Once approved, a maintainer will merge your PR

## Release Process

Releases are automated via semantic-release:

1. **Merge to main** - PR is merged
2. **CI runs** - Builds and tests
3. **semantic-release** - Analyzes commits and creates release
4. **GitHub Release** - Created with changelog
5. **Tags updated** - Version tags and major version tag

You don't need to manually create releases or update version numbers!

## Questions?

- Open an issue for bugs or feature requests
- Start a discussion for questions or ideas

Thank you for contributing!
