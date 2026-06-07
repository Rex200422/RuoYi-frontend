# RuoYi 舆情分析平台 - 前端

基于 [RuoYi-Vue3](https://gitee.com/y_project/RuoYi-Vue) 框架的舆情分析平台前端项目，提供社交媒体监测、新闻资讯采集、舆情态势感知、AI简报生成等功能。

---

## 项目概述

本项目是 **RuoYi 舆情分析平台** 的前端部分，基于 RuoYi-Vue3 脚手架进行二次开发，集成了舆情监测与分析相关模块。平台支持对社交媒体帖子、新闻资讯等多源数据进行采集、分析和可视化展示，帮助用户快速掌握舆情动态。

### 主要功能

- **舆情仪表盘** — 关键词云、热点话题、数据统计总览
- **社交媒体监测** — 帖子列表浏览、展开详情、评论查看
- **新闻资讯库** — 新闻列表展示、封面图片预览
- **爬取任务管理** — 爬虫任务的启用/禁用与手动触发
- **爬取日志查看** — 运行状态监控、成功/失败统计
- **AI 舆情简报** — 自动生成舆情分析报告

---

## 技术栈

| 类别 | 技术 |
|------|------|
| **前端框架** | Vue 3.5 |
| **构建工具** | Vite 6.4 |
| **UI 组件库** | Element Plus 2.13 |
| **状态管理** | Pinia 3.0 |
| **路由管理** | Vue Router 4.6 |
| **HTTP 请求** | Axios 1.13 |
| **图表库** | ECharts 5.6 |
| **CSS 预处理** | Sass (sass-embedded) |
| **工具库** | VueUse、js-cookie、jsencrypt 等 |

---

## 目录结构

```
RuoYi-frontend/
├── .env.development        # 开发环境变量
├── .env.production         # 生产环境变量
├── .env.staging            # 预发布环境变量
├── index.html              # 入口 HTML
├── package.json            # 项目依赖配置
├── vite.config.js          # Vite 构建配置
├── vite/                   # Vite 插件配置
├── public/                 # 静态资源（不参与构建）
└── src/
    ├── main.js             # 应用入口
    ├── App.vue             # 根组件
    ├── api/                # API 接口定义
    │   ├── login.js        # 登录相关接口
    │   ├── menu.js         # 菜单相关接口
    │   ├── sentiment/      # 舆情模块接口
    │   │   ├── post.js     # 社交媒体帖子接口
    │   │   ├── news.js     # 新闻资讯接口
    │   │   ├── crawl.js    # 爬取任务接口
    │   │   ├── comment.js  # 评论接口
    │   │   └── image.js    # 图片资源接口
    │   ├── monitor/        # 系统监控接口
    │   ├── system/         # 系统管理接口
    │   └── tool/           # 工具模块接口
    ├── assets/             # 静态资源（图片、样式等）
    ├── components/         # 公共组件
    ├── directive/          # 自定义指令
    ├── layout/             # 页面布局组件
    ├── plugins/            # 插件配置
    ├── router/             # 路由配置
    │   └── index.js        # 路由定义
    ├── settings.js         # 全局配置
    ├── store/              # Pinia 状态管理
    │   └── modules/
    │       ├── user.js     # 用户状态
    │       └── permission.js # 权限状态
    ├── utils/              # 工具函数
    └── views/              # 页面视图
        ├── login.vue       # 登录页
        ├── index.vue       # 首页
        ├── sentiment/      # 舆情分析模块（核心）
        │   ├── index.vue       # 旧版整合页面（已废弃）
        │   ├── dashboard.vue   # 舆情仪表盘
        │   ├── social.vue      # 社交媒体监测
        │   ├── news.vue        # 新闻资讯库
        │   ├── crawlConfig.vue # 爬取任务配置
        │   ├── crawlLog.vue    # 爬取日志
        │   ├── summary.vue     # 舆情简报
        │   ├── utils.js        # 共享工具函数
        │   └── common.css      # 共享样式
        ├── system/         # 系统管理
        ├── monitor/        # 系统监控
        └── tool/           # 系统工具
```

---

## 舆情模块组件说明

`src/views/sentiment/` 目录下各组件职责如下：

### dashboard.vue — 舆情仪表盘
舆情数据总览页面，展示关键词云、热点话题排行、数据统计图表等。是用户进入舆情模块的默认首页。

### social.vue — 社交媒体监测
社交媒体帖子监测页面，支持帖子列表浏览、展开查看帖子详情、评论内容展示。

### news.vue — 新闻资讯库
新闻资讯聚合展示页面，以卡片/列表形式展示新闻，支持封面图片预览。

### crawlConfig.vue — 爬取任务配置
爬虫任务管理页面，支持对各数据源爬取任务的启用/禁用操作，以及手动触发爬取。

### crawlLog.vue — 爬取日志
爬虫运行日志查看页面，展示爬取任务的运行状态、成功/失败次数统计。

### summary.vue — 舆情简报
AI 驱动的舆情分析简报页面，展示系统自动生成的舆情分析报告。

### utils.js — 共享工具函数
舆情模块内部共享的工具函数，供上述各组件调用。

### common.css — 共享样式
舆情模块各组件共用的样式定义。

### index.vue — 旧版整合页面（已废弃）
早期将所有功能整合在单页面的版本，现已拆分为上述独立组件。保留仅供参考。

---

## 开发与构建

### 环境准备

- **Node.js** >= 16.x
- **npm** 或 **yarn**

### 安装依赖

```bash
# 进入项目目录
cd RuoYi-frontend

# 安装依赖（推荐使用淘宝镜像）
npm install --registry=https://registry.npmmirror.com
# 或
yarn --registry=https://registry.npmmirror.com
```

### 启动开发服务

```bash
npm run dev
# 或
yarn dev
```

开发服务器启动后访问：`http://localhost:3100`

> 开发模式下，API 请求通过 Vite 代理转发至后端 `http://localhost:8080`（在 `vite.config.js` 中配置）。

### 构建命令

```bash
# 构建生产环境
npm run build:prod

# 构建预发布/staging 环境
npm run build:stage

# 预览构建产物
npm run preview
```

---

## 部署说明

### 开发环境

开发模式下直接运行 `npm run dev`，Vite 提供 HMR 热更新，前端开发服务器运行在 **3100 端口**，通过代理将 `/dev-api` 路径的请求转发至后端（默认 `http://localhost:8080`）。

### 生产构建

```bash
npm run build:prod
```

构建产物输出至 `dist/` 目录，文件结构如下：

```
dist/
├── index.html
└── static/
    ├── js/      # JavaScript 文件（按 chunk 拆分）
    ├── css/     # 样式文件
    └── ...      # 其他静态资源
```

### 部署到后端

构建完成后，将 `dist/` 目录内容复制到后端项目的静态资源目录：

```bash
# 假设后端项目在 ../RuoYi-backend
cp -r dist/* ../RuoYi-backend/src/main/resources/static/
```

后端 Spring Boot 应用启动后即可通过 `http://localhost:8080` 访问前端页面。

---

## 后端接口

前端通过 `src/api/sentiment/` 下的接口文件与后端通信：

| 接口文件 | 说明 |
|----------|------|
| `post.js` | 社交媒体帖子相关接口 |
| `news.js` | 新闻资讯相关接口 |
| `crawl.js` | 爬取任务管理接口 |
| `comment.js` | 评论相关接口 |
| `image.js` | 图片资源接口 |

后端 API 文档通过 SpringDoc 自动生成，可通过 `/v3/api-docs` 访问（已配置代理）。

---

## 许可证

MIT License
