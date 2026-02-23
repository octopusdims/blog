# 音乐日志使用说明

## 文件结构

```
static/audio/          # 存放音频文件
content/moments/       # 日志内容
```

## 创建音乐日志

新建一个 `.md` 文件在 `content/moments/` 目录下：

```markdown
---
date: 2026-02-23T18:00:00+08:00
type: "music"
mood: "🎵"
music:
  title: "歌曲名称"
  artist: "艺术家"
  src: "/audio/你的音乐文件.mp3"
  cover: "/images/封面图片.jpg"
---

你想分享的文字内容...
```

## 参数说明

| 参数 | 说明 | 必填 |
|------|------|------|
| `type` | 必须设置为 `"music"` | ✅ |
| `music.title` | 歌曲标题 | ✅ |
| `music.artist` | 艺术家名称 | ✅ |
| `music.src` | 音频文件路径，放在 `static/audio/` 下 | ✅ |
| `music.cover` | 封面图片路径 | ❌（默认使用博客默认封面） |
| `mood` | 心情 emoji | ❌ |

## 音频文件要求

- 格式：MP3、M4A、OGG、WAV 等浏览器支持的格式
- 推荐：MP3 格式，兼容性最好
- 存放位置：`static/audio/` 目录下
- 引用路径：`/audio/文件名.mp3`

## 示例

1. 将音乐文件 `mysong.mp3` 放入 `static/audio/`
2. 创建日志文件 `content/moments/2026-02-23-mysong.md`
3. 内容如下：

```markdown
---
date: 2026-02-23T20:00:00+08:00
type: "music"
mood: "😊"
music:
  title: "My Song"
  artist: "Artist Name"
  src: "/audio/mysong.mp3"
  cover: "/images/music-cover.jpg"
---

今天发现了一首超好听的歌！
```

## 注意事项

- 音频文件需要先放入 `static/audio/` 目录
- 使用相对路径 `/audio/文件名` 引用
- 每次添加新音乐后需要重新构建博客：`hugo server` 或 `hugo`
