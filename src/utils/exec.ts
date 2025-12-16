import * as exec from '@actions/exec';

export interface ExecResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

export async function executeCommand(
  command: string,
  args: string[] = [],
  cwd?: string
): Promise<ExecResult> {
  let stdout = '';
  let stderr = '';

  const options: exec.ExecOptions = {
    listeners: {
      stdout: (data: Buffer) => {
        stdout += data.toString();
      },
      stderr: (data: Buffer) => {
        stderr += data.toString();
      },
    },
    cwd: cwd || process.cwd(),
    ignoreReturnCode: true,
  };

  const exitCode = await exec.exec(command, args, options);

  return {
    exitCode,
    stdout: stdout.trim(),
    stderr: stderr.trim(),
  };
}

export async function commandExists(command: string): Promise<boolean> {
  try {
    const result = await executeCommand('which', [command]);
    return result.exitCode === 0;
  } catch {
    return false;
  }
}
