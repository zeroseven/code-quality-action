# Code Quality Action

A comprehensive GitHub Action for code quality checks supporting PHP, JavaScript/TypeScript, CSS, and SCSS.

## Features

- **Zero Setup Required**: Automatically sets up PHP, Node.js, and installs dependencies
- **Multi-language support**: PHP, JavaScript, TypeScript, CSS, SCSS
- **8 Powerful Tools**:
  - **PHPStan** - PHP static analysis
  - **PHPMD** - PHP Mess Detector
  - **PHP-CS-Fixer** - PHP coding standards
  - **ESLint** - JavaScript/TypeScript linting
  - **Stylelint** - CSS/SCSS linting
  - **EditorConfig** - Validates files against .editorconfig rules
  - **Composer Normalize** - Ensures composer.json consistency
  - **TYPO3 Rector** - TYPO3-specific code refactoring (opt-in)
- **Smart Detection**: Automatically detects and uses npm, yarn, or pnpm
- **Flexible Configuration**: Use default configs or provide your own
- **GitHub Integration**: Annotations on PRs and detailed summary reports
- **Configurable Failure**: Choose whether to fail the workflow or just warn

## Usage

### Basic Example

The action automatically sets up PHP and Node.js, and installs dependencies:

```yaml
name: Code Quality

on: [push, pull_request]

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Run Code Quality Checks
        uses: zeroseven/code-quality-action@v1
```

### Advanced Example with Custom Configuration

```yaml
name: Code Quality

on: [push, pull_request]

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Run Code Quality Checks
        uses: zeroseven/code-quality-action@v1
        with:
          tools: 'phpstan,eslint,stylelint,editorconfig,composer-normalize'
          php-version: '8.3'
          node-version: '20'
          phpstan-config: 'phpstan.neon'
          eslint-config: '.eslintrc.json'
          fail-on-errors: true
```

### Skip Setup Steps (if already configured)

If you've already set up PHP/Node in previous steps:

```yaml
- name: Run Code Quality Checks
  uses: zeroseven/code-quality-action@v1
  with:
    skip-php-setup: true
    skip-node-setup: true
    skip-composer-install: true
    skip-npm-install: true
```

### Only Warn (Don't Fail)

```yaml
- name: Run Code Quality Checks
  uses: zeroseven/code-quality-action@v1
  with:
    fail-on-errors: false
```

## Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `tools` | Comma-separated list of tools to run or "all" (Note: typo3-rector must be explicitly specified) | No | `all` |
| `php-paths` | Glob pattern for PHP files | No | `**/*.php` |
| `js-paths` | Glob pattern for JS/TS files | No | `**/*.{js,ts,jsx,tsx}` |
| `style-paths` | Glob pattern for CSS/SCSS files | No | `**/*.{css,scss}` |
| `phpstan-config` | Path to custom PHPStan config | No | - |
| `phpmd-config` | Path to custom PHPMD config | No | - |
| `php-cs-fixer-config` | Path to custom PHP-CS-Fixer config | No | - |
| `eslint-config` | Path to custom ESLint config | No | - |
| `stylelint-config` | Path to custom Stylelint config | No | - |
| `editorconfig-config` | Path to custom .editorconfig file | No | - |
| `composer-normalize-config` | Path to custom composer.json file | No | - |
| `typo3-rector-config` | Path to custom rector.php config | No | - |
| `fail-on-errors` | Fail workflow when issues are found | No | `true` |
| `working-directory` | Working directory to run checks in | No | `.` |
| `php-version` | PHP version to use | No | `8.2` |
| `node-version` | Node.js version to use | No | `20` |
| `skip-php-setup` | Skip PHP setup step | No | `false` |
| `skip-node-setup` | Skip Node.js setup step | No | `false` |
| `skip-composer-install` | Skip composer install step | No | `false` |
| `skip-npm-install` | Skip npm install step | No | `false` |

## Outputs

| Output | Description |
|--------|-------------|
| `status` | Overall status: "success" or "failed" |
| `total-issues` | Total number of issues found |
| `report` | JSON summary of all findings |

## Configuration

### Default Configurations

The action includes sensible default configurations for all tools:

- **PHPStan**: Level 5 analysis
- **PHPMD**: All standard rulesets
- **PHP-CS-Fixer**: PSR-12 with additional rules
- **ESLint**: Recommended rules
- **Stylelint**: Standard config

### Custom Configurations

You can provide your own configuration files:

1. Create config files in your repository
2. Reference them in the action inputs

**Config Priority:**
1. Custom config specified in inputs (highest priority)
2. Config files in repository root
3. Default configs provided by the action (lowest priority)

### Example with Custom Configs

```yaml
- name: Code Quality
  uses: zeroseven/code-quality-action@v1
  with:
    phpstan-config: 'config/phpstan.neon'
    phpmd-config: 'config/phpmd.xml'
    php-cs-fixer-config: '.php-cs-fixer.php'
    eslint-config: '.eslintrc.json'
    stylelint-config: '.stylelintrc.json'
```

## Requirements

The action **automatically sets up PHP and Node.js** and installs dependencies for you. You just need to have the tools listed in your `composer.json` and/or `package.json`.

### PHP Tools

Add the PHP tools to your `composer.json`:

**Example `composer.json`:**

```json
{
  "require-dev": {
    "phpstan/phpstan": "^1.10",
    "phpmd/phpmd": "^2.15",
    "friendsofphp/php-cs-fixer": "^3.40",
    "armin/editorconfig-cli": "^2.0",
    "ergebnis/composer-normalize": "^2.42",
    "ssch/typo3-rector": "^2.0"
  }
}
```

### JavaScript/CSS Tools

Add the JavaScript/CSS tools to your `package.json`:

```json
{
  "devDependencies": {
    "eslint": "^8.56.0",
    "stylelint": "^16.1.0",
    "stylelint-config-standard": "^36.0.0"
  }
}
```

## Output Examples

### Annotations

Issues are reported as GitHub annotations directly on your PR:

![Annotations Example](https://via.placeholder.com/800x200?text=Annotations+on+PR+Files)

### Summary Report

A detailed summary table is added to the workflow summary:

| Tool | Status | Issues |
|------|--------|--------|
| PHPStan | PASS | 0 |
| PHPMD | FAIL | 5 |
| PHP-CS-Fixer | PASS | 0 |
| ESLint | FAIL | 12 |
| Stylelint | PASS | 0 |
| | **Total** | **17** |

## Selecting Specific Tools

Run only specific tools by providing a comma-separated list:

```yaml
# Only run PHPStan and ESLint
- uses: zeroseven/code-quality-action@v1
  with:
    tools: 'phpstan,eslint'
```

Available tools:
- `phpstan` - PHP static analysis
- `phpmd` - PHP Mess Detector
- `php-cs-fixer` - PHP coding standards
- `eslint` - JavaScript/TypeScript linting
- `stylelint` - CSS/SCSS linting
- `editorconfig` - EditorConfig validation
- `composer-normalize` - Composer.json normalization
- `typo3-rector` - TYPO3 Rector refactoring (must be explicitly specified, not included in "all")

### Running TYPO3 Rector

TYPO3 Rector is opt-in only and must be explicitly specified:

```yaml
- uses: zeroseven/code-quality-action@v1
  with:
    tools: 'phpstan,phpmd,typo3-rector'
    typo3-rector-config: 'rector.php'
```

### New Tools Overview

**EditorConfig CLI**
- Validates files against `.editorconfig` rules
- Checks indentation, line endings, charset, etc.
- Runs automatically on all files when included in tools list

**Composer Normalize**
- Ensures `composer.json` follows a consistent format
- Validates JSON structure and property ordering
- Helps maintain clean dependency files

**TYPO3 Rector**
- TYPO3-specific automated refactoring
- Helps upgrade TYPO3 extensions
- Suggests code modernization opportunities
- **Note**: Only use in TYPO3 projects

## Development

### Building

```bash
npm install
npm run all
```

This will:
1. Compile TypeScript
2. Format code
3. Lint code
4. Package to `dist/`

### Project Structure

```
code-quality-action/
├── .github/workflows/       # CI/CD workflows
├── src/
│   ├── main.ts              # Entry point
│   ├── types.ts             # TypeScript interfaces
│   ├── runners/             # Tool runners
│   ├── config/              # Config resolution
│   ├── reporters/           # GitHub reporter
│   └── utils/               # Utilities
├── dist/                    # Packaged output (committed)
├── action.yml               # Action metadata
└── .releaserc.json          # Semantic-release config
```

## Releases

This project uses [semantic-release](https://github.com/semantic-release/semantic-release) for automated versioning and releases.

### How Releases Work

1. **Commit with Conventional Commits** - Use conventional commit format
2. **Push to main** - Triggers the release workflow
3. **Automatic versioning** - semantic-release analyzes commits and determines version bump
4. **Create release** - Generates GitHub release, tags, and CHANGELOG
5. **Update major tag** - Updates floating major version tag (e.g., `v1`)

### Conventional Commits

Use conventional commit messages to trigger releases:

- `feat:` - New feature (triggers minor version bump, e.g., 1.0.0 → 1.1.0)
- `fix:` - Bug fix (triggers patch version bump, e.g., 1.0.0 → 1.0.1)
- `docs:` - Documentation changes (no version bump)
- `chore:` - Maintenance tasks (no version bump)
- `BREAKING CHANGE:` - Breaking change (triggers major version bump, e.g., 1.0.0 → 2.0.0)

**Examples:**

```bash
git commit -m "feat: add support for custom config paths"
git commit -m "fix: resolve issue with PHP tool detection"
git commit -m "docs: update README with new examples"
git commit -m "feat!: redesign configuration API

BREAKING CHANGE: Configuration format has changed"
```

### Version Tags

The action maintains two types of tags:

- **Specific version tags**: `v1.0.0`, `v1.1.0`, `v2.0.0`, etc.
- **Major version tags**: `v1`, `v2`, etc. (always points to latest minor/patch)

Users can pin to specific versions or use major version tags for automatic updates:

```yaml
# Pin to specific version
- uses: zeroseven/code-quality-action@v1.0.0

# Auto-update to latest v1.x.x
- uses: zeroseven/code-quality-action@v1
```

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Use conventional commits
5. Submit a pull request

The CI workflow will automatically check your code formatting, linting, and build.

## License

MIT
