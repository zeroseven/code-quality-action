import * as glob from '@actions/glob';

export async function findFiles(pattern: string, cwd?: string): Promise<string[]> {
  const globber = await glob.create(pattern, {
    matchDirectories: false,
    followSymbolicLinks: false,
  });

  const files = await globber.glob();

  if (cwd && cwd !== '.') {
    return files.map(file => file.replace(`${cwd}/`, ''));
  }

  return files;
}

export async function hasMatchingFiles(pattern: string, cwd?: string): Promise<boolean> {
  const files = await findFiles(pattern, cwd);
  return files.length > 0;
}
