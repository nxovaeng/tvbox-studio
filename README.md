# TVBox Studio

一站式 TVBox 规则管理工具，整合了规则编辑、多源管理、连通检测和云端发布。

## 功能特性

**配置管理**
- 从 URL 或本地文件加载 TVBox JSON 配置（支持 JSONC 注释和尾逗号）
- 多源智能合并：按 key/url 去重合并 sites、lives、parses、flags、ads、rules
- 完整的 8 个 Tab 管理：爬虫规则 / 直播规则 / 解析接口 / 广告过滤 / VIP 标识 / IJK 参数 / 提取规则 / 基础信息
- 加载历史记录，支持快速重新加载

**规则编辑器**
- Monaco Editor 代码编辑器（格式化、主题切换、语法高亮）
- 三种图形化规则编辑器，按字段分 Tab 填写，无需手写 JSON：
  - **XYQHiker**：首页 / 分类 / 详情 / 播放 / 搜索规则
  - **XBPQ**：基础 / 分类 / 列表 / 详情 / 播放 / 搜索规则
  - **XPath**：首页 / 分类 / 详情 / 搜索 / 播放 / 筛选规则
- 每个字段支持变量插入（下拉菜单）和实时规则测试（输入测试 URL 后点击按钮即可看到解析结果）

**连通性检测**
- 批量检测爬虫规则（sites）、直播规则（lives）、解析接口（parses）
- Rust 并发检测，带进度覆盖层显示实时进度
- 支持快速模式（TCP 连通）和完整模式（HTTP 可达）

**直播源管理**
- 支持 M3U / TXT 格式播放列表解析
- 分组展示，支持批量连通性检测
- 推送到内嵌 HTTP 服务器供局域网设备订阅

**发布与分享**
- **Cloudflare R2**：上传 `tvbox.json` 到 R2 存储桶，生成公开 URL 和订阅二维码
- **局域网共享**：内嵌 HTTP Server（axum，默认端口 8090），局域网内扫码直接订阅
- **PNG 加密导出**：将 JSON 配置隐写到 PNG 图片尾部，TVBox 可直接加载图片 URL

**资源本地化**
- 一键分析配置中所有外部资源（spider JAR、ext 规则文件、lives URL）
- 批量下载到本地指定目录，自动将配置中的绝对路径替换为相对路径

## 技术栈

| 层 | 技术 |
|---|---|
| 桌面容器 | Tauri 2.x |
| 前端框架 | React 19 + TypeScript + Vite |
| 样式 | Tailwind CSS v3 |
| 状态管理 | Zustand |
| 代码编辑器 | Monaco Editor |
| Rust 后端 | Tokio + Axum + Reqwest |
| 云存储 | aws-sdk-s3（对接 Cloudflare R2） |
| JSON 解析 | json5（支持注释和宽松语法） |

## 环境要求

- **Rust** 1.80+（`rustup default stable`）
- **Node.js** 18+
- **系统依赖**（Linux）：`libwebkit2gtk-4.1-dev`、`libgtk-3-dev`、`build-essential`

## 启动

```bash
cd tvbox-studio

# 安装前端依赖
npm install

# 开发模式（热更新，Rust 自动重编译）
npm run tauri dev

# 生产构建（输出到 src-tauri/target/release/bundle/）
npm run tauri build

# 仅检查前端类型
npm run type-check
```

## 项目结构

```
tvbox-studio/
├── src/                              # 前端
│   ├── types/tvbox.ts                # TVBox 数据类型定义
│   ├── lib/utils.ts                  # JSONC 解析、多源合并、PNG 隐写加密
│   ├── lib/tauri.ts                  # Tauri 命令封装（统一调用层）
│   ├── store/index.ts                # Zustand 状态管理（6 个 store）
│   └── components/
│       ├── layout/                   # 主布局 + 可折叠侧边栏
│       ├── config/                   # 配置管理主面板
│       │   ├── tabs/                 # 8 个 Tab 组件
│       │   ├── MergeDialog.tsx       # 多源合并对话框
│       │   ├── PublishDialog.tsx     # 发布（R2 / 局域网 / PNG 加密）
│       │   ├── LocalizeDialog.tsx    # 资源本地化
│       │   └── HistoryDialog.tsx     # 历史记录
│       ├── editor/
│       │   ├── CodeEditorPanel.tsx   # Monaco 代码编辑器
│       │   └── rule/                 # 图形化规则编辑器
│       │       ├── XYQHikerEditor.tsx
│       │       ├── XBPQEditor.tsx
│       │       └── XPathEditor.tsx
│       ├── playlist/PlaylistPage.tsx # 直播源管理
│       ├── settings/SettingsPage.tsx # 应用设置
│       └── ui/                       # 基础 UI 组件
│
└── src-tauri/src/                    # Rust 后端
    ├── commands.rs                   # 25 个 Tauri 命令
    ├── server.rs                     # 内嵌 HTTP Server（axum，8090 端口）
    ├── r2.rs                         # Cloudflare R2 上传
    ├── utils.rs                      # HTTP 连通检测
    └── tvbox/
        ├── check.rs                  # 并发连通性检测（带进度事件）
        └── source/                   # TVBox 数据结构（Vod / Live / Parse / Rule / Ijk）
```

## Cloudflare R2 配置

在「发布」对话框的 R2 标签填写以下信息：

| 字段 | 说明 |
|---|---|
| Account ID | Cloudflare 账户 ID（Dashboard 右侧）|
| Bucket Name | R2 存储桶名称 |
| Access Key ID | R2 API 令牌的 Access Key |
| Secret Access Key | R2 API 令牌的 Secret Key |
| 自定义域名 | 可选，绑定到存储桶的自定义域名或留空使用 `*.r2.dev` |

R2 API 令牌在 Cloudflare Dashboard → R2 → Manage R2 API tokens 中创建，需要 **Object Read & Write** 权限。

## 快捷键

| 快捷键 | 功能 |
|---|---|
| `Ctrl+1` | 配置管理 |
| `Ctrl+2` | 直播源 |
| `Ctrl+3` | 代码编辑器 |
| `Ctrl+,` | 设置 |
| `Ctrl+S` | 保存到本地文件 |
| `Ctrl+Shift+S` | 发布到云端 |
| `Ctrl+M` | 打开多源合并 |
| `?` | 快捷键帮助 |
| `Esc` | 关闭弹窗 |

## 推荐开发工具

- [VS Code](https://code.visualstudio.com/) + [Tauri 插件](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
