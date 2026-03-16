import { promises as fs } from "node:fs";
import path from "node:path";

export async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

export async function ensureDirectory(targetPath: string): Promise<void> {
  await fs.mkdir(targetPath, { recursive: true });
}

export async function copyRecursive(sourcePath: string, targetPath: string): Promise<void> {
  const entry = await fs.lstat(sourcePath);

  if (entry.isDirectory()) {
    await ensureDirectory(targetPath);

    const children = await fs.readdir(sourcePath);
    for (const child of children) {
      await copyRecursive(path.join(sourcePath, child), path.join(targetPath, child));
    }
    return;
  }

  await ensureDirectory(path.dirname(targetPath));

  if (entry.isSymbolicLink()) {
    const linkTarget = await fs.readlink(sourcePath);
    await fs.symlink(linkTarget, targetPath);
    return;
  }

  await fs.copyFile(sourcePath, targetPath);
}

export async function removeDirectory(targetPath: string): Promise<void> {
  await fs.rm(targetPath, { recursive: true, force: true });
}
