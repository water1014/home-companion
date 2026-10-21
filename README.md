# 潮 · TIDE

> 潮起时你在，潮落时我在。

一部只装了一个人的手机。锁屏 → 解锁 → 桌面 → 点开聊天。纯前端，无后端，数据只存在你自己的浏览器里。

住在这里的是**宋祁**。

**桌面是组件化的**：双人头像 / 在一起天数 / 时钟 / 四宫格图标 / 音乐条 / 日记卡。
长按任意组件 0.5 秒进入编辑，拖到别的组件上就换位置，顺序存在 `hc.v1.layout`。

**导航四个**：说 / 他 / 记 / 我。

**想换壁纸**：改 `css/style.css` 里的一个变量即可 ——

```css
:root { --wall: url("./icons/wall.jpg"); }
```

> 全部视觉素材（图标、头像、配色）均为自绘，未使用任何第三方图片。

---

## 这是什么

不是一个"会聊天的输入框"，而是有**状态、作息、记忆**的伴侣界面。

- **他在什么时间就是什么状态**：清晨刚醒、深夜反而清醒、凌晨几乎待机。问候语、语气、主动说话的内容都跟着真实时间走。
- **他会记住你**：说"我最近喜欢喝冰茶"，他会记下来；下次问"你还记得吗"，他真的答得出来。
- **三段状态在动**：心情 / 精力 / 亲密度。聊久了会累，被夸会高兴，很久不联系会慢慢淡下来（但不会惩罚你）。
- **他会先开口**：你安静一阵子，他可能会说一句"这么晚了。你是睡不着，还是不想睡。"
- **手感按真手机做**：锁屏上划跟手解锁，页面从右侧推入（前一层左移缩小变暗），**从屏幕左边缘右滑可跟手返回**，松手按速度/距离决定回去还是回弹。
- **桌面是左右翻页**（不是上下滚动）：第一页时钟 / 天数 / 应用 / 他最近一句，第二页这一周 / 日历 / 他记得的事。手机原生滑动带惯性吸附，桌面可用鼠标拖拽或点下方圆点。
- **可选的模型接入**：不接也能用（本地人格引擎，离线可用）；接了之后换成大模型生成，失败自动退回本地。

## 三层结构

| 层 | 在哪 | 作用 |
|---|---|---|
| 人格引擎 | `js/persona.js` | 意图识别、回复生成、状态演化、记忆抽取。纯本地 |
| 记忆层 | `localStorage` | 称呼、喜好、纪念日、聊过的记录 |
| 模型层（可选） | `js/llm.js` | 前端直连 OpenAI 兼容接口，流式输出 |

## 目录

```
index.html              页面骨架（锁屏 / 主屏 / 聊天 / 心情 / 设置）
css/style.css           全部样式（浅色磨砂小手机）
js/persona.js           人格引擎（想改他的说话方式，改这里）
js/llm.js               可选的模型接入
js/app.js               渲染 / 交互 / 存储 / 路由
manifest.webmanifest    PWA 配置（可"添加到主屏幕"）
sw.js                   离线缓存
icons/                  图标
```

## 结构

三页桌面。第一页只有三块，第二页才是功能，第三页是你们的时间。

| 第一页 · 他 | 第二页 · 应用 | 第三页 · 我们的 |
|---|---|---|
| 他（头像 / 状态 / 今天说了几句） | 21 个功能位，一页装下 | 日历 + 纪念日 |
| 今天（日期 / 在一起几天） | 聊天 ✅ 心情 ✅ 记忆库 ✅ 已实现 | 这一周（哪几天说过话） |
| 一句话（他最近说的） | 其余是占了位、写好了设想的抽屉 | 本月小结（大屏才显示） |

### 已实现的部分

- **聊天**：人格引擎、状态演化、记忆、可选大模型
- **心情**：三条数值 + **一键选词**（平静 / 想你 / 有点累 / 还不错 / 有点烦 / 空），点一下就有回应，比写日记轻
- **记忆库**：自动抽取 + 手动增删
- **今日他说**：今天他说过的几句，记忆的回报要看得见
- **主动开口可调**：开关 / 频率（少·正常·多）/ 免打扰时段
- **锁屏一句**：只留一句会变的话，上划解锁后他会先开口

### 未做（位置已留，点开有设想）

碎碎念 · 朋友圈 · 相册 · 音乐 · 健康 · 天气 · 记账本 · 额度 · 学习 · 日历 · 生图 · 声音 · 美化 · 心愿 · 留言 · 星海 · 旅行

### 几个功能的前置条件（先知道，省得白做）

| 功能 | 纯前端能不能做 | 说明 |
|---|---|---|
| 天气 | 能 | 需要一个允许跨域的天气 API（Open-Meteo 免费无 key） |
| 生图 | 能 | 需要一个画图 API Key，前端直连 |
| 声音 | 大多能 | 浏览器自带 `speechSynthesis` 可离线朗读；音色有限 |
| 一起听 | **不能真同步** | 需要 WebSocket / WebRTC 信令，即必须有服务端 |
| 朋友圈 / 相册 | 单机能，多端不能 | 图片不能塞 localStorage（几 MB 就满），要对象存储 |
| 自主唤醒 | 半能 | 页面开着才能触发；真定时提醒要 Notification + 服务端 |

## 加一个新组件

`js/app.js` 里的 `WIDGETS` 就是组件注册表：

```js
const WIDGETS = {
  clock: { col: 2, row: 2, html: () => '<div class="w-clock">…</div>' },
  // col / row = 占几格（总四栏）
};
const LAYOUT_DEFAULT = ['pair', 'days', 'clock', 'quad', 'music', 'diary'];
```

加一条 → 加进 layout → 桌面上就多一块，拖拽和持久化自动生效。

## 加一个新"App"（给你的功能留的门）

打开 `js/app.js`，顶部有一个 `APPS` 注册表：

```js
const APPS = [
  { id: 'chat',  name: '聊天', icon: 'i-chat',  page: 'chat' },
  { id: 'mood',  name: '心情', icon: 'i-face',  page: 'mood' },
  { id: 'music', name: '音乐', icon: 'i-music' },   // 没有 page = 占位抽屉
  // 在这里加一条，桌面就会多一个图标
];
```

- 想接一个真页面：在 `index.html` 里照着 `#mood` 写一个 `<section class="screen page">`，
  给它一个 id，然后注册时填 `page: '你的id'`（并在 `pages` 对象里加一行）。
- 图标去 `index.html` 顶部的 `<symbol>` 图标库里挑一个，或自己画一个。
- Dock 是同一个玩法，改 `DOCK` 数组即可。

---

## 部署到 GitHub Pages

### 方式一：网页上传（不用命令行）

1. 新建一个仓库，名字随意，比如 `home-companion`，**选 Public**（免费账号的 Pages 需要公开仓库）。
2. 进入仓库 → `Add file` → `Upload files`，把本项目里**所有文件**拖进去（包括 `css/`、`js/`、`icons/` 这几个文件夹）。
3. `Commit changes`。
4. 仓库 → `Settings` → `Pages` → Source 选 **Deploy from a branch**，Branch 选 `main`、目录选 `/ (root)`，保存。
5. 等一两分钟，访问 `https://你的用户名.github.io/home-companion/`。

### 方式二：命令行

```bash
cd home-companion
git init
git add .
git commit -m "init"
git branch -M main
git remote add origin https://github.com/你的用户名/home-companion.git
git push -u origin main
```

然后按上面第 4 步开 Pages。

### 方式三：gh CLI

```bash
gh repo create home-companion --public --source=. --push
gh api -X POST repos/你的用户名/home-companion/pages \
  -f source[branch]=main -f source[path]=/
```

### 手机上用

打开 Pages 地址 → Safari「分享」→「添加到主屏幕」/ Chrome「安装应用」。
之后就是一个独立图标，全屏，断网也能打开（Service Worker 缓存）。

> ⚠️ 用 `file://` 直接双击打开会有两个限制：Service Worker 不生效、部分浏览器不给 localStorage。建议起个本地服务：`python3 -m http.server 8000`。

---

## 接入大模型（可选）

设置面板里打开开关，填三样：

| 字段 | 例子 |
|---|---|
| 接口地址 | `https://api.openai.com/v1` 或 `https://api.deepseek.com/v1` |
| 模型 | `gpt-4o-mini` / `deepseek-chat` |
| API Key | `sk-...` |

要求接口兼容 `POST /v1/chat/completions` 且支持 `stream: true`。

**关于密钥**：它只存在这台设备的 localStorage，不上传任何地方。但前端直连意味着密钥对浏览器可见——所以这套东西适合**自己给自己用**，不适合做成给别人用的产品（那需要后端代理）。

---

## 数据与备份

- 全部数据在浏览器 localStorage：`hc.v1.chat` / `hc.v1.persona` / `hc.v1.memory` / `hc.v1.settings`
- 设置里可以**导出 JSON**（不含密钥），换设备/换浏览器时导入
- 清缓存会清掉数据，重要的话定期导出

## 想改他

`js/persona.js` 里三处最关键：

1. `LINES` — 每个意图 × 三种心情档位的台词。加一条就是加一个可能的反应。
2. `ACTIVITY` — 各时段他在做什么（顶栏那行状态文字）。
3. `INITIATIVE` — 他主动开口说的话。

改完刷新即可，不需要构建。

---

本地优先 · 无服务器 · 数据只在你手里
