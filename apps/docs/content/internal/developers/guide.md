---
title: 开发者指南
description: 了解如何参与档案馆的开发工作。
---

## 准备环境

档案馆的开发与协作集中在 [GitHub](https://github.com) 上。你需要准备一台能够访问 GitHub 的计算机。

此外，几乎所有主要模块的开发都依赖 [Bun](https://bun.sh) 运行时。你可以通过如下方法来安装 bun 到你的电脑上：

```bash tab="Linux/macOS"
curl -fsSL https://bun.sh/install | bash
```

```bash tab="Windows"
powershell -c "irm bun.sh/install.ps1 | iex"
```

此外，你还需要准备一个 PostgreSQL 18 数据库实例来辅助开发和调试。我们推荐使用 Docker，因为它易于管理和隔离。  
可以参考以下命令启动一个 PostgreSQL 18 容器：

```bash
docker run \
  --name cvsa-db \
  --volume "cvsa-data:/var/lib/postgresql" \
  --restart "always" \
  -p 127.0.0.1:5432:5432 \
  --env "POSTGRES_USER=cvsa" \
  --env "POSTGRES_PASSWORD=password" \
  --env "POSTGRES_DB=cvsa" \
  --env "PGDATA=/var/lib/postgresql/18/docker" \
  --detach \
  "postgres:18-alpine" \
  "postgres"
```

## 克隆仓库

为了参与开发，首先需要从 GitHub 克隆档案馆的代码仓库：

```bash
git clone https://github.com/project-cvsa/cvsa
```

## 进行开发

每个开发任务都会在 GitHub 仓库以 **issue** 的形式呈现。在挑选（或被分配）一个自己可以完成的 issue 后，就可以开始开发了。

在开始编写代码前，我们需要从 `develop` 分支签出一个新的开发分支。

```bash
git checkout develop
git checkout -b feat/alikia-233-some-changes
```

> 关于分支的命名，参见[流程规范](./workflow.md#分支命名)

之后，进行对应的代码编写。下面的说明信息可能有助于你开发。

## 目录结构

档案馆使用 monorepo 的方式组织项目，在 `apps` 和 `packages` 下分别有若干个 package。目录结构如下：

```
cvsa/
├── apps/
│   ├── backend/			# 主后端
│   ├── docs/				# 文档站点
│   └── web/				# 网站前端
├── packages/
│   ├── core/				# 通用代码
│   ├── db/					# 数据库 schema 与 ORM
│   └── typescript-config/	# tsconfig（TypeScript）配置
├── package.json			# 主 package.json 文件
└── turbo.json				# Turborepo 配置
```

## 环境变量

每个 package 中通常会有对应的环境变量样例文件 `.env.example`，你需要将它们复制一份，并根据情况修改对应的值：

```bash
# 复制 core package 的 .env.test 用于测试
cp packages/core/.env.example packages/core/.env.test
# 复制 db package 的 .env 用于数据库迁移
cp packages/db/.env.example packages/db/.env
# 复制 backend package 的 .env 用于本地测试/部署
cp apps/backend/.env.example apps/backend/.env
cp apps/backend/.env.example apps/backend/.env.test
```

## 数据库配置

环境变量 `DATABASE_URL` 用于指定主数据库的连接字符串。
在配置好对应的 `.env` 文件后，你需要运行数据库迁移命令：

```bash
bun run db:deploy
```

这会将当前的代码库中的迁移记录应用到选定的数据库中。

## 依赖安装与其它命令

在根目录下，运行 `bun i` 以安装所需依赖。

此外，在根目录下，有如下命令可供使用：

```bash
bun run dev				# 启动每个 package 的开发服务器
bun run test			# 运行所有 package 的测试
bun run test:coverage	# 运行测试并报告覆盖率
bun run lint			# 运行 linter
bun run format			# 运行代码格式化
bun run typecheck		# 检查类型错误
```

你也可以切换到某个 package 内执行对应命令。

## 提交与推送

开发完成后，需要创建对应的提交。代码提交到本地分支后，需要将其推送到 GitHub 远程仓库，并创建 PR 以合并到主分支或开发分支。

> 关于提交信息的编写，参见[流程规范](./workflow.md#提交信息)
> 关于 PR 的格式规范，参见[流程规范](./workflow.md#pr-格式)
