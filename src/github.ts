import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import * as tar from "tar";

export interface GitHubRepoSpec {
  owner: string;
  repo: string;
  ref?: string;
}

export interface DownloadedRepository {
  ref: string;
  tempRoot: string;
  repositoryRoot: string;
}

interface GitHubRepositoryResponse {
  default_branch?: string;
  message?: string;
}

const GITHUB_API_BASE_URL = "https://api.github.com";

export function parseGitHubUrl(inputUrl: string): GitHubRepoSpec {
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(inputUrl);
  } catch {
    throw new Error(`无效的仓库地址: ${inputUrl}`);
  }

  if (!["github.com", "www.github.com"].includes(parsedUrl.hostname)) {
    throw new Error("当前只支持 GitHub 仓库地址。");
  }

  const segments = parsedUrl.pathname.split("/").filter(Boolean);
  if (segments.length < 2) {
    throw new Error("GitHub 仓库地址必须包含 owner/repo。");
  }

  const owner = segments[0];
  const repo = segments[1].replace(/\.git$/, "");

  if (!owner || !repo) {
    throw new Error("无法从仓库地址中解析 owner/repo。");
  }

  if (segments.length === 2) {
    return { owner, repo };
  }

  if (segments[2] === "tree" && segments.length >= 4) {
    return {
      owner,
      repo,
      ref: decodeURIComponent(segments.slice(3).join("/"))
    };
  }

  throw new Error("当前仅支持仓库根地址或 `/tree/<ref>` 形式的 GitHub 地址。");
}

export async function resolveRepositoryRef(spec: GitHubRepoSpec): Promise<string> {
  if (spec.ref) {
    return spec.ref;
  }

  const metadata = await fetchGitHubJson<GitHubRepositoryResponse>(
    `${GITHUB_API_BASE_URL}/repos/${encodeURIComponent(spec.owner)}/${encodeURIComponent(spec.repo)}`
  );

  if (!metadata.default_branch) {
    throw new Error("无法解析远端仓库的默认分支。");
  }

  return metadata.default_branch;
}

export async function downloadRepositorySnapshot(spec: GitHubRepoSpec, ref: string): Promise<DownloadedRepository> {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "create-skills-"));
  const archivePath = path.join(tempRoot, "repository.tar.gz");
  const extractRoot = path.join(tempRoot, "extract");

  await fs.mkdir(extractRoot, { recursive: true });

  const response = await fetch(
    `${GITHUB_API_BASE_URL}/repos/${encodeURIComponent(spec.owner)}/${encodeURIComponent(spec.repo)}/tarball/${encodeURIComponent(ref)}`,
    {
      headers: buildGitHubHeaders()
    }
  );

  if (!response.ok) {
    throw new Error(`下载仓库快照失败: ${response.status} ${response.statusText}`);
  }

  const archiveBuffer = Buffer.from(await response.arrayBuffer());
  await fs.writeFile(archivePath, archiveBuffer);

  await tar.x({
    cwd: extractRoot,
    file: archivePath,
    gzip: true
  });

  const extractedEntries = await fs.readdir(extractRoot, { withFileTypes: true });
  const rootEntry = extractedEntries.find((entry) => entry.isDirectory());

  if (!rootEntry) {
    throw new Error("仓库快照解压后未找到根目录。");
  }

  return {
    ref,
    tempRoot,
    repositoryRoot: path.join(extractRoot, rootEntry.name)
  };
}

async function fetchGitHubJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: buildGitHubHeaders()
  });

  if (!response.ok) {
    let message = `${response.status} ${response.statusText}`;

    try {
      const body = (await response.json()) as GitHubRepositoryResponse;
      if (body.message) {
        message = body.message;
      }
    } catch {
      // ignore json parse errors and keep the HTTP status message
    }

    throw new Error(`GitHub 请求失败: ${message}`);
  }

  return (await response.json()) as T;
}

function buildGitHubHeaders(): HeadersInit {
  return {
    "Accept": "application/vnd.github+json",
    "User-Agent": "create-skills-cli"
  };
}
