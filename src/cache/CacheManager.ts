import * as core from '@actions/core';
import * as cache from '@actions/cache';
import * as crypto from 'crypto';
import * as path from 'path';
import * as fs from 'fs';
import { executeCommand } from '../utils/exec';
import { fileExists } from '../utils/fileUtils';
import { Logger } from '../utils/logger';

export interface CacheConfig {
  enabled: boolean;
  keyPrefix: string;
  composerCache: boolean;
  composerVendor: boolean;
  npmCache: boolean;
  nodeModules: boolean;
}

interface CacheKeyInfo {
  key: string;
  restoreKeys: string[];
  paths: string[];
}

export class CacheManager {
  private config: CacheConfig;
  private workingDirectory: string;
  private logger: Logger;
  private composerCacheDir: string | null = null;
  private npmCacheDir: string | null = null;

  constructor(config: CacheConfig, workingDirectory: string, logger: Logger) {
    this.config = config;
    this.workingDirectory = workingDirectory;
    this.logger = logger;
  }

  async restore(): Promise<void> {
    if (!this.config.enabled) {
      this.logger.debug('Cache is disabled');
      return;
    }

    try {
      this.logger.group('Restoring cache');

      // Detect cache directories
      await this.detectComposerCacheDir();
      await this.detectNpmCacheDir();

      // Restore Composer cache
      await this.restoreComposerCache();

      // Restore npm cache
      await this.restoreNpmCache();

      this.logger.info('Cache restoration completed');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warning(`Failed to restore cache: ${message}`);
    } finally {
      this.logger.endGroup();
    }
  }

  async save(): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    try {
      this.logger.group('Saving cache');

      // Save Composer cache
      await this.saveComposerCache();

      // Save npm cache
      await this.saveNpmCache();

      this.logger.info('Cache saving completed');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warning(`Failed to save cache: ${message}`);
    } finally {
      this.logger.endGroup();
    }
  }

  private async restoreComposerCache(): Promise<void> {
    const cacheKeyInfo = await this.generateComposerCacheKey();
    if (cacheKeyInfo.paths.length === 0) {
      this.logger.debug('No Composer cache paths configured');
      return;
    }

    this.logger.info(`Composer cache key: ${cacheKeyInfo.key}`);
    this.logger.debug(`Composer cache paths: ${cacheKeyInfo.paths.join(', ')}`);

    const cacheHit = await cache.restoreCache(
      cacheKeyInfo.paths,
      cacheKeyInfo.key,
      cacheKeyInfo.restoreKeys
    );

    if (cacheHit) {
      this.logger.info(`Composer cache restored from key: ${cacheHit}`);
      core.saveState('composer-cache-hit', 'true');
      core.saveState('composer-cache-key', cacheKeyInfo.key);
    } else {
      this.logger.info('Composer cache not found');
      core.saveState('composer-cache-hit', 'false');
      core.saveState('composer-cache-key', cacheKeyInfo.key);
    }
  }

  private async saveComposerCache(): Promise<void> {
    const cacheHit = core.getState('composer-cache-hit') === 'true';
    if (cacheHit) {
      this.logger.debug('Composer cache hit occurred, skipping save');
      return;
    }

    const cacheKey = core.getState('composer-cache-key');
    if (!cacheKey) {
      this.logger.debug('No Composer cache key found, skipping save');
      return;
    }

    const cacheKeyInfo = await this.generateComposerCacheKey();
    const existingPaths = await this.filterExistingPaths(cacheKeyInfo.paths);

    if (existingPaths.length === 0) {
      this.logger.debug('No Composer cache paths exist to save');
      return;
    }

    this.logger.info(`Saving Composer cache with key: ${cacheKey}`);
    this.logger.debug(`Composer cache paths: ${existingPaths.join(', ')}`);

    try {
      await cache.saveCache(existingPaths, cacheKey);
      this.logger.info('Composer cache saved successfully');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      // Don't fail the action if cache save fails
      this.logger.warning(`Failed to save Composer cache: ${message}`);
    }
  }

  private async restoreNpmCache(): Promise<void> {
    const cacheKeyInfo = await this.generateNpmCacheKey();
    if (cacheKeyInfo.paths.length === 0) {
      this.logger.debug('No npm cache paths configured');
      return;
    }

    this.logger.info(`npm cache key: ${cacheKeyInfo.key}`);
    this.logger.debug(`npm cache paths: ${cacheKeyInfo.paths.join(', ')}`);

    const cacheHit = await cache.restoreCache(
      cacheKeyInfo.paths,
      cacheKeyInfo.key,
      cacheKeyInfo.restoreKeys
    );

    if (cacheHit) {
      this.logger.info(`npm cache restored from key: ${cacheHit}`);
      core.saveState('npm-cache-hit', 'true');
      core.saveState('npm-cache-key', cacheKeyInfo.key);
    } else {
      this.logger.info('npm cache not found');
      core.saveState('npm-cache-hit', 'false');
      core.saveState('npm-cache-key', cacheKeyInfo.key);
    }
  }

  private async saveNpmCache(): Promise<void> {
    const cacheHit = core.getState('npm-cache-hit') === 'true';
    if (cacheHit) {
      this.logger.debug('npm cache hit occurred, skipping save');
      return;
    }

    const cacheKey = core.getState('npm-cache-key');
    if (!cacheKey) {
      this.logger.debug('No npm cache key found, skipping save');
      return;
    }

    const cacheKeyInfo = await this.generateNpmCacheKey();
    const existingPaths = await this.filterExistingPaths(cacheKeyInfo.paths);

    if (existingPaths.length === 0) {
      this.logger.debug('No npm cache paths exist to save');
      return;
    }

    this.logger.info(`Saving npm cache with key: ${cacheKey}`);
    this.logger.debug(`npm cache paths: ${existingPaths.join(', ')}`);

    try {
      await cache.saveCache(existingPaths, cacheKey);
      this.logger.info('npm cache saved successfully');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      // Don't fail the action if cache save fails
      this.logger.warning(`Failed to save npm cache: ${message}`);
    }
  }

  private async detectComposerCacheDir(): Promise<void> {
    if (!this.config.composerCache) {
      return;
    }

    try {
      const result = await executeCommand(
        'composer',
        ['config', 'cache-files-dir'],
        this.workingDirectory
      );

      if (result.exitCode === 0 && result.stdout) {
        this.composerCacheDir = result.stdout.trim();
        this.logger.debug(`Composer cache directory: ${this.composerCacheDir}`);
      } else {
        this.logger.debug('Could not detect Composer cache directory');
      }
    } catch (error) {
      this.logger.debug('Composer not available for cache detection');
    }
  }

  private async detectNpmCacheDir(): Promise<void> {
    if (!this.config.npmCache) {
      return;
    }

    try {
      // Try npm first
      const npmResult = await executeCommand(
        'npm',
        ['config', 'get', 'cache'],
        this.workingDirectory
      );

      if (npmResult.exitCode === 0 && npmResult.stdout) {
        this.npmCacheDir = npmResult.stdout.trim();
        this.logger.debug(`npm cache directory: ${this.npmCacheDir}`);
        return;
      }

      // Try yarn if npm fails
      const yarnResult = await executeCommand('yarn', ['cache', 'dir'], this.workingDirectory);

      if (yarnResult.exitCode === 0 && yarnResult.stdout) {
        this.npmCacheDir = yarnResult.stdout.trim();
        this.logger.debug(`Yarn cache directory: ${this.npmCacheDir}`);
        return;
      }

      // Try pnpm if yarn fails
      const pnpmResult = await executeCommand('pnpm', ['store', 'path'], this.workingDirectory);

      if (pnpmResult.exitCode === 0 && pnpmResult.stdout) {
        this.npmCacheDir = pnpmResult.stdout.trim();
        this.logger.debug(`pnpm cache directory: ${this.npmCacheDir}`);
        return;
      }

      this.logger.debug('Could not detect npm/yarn/pnpm cache directory');
    } catch (error) {
      this.logger.debug('npm/yarn/pnpm not available for cache detection');
    }
  }

  private async generateComposerCacheKey(): Promise<CacheKeyInfo> {
    const paths: string[] = [];
    const platform = process.platform;
    const prefix = this.config.keyPrefix;

    // Add Composer cache directory
    if (this.config.composerCache && this.composerCacheDir) {
      paths.push(this.composerCacheDir);
    }

    // Add vendor directory
    if (this.config.composerVendor) {
      const vendorPath = path.join(this.workingDirectory, 'vendor');
      paths.push(vendorPath);
    }

    // Hash composer.lock for cache key
    const composerLockPath = path.join(this.workingDirectory, 'composer.lock');
    let lockHash = 'no-lock';

    if (await fileExists(composerLockPath)) {
      const lockContent = await fs.promises.readFile(composerLockPath, 'utf-8');
      lockHash = crypto.createHash('sha256').update(lockContent).digest('hex').substring(0, 8);
    }

    const key = `${prefix}-${platform}-composer-${lockHash}`;
    const restoreKeys = [
      `${prefix}-${platform}-composer-`, // Any cache for this platform
      `${prefix}-composer-`, // Any composer cache
    ];

    return { key, restoreKeys, paths };
  }

  private async generateNpmCacheKey(): Promise<CacheKeyInfo> {
    const paths: string[] = [];
    const platform = process.platform;
    const prefix = this.config.keyPrefix;

    // Add npm cache directory
    if (this.config.npmCache && this.npmCacheDir) {
      paths.push(this.npmCacheDir);
    }

    // Add node_modules directory
    if (this.config.nodeModules) {
      const nodeModulesPath = path.join(this.workingDirectory, 'node_modules');
      paths.push(nodeModulesPath);
    }

    // Determine lock file and package manager
    const packageLockPath = path.join(this.workingDirectory, 'package-lock.json');
    const yarnLockPath = path.join(this.workingDirectory, 'yarn.lock');
    const pnpmLockPath = path.join(this.workingDirectory, 'pnpm-lock.yaml');

    let lockHash = 'no-lock';
    let packageManager = 'npm';

    if (await fileExists(pnpmLockPath)) {
      const lockContent = await fs.promises.readFile(pnpmLockPath, 'utf-8');
      lockHash = crypto.createHash('sha256').update(lockContent).digest('hex').substring(0, 8);
      packageManager = 'pnpm';
    } else if (await fileExists(yarnLockPath)) {
      const lockContent = await fs.promises.readFile(yarnLockPath, 'utf-8');
      lockHash = crypto.createHash('sha256').update(lockContent).digest('hex').substring(0, 8);
      packageManager = 'yarn';
    } else if (await fileExists(packageLockPath)) {
      const lockContent = await fs.promises.readFile(packageLockPath, 'utf-8');
      lockHash = crypto.createHash('sha256').update(lockContent).digest('hex').substring(0, 8);
      packageManager = 'npm';
    }

    const key = `${prefix}-${platform}-${packageManager}-${lockHash}`;
    const restoreKeys = [
      `${prefix}-${platform}-${packageManager}-`, // Any cache for this package manager and platform
      `${prefix}-${platform}-`, // Any cache for this platform
      `${prefix}-`, // Any cache with this prefix
    ];

    return { key, restoreKeys, paths };
  }

  private async filterExistingPaths(paths: string[]): Promise<string[]> {
    const existingPaths: string[] = [];

    for (const p of paths) {
      if (await fileExists(p)) {
        existingPaths.push(p);
      }
    }

    return existingPaths;
  }
}
