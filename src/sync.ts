import { promises as fs } from "node:fs";
import path from "node:path";

import { copyRecursive, ensureDirectory, pathExists, removeDirectory } from "./fs";
import { downloadRepositorySnapshot, parseGitHubUrl, resolveRepositoryRef } from "./github";

export interface SyncOptions {
  url: string;
  useSkills?: boolean;
  useAgentFile?: boolean;
  cwd?: string;
}

interface SyncTargets {
  skills: boolean;
  agentFile: boolean;
}

interface SkillsResult {
  copied: string[];
  skipped: string[];
}

interface AgentFileResult {
  copied: boolean;
  skipped: boolean;
}

export interface SyncResult {
  ref: string;
  skills?: SkillsResult;
  agentFile?: AgentFileResult;
}

export async function syncRepository(options: SyncOptions): Promise<SyncResult> {
  const cwd = options.cwd ?? process.cwd();
  const targets = resolveTargets(options);
  const spec = parseGitHubUrl(options.url);

  console.log(`开始拉取 GitHub 仓库: ${options.url}`);

  const ref = await resolveRepositoryRef(spec);
  console.log(`使用引用: ${ref}`);

  const snapshot = await downloadRepositorySnapshot(spec, ref);

  try {
    await assertRequestedSourcesExist(snapshot.repositoryRoot, targets);

    const result: SyncResult = { ref };

    if (targets.skills) {
      result.skills = await syncSkills(snapshot.repositoryRoot, cwd);
    }

    if (targets.agentFile) {
      result.agentFile = await syncAgentFile(snapshot.repositoryRoot, cwd);
    }

    return result;
  } finally {
    await removeDirectory(snapshot.tempRoot);
  }
}

function resolveTargets(options: SyncOptions): SyncTargets {
  if (options.useSkills || options.useAgentFile) {
    return {
      skills: Boolean(options.useSkills),
      agentFile: Boolean(options.useAgentFile)
    };
  }

  return {
    skills: true,
    agentFile: true
  };
}

async function assertRequestedSourcesExist(repositoryRoot: string, targets: SyncTargets): Promise<void> {
  const missing: string[] = [];

  if (targets.skills) {
    const sourceSkillsPath = path.join(repositoryRoot, "skills");
    if (!(await pathExists(sourceSkillsPath))) {
      missing.push("skills/");
    }
  }

  if (targets.agentFile) {
    const sourceAgentTemplatePath = path.join(repositoryRoot, "AGENTS_TEMPLATE.md");
    if (!(await pathExists(sourceAgentTemplatePath))) {
      missing.push("AGENTS_TEMPLATE.md");
    }
  }

  if (missing.length > 0) {
    throw new Error(`远端仓库缺少请求的内容: ${missing.join(", ")}`);
  }
}

async function syncSkills(repositoryRoot: string, cwd: string): Promise<SkillsResult> {
  const sourceSkillsPath = path.join(repositoryRoot, "skills");
  const targetSkillsPath = path.join(cwd, "skills");
  const entries = await fs.readdir(sourceSkillsPath, { withFileTypes: true });

  await ensureDirectory(targetSkillsPath);

  const copied: string[] = [];
  const skipped: string[] = [];

  for (const entry of entries) {
    const sourceEntryPath = path.join(sourceSkillsPath, entry.name);
    const targetEntryPath = path.join(targetSkillsPath, entry.name);

    if (await pathExists(targetEntryPath)) {
      skipped.push(entry.name);
      console.log(`跳过已存在的 skill: ${entry.name}`);
      continue;
    }

    await copyRecursive(sourceEntryPath, targetEntryPath);
    copied.push(entry.name);
    console.log(`已复制 skill: ${entry.name}`);
  }

  return { copied, skipped };
}

async function syncAgentFile(repositoryRoot: string, cwd: string): Promise<AgentFileResult> {
  const sourceAgentTemplatePath = path.join(repositoryRoot, "AGENTS_TEMPLATE.md");
  const targetAgentPath = path.join(cwd, "AGENTS.md");

  if (await pathExists(targetAgentPath)) {
    console.log("跳过 AGENTS.md，本地文件已存在。");
    return {
      copied: false,
      skipped: true
    };
  }

  await copyRecursive(sourceAgentTemplatePath, targetAgentPath);
  console.log("已复制 AGENTS_TEMPLATE.md -> AGENTS.md");

  return {
    copied: true,
    skipped: false
  };
}
