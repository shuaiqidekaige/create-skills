# create-skills

一个基于 Node.js 的 CLI，用于从 GitHub 仓库拉取常用的 `skills/` 目录和 `AGENTS_TEMPLATE.md` 模版文件。

## 功能

- 从指定 GitHub 仓库下载固定结构内容
- 支持只拉取 `skills/`
- 支持只拉取 `AGENTS_TEMPLATE.md`
- 支持通过 `--cwd` 指定创建目录
- 未指定拉取范围时，默认同时拉取两者
- 将远端 `AGENTS_TEMPLATE.md` 保存为本地 `AGENTS.md`
- 本地已存在同名内容时默认跳过，不覆盖

## 仓库结构要求

远端仓库需要满足以下固定结构：

```text
skills/
  a/
  b/
AGENTS_TEMPLATE.md
```

## 环境要求

- Node.js `>= 18`

## 安装依赖

```bash
npm install
```

## 本地开发

```bash
npm run typecheck
npm run build
```

直接运行源码：

```bash
npm run dev -- --url https://github.com/your-name/your-skills-repo
```

运行编译产物：

```bash
node dist/cli.js --url https://github.com/your-name/your-skills-repo
```

## 命令用法

```bash
create-skills --url <repo-url> [--cwd <path>] [--use-skills] [--use-agentFile]
```

### 参数

- `--url <repo-url>`：GitHub 仓库地址，必填
- `--cwd <path>`：指定写入目录，默认使用当前工作目录
- `--use-skills`：仅拉取 `skills/`
- `--use-agentFile`：仅拉取 `AGENTS_TEMPLATE.md`
- `-h, --help`：查看帮助

### 行为规则

- 如果未传 `--use-skills` 和 `--use-agentFile`，默认同时拉取两者
- 如果只传 `--use-skills`，只同步 `skills/`
- 如果只传 `--use-agentFile`，只同步 `AGENTS_TEMPLATE.md`
- 如果两者都传，则同步两者
- 如果传入 `--cwd`，则 `skills/` 和 `AGENTS.md` 都会写入该目录

## 使用示例

拉取 `skills/` 和 `AGENTS.md`：

```bash
node dist/cli.js --url https://github.com/your-name/your-skills-repo
```

指定写入目录：

```bash
node dist/cli.js --url https://github.com/your-name/your-skills-repo --cwd /path/to/project
```

仅拉取 `skills/`：

```bash
node dist/cli.js --url https://github.com/your-name/your-skills-repo --use-skills
```

仅拉取 `AGENTS.md`：

```bash
node dist/cli.js --url https://github.com/your-name/your-skills-repo --use-agentFile
```

## 同步结果

- `skills/` 会复制到目标目录下的 `skills/`
- `AGENTS_TEMPLATE.md` 会复制到目标目录下的 `AGENTS.md`
- 已存在的 skill 目录会被跳过
- 已存在的 `AGENTS.md` 会被跳过
- 请求的目标在远端缺失时，命令会报错并返回非零退出码

## 发布

编译后可通过 `package.json` 中的 `bin` 字段作为 CLI 入口发布：

```bash
npm run build
```
