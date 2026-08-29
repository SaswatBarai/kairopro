import Docker from 'dockerode';

export const docker = new Docker({ socketPath: '/var/run/docker.sock' });

export const SANDBOX_CONFIG = {
  Image: 'kairopro/sandbox:latest',
  CpuPeriod: 100000,
  CpuQuota: 200000,   // 2 vCPU max
  Memory: 2 * 1024 * 1024 * 1024,  // 2 GB
  NetworkMode: 'bridge',
};

export async function createSandbox(projectId: string): Promise<string> {
  const container = await docker.createContainer({
    ...SANDBOX_CONFIG,
    name: `kairopro-${projectId}`,
    Tty: true,
    Volumes: { [`/workspace`]: {} },
    HostConfig: {
      Binds: [`kairopro-vol-${projectId}:/workspace`],
      Memory: SANDBOX_CONFIG.Memory,
      AutoRemove: true,
    },
  });
  await container.start();
  return container.id;
}

import { Writable } from 'stream';

export async function execInSandbox(containerId: string, cmd: string[]): Promise<{ stdout: string; stderr: string }> {
  const container = docker.getContainer(containerId);
  const exec = await container.exec({ Cmd: cmd, AttachStdout: true, AttachStderr: true, Tty: false });
  const stream: any = await exec.start({ Detach: false, hijack: true, stdin: false });
  
  return new Promise((resolve, reject) => {
    let stdout = '';
    let stderr = '';
    
    const outStream = new Writable({
      write(chunk, encoding, callback) {
        stdout += chunk.toString('utf8');
        callback();
      }
    });

    const errStream = new Writable({
      write(chunk, encoding, callback) {
        stderr += chunk.toString('utf8');
        callback();
      }
    });

    docker.modem.demuxStream(stream, outStream, errStream);

    stream.on('end', () => resolve({ stdout, stderr }));
    stream.on('error', (err: any) => reject(err));
  });
}

export async function writeFile(containerId: string, path: string, content: string): Promise<void> {
    // using echo/cat for simplicity instead of tar buffer, since this is an IDE text file
    const escapedContent = content.replace(/'/g, "'\\''");
    await execInSandbox(containerId, ['sh', '-c', `mkdir -p $(dirname '${path}') && echo '${escapedContent}' > '${path}'`]);
}

export async function readFile(containerId: string, path: string): Promise<string> {
    const { stdout, stderr } = await execInSandbox(containerId, ['cat', path]);
    if (stderr) throw new Error(stderr);
    return stdout;
}

export interface FileNode {
    path: string;
    isDirectory: boolean;
}

export async function listFiles(containerId: string, dir: string = '/workspace'): Promise<FileNode[]> {
    const { stdout, stderr } = await execInSandbox(containerId, ['find', dir, '-type', 'f', '-o', '-type', 'd']);
    if (stderr) throw new Error(stderr);
    
    const lines = stdout.split('\n').filter(Boolean);
    const files: FileNode[] = [];
    
    for (const line of lines) {
        if (line === dir) continue;
        const relativePath = line.replace(dir + '/', '');
        // Hacky check for dir: doesn't have an extension in most cases for this simple mock
        const isDir = !line.includes('.'); 
        files.push({ path: relativePath, isDirectory: isDir });
    }
    
    return files;
}
