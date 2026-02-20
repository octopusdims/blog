# Liquid Hugo Theme

一个从 Hexo 移植到 Hugo 的现代深色主题，具有玻璃拟态效果。

## 特性

- 🌙 深色模式（默认）
- 🔍 内置搜索功能
- 📑 文章目录 (TOC)
- 🏷️ 分类和标签支持
- 📝 文章字数统计
- 📱 响应式设计
- 🎨 玻璃拟态视觉效果
- 🔢 KaTeX 数学公式支持

## 安装

```bash
cd your-hugo-site
git clone https://github.com/yourname/hugo-theme-liquid.git themes/liquid-hugo
```

然后在 `hugo.toml` 中设置主题：

```toml
theme = 'liquid-hugo'
```

## 配置

在 `hugo.toml` 中添加以下配置：

```toml
baseURL = 'https://your-site.com'
languageCode = 'zh-CN'
title = 'Your Blog'

[params]
  # 站点信息
  suffix = "DIMS"
  author = "Your Name"
  keyword = "blog"
  description = "Your description"
  since_year = 2025
  
  # 文章设置
  [params.posts]
    per_page = 6
    default_cover = "/images/default-cover.jpg"
  
  # 功能开关
  [params.features]
    dark_mode = true
    search = true
    toc = true
    wordcount = true
    back_to_top = true
  
  # 关于信息
  [params.about]
    name = "Your Name"
    avatar = "https://your-avatar-url.jpg"
    description = "Your description"
    [[params.about.social]]
      name = "github"
      link = "https://github.com/yourname"
      icon = "github"
  
  # KaTeX 数学公式
  [params.katex]
    enable = true
    cdn = "https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/"
  
  # 页脚
  [params.footer]
    copyright = "Your Name"
    since = 2025

[menu]
  [[menu.main]]
    name = '主页'
    url = '/'
    weight = 10
  [[menu.main]]
    name = '归档'
    url = '/archives'
    weight = 20
  [[menu.main]]
    name = '关于'
    url = '/about'
    weight = 30

[taxonomies]
  category = 'categories'
  tag = 'tags'

[pagination]
  pagerSize = 6
```

## 内容结构

```
content/
├── posts/          # 文章目录
│   ├── post-1/
│   │   ├── index.md
│   │   └── cover.jpg
│   └── post-2/
│       └── index.md
├── about/
│   └── index.md    # 关于页面
└── archives/
    └── index.md    # 归档页面
```

## 文章 Front Matter

```yaml
---
title: "文章标题"
date: 2025-01-01T00:00:00+08:00
draft: false
tags:
  - tag1
  - tag2
categories:
  - category1
description: "文章描述"
cover: "./cover.jpg"  # 文章封面图
math: true            # 启用数学公式
---
```

## 搜索功能

主题内置搜索功能，会自动生成 `search.json` 文件。搜索数据包含所有文章的标题、内容、分类和标签信息。

## 许可证

MIT
