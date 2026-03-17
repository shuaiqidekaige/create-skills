#!/usr/bin/env node

import { syncRepository } from "./sync";

interface CliOptions {
  url: string;
  useSkills: boolean;
  useAgentFile: boolean;
  cwd?: string;
}

async function main(): Promise<void> {
  const argv = parseArguments(process.argv.slice(2));

  const result = await syncRepository({
    url: argv.url,
    useSkills: argv.useSkills,
    useAgentFile: argv.useAgentFile,
    cwd: argv.cwd
  });

  console.log("同步完成。");

  if (result.skills) {
    console.log(`skills: 新增 ${result.skills.copied.length} 个，跳过 ${result.skills.skipped.length} 个`);
  }

  if (result.agentFile) {
    console.log(`AGENTS.md: ${result.agentFile.copied ? "已创建" : "已跳过"}`);
  }
}

function parseArguments(args: string[]): CliOptions {
  const options: Partial<CliOptions> = {
    useSkills: false,
    useAgentFile: false
  };

  for (let index = 0; index < args.length; index += 1) {
    const current = args[index];

    switch (current) {
      case "--help":
      case "-h":
        printHelp();
        process.exit(0);
        break;
      case "--url": {
        const url = args[index + 1];
        if (!url || url.startsWith("--")) {
          throw new Error("`--url` 需要传入 GitHub 仓库地址。");
        }
        options.url = url;
        index += 1;
        break;
      }
      case "--cwd": {
        const cwd = args[index + 1];
        if (!cwd || cwd.startsWith("--")) {
          throw new Error("`--cwd` 需要传入目标目录。");
        }
        options.cwd = cwd;
        index += 1;
        break;
      }
      case "--use-skills":
        options.useSkills = true;
        break;
      case "--use-agentFile":
        options.useAgentFile = true;
        break;
      default:
        throw new Error(`不支持的参数: ${current}`);
    }
  }

  if (!options.url) {
    throw new Error("缺少必填参数 `--url`。");
  }

  return {
    url: options.url,
    cwd: options.cwd,
    useSkills: Boolean(options.useSkills),
    useAgentFile: Boolean(options.useAgentFile)
  };
}

function printHelp(): void {
  console.log(`
create-skills --url <repo-url> [--cwd <path>] [--use-skills] [--use-agentFile]

参数:
  --url <repo-url>   GitHub 仓库地址，必填
  --cwd <path>       指定写入目录，默认使用当前工作目录
  --use-skills       仅拉取 skills 目录
  --use-agentFile    仅拉取 AGENTS 模版文件
  -h, --help         查看帮助

说明:
  如果未传 --use-skills 和 --use-agentFile，则默认同时拉取两者。
  远端 AGENTS_TEMPLATE.md 会保存为本地 AGENTS.md。
  本地已存在同名内容时默认跳过，不覆盖。
`.trim());
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "未知错误";
  console.error(`执行失败: ${message}`);
  process.exitCode = 1;
});
