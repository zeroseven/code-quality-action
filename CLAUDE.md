# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **composite GitHub Action** written in TypeScript that runs code quality checks for multiple languages (PHP, JavaScript/TypeScript, CSS, SCSS). It integrates 8 different linting/analysis tools and provides GitHub annotations and summaries.

**Key Architecture Points:**

- **Composite Action**: Unlike typical Node.js actions, this runs as a composite action that sets up PHP/Node.js, installs dependencies, then executes the TypeScript code
- **Tool Runner Pattern**: Each tool (PHPStan, PHPMD, etc.) implements the `ToolRunner` interface for consistency
- **Config Resolution**: Three-tier config priority: custom input → repo config → default config
- **Bundled Distribution**: TypeScript is compiled and bundled to `dist/index.js` using @vercel/ncc - this bundled file MUST be committed

## Commands

### Development

```bash
# Install dependencies
npm install

# Build, format, lint, and package (run before committing)
npm run all

# Individual steps
npm run build      # Compile TypeScript to lib/
npm run format     # Format with Prettier
npm run lint       # Lint with ESLint
npm run package    # Bundle to dist/index.js with @vercel/ncc
```

### Testing

```bash
# Check formatting without changes
npm run format:check

# Lint check
npm run lint
```

### Pre-commit Hooks

This project uses **husky** and **lint-staged** - all TypeScript files are automatically formatted and linted before each commit. If linting fails, the commit is rejected.

## Architecture

### Core Flow (src/main.ts)

1. **parseInputs()** - Parse action inputs from environment variables (composite actions receive inputs as `INPUT_*` env vars)
2. **runTool()** - For each enabled tool:
   - Check tool availability with `checkToolAvailability()`
   - Find matching files with `findFiles()`
   - Resolve config path with `resolveConfig()`
   - Instantiate appropriate runner class
   - Execute runner.run()
3. **GitHubReporter** - Generate annotations and summary from all tool results
4. **Set outputs** - status, total-issues, report JSON
5. **Handle failure** - Respect `fail-on-errors` input

### Tool Runner Pattern

Every tool runner implements this interface:

```typescript
interface ToolRunner {
  run(config: RunnerConfig): Promise<ToolResult>;
}
```

**RunnerConfig** provides:

- `configPath`: Resolved config file path (or undefined)
- `filePaths`: Array of files to check
- `workingDirectory`: Where to execute commands

**ToolResult** returns:

- `tool`: Tool name
- `success`: Boolean status
- `issues`: Array of Issue objects (file, line, column, severity, message, rule)
- `rawOutput`: Full stdout/stderr

### Config Resolution (src/config/resolver.ts)

Priority order:

1. **Custom config** specified in action inputs
2. **Repository config** in working directory (e.g., `.eslintrc.json`)
3. **Default config** from `src/config/defaults/`

Tools without default configs (editorconfig, composer-normalize, typo3-rector) rely on repository configs or tool defaults.

### Tool Availability Checking (src/utils/toolCheck.ts)

Before running each tool, `checkToolAvailability()` verifies:

- PHP tools: Check `vendor/bin/{tool}` exists via `--version` command
- Node tools: Check `npx {tool}` works via `--version` command
- Composer: Check `composer` command availability

If unavailable, logs helpful installation instructions via `logToolNotFound()`.

### Type Safety (src/types.ts)

Tool-specific output types are defined for JSON parsing:

- `PHPStanOutput` - Structured PHPStan JSON format
- `PHPMDOutput` - PHPMD JSON format
- `ESLintOutput` - ESLint JSON format
- `StylelintOutput` - Stylelint JSON format

This prevents `any` types and provides compile-time safety when parsing tool outputs.

### GitHub Reporter (src/reporters/github.ts)

Uses ANSI color codes (NOT emojis) for terminal output:

- `\x1b[31m` - Red for errors/FAIL
- `\x1b[32m` - Green for PASS
- `\x1b[33m` - Yellow for warnings
- `\x1b[36m` - Cyan for info

Generates:

1. **Annotations** - `core.error()` / `core.warning()` for each issue (shows inline on PR files)
2. **Summary table** - Markdown table via `core.summary`
3. **JSON report** - Structured output for `report` output

## Adding a New Tool

1. **Create runner** in `src/runners/your-tool.ts`:

   ```typescript
   export class YourToolRunner implements ToolRunner {
     async run(config: RunnerConfig): Promise<ToolResult> {
       // Parse tool's JSON output into Issue[]
     }
   }
   ```

2. **Update types** in `src/types.ts`:

   ```typescript
   export type ToolName = 'existing' | 'your-tool';

   // Optional: Add tool-specific output interface
   export interface YourToolOutput { ... }
   ```

3. **Register in main.ts**:
   - Import runner class
   - Add case to switch statement in `runTool()`
   - Add to `allTools` array if it should be included in "all"

4. **Update config resolver** in `src/config/resolver.ts`:
   - Add config filenames to `CONFIG_FILENAMES`
   - Add default config path to `DEFAULT_CONFIGS` (or empty string if none)
   - Create default config in `src/config/defaults/` if applicable

5. **Update toolCheck.ts**:
   - Add tool command to `TOOL_COMMANDS`
   - Add install instructions to `TOOL_INSTALL_INSTRUCTIONS`

6. **Update action.yml** - Add new input for custom config path

7. **Update README.md** - Document the new tool

## Important Constraints

### TYPO3 Rector is Opt-in Only

TYPO3 Rector is NOT included when `tools: 'all'` - it must be explicitly specified. This is intentional because it's TYPO3-specific and inappropriate for non-TYPO3 projects.

In `src/main.ts`, the `allTools` array excludes `'typo3-rector'`.

### dist/ Must Be Committed

Unlike typical projects, the `dist/` directory is committed to version control. This is REQUIRED for GitHub Actions because:

- GitHub Actions execute directly from the repository
- No build step occurs when users run the action
- The bundled `dist/index.js` is the entry point (specified in `action.yml`)

After making TypeScript changes, ALWAYS run `npm run all` and commit the updated `dist/` directory.

The CI workflow verifies `dist/` is up-to-date.

### Composite Action Structure

This action uses `runs: using: 'composite'` not `runs: using: 'node20'`. This means:

- The action.yml defines multiple shell steps (PHP setup, Node setup, dependency installation, then our code)
- Inputs are passed as environment variables (`INPUT_*`)
- The final step executes `node ${{ github.action_path }}/dist/index.js`

### Working Directory Support

All commands must respect the `working-directory` input for monorepo support:

- File globbing uses the working directory
- Command execution passes `workingDirectory` to `executeCommand()`
- Config resolution searches relative to working directory

## Release Process

This project uses **semantic-release** for automated versioning:

### Conventional Commits

All commits must follow conventional commit format:

- `feat:` → Minor version bump (1.0.0 → 1.1.0)
- `fix:` → Patch version bump (1.0.0 → 1.0.1)
- `feat!:` or `BREAKING CHANGE:` → Major version bump (1.0.0 → 2.0.0)
- `docs:`, `chore:`, `style:`, `refactor:` → No version bump

### Release Workflow

1. Push to `main` branch
2. CI checks run (formatting, linting, build)
3. If CI passes, release job runs:
   - semantic-release analyzes commits
   - Determines version bump
   - Generates CHANGELOG.md
   - Creates GitHub release
   - Updates major version tag (e.g., `v1` → latest v1.x.x)

### Version Tags

Two types of tags:

- **Specific**: `v1.0.0`, `v1.1.0`, `v2.0.0`
- **Major**: `v1`, `v2` (floating, always points to latest)

Users can pin to specific versions or use major tags for auto-updates.

## File Structure

```
src/
├── main.ts                  # Entry point, orchestrates tool execution
├── types.ts                 # TypeScript interfaces and tool output types
├── runners/                 # Tool runner implementations (8 files)
│   ├── phpstan.ts
│   ├── phpmd.ts
│   ├── php-cs-fixer.ts
│   ├── eslint.ts
│   ├── stylelint.ts
│   ├── editorconfig.ts
│   ├── composer-normalize.ts
│   └── typo3-rector.ts
├── config/
│   ├── resolver.ts          # Config resolution logic (3-tier priority)
│   └── defaults/            # Default config files for tools
├── reporters/
│   └── github.ts            # GitHub annotations and summary generation
└── utils/
    ├── exec.ts              # Command execution wrapper
    ├── glob.ts              # File pattern matching
    └── toolCheck.ts         # Tool availability verification

dist/                        # Bundled output (MUST be committed)
lib/                         # TypeScript compilation output (gitignored)
action.yml                   # Composite action definition
.github/workflows/
├── ci.yml                   # CI checks on PRs
└── release.yml              # Automated release on main
```

## Common Issues

### "Tool not available" warnings

If a tool shows as unavailable:

- For PHP tools: Ensure tool is in `composer.json` require-dev and `composer install` has run
- For Node tools: Ensure tool is in `package.json` devDependencies and `npm install` has run
- The action automatically installs dependencies, but tools must be declared in package files

### dist/ out of date

If CI fails with "dist/ has uncommitted changes":

```bash
npm run all
git add dist/
git commit -m "chore: update dist/"
```

### Formatting failures

Run `npm run format` to auto-fix. The pre-commit hook should prevent this, but if bypassed:

```bash
npm run format
git add .
git commit --amend --no-edit
```

### TypeScript errors

Ensure you're using proper types from `src/types.ts`. Avoid `any` types - define interfaces for tool outputs.

## Configuration Examples

### Minimal (uses all defaults)

```yaml
- uses: zeroseven/code-quality-action@v1
```

### Custom configs

```yaml
- uses: zeroseven/code-quality-action@v1
  with:
    phpstan-config: 'config/phpstan.neon'
    eslint-config: '.eslintrc.custom.json'
    fail-on-errors: false
```

### Specific tools only

```yaml
- uses: zeroseven/code-quality-action@v1
  with:
    tools: 'phpstan,eslint,stylelint'
```

### With TYPO3 Rector (explicit opt-in)

```yaml
- uses: zeroseven/code-quality-action@v1
  with:
    tools: 'phpstan,phpmd,typo3-rector'
    typo3-rector-config: 'rector.php'
```

### Monorepo support

```yaml
- uses: zeroseven/code-quality-action@v1
  with:
    working-directory: 'packages/my-package'
```
