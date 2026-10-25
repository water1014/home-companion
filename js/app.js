/* ============================================================
   app.js — 宋祁手机 · 界面 / 存储 / 交互
   想加新功能：在下面 APPS 里注册一条即可
   ============================================================ */
(function () {
  'use strict';
  window.__TIDE_MARK = 'LOCAL-v64';

  const P = window.Persona;
  const LLM = window.LLM;
  const $ = (id) => document.getElementById(id);

  /* ============================================================
     外观：明暗 + 字体
     两个值各自独立存 localStorage（tide.theme / tide.font），
     <head> 里的内联脚本已经先把 data-theme / data-font 挂上 html 了，
     这里负责「切换 + 落盘」，CSS 变量全部跟着 html 属性走。
     ============================================================ */
  const APPEAR_KEY = { theme: 'tide.theme', font: 'tide.font' };

  function appearCfg() {
    let theme = 'dark', font = 'serif';
    try {
      theme = localStorage.getItem(APPEAR_KEY.theme) || 'dark';
      font = localStorage.getItem(APPEAR_KEY.font) || 'serif';
    } catch (_) {}
    return { theme: theme === 'light' ? 'light' : 'dark', font: font === 'sans' ? 'sans' : 'serif' };
  }

  function applyAppearance(theme, font) {
    const a = { theme: theme || appearCfg().theme, font: font || appearCfg().font };
    document.documentElement.dataset.theme = a.theme;
    document.documentElement.dataset.font = a.font;
    return a;
  }

  function patchAppearance(patch) {
    const a = appearCfg();
    const next = { theme: patch.theme || a.theme, font: patch.font || a.font };
    try {
      localStorage.setItem(APPEAR_KEY.theme, next.theme);
      localStorage.setItem(APPEAR_KEY.font, next.font);
    } catch (_) {}
    applyAppearance(next.theme, next.font);
    syncAppearance();
    return next;
  }

  /* 设置页两个分段控件的高亮跟随当前值 */
  function syncAppearance() {
    const a = appearCfg();
    const mark = (id, v) => {
      const seg = $(id);
      if (!seg) return;
      seg.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.v === v));
    };
    mark('segTheme', a.theme);
    mark('segFont', a.font);
  }

  /* ============================================================
     应用注册表 —— 之后加功能就在这里加一条
     page: 'chat' | 'now' | 'records' | 'settings' | null
     page 留空 = 占位页（点开会显示 desc 里写好的设想）
     ============================================================ */
  /* 贴纸色板：浅底 / 同色深线 */
  const TINTS = [
    ['#ffe9f0', '#ffcbdb', '#b8697f'],
    ['#e8f1fe', '#cadef8', '#6b86ad'],
    ['#fff5e4', '#ffe2ba', '#a8824e'],
    ['#f1eaff', '#ddcdfa', '#8168ac'],
    ['#e6f8ee', '#caecda', '#5f9478'],
    ['#fff1e9', '#ffd8c6', '#b87360'],
  ];

  function tintFor(id) {
    let h = 7;
    for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 9973;
    return TINTS[h % TINTS.length];
  }

  const APP_VER = '23';   // 版本号会显示在编辑提示里，方便确认手机上跑的是哪版
  /* 五类：now 现在 / past 过去 / next 将来 / between 之间 / me 我
     cat 决定它落在「全部应用」的哪一组；名字统一两个字 */
  const APPS_DEFAULT = [
    /* 【现在】当下正在发生的事 */
    { id: 'chat',     name: '聊天', icon: 'i-chat',    cat: 'now', page: 'chat' },
    { id: 'mood',     name: '状态', icon: 'i-face',    cat: 'now', page: 'now', seg: 'status' },
    { id: 'partnerday', name: '一天', icon: 'i-sunrise', cat: 'now', page: 'now', seg: 'day' },
    { id: 'device',   name: '设备', icon: 'i-device',  cat: 'now', page: 'now', seg: 'device' },
    { id: 'health',   name: '健康', icon: 'i-health',  cat: 'now', desc: '睡眠、喝水、久坐。数字旁边会跟一句人话，比如「今天只走了 800 步，坐太久了」。' },
    { id: 'forecast',  name: '天气', icon: 'i-sun',     cat: 'now', desc: '今天的温度、有没有雨。不接 API 就先手动记，接了就自动。' },
    { id: 'voice',    name: '声音', icon: 'i-wave',    cat: 'now', desc: '让他读出来，或者发一条语音。先在本地合成，不联网也能响。' },
    { id: 'music',    name: '音乐', icon: 'i-music',   cat: 'now', desc: '想做成「一起听」：同一个进度条，两边同时听到同一秒。\n真同步需要服务端，纯前端只能做到手动对齐。' },

    /* 【过去】已经存下来的东西 */
    { id: 'memory',   name: '记忆', icon: 'i-brain',   cat: 'past', page: 'mirror', seg: 'memory' },
    { id: 'album',    name: '相册', icon: 'i-album',   cat: 'past', page: 'mirror', seg: 'gallery' },
    { id: 'moments',  name: '朋友圈', icon: 'i-moments', cat: 'past', page: 'mirror', seg: 'gallery' },
    { id: 'notes',    name: '记录', icon: 'i-note',    cat: 'past', desc: '聊天记录导出、日记流水，按时间堆在这里。' },
    { id: 'travel',   name: '旅行', icon: 'i-plane',   cat: 'past', desc: '想去哪、什么时候去、要带什么。攒够了就出发。' },
    { id: 'starsea',  name: '星海', icon: 'i-starsea', cat: 'past', desc: '一片只属于你们的夜空。看过的、想去的、说过的，都挂成星星。' },
    { id: 'studyroom', name: '书房', icon: 'i-book',   cat: 'past', desc: '位置留好了。想放什么（一起读书的笔记、他的抽屉）等你说了算。' },

    /* 【将来】还没到的时间 */
    { id: 'courses',  name: '课程', icon: 'i-course',  cat: 'next', page: 'courses' },
    { id: 'countdown', name: '倒数', icon: 'i-hourglass', cat: 'next', page: 'countdown' },
    { id: 'anniv',    name: '纪念日', icon: 'i-heart', cat: 'next', desc: '从倒数里分出来的一页：在一起多少天，以及每年要过的那几个日子。页面下一步做。' },
    { id: 'calendar', name: '日历', icon: 'i-cal',     cat: 'next', page: 'calendar', desc: '纪念日、约定、他的作息。点某一天，能看见那天发生了什么。' },

    /* 【之间】两个人互相给的东西 */
    { id: 'cards',    name: '卡券', icon: 'i-ticket',  cat: 'between', page: 'cards' },
    { id: 'message',  name: '留言', icon: 'i-mail',    cat: 'between', desc: '他给你留的话。写了就送到，不像信要等时候。\n数据已经在攒了，界面下一批接。' },
    { id: 'letter',   name: '信',   icon: 'i-mail',    cat: 'between', desc: '写了但不急着让你看到的，攒着。到点才拆。' },
    { id: 'wish',     name: '心愿', icon: 'i-spark',   cat: 'between', desc: '想一起做的事。做掉一件，划掉一件。' },
    { id: 'game',     name: '游戏', icon: 'i-game',    cat: 'between', desc: '不止一个。石头剪刀布、猜数字、真心话……能一起耗时间的小东西。下一批做。' },
    { id: 'ledger',   name: '记账', icon: 'i-ledger',  cat: 'between', desc: '一起花的钱，一笔一笔。他也可以记下自己「想要」的东西。' },
    { id: 'quota',    name: '额度', icon: 'i-quota',   cat: 'between', desc: '不显示还剩多少钱，显示还能陪你几次。' },

    /* 【我】设置和家当 */
    { id: 'theme',    name: '美化', icon: 'i-palette', cat: 'me', page: 'theme' },
    { id: 'data',     name: '数据', icon: 'i-ledger',  cat: 'me', page: 'settings' },
    { id: 'model',    name: '模型', icon: 'i-meter',   cat: 'me', page: 'settings' },
    { id: 'wake',     name: '唤醒', icon: 'i-bell',    cat: 'me', desc: '不只被叫才说话。定时或随机地，主动找你一次。\n纯前端只能在页面打开时生效；要做到真提醒得走通知 + 服务端。' },
    { id: 'image',    name: '生图', icon: 'i-magic',   cat: 'me', desc: '打字出图。他的样子、你们想去的地方、今天的心情。\n需要一个画图的 API Key，接在哪由你定。' },
    { id: 'console',  name: '用量', icon: 'i-meter',   cat: 'me', desc: '模型用量：峰值 token、总请求数、本地引擎命中率、输出量、估算费用。\n用量数据现在就在默默记着，界面下一批做。' },
    { id: 'study',    name: '学习', icon: 'i-book',    cat: 'me', desc: '一起背单词、番茄钟。他在旁边看着，你走神他会说一句。' },
  ];

  /* 全部应用分五组，组间距 24 */
  const APP_CATS = [
    { k: 'now',     name: '现在' },
    { k: 'past',    name: '过去' },
    { k: 'next',    name: '将来' },
    { k: 'between', name: '之间' },
    { k: 'me',      name: '我' },
  ];

  /* 底部常驻四个：他 / 说 / 记 / 我（顺序固定，别再加第五个） */
  const DOCK_DEFAULT = [
    { id: 'mood',     name: '他', icon: 'i-face',  page: 'now', seg: 'status' },
    { id: 'chat',     name: '说', icon: 'i-chat',  page: 'chat' },
    { id: 'memory',   name: '记', icon: 'i-brain', page: 'records', seg: 'memory' },
    { id: 'settings', name: '我', icon: 'i-gear',  page: 'settings' },
  ];

  /* 新 dock（v42 三区骨架）：五格 —— 现在 / 记 / Home / 日 / 我。
     tab = 点亮规则：currentPage 为 null（主屏）时 Home 亮，
     打开某页时对应格亮；Home 是圆形凸起键，点它回主屏。
     data-app 保留，角标查询（.tile[data-app]）不用改。 */
  /* 镜花水月 · 四 Tab：月 MOON / 水 WATER / 花 FLOWER / 镜 MIRROR */
  const DOCK_TABS = [
    { id: 'moon',   name: '月', en: 'MOON',   icon: 'i-home',  page: null },
    { id: 'water',  name: '水', en: 'WATER',  icon: 'i-chat',  page: 'chat' },
    { id: 'flower', name: '花', en: 'FLOWER', icon: 'i-book',  page: 'records', seg: 'all' },
    { id: 'mirror', name: '镜', en: 'MIRROR', icon: 'i-gear',  page: 'mirror',  seg: 'gallery' },
  ];

  /* 应用/dock 顺序可拖动换位，存本地；读出来时按注册表校准，缺的补默认 */
  /* 老 id → 新 id：改名后老用户存的排列顺序不能丢 */
  const ID_ALIAS = { herday: 'partnerday' };

  function loadOrder(k, def) {
    const rawIds = load(k, def.map((a) => a.id));
    const ids = (Array.isArray(rawIds) ? rawIds : []).map((x) => ID_ALIAS[x] || x);
    const known = {};
    def.forEach((a) => { known[a.id] = a; });
    const out = [];
    (Array.isArray(ids) ? ids : []).forEach((id) => {
      if (known[id] && !out.some((o) => o.id === id)) out.push(known[id]);
    });
    def.forEach((a) => { if (!out.some((o) => o.id === a.id)) out.push(a); });
    return out;
  }

  /* ---------------- 存储 ---------------- */

  const KEY = {
    chat: 'hc.v1.chat',
    persona: 'hc.v1.persona',
    memory: 'hc.v1.memory',
    settings: 'hc.v1.settings',
    mood: 'hc.v1.mood',
    apps: 'hc.v1.apps',
    dock: 'hc.v1.dock',
    pages: 'hc.v1.appPages', // 三页各自的应用名单（自由摆放）
    seeded: 'hc.v1.seeded',  // 种子已灌过（不管灌没灌成功都标记，防重复）
    life: 'hc.v1.life',      // 心事/念头/课程/倒数日/卡券/设备/用量/他的一天
    timers: 'hc.v1.timers',  // 内部闹钟（续话那种）
    meta: 'hc.v1.meta',      // schema 版本
    chatUI: 'hc.v1.chatUI',  // 聊天界面专属设置（头像/备注/美化/输入）
    homeOrder: 'hc.v1.homeOrder', // 首屏卡片顺序（可拖，默认按规范那五块）
    modSeg: 'hc.v1.modSeg',    // 容器页当前分段（{ now: 'status', ... }）
  };

  /* ============================================================
     统一存储：localStorage 只有一个 key —— tide.v1
     老版本散在 hc.v1.* 的数据第一次读到时整体搬过来（旧 key 保留做备份，不删）。
     页面里照旧用 load(KEY.x) / save(KEY.x, v)，调用方式不变。
     写回是有变化才写，不每次无脑刷。
     ============================================================ */
  const TIDE_KEY = 'tide.v1';
  let __tide = null;          // 整个 state 的内存镜像
  let __tideSnap = '';        // 上次落盘的字符串，用来判断有没有真变化
  const fieldOf = (k) => k.split('.').pop();

  function tideWriteNow() {
    if (!__tide) return;
    const s = JSON.stringify(__tide);
    if (s === __tideSnap) return;
    try { localStorage.setItem(TIDE_KEY, s); __tideSnap = s; } catch (_) {}
  }

  let __tideTimer = 0;
  function tideWrite() {
    if (__tideTimer) return;
    __tideTimer = setTimeout(() => { __tideTimer = 0; tideWriteNow(); }, 0);
  }

  /* 老 key 搬家：hc.v1.* → tide.v1，任何一条有数据就算迁移过 */
  function tideMigrate() {
    const out = {};
    let any = false;
    Object.keys(KEY).forEach((f) => {
      let r = null;
      try { r = localStorage.getItem(KEY[f]); } catch (_) {}
      if (r) { try { out[f] = JSON.parse(r); any = true; } catch (_) {} }
    });
    return any ? out : null;
  }

  function tideLoad() {
    if (__tide) return __tide;
    let obj = null;
    try { const r = localStorage.getItem(TIDE_KEY); if (r) obj = JSON.parse(r); } catch (_) {}
    if (!obj || typeof obj !== 'object') {
      obj = tideMigrate() || {};
      __tide = obj;
      tideWriteNow();     // 迁移结果立刻落盘，旧 key 原样留着
      return __tide;
    }
    __tide = obj;
    __tideSnap = JSON.stringify(obj);
    return __tide;
  }

  const load = (k, fb) => {
    const t = tideLoad();
    const v = t[fieldOf(k)];
    return v === undefined ? fb : v;
  };
  const save = (k, v) => {
    tideLoad()[fieldOf(k)] = v;
    tideWrite();
  };
  const dropKey = (k) => {
    delete tideLoad()[fieldOf(k)];
    tideWrite();
  };

  let APPS = loadOrder(KEY.apps, APPS_DEFAULT);
  let DOCK = loadOrder(KEY.dock, DOCK_DEFAULT);

  const pad = (n) => String(n).padStart(2, '0');
  const todayStr = () => {
    const d = new Date();
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  };

  /* 生活层数据的默认结构：新增字段只要在这里加，migrate 会替老数据补上 */
  const LIFE_DEFAULT = () => ({
    v: 1,
    thought: { text: '', ts: 0 },                  // 机的心事：新的直接覆盖旧的
    ideas: [],                                     // 待续念头：追加去重，上限 30
    courses: [],                                   // [{id,day:0-6,start,end,name,room}]
    countdowns: [],                                // [{id,title,date,note,repeat}]
    coupons: [],                                   // [{id,title,desc,usedAt,note,by}]
    said: { date: '', text: '' },                  // 他今天想对你说（零点换）
    saidLog: [],                                   // 往期：[{date,text}]
    dayLog: [],                                    // 机的一天：[{ts,text,kind,inferred}]
    device: { ts: 0 },                             // 查手机快照
    usage: { total: { prompt: 0, completion: 0, requests: 0, local: 0 }, peak: 0, byDay: {} },
    mails: [],                                     // 留言：[{id,from,text,at}]（种子先落这，界面后面接）
    music: [],                                     // 一起听歌单：[{id,title,artist,note}]（种子先落这）
    photos: [],                                    // 相册：[{id,img,cap,ts}]
    moments: [],                                   // 朋友圈：[{id,text,img,ts,reply,replyTs}]
  });

  const SCHEMA = 3;

  /* 聊天界面专属设置：只影响聊天，不碰别的页面 */
  const CHATUI_DEFAULT = () => ({
    partnerAvatar: '',     // 他的头像 dataURL（空=用首字）
    myAvatar: '',      // 我的头像 dataURL（空=用首字）
    partnerAlias: '',      // 聊天里对他的称呼（空=用本名）
    bubble: 'frost',   // 气泡质感：frost 磨砂 / solid 纯色
    ava: false,        // 头像列（参考图那版：头像在左侧）
    fs: 'md',          // 字号：sm / md / lg
    showThink: true,   // 思考药丸
    showBpm: true,     // 心率彩蛋
    showDate: true,    // 日期分隔
    bg: 'wall',        // 聊天背景：wall 桌面壁纸 / light 浅色
    enterSend: true,   // 回车发送
    autoScroll: true,  // 新消息自动滚到底
  });

  const S = {
    chat: load(KEY.chat, []),
    persona: load(KEY.persona, { mood: 58, energy: 62, affection: 12, lastTick: Date.now() }),
    memory: load(KEY.memory, { userName: '', partnerName: '宋祁', facts: [], startDate: todayStr() }),
    settings: load(KEY.settings, { enabled: false, apiBase: '', model: '', apiKey: '' }),
    moodLog: load(KEY.mood, {}),
    life: load(KEY.life, null),
    timers: load(KEY.timers, []),
    meta: load(KEY.meta, null),
    chatUI: load(KEY.chatUI, CHATUI_DEFAULT()),
  };
  const saveChatUI = () => save(KEY.chatUI, S.chatUI);
  // 字段补全：老数据缺了新加的键也能用
  S.chatUI = Object.assign(CHATUI_DEFAULT(), S.chatUI);

  S.persona = P.evolve(S.persona, Date.now());
  save(KEY.persona, S.persona);

  // 从旧版本迁移：默认名换过一次
  if (S.memory.partnerName === '小满') {
    S.memory.partnerName = '宋祁';
    save(KEY.memory, S.memory);
  }

  /* 版本迁移：老数据缺什么补什么，绝不整体重置用户的东西 */
  function migrate() {
    let v = S.meta && S.meta.schema ? S.meta.schema : 1;

    if (!S.life || typeof S.life !== 'object') S.life = LIFE_DEFAULT();
    const L = S.life;
    const def = LIFE_DEFAULT();
    Object.keys(def).forEach((k) => { if (L[k] === undefined) L[k] = def[k]; });
    ['ideas', 'courses', 'countdowns', 'coupons', 'saidLog', 'dayLog', 'mails', 'music', 'photos', 'moments'].forEach((k) => {
      if (!Array.isArray(L[k])) L[k] = [];
    });
    if (!L.thought || typeof L.thought !== 'object') L.thought = { text: '', ts: 0 };
    if (!L.said || typeof L.said !== 'object') L.said = { date: '', text: '' };
    if (!L.device || typeof L.device !== 'object') L.device = { ts: 0 };
    if (!L.usage || typeof L.usage !== 'object') L.usage = def.usage;
    if (!L.usage.total || typeof L.usage.total !== 'object') L.usage.total = def.usage.total;
    if (!L.usage.byDay || typeof L.usage.byDay !== 'object') L.usage.byDay = {};
    if (!Array.isArray(S.timers)) S.timers = [];

    /* 称呼改中性了：老数据里的 herName / herAvatar / herAlias 搬一次家，不丢东西 */
    if (!S.memory.partnerName && S.memory.herName) S.memory.partnerName = S.memory.herName;
    if (!S.chatUI.partnerAvatar && S.chatUI.herAvatar) S.chatUI.partnerAvatar = S.chatUI.herAvatar;
    if (!S.chatUI.partnerAlias && S.chatUI.herAlias) S.chatUI.partnerAlias = S.chatUI.herAlias;
    save(KEY.memory, S.memory);
    save(KEY.chatUI, S.chatUI);
    // 老聊天记录的 role 是 'her'，isMine() 已经把它当「他」处理，不用改数据


    if (v < SCHEMA) v = SCHEMA;
    /* 保留 meta 里的其它标记（比如 STEP B 一次性归位的 stepB）：
       以前这里是整体覆盖，会把下次启动还要用的标记冲掉 */
    S.meta = Object.assign({}, S.meta, { schema: v });
  }
  migrate();

  /* ---------------- 种子（家机给的 seed.json，编译进 js/seed.js） ----------------
     约定：这站没有后端，数据只在本机 localStorage。
     第一次进站先查有没有数据，没有就把种子灌进去，页面才不空；
     灌过（或本来就有真数据）就只打标记，绝不覆盖。 */
  function applySeed(seed) {
    if (!seed || !seed.meta) return;
    // 名字与起始日：空的才填，用户改过的别动
    if (!S.memory.userName) S.memory.userName = seed.meta.me_name || '';
    if (!S.memory.partnerName || S.memory.partnerName === '宋祁') S.memory.partnerName = seed.meta.partner_name || seed.meta.her_name || S.memory.partnerName;
    if (seed.meta.since) S.memory.startDate = seed.meta.since;
    // 三件事 → 记着的事（主页统计和记忆页都从这读）
    if (!(S.memory.facts || []).length && Array.isArray(seed.todos)) {
      S.memory.facts = seed.todos.map((t) => t.text + (t.due ? '（' + t.due.slice(5).replace('-', '.') + ' 前）' : ''));
    }
    // 一条消息 → 聊天流
    if (!S.chat.length && Array.isArray(seed.messages)) {
      S.chat = seed.messages.map((m) => ({
        role: m.from === 'me' ? 'me' : 'partner',
        text: m.text,
        ts: m.at ? new Date(m.at).getTime() : Date.now(),
      }));
    }
    // 两个纪念日 → 倒数日（repeat 在这站是布尔）
    if (!S.life.countdowns.length && Array.isArray(seed.anniversaries)) {
      S.life.countdowns = seed.anniversaries.map((a, i) => ({
        id: 'seed_ann' + i,
        title: a.name,
        date: a.date,
        note: a.note || '',
        repeat: a.repeat === 'yearly',
      }));
    }
    // 三首歌 → 一起听歌单（小部件显示第一首）
    if (Array.isArray(seed.music)) S.life.music = seed.music.slice();
    // 留言 → 存档（said 直接吃他给的那条；两条都留档等留言页接上）
    if (Array.isArray(seed.notes)) {
      S.life.mails = seed.notes.slice();
      const partners = seed.notes.filter((n) => n.from !== (seed.meta.me_name || 'me'));
      const last = partners[partners.length - 1];
      if (last && (!S.life.said || !S.life.said.text)) {
        S.life.said = { date: (last.at || '').slice(0, 10) || todayStr(), text: last.text };
      }
    }
    // 心情轨迹 → moodLog（日期 → 词），情绪值顺到最后一次的 level
    if (Array.isArray(seed.mood_history)) {
      seed.mood_history.forEach((h) => { S.moodLog[h.date] = h.word; });
      const lastM = seed.mood_history[seed.mood_history.length - 1];
      if (lastM && typeof lastM.level === 'number') S.persona.mood = lastM.level;
    }
    // 空态文案 + 状态行
    if (seed.empty_text) S.settings.emptyText = seed.empty_text;
    if (seed.me && seed.me.status_line) S.settings.statusLine = seed.me.status_line;
    persistAll();
    tideWriteNow();
  }

  /* 第一次进站：本地没数据时 fetch 同级 seed.json 灌进来。
     file:// 或离线时 fetch 不到，退回 js/seed.js 里那份（内容同源）。 */
  async function seedIfEmpty() {
    if (load(KEY.seeded, false)) return;
    const untouched =
      !S.chat.length &&
      !(S.memory.facts || []).length &&
      !S.life.countdowns.length &&
      S.memory.startDate === todayStr();
    if (untouched) {
      let seed = null;
      try {
        const res = await fetch('seed.json', { cache: 'no-cache' });
        if (res.ok) seed = await res.json();
      } catch (_) {}
      if (!seed) seed = window.TIDE_SEED;
      if (seed) applySeed(seed);
    }
    save(KEY.seeded, true);
    tideWriteNow();
  }

  const persistAll = () => {
    save(KEY.chat, S.chat);
    save(KEY.persona, S.persona);
    save(KEY.memory, S.memory);
    save(KEY.settings, S.settings);
    save(KEY.mood, S.moodLog);
    save(KEY.life, S.life);
    save(KEY.timers, S.timers);
    save(KEY.meta, S.meta);
  };

  // seedIfEmpty 挪进 boot() 里 await：先灌种子再渲染，首屏不会先空一下再变

  /* ---------------- 小工具 ---------------- */

  const clamp = P.clamp;
  const hhmm = (ts) => {
    const d = new Date(ts);
    return pad(d.getHours()) + ':' + pad(d.getMinutes());
  };

  const WEEK = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];

  function dateLabel(d) {
    return (d.getMonth() + 1) + '月' + d.getDate() + '日 ' + WEEK[d.getDay()];
  }

  function toast(text) {
    const el = $('toast');
    el.textContent = text;
    el.classList.add('show');
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove('show'), 2400);
  }

  const partnerName = () => S.memory.partnerName || S.memory.herName || '宋祁';
  /* 谁在说话：me = 我；其余（partner，以及老数据里的 her）都算他 */
  const isMine = (m) => String((m && m.role) || '') === 'me';
  const isMineBy = (by) => String(by || '') === 'me';
  const partnerInitial = () => (partnerName().trim().slice(-1) || '满');

  /* 聊天界面专属显示名（备注）：有备注用备注，否则用本名 */
  const chatPartnerName = () => S.chatUI.partnerAlias.trim() || partnerName();
  const myInitial = () => (S.memory.userName ? S.memory.userName.trim().slice(0, 1) : '我');
  /* 头像innerHTML：有图用 <img>，否则用首字 */
  const partnerAvaInner = (cls) =>
    S.chatUI.partnerAvatar
      ? '<img alt="" src="' + S.chatUI.partnerAvatar + '">'
      : '<span class="' + cls + '">' + partnerInitial() + '</span>';
  const myAvaInner = (cls) =>
    S.chatUI.myAvatar
      ? '<img alt="" src="' + S.chatUI.myAvatar + '">'
      : '<span class="' + cls + '">' + myInitial() + '</span>';

  function daysSince() {
    const start = new Date((S.memory.startDate || todayStr()) + 'T00:00:00');
    return Math.max(0, Math.floor((Date.now() - start.getTime()) / 86400000)) + 1;
  }

  /* ---------------- 路由 + 手势 ---------------- */

  const phone = $('phone');
  const home = $('home');
  const dim = document.querySelector('.home-dim');
  const pages = {
    chat: $('chat'),
    now: $('now'),          // 容器页：状态 / 一天 / 设备
    records: $('records'),  // 容器页：记忆 / 相册 / 朋友圈
    settings: $('settings'),
    todo: $('todo'),
    theme: $('theme'),
    courses: $('courses'),
    countdown: $('countdown'),
    cards: $('cards'),
    calendar: $('calendar'),
    more: $('more'),
    mirror: $('mirror'),   // 容器页：相册 / 足迹 / 记忆 / 底座
  };

  /* 顶栏标题：页面 id → 中文标题（抽屉删掉后，标题由顶栏承担） */
  const PAGE_TITLES = {
    chat: '聊天',
    now: '现在',
    records: '花',
    settings: '设置',
    todo: '待办',
    theme: '壁纸与桌面',
    courses: '课程',
    countdown: '倒数',
    cards: '之间',
    calendar: '日历',
    more: '更多',
    mirror: '镜',
  };

  let currentPage = null;
  let movingTimer = 0;

  function markMoving(ms) {
    phone.classList.add('moving');
    clearTimeout(movingTimer);
    movingTimer = setTimeout(() => phone.classList.remove('moving'), ms || 520);
  }

  /** 清掉滑动过程中写下的 inline 值，让 CSS 重新接管 */
  function resetHomeInline() {
    home.style.transition = '';
    home.style.transform = '';
    home.style.opacity = '';
    if (dim) dim.style.opacity = '';
  }

  /* v42：页面切换只准淡入 180ms（.screen.page 的 CSS 过渡），
     不再滑轨、不再给主屏加 zoom 视差；手势里写过的 inline 值仍要清掉 */
  function openPage(id, seg) {
    const el = pages[id];
    if (!el) return;
    if (currentPage === id) {
      // 已在同一页：只切分段（抽屉/桌面图标重复点也走这条）
      if (seg) switchSeg(id, seg);
      return;
    }

    resetHomeInline();

    // 上一个页面瞬间归位（列表里只会有一个打开）
    if (currentPage && pages[currentPage]) {
      const prev = pages[currentPage];
      prev.style.transition = 'none';
      prev.classList.remove('open');
      prev.style.transform = '';
      void prev.offsetWidth;
      prev.style.transition = '';
    }

    el.style.transition = 'none';
    el.style.transform = '';
    void el.offsetWidth;
    el.style.transition = '';

    el.classList.add('open');
    currentPage = id;
    syncDock();
    syncTopbar();

    if (id === 'chat') {
      clearBadge('chat');
      applyChatUI();
      scrollDown(true);
    }
    // 容器页：落到指定分段 → 上次那段 → 第一段
    if (el.classList.contains('mod-page')) {
      const first = el.querySelector('.seg-btn');
      switchSeg(id, seg || lastSeg(id) || (first ? first.dataset.seg : null));
    }
    if (id === 'settings') syncSettingsForm();
    if (id === 'courses') renderCourses();
    if (id === 'countdown') renderCountdownPage();
    if (id === 'cards') renderCoupons();
    if (id === 'theme') renderTheme();
    if (id === 'settings') renderAppRows();
    if (id === 'calendar') renderCalendarPage();
  }

  function closePage() {
    if (!currentPage) return;
    const el = pages[currentPage];
    el.style.transition = '';
    el.style.transform = '';
    el.classList.remove('open');
    resetHomeInline();
    currentPage = null;
    syncDock();
    syncTopbar();
    replayMoon();          // 回月的时候，天数再浮一次
  }

  document.querySelectorAll('[data-back]').forEach((b) => {
    b.addEventListener('click', closePage);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closePage();
  });

  /* ============================================================
     v43 · 容器页分段（页面合并：15 页 → 8 页，旧页面内容搬进容器页）
     · mod-page 顶部一排胶囊分段，选中实底 --accent
     · 每个分段是一个 seg-pane，切换只换 hidden + 重渲染该段内容
     · goModule(page, seg)：打开容器页并落到指定分段（桌面图标/抽屉/dock 都用它）
     · 分段状态记在 tide.v1.modSeg，下次进来停在上次那段
     ============================================================ */
  function modSegCfg() {
    const c = load(KEY.modSeg, null);
    return c && typeof c === 'object' ? c : {};
  }
  function lastSeg(page) {
    return modSegCfg()[page] || null;
  }
  function rememberSeg(page, seg) {
    const c = modSegCfg();
    c[page] = seg;
    save(KEY.modSeg, c);
  }

  /* 每个分段渲染什么：分段 key → 渲染函数（now 页先接，其他容器页后续接） */
  /* 记容器页共用搜索词：顶部搜索框对所有分段（记忆 / 相册 / 朋友圈）生效 */
  let recSearchTerm = '';
  const recSearchEl = $('recSearch');
  if (recSearchEl) {
    recSearchEl.addEventListener('input', () => {
      recSearchTerm = recSearchEl.value.trim().toLowerCase();
      const seg = lastSeg('records') || 'all';
      const fn = SEG_RENDER.records && SEG_RENDER.records[seg];
      if (fn) fn();
    });
  }

  const SEG_RENDER = {
    now: {
      status: () => renderMood(),
      day: () => renderPartnerDay(),
      device: () => renderDevice(),
    },
    /* 花 FLOWER：日记 / 信 / 待办（+ 全部时间线） */
    records: {
      all: () => renderFlowerAll(),
      diary: () => renderDiary(),
      letters: () => renderLetters(),
      tasks: () => renderTasks(),
    },
    /* 镜 MIRROR：相册 / 足迹 / 记忆 / 底座 */
    mirror: {
      gallery: () => { renderAlbum(); renderAlbumCal(); renderMoments(); },
      moments: () => renderFootprint(),
      memory: () => renderMemoryPage(),
      system: () => {},
    },
  };

  /** 分类条的滑动指示器：跟随当前分段滑动（FLOWER 用细线 + 滑动下划线） */
  function moveSegInk(bar) {
    if (!bar) return;
    if (!bar.closest('.fl-page')) return;   // 只有 FLOWER 用滑动指示器
    let ink = bar.querySelector('.seg-ink');
    if (!ink) {
      ink = document.createElement('i');
      ink.className = 'seg-ink';
      bar.appendChild(ink);
    }
    const on = bar.querySelector('.seg-btn.on');
    if (!on) { ink.style.width = '0px'; return; }
    const br = bar.getBoundingClientRect();
    const or = on.getBoundingClientRect();
    ink.style.width = Math.round(or.width) + 'px';
    ink.style.transform = 'translateX(' + Math.round(or.left - br.left) + 'px)';
  }

  function switchSeg(page, seg) {
    const box = pages[page];
    if (!box || !box.classList.contains('mod-page')) return;
    const bar = box.querySelector('.seg-bar');
    const panes = box.querySelectorAll('.seg-pane');
    /* 旧入口可能还带着已经搬走的分段 key（记忆→镜、相册→镜…）：
       找不到就落回第一段，别把整页清空 */
    if (seg && panes.length && !box.querySelector('.seg-pane[data-seg="' + seg + '"]')) {
      seg = panes[0].dataset.seg;
    }
    let hit = null;
    panes.forEach((p) => {
      const on = p.dataset.seg === seg;
      p.hidden = !on;
      p.classList.toggle('on', on);
      if (on) hit = p;
    });
    if (bar) {
      bar.querySelectorAll('.seg-btn').forEach((b) => {
        b.classList.toggle('on', b.dataset.seg === seg);
      });
      moveSegInk(bar);
    }
    /* 花：顶部胶囊与下方细线 Tab 保持同一状态 */
    if (page === 'records') {
      const tags = $('flHeroTags');
      if (tags) {
        tags.querySelectorAll('.fl-tag').forEach((b) => {
          b.classList.toggle('on', b.dataset.flseg === seg);
        });
      }
    }
    if (!hit) return;
    rememberSeg(page, seg);
    // 换段回到顶部，别留着上一段滚到一半的位置
    const sc = box.querySelector('.page-scroll');
    if (sc) sc.scrollTop = 0;
    const fn = SEG_RENDER[page] && SEG_RENDER[page][seg];
    if (fn) fn();
  }

  /** 打开容器页并切到指定分段；seg 空 = 用上次那段（没有就第一段） */
  function goModule(page, seg) {
    openPage(page, seg);
  }

  /** 某分段此刻是不是摊开着（页开着 + 该 pane 没 hidden）——定时刷新用它判断要不要重画 */
  function segOn(page, seg) {
    const box = pages[page];
    if (!box || !box.classList.contains('mod-page')) return false;
    const p = box.querySelector('.seg-pane[data-seg="' + seg + '"]');
    return !!p && !p.hidden;
  }

  /* 分段胶囊点击（事件委托：每个容器页的 seg-bar 一套） */
  document.querySelectorAll('.mod-page .seg-bar').forEach((bar) => {
    const page = bar.closest('.mod-page').id;
    bar.querySelectorAll('.seg-btn').forEach((b) => {
      b.addEventListener('click', () => {
        if (currentPage === page) switchSeg(page, b.dataset.seg);
        else goModule(page, b.dataset.seg);
      });
    });
  });

  /* ---- 右滑返回（跟手） ---- */

  const EDGE = 58; // 只有从左侧边缘开始才算返回手势

  Object.keys(pages).forEach((id) => {
    const el = pages[id];
    let g = null;

    el.addEventListener('pointerdown', (e) => {
      if (currentPage !== id) return;
      if (e.clientX > EDGE) return;
      const tag = (e.target.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea') return;
      g = { pid: e.pointerId, x0: e.clientX, y0: e.clientY, dx: 0, t0: performance.now(), live: false, w: el.clientWidth || 1 };
    });

    el.addEventListener('pointermove', (e) => {
      if (!g || g.pid !== e.pointerId) return;
      const dx = e.clientX - g.x0;
      const dy = e.clientY - g.y0;

      if (!g.live) {
        if (dx < 8) return;
        if (Math.abs(dx) <= Math.abs(dy)) { g = null; return; }
        g.live = true;
        markMoving(600);
        el.style.transition = 'none';
        home.style.transition = 'none';
        if (dim) dim.style.transition = 'none';
        try { el.setPointerCapture(e.pointerId); } catch (_) {}
      }

      const w = g.w;
      const d = Math.max(0, Math.min(w, dx));
      g.dx = d;

      /* v42：手势只拖页面自己，主屏不跟着缩放/平移（动效只准三样） */
      el.style.transform = 'translate3d(' + d + 'px,0,0)';
    });

    const end = (e) => {
      if (!g || (e && e.pointerId !== g.pid)) return;
      const moved = g.live;
      const dx = g.dx;
      const w = g.w || el.clientWidth || 1;
      const dt = Math.max(1, performance.now() - g.t0);
      const v = dx / dt; // px per ms
      g = null;
      if (!moved) return;

      const done = dx > w * 0.28 || v > 0.5;

      el.style.transition = '';
      el.style.transform = '';
      home.style.transition = '';
      resetHomeInline();

      if (done) {
        el.classList.remove('open');
        currentPage = null;
        syncDock();
        syncTopbar();
      }
      markMoving();
    };

    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
  });

  /* 未读角标 */

  function addBadge(appId) {
    document.querySelectorAll(`.tile[data-app="${appId}"] .badge, .dock .tile[data-app="${appId}"] .badge, .card[data-app="${appId}"] .badge`)
      .forEach((b) => b.classList.add('show'));
  }
  function clearBadge(appId) {
    document.querySelectorAll(`.tile[data-app="${appId}"] .badge, .card[data-app="${appId}"] .badge`)
      .forEach((b) => b.classList.remove('show'));
  }

  /* ---------------- App 网格 / Dock ---------------- */

  function openApp(app) {
    if (!app) return;
    if (app.page) { openPage(app.page, app.seg); return; }
    // 占位：把这个功能的设想写在页面上，之后照着填
    setTxt('todoTitle', app.name);
    setTxt('todoName', app.name);
    setTxt('todoDesc', app.desc || '位置已经留好了。');
    const ti = $('todoIcon');
    if (ti) ti.setAttribute('href', '#' + app.icon);
    openPage('todo');
  }

  function findApp(id) {
    return APPS.concat(DOCK).filter((a) => a.id === id)[0];
  }

  function makeTile(app) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'tile';
    b.dataset.app = app.id;
    const t = tintFor(app.id);
    b.innerHTML =
      '<span class="tile-ic" style="--c1:' + t[0] + ';--c2:' + t[1] + ';--inkc:' + t[2] + '">' +
      '<svg><use href="#' + app.icon + '"/></svg><i class="badge"></i></span>' +
      '<span class="tile-name">' + app.name + '</span>';
    b.addEventListener('click', () => { if (editing) return; openApp(app); });
    return b;
  }

  /* 应用不再按固定数量切页：三页各有各的名单（hc.v1.appPages），
     拖到哪页就归哪页，每页放几个由你摆（各有放得下的上限）。
     APPS 仍是全量目录（顺序 = 三页名单拼起来），给四格/其他地方按 id 找应用用。 */
  /* v2 单页桌面：应用不再分三页，全部归到一页（appPages[0]），
     首页上限给到很大，clampPages / rebalanceOnce 自然把应用都留在第 0 页 */
  const PAGE_CAP = [999, 0, 0];

  function page1Cap() { return 999; }
  function pageCap(i) { return i === 0 ? page1Cap() : PAGE_CAP[i]; }

  /* v2 单页桌面：无论老数据怎么分三页，统统合并到一页（appPages[0]），
     顺序 = 老第一页 → 第二页 → 第三页；名单里没有的新应用补到最后 */
  function loadPages() {
    const ids = APPS.map((a) => a.id);
    const saved = load(KEY.pages, null);
    const merged = [];
    const seen = {};
    if (Array.isArray(saved) && saved.length === 3) {
      saved.forEach((l) => (Array.isArray(l) ? l : []).forEach((x) => {
        const id = ID_ALIAS[x] || x;
        if (seen[id] || ids.indexOf(id) < 0) return;
        seen[id] = true;
        merged.push(findApp(id));
      }));
    } else {
      ids.forEach((id) => { if (!seen[id]) { seen[id] = true; merged.push(findApp(id)); } });
    }
    ids.forEach((id) => { if (!seen[id]) merged.push(findApp(id)); });
    return [merged, [], []];
  }

  function pagesSave() {
    save(KEY.pages, appPages.map((l) => l.map((a) => a.id)));
    APPS = appPages[0].concat(appPages[1], appPages[2]);
    save(KEY.apps, APPS.map((a) => a.id));
  }

  /* 组件行数/首页开关变了 → 各页名单重新平衡（超出的依次往后挪）。
     兜底守卫：万一应用总数比三页容量加起来还多（以后加应用就可能），
     以「前面的页尽量装满」收场，绝不死循环把浏览器挂住。 */
  function clampPages() {
    let guard = 0;
    while (appPages[0].length > page1Cap() && guard++ < 400) appPages[1].unshift(appPages[0].pop());
    guard = 0;
    while (appPages[1].length > PAGE_CAP[1] && appPages[2].length < PAGE_CAP[2] && guard++ < 400) {
      appPages[2].unshift(appPages[1].pop());
    }
    guard = 0;
    while (appPages[2].length > PAGE_CAP[2] && appPages[1].length < PAGE_CAP[1] && guard++ < 400) {
      appPages[1].push(appPages[2].pop());
    }
    pagesSave();
  }

  // appPages 在 appSliceStart 定义之后初始化（依赖 HOME_DEFAULT/homeCfg），见那儿
  /* v2 单页渲染：
     #bento = 卡片（renderBento）；#appGrid = 全部应用（应用矩阵单独成区，见 .app-matrix）
     不再有第二、第三页，分页圆点已删 */
  /* 设置页里的「应用」分组：按 APP_CATS 五组列出全部 APPS，
     和「外观 / 接入 / 主动 / 数据」同级。已经做好的可点进页面；
     还没做的显示「待做」，点一下给出它打算做什么。 */
  function renderAppRows() {
    const box = $('setApps');
    if (!box) return;
    box.innerHTML = '';
    APP_CATS.forEach((cat) => {
      const list = APPS.filter((a) => a.cat === cat.k);
      if (!list.length) return;
      const card = document.createElement('section');
      card.className = 'glass list-card';
      const head = document.createElement('p');
      head.className = 'list-head';
      head.textContent = '应用 · ' + cat.name;
      card.appendChild(head);
      list.forEach((a) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'row nav' + (a.page ? '' : ' is-todo');
        b.innerHTML =
          '<svg class="row-ic"><use href="#' + a.icon + '"/></svg>' +
          '<span class="row-name">' + a.name + '</span>' +
          (a.page ? '' : '<span class="row-side">待做</span>');
        b.addEventListener('click', () => {
          if (a.page) openPage(a.page, a.seg);
          else toast(a.desc ? String(a.desc).split('\n')[0] : '这个还没做，先记着。');
        });
        card.appendChild(b);
      });
      box.appendChild(card);
    });
  }

  function renderApps() {
    const grid = $('appGrid');
    if (grid) {
      grid.innerHTML = '';
      appPages[0].forEach((a) => grid.appendChild(makeTile(a)));
    }
    syncPagerPages();
    updateGrid();   // 卡片是刚重建的 DOM，内容（状态/电量/相册/一句话…）马上刷，别等 60s tick
    renderDock();
  }

  /* 镜花水月 · 四格底栏：图标 + 英文小字 + 中文 */
  function renderDock() {
    const dock = $('dock');
    if (!dock) return;
    dock.innerHTML = '';
    DOCK_TABS.forEach((t, i) => {
      /* 五格胶囊：中间（第 3 格）插一颗凸起圆 —— 此刻 · NOW */
      if (i === 2) dock.appendChild(makeCoreTile());
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'tile';
      b.dataset.app = t.id;
      b.dataset.tab = t.page === null ? 'moon' : t.page;
      b.setAttribute('aria-label', (t.en || '') + ' ' + (t.name || ''));
      b.innerHTML =
        '<span class="tile-ic"><svg><use href="#' + t.icon + '"/></svg></span>' +
        '<span class="tile-name"><em>' + (t.en || '') + '</em><span>' + (t.name || '') + '</span></span>';
      b.addEventListener('click', () => {
        if (t.page === null) closePage();
        else openPage(t.page, t.seg);
      });
      dock.appendChild(b);
    });
    syncDock();
  }

  /* 胶囊中间的凸起圆键：此刻（NOW 页）——56px、上移 14px，样式见 CSS v65 */
  function makeCoreTile() {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'tile tile-core';
    b.dataset.app = 'now';
    b.dataset.tab = 'now';
    b.setAttribute('aria-label', '此刻 NOW');
    b.innerHTML = '<span class="core-ic"><svg><use href="#i-hourglass"/></svg></span>';
    b.addEventListener('click', () => openPage('now', 'status'));
    return b;
  }

  /* dock 点亮：主屏（currentPage 为 null）→ Home；打开某页 → 对应格 */
  function syncDock() {
    const key = currentPage === null ? 'moon' : currentPage;
    document.querySelectorAll('.dock .tile').forEach((t) => {
      t.classList.toggle('on', t.dataset.tab === key);
    });
  }

  /* 顶栏右侧：主屏显示聊天入口，聊天页显示齿轮（聊天设置）；
     左侧：主屏是 头像+竖线+状态语，其它页是页面标题（15px）；
     右侧常驻「更多」图标 → 更多页（聊天页让位给聊天设置） */
  function syncTopbar() {
    const inChat = currentPage === 'chat';
    const chatBtn = $('tbChatBtn');
    const setBtn = $('chatSetBtn');
    const moreBtn = $('tbMoreBtn');
    const title = $('tbTitle');
    if (chatBtn) chatBtn.hidden = inChat;
    if (setBtn) setBtn.hidden = !inChat;
    if (moreBtn) moreBtn.hidden = inChat;
    if (title) title.textContent = currentPage === null ? '桌面' : (PAGE_TITLES[currentPage] || '潮');
    if (inChat) { try { renderChatTop(); } catch (_) {} }
  }

  /* 顶栏「更多」图标 → 更多页（抽屉已彻底移除，导航＝底栏五格 + 更多） */
  const topMoreBtn = $('tbMoreBtn');
  if (topMoreBtn) topMoreBtn.addEventListener('click', () => openPage('more'));

  /** 通用：重建前后各量一次，让元素从旧位置滑到新位置（FLIP） */
  function flipAll(sel, keyAttr, rebuild, fromRect) {
    const first = {};
    document.querySelectorAll(sel).forEach((el) => { first[el.dataset[keyAttr]] = el.getBoundingClientRect(); });
    rebuild();
    document.querySelectorAll(sel).forEach((el) => {
      const k = el.dataset[keyAttr];
      const f = fromRect && k === fromRect.id ? fromRect.r : first[k];
      if (!f) return;
      const l = el.getBoundingClientRect();
      const dx = f.left - l.left, dy = f.top - l.top;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
      el.animate([
        { transform: 'translate3d(' + dx + 'px,' + dy + 'px,0)' },
        { transform: 'translate3d(0,0,0)' }
      ], { duration: 280, easing: 'cubic-bezier(0.32,0.72,0,1)' });
    });
  }

  /* ---------------- 时钟 / 日期 ---------------- */

  function tickClocks() {
    const now = new Date();
    setTxt('lockDate', dateLabel(now));
    setTxt('sbDate', dateLabel(now));
    setTxt('sbState', S.settings.statusLine || '他在家');
    setTxt('chatStatus', P.statusLine(S.persona, Date.now()));
    setTxt('clockSub', P.statusLine(S.persona, Date.now()));
    setTxt('clockTime', pad(now.getHours()) + ':' + pad(now.getMinutes()));
    setTxt('clockDate', dateLabel(now));
    /* v42 顶栏：他的头像 + 一句状态 */
    setHTML('tbAva', partnerAvaInner(''));
    setTxt('tbStatus', P.statusLine(S.persona, Date.now()));
    if (typeof updateGrid === 'function') updateGrid();
    document.querySelectorAll('.sb-date-mini').forEach((el) => {
      el.textContent = dateLabel(now);
    });
  }

  /* ---------------- 日历 ---------------- */

  function renderCalendar() {
    const grid = $('calGrid');
    if (!grid) return;   // 日历卡已不在主屏；倒数页删改日子时还会调到这
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    $('calTitle').textContent = y + ' · ' + ['一月','二月','三月','四月','五月','六月','七月','八月','九月','十月','十一月','十二月'][m];

    const first = new Date(y, m, 1);
    const padStart = (first.getDay() + 6) % 7; // 周一开头
    const total = new Date(y, m + 1, 0).getDate();
    const start = new Date((S.memory.startDate || todayStr()) + 'T00:00:00');

    grid.innerHTML = '';
    for (let i = 0; i < padStart; i++) {
      const s = document.createElement('span');
      s.className = 'pad';
      grid.appendChild(s);
    }
    // 倒数日在日历上点个点
    const cdMap = {};
    (S.life.countdowns || []).forEach((c) => {
      const dt = new Date((c.date || '') + 'T00:00:00');
      if (isNaN(dt.getTime())) return;
      const key = dt.getFullYear() + '-' + dt.getMonth() + '-' + dt.getDate();
      (cdMap[key] || (cdMap[key] = [])).push(c.title);
    });

    for (let d = 1; d <= total; d++) {
      const s = document.createElement('span');
      s.textContent = d;
      s.dataset.date = y + '-' + pad(m + 1) + '-' + pad(d);
      if (d === now.getDate()) s.className = 'today';
      else if (start.getFullYear() === y && start.getMonth() === m && d === start.getDate()) s.className = 'anniv';
      const cds = cdMap[y + '-' + m + '-' + d];
      if (cds && cds.length) {
        s.classList.add('cd');
        s.title = cds.join('、');
      }
      grid.appendChild(s);
    }
  }

  /* v42 日历页（第 1 步先能用：翻月 / 今天描边 / 说过话的日子点；
     标记 / 图例 / 某天发生了什么，第 5 步做） */
  let calPageYM = null;   // 当前翻到哪个月，null = 回到本月
  let calSelKey = '';     // 选中的那一天：'y-m-d'（m 从 0 起，跟日历内部一致）

  function renderCalendarPage() {
    const grid = $('calPageGrid');
    if (!grid) return;
    const now = new Date();
    if (!calPageYM) calPageYM = { y: now.getFullYear(), m: now.getMonth() };
    const y = calPageYM.y, m = calPageYM.m;
    setTxt('calPageTitle', y + ' 年 ' + (m + 1) + ' 月');

    // 说过话的日子（本地日期）→ 计数，做成「足迹」热度：聊得越多，色块越深
    const talked = {};
    S.chat.forEach((msg) => {
      const d = new Date(msg.ts || 0);
      if (isNaN(d.getTime())) return;
      const k = d.getFullYear() + '-' + d.getMonth() + '-' + d.getDate();
      talked[k] = (talked[k] || 0) + 1;
    });

    const first = new Date(y, m, 1);
    const padStart = (first.getDay() + 6) % 7; // 周一开头
    const total = new Date(y, m + 1, 0).getDate();

    grid.innerHTML = '';
    ['一', '二', '三', '四', '五', '六', '日'].forEach((w) => {
      const el = document.createElement('span');
      el.className = 'cg-w';
      el.textContent = w;
      grid.appendChild(el);
    });
    for (let i = 0; i < padStart; i++) {
      const el = document.createElement('span');
      el.className = 'cg-d pad';
      grid.appendChild(el);
    }
    for (let d = 1; d <= total; d++) {
      const key = y + '-' + m + '-' + d;
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'cg-d' +
        (y === now.getFullYear() && m === now.getMonth() && d === now.getDate() ? ' today' : '') +
        (calSelKey === key ? ' sel' : '');
      cell.dataset.d = String(d);
      const num = document.createElement('em');
      num.textContent = d;
      cell.appendChild(num);
      const n = talked[key] || 0;
      if (n) {
        const dot = document.createElement('i');
        dot.className = 'fp l' + (n >= 20 ? 3 : n >= 6 ? 2 : 1);
        cell.classList.add('has-fp');
        cell.setAttribute('aria-label', d + ' 日，聊了 ' + n + ' 句');
        cell.appendChild(dot);
      } else {
        cell.setAttribute('aria-label', d + ' 日');
      }
      cell.addEventListener('click', () => {
        calSelKey = key;
        renderCalendarPage();
        renderCalDay(y, m, d);
      });
      grid.appendChild(cell);
    }

    // 没选过就默认落到「今天」，一进来就有东西看
    if (!calSelKey) {
      calSelKey = now.getFullYear() + '-' + now.getMonth() + '-' + now.getDate();
      renderCalDay(now.getFullYear(), now.getMonth(), now.getDate());
      const t = grid.querySelector('.cg-d.today');
      if (t) t.classList.add('sel');
    }
  }

  /* 点某一天 → 这天发生了什么。数据全部来自本地真实记录：
     聊了几句 / 他那天做过的事 / 那天的课 / 那天的倒数 / 那天留下的照片 */
  function renderCalDay(y, m, d) {
    const box = $('calDayCard');
    if (!box) return;
    const dayStart = new Date(y, m, d).getTime();
    const dayEnd = dayStart + 86400000;
    const inDay = (ts) => ts >= dayStart && ts < dayEnd;
    const W = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const wd = new Date(y, m, d).getDay();

    const msgs = (S.chat || []).filter((x) => inDay(x.ts || 0));
    const logs = (S.life.dayLog || []).filter((x) => inDay(x.ts || 0));
    const courses = (S.life.courses || []).filter((c) => Number(c.day) === wd);
    const cds = (S.life.countdowns || []).filter((c) => {
      if (!c.date) return false;
      return new Date(c.date + 'T00:00:00').getTime() === dayStart;
    });
    const photos = (S.life.photos || []).filter((p) => inDay(p.ts || 0));

    box.innerHTML = '';
    const card = document.createElement('section');
    card.className = 'glass list-card cal-day';

    const head = document.createElement('p');
    head.className = 'list-head';
    head.textContent = (m + 1) + ' 月 ' + d + ' 日 · ' + W[wd];
    card.appendChild(head);

    const line = (ic, title, sub) => {
      const row = document.createElement('div');
      row.className = 'row';
      row.innerHTML = '<svg class="row-ic"><use href="#' + ic + '"/></svg>' +
        '<span class="row-name">' + title + (sub ? '<small>' + sub + '</small>' : '') + '</span>';
      return row;
    };

    if (msgs.length) {
      const me = msgs.filter((x) => x.role === 'me').length;
      const preview = msgs.slice(-2)
        .map((x) => (x.role === 'me' ? '你：' : '他：') + String(x.text || '').slice(0, 22))
        .join(' / ');
      card.appendChild(line('i-chat', '聊了 ' + msgs.length + ' 句', '你 ' + me + ' · 他 ' + (msgs.length - me) + '　' + preview));
    }
    if (logs.length) {
      card.appendChild(line('i-sunrise', '他那天 ' + logs.length + ' 件事',
        logs.slice(-2).map((x) => x.text).join(' / ')));
    }
    courses.forEach((c) => {
      const time = [c.start, c.end].filter(Boolean).join('–');
      card.appendChild(line('i-course', c.name || '课', time + (c.room ? ' · ' + c.room : '')));
    });
    cds.forEach((c) => {
      card.appendChild(line('i-hourglass', c.title || '倒数', '这天到点' + (c.note ? ' · ' + c.note : '')));
    });
    if (photos.length) {
      card.appendChild(line('i-album', '留下 ' + photos.length + ' 张照片',
        photos.map((p) => p.cap).filter(Boolean).slice(0, 2).join(' / ')));
    }

    if (!card.querySelectorAll('.row').length) {
      const empty = document.createElement('p');
      empty.className = 'cal-empty';
      empty.textContent = '这天没有留下什么。';
      card.appendChild(empty);
    }
    box.appendChild(card);
  }

  function shiftCalPage(delta) {
    if (!calPageYM) {
      const now = new Date();
      calPageYM = { y: now.getFullYear(), m: now.getMonth() };
    }
    const d = new Date(calPageYM.y, calPageYM.m + delta, 1);
    calPageYM = { y: d.getFullYear(), m: d.getMonth() };
    // 翻月后选中态失效：月变了，日号不再对应同一天
    calSelKey = '';
    const box = $('calDayCard');
    if (box) box.innerHTML = '';
    renderCalendarPage();
  }

  /* ---------------- 主屏分页 ---------------- */

  const pager = $('homePager');
  const dotsBox = $('pagerDots');

  function renderDots() {
    if (!pager || !dotsBox) return;
    const w = pager.clientWidth || 1;
    const count = Math.max(1, Math.round(pager.scrollWidth / w));
    dotsBox.innerHTML = '';
    for (let i = 0; i < count; i++) {
      const b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('aria-label', '第 ' + (i + 1) + ' 页');
      b.addEventListener('click', () => {
        pager.scrollTo({ left: i * (pager.clientWidth || 1), behavior: 'smooth' });
      });
      dotsBox.appendChild(b);
    }
    syncDots();
  }

  function syncDots() {
    if (!pager || !dotsBox) return;
    const w = pager.clientWidth || 1;
    const idx = Math.round(pager.scrollLeft / w);
    Array.prototype.forEach.call(dotsBox.children, (d, i) => {
      d.classList.toggle('on', i === idx);
    });
    /* 只让当前页开毛玻璃：屏幕外那一页的 backdrop-filter 会串味，
       把它的模糊采样画到当前页上（Chromium 在横向滚动容器里的老毛病） */
    Array.prototype.forEach.call(pager.children, (p, i) => {
      p.classList.toggle('active', i === idx);
    });
  }

  /* 空页收起来（display:none 会把它从滚动宽度里拿掉），圆点重数；
     正停在被收掉那页就平滑退回最后一页 */
  function syncPagerPages() {
    if (!pager) return;
    renderDots();
    const w = pager.clientWidth || 1;
    const shown = Array.prototype.filter.call(pager.children, (p) => !p.hidden).length;
    const max = Math.max(0, shown - 1) * w;
    if (pager.scrollLeft > max + 2) pager.scrollTo({ left: max, behavior: 'smooth' });
  }

  if (pager) {
    let raf = 0;
    pager.addEventListener('scroll', () => {
      if (raf) return;
      raf = requestAnimationFrame(() => { raf = 0; syncDots(); });
    }, { passive: true });
    window.addEventListener('resize', renderDots);
    /* 翻页手势（含从组件/图标上开始的滑动）在下面的统一手势系统里；
       触摸从空白处开始仍走原生 pan-x，有惯性和吸附。 */
  }

  /* 下一个纪念日 */
  function renderAnniv() {
    const nameEl = $('annivName');
    if (!nameEl) return;

    const start = new Date((S.memory.startDate || todayStr()) + 'T00:00:00');
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    let next = new Date(now.getFullYear(), start.getMonth(), start.getDate());
    if (next < today) next = new Date(now.getFullYear() + 1, start.getMonth(), start.getDate());

    const n = Math.max(1, next.getFullYear() - start.getFullYear());
    const days = Math.round((next - today) / 86400000);

    const card = $('annivCard');
    if (card) card.hidden = daysSince() <= 1;   // 第一天只说一次

    setTxt('annivDays', days);
    nameEl.textContent = days === 0
      ? '第 ' + n + ' 个纪念日 · 就是今天'
      : '第 ' + n + ' 个纪念日';
  }

  /* 本月小结 */
  function renderMonthStats() {
    const bD = $('statDays');
    if (!bD) return;
    const now = new Date();
    const monthMsgs = S.chat.filter((m) => {
      const d = new Date(m.ts);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    });
    const days = new Set(monthMsgs.map((m) => new Date(m.ts).toDateString())).size;
    $('statDays').textContent = days;
    $('statMsgs').textContent = monthMsgs.length;
    $('statFacts').textContent = (S.memory.facts || []).length;
  }

  /* 他最近说的一句 */
  function renderHomeMemories() {
    const ul = $('homeMemories');
    if (!ul) return;
    const facts = (S.memory.facts || []).slice(-4).reverse();
    ul.innerHTML = '';
    $('homeMemoryHint').hidden = facts.length > 0;
    facts.forEach((f) => {
      const li = document.createElement('li');
      const span = document.createElement('span');
      span.textContent = f;
      li.appendChild(span);
      ul.appendChild(li);
    });
  }



  const setTxt = (id, v) => { const el = $(id); if (el) el.textContent = v; };
  const setHTML = (id, v) => { const el = $(id); if (el) el.innerHTML = v; };
  const esc = (s) => String(s === undefined || s === null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

  /* ============================================================
     v42 · STEP B · 桌面卡片（原 WIDGETS 组件系统并入这套，只留一份定义）
     page = 落在哪一页（0/1/2）；size = 四栏栅格占位；go = 点整卡进哪个页
     卡片内容用下面的 GRID_HTML；能不能收由美化页的开关决定
     ============================================================ */
  /* v2 单页桌面：所有卡片都在第 0 页；尺寸只准两种——
     4x2 全宽卡 / 2x2 半宽卡（1x1 只留给应用矩阵）。
     顺序即桌面从上到下的顺序（device/album/week 默认收起，见 dtHidden） */
  const DT_CARDS = {
    today:   { page: 0, size: 'g-4x2', name: '今日', go: 'calendar' },
    days:    { page: 0, size: 'g-4x2', name: '在一起多少天', go: 'now', seg: 'status' },
    mood:    { page: 0, size: 'g-4x2', name: '他的情绪', go: 'now', seg: 'status' },
    mem:     { page: 0, size: 'g-4x2', name: '记忆', go: 'records', seg: 'memory' },
    status:  { page: 0, size: 'g-2x2', name: '他的状态', go: 'now', seg: 'status' },
    chat:    { page: 0, size: 'g-2x2', name: '和他聊聊', go: 'chat' },
    between: { page: 0, size: 'g-4x2', name: '之间', go: 'cards' },
    album:   { page: 0, size: 'g-4x2', name: '拍立得', go: 'records', seg: 'album' },
    music:   { page: 0, size: 'g-4x2', name: '一起听', go: null },
    device:  { page: 0, size: 'g-2x2', name: '他的设备', go: 'now', seg: 'device' },
    week:    { page: 0, size: 'g-4x2', name: '这一周', go: null },
    quote:   { page: 0, size: 'g-4x2', name: '一句话', go: null },
  };
  /* 美化页开关的列举顺序 = 桌面从上到下 */
  /* 天数不再是一张卡：它已经升到页头（.ed-head）做超大标题，
     所以 days 从列表里摘掉，只留 DT_CARDS 里的定义给编辑面板认。 */
  const DT_ORDER = ['mood', 'mem', 'status', 'chat', 'between', 'album', 'music', 'quote', 'today', 'device', 'week'];

  /* 收起了哪些卡片：存 S.settings.widgets.hidden。
     老配置里是旧组件 id（pair/clock/quad…），这里只认 DT_CARDS 里有的。
     v2：device / album / week 不再上桌面（内容和「现在 / 记」页重复），
     首次进入新单页桌面时默认收起——想留着可在「美化 → 桌面组件」里开回来 */
  /* V13 沉浸版首页默认上墙：天数 / 情绪 / 状态 / 聊聊 / 之间 / 拍立得 / 音乐 / 一句话
     device、week、today 默认收起（可在编辑态里拖出来） */
  const HOME_EXTRA_HIDDEN = ['device', 'week', 'today'];
  function dtHidden() {
    const w = S.settings.widgets || {};
    if (!w.__homeV3) {                       // 一次性迁移：情绪卡 + 拍立得上墙
      const set = new Set(Array.isArray(w.hidden) ? w.hidden : []);
      HOME_EXTRA_HIDDEN.forEach((id) => { if (DT_CARDS[id]) set.add(id); });
      set.delete('album');
      set.delete('mood');
      w.hidden = Array.from(set);
      w.__homeV3 = true;
      save(KEY.settings, S.settings);
    }
    const hid = Array.isArray(w.hidden) ? w.hidden : [];
    return hid.filter((id) => DT_CARDS[id]);
  }
  function patchDt(hidden) {
    S.settings.widgets = { hidden: hidden, p1: [] };
    save(KEY.settings, S.settings);
  }

  /* 桌面布局：组件与应用交替 + 密度；美化页里可调 */
  const HOME_DEFAULT = { mix: true, rows: 2, every: 2, gap: 'comfy' };
  function homeCfg() {
    return Object.assign({}, HOME_DEFAULT, S.settings.home || {});
  }
  function patchHome(patch) {
    S.settings.home = Object.assign(homeCfg(), patch);
    save(KEY.settings, S.settings);
    clampPages();   // 首页行数/开关变了 → 各页名单重新平衡
  }

  /* 建一张桌面卡：card + 尺寸类；data-app 让未读红点那套选择器也能找到主屏的卡 */
  function makeDtCard(id) {
    const c = DT_CARDS[id];
    const el = document.createElement('div');
    el.className = 'card ' + c.size + ' c-' + id;
    el.dataset.card = id;
    el.dataset.app = id;
    el.innerHTML = GRID_HTML[id]();
    if (c.go) {
      el.classList.add('tap');
      el.addEventListener('click', () => { if (!editing) openPage(c.go, c.seg); });
    }
    if (id === 'music') {
      // 音乐播放键：只切视觉状态（这首歌还没有真的播放器）
      const play = el.querySelector('#muPlay');
      if (play) play.addEventListener('click', (e) => {
        e.stopPropagation();
        const card = play.closest('.card');
        const on = card.classList.toggle('playing');
        play.setAttribute('aria-label', on ? '暂停' : '播放');
      });
    }
    return el;
  }

  /* ============================================================
     STEP B 桌面渲染（三页）：
     P1 #bento = 卡片 + 4 个一行的应用行混排
     P2 = 卡片（#dtCards2）+ 应用矩阵（#appGrid）
     P3 = 应用矩阵（#appGrid2）+ 卡片（#dtCards3）
     ============================================================ */

  /** 桌面卡片：按 DT_ORDER 顺序把第 0 页的卡片铺进 #bento。
     应用不再混进卡片流，单独成「应用矩阵」区（见 .app-matrix） */
  function renderBento() {
    const box = $('bento');
    if (!box) return;
    const hidden = dtHidden();
    box.innerHTML = '';
    DT_ORDER.filter((id) => DT_CARDS[id].page === 0 && hidden.indexOf(id) < 0)
      .forEach((id) => box.appendChild(makeDtCard(id)));
    updateGrid();   // 卡片内容（天数/之间计数/音乐/相册…）马上刷，不等 60 秒 tick
  }

  /* 主屏九块拼贴（v41）已并入 STEP B 三页桌面：卡片定义见 DT_CARDS，
     顺序/尺寸/跳转都在那儿；GRID_GO 的「点哪张卡进哪个页」= DT_CARDS 的 go 字段 */

  /* 一句话卡：每天一句，按本地日期从数组里取 */
  const QUOTES = [
    '潮水每天都会来，我也是。',
    '你说话的时候，海面是亮的。',
    '不用赶，潮汐不等谁，但总归会来。',
    '今天也想了你一遍，不多不少。',
    '把日子过慢一点，才听得见回音。',
    '你在的时候，连沉默都是温的。',
    '月亮把海面铺平，替我说晚安。',
    '有些话不必说完，潮会替我记得。',
    '晴天有晴天的好，雨天有雨天的静。',
    '所有的离开，都是为了回来。',
    '海那么大，我只想回到你这片。',
    '慢慢来，我们有一整个余生。',
  ];

  const GRID_HTML = {
    days: () =>
      '<div class="days">' +
        '<div class="days-pair">' +
          '<div class="pair-ava d56 partner" id="daysAvaP"></div>' +
          '<svg class="days-wave" viewBox="0 0 72 12" aria-hidden="true">' +
            '<path d="M0 6 Q 9 1 18 6 T 36 6 T 54 6 T 72 6" fill="none" stroke="currentColor" stroke-width="1" opacity=".5"/>' +
          '</svg>' +
          '<div class="pair-ava d56 me" id="daysAvaM"></div>' +
        '</div>' +
        '<p class="days-num" id="daysNum">—</p>' +
        '<p class="days-names" id="daysNames"></p>' +
        '<p class="days-since" id="daysSince">since —</p>' +
      '</div>',

    status: () =>
      '<div class="pair-ava d36 partner st-ava" id="stAva"></div>' +
      '<p class="st-word" id="stWord">—</p>' +
      '<p class="st-sub" id="stSub"></p>' +
      '<i class="breath st-dot" aria-hidden="true"></i>',

    chat: () =>
      '<svg class="g-ic" viewBox="0 0 24 24" aria-hidden="true"><use href="#i-chat"/></svg>' +
      '<p class="tile-t">和他聊聊</p>',

    device: () =>
      '<div class="dv">' +
        '<b class="tile-num" id="dvNum">—</b>' +
        '<span class="tile-t">电量</span>' +
      '</div>',

    between: () =>
      '<div class="bt">' +
        '<p class="bt-head"><svg class="bt-ic" viewBox="0 0 24 24" aria-hidden="true"><use href="#i-mail"/></svg>之间</p>' +
        '<div class="bt-cells">' +
          '<div class="bt-cell"><p class="tile-num"><span id="btCoupon">0</span><i>张</i></p><p class="tile-t">卡券</p></div>' +
          '<div class="bt-cell"><p class="tile-num" id="btMail">0</p><p class="tile-t">未拆信</p></div>' +
          '<div class="bt-cell"><p class="tile-num" id="btWish">0</p><p class="tile-t">心愿</p></div>' +
        '</div>' +
      '</div>',

    /* 情绪面板（g-4x2）：精力 / 心情 两条极细进度条 + 一句他的状态话 */
    mood: () =>
      '<div class="mo">' +
        '<div class="mo-head">' +
          '<span class="pair-ava d32 partner mo-ava" id="moAva"></span>' +
          '<span class="mo-name" id="moName">他</span>' +
          '<i class="breath mo-dot" aria-hidden="true"></i>' +
          '<span class="mo-eyebrow">MOOD</span>' +
        '</div>' +
        '<div class="mo-row">' +
          '<span class="mo-k">精力</span>' +
          '<span class="mo-bar"><i id="moEnergy"></i></span>' +
          '<b class="mo-v" id="moEnergyN">—</b>' +
        '</div>' +
        '<div class="mo-row">' +
          '<span class="mo-k">心情</span>' +
          '<span class="mo-bar"><i id="moMood"></i></span>' +
          '<b class="mo-v" id="moMoodN">—</b>' +
        '</div>' +
        '<p class="mo-say" id="moSay"></p>' +
      '</div>',

    /* 音乐：一条横线贯穿。左歌名 / 中播放键 / 右时长，下面一条极细进度条 */
    music: () =>
      '<div class="mu-line">' +
        '<span class="mu-meta">' +
          '<span class="mu-title" id="muTitle">想听什么，放给我</span>' +
          '<span class="mu-artist" id="muArtist"></span>' +
        '</span>' +
        '<button class="mu-play" id="muPlay" type="button" aria-label="播放">' +
          '<svg class="ic-play" viewBox="0 0 24 24"><path d="M8 5.2v13.6L19.5 12z"/></svg>' +
          '<svg class="ic-pause" viewBox="0 0 24 24"><path d="M7 5h3.4v14H7zM13.6 5H17v14h-3.4z"/></svg>' +
        '</button>' +
        '<span class="mu-time" id="muTime">--:--</span>' +
      '</div>' +
      '<div class="mu-track" aria-hidden="true"><i></i></div>',

    /* 记忆：一排极小的点表示收集进度（空心＝还没记，实心＝已记下） */
    mem: () =>
      '<div class="mm">' +
        '<p class="mm-k">记忆<em>MEMORY</em></p>' +
        '<div class="mm-dots" id="mmDots" role="img" aria-label="记忆收集进度"></div>' +
        '<p class="mm-hint" id="mmHint"></p>' +
      '</div>',

    /* 拍立得相册墙（g-4x2）：白边 + 微倾 + 质感阴影，横向滑动 */
    album: () =>
      '<div class="pl">' +
        '<p class="pl-eyebrow">POLAROID</p>' +
        '<div class="pl-rail" id="alGrid"></div>' +
      '</div>',

    week: () =>
      '<div class="wk">' +
        '<div class="wk-row" id="wkRow"></div>' +
        '<p class="wk-sub" id="wkSub">—</p>' +
      '</div>',

    today: () =>
      '<div class="td">' +
        '<p class="td-eyebrow">今日</p>' +
        '<p class="td-day" id="tdDay">—</p>' +
        '<p class="td-meta" id="tdMeta">—</p>' +
        '<p class="td-hint">点开看这天</p>' +
      '</div>',

    /* 便签卡：半透明纸感 + 手写体，把「一句话」做成贴在桌面上的小纸条 */
    quote: () =>
      '<div class="nt">' +
        '<span class="nt-tape" aria-hidden="true"></span>' +
        '<p class="nt-eyebrow">TODAY</p>' +
        '<p class="qt" id="qtText">—</p>' +
      '</div>',
  };

  function updateGrid() {
    // 双人天数卡
    setHTML('daysAvaP', partnerAvaInner(''));
    setHTML('daysAvaM', myAvaInner(''));
    setTxt('daysNum', String(daysSince()));
    setTxt('daysNames', partnerName() + ' with ' + (S.memory.userName || '我'));
    setTxt('daysSince', 'since ' + (S.memory.startDate || todayStr()).replace(/-/g, '.'));
    renderToday();
    renderMoon();

    // 状态卡：今天挑过的心情词，没挑就看他现在的
    setHTML('stAva', partnerAvaInner(''));
    setTxt('stWord', (S.moodLog || {})[todayStr()] || P.moodWord(S.persona));
    // 状态卡只留「他在做什么」，那句情绪文案让给下面的情绪面板，避免同屏重复
    setTxt('stSub', String(P.statusLine(S.persona, Date.now())).split('·')[0].trim());

    // 情绪面板：精力 / 心情（真实 persona 值）+ 一句他的状态
    renderMoodCard();

    // 记忆收集进度
    renderMemRow();

    // 设备格：浏览器给的真实电量，采不到就 —
    const d = S.life.device || {};
    setTxt('dvNum', d.battery === undefined ? '—' : String(Math.round(d.battery * 100)));

    // 之间卡：没用掉的卡券 / 留言 / 心愿（心愿页还没做，先占 0）
    setTxt('btCoupon', String((S.life.coupons || []).filter((c) => !c.usedAt).length));
    setTxt('btMail', String((S.life.mails || []).length));
    setTxt('btWish', '0');

    // 音乐条
    const song = (S.life.music || [])[0];
    setTxt('muTitle', song ? song.title : '想听什么，放给我');
    setTxt('muArtist', song ? (song.artist || '') : '');

    // 相册卡 / 一周卡 / 一句话卡
    renderAlbumCard();
    renderWeek();
    renderQuote();
  }

  /* 主色微调：跟着他的情绪走一点点。
     不碰 --accent（冷银 / 近黑是你定的，动了就不是这套界面）——
     只把「氛围光 + 情绪条」的色温在冷银 ↔ 淡暖之间挪：
     心情高 → 暖一点、亮一点；心情低 → 冷一点、沉一点。 */
  function applyMoodTint() {
    const p = S.persona || {};
    const m = Math.max(0, Math.min(100, p.mood === undefined ? 58 : p.mood));
    const t = m / 100;
    const mix = (a, b) => Math.round(a + (b - a) * t);
    // 冷 (206,214,228) → 暖 (232,212,196)
    const rgb = mix(206, 232) + ',' + mix(214, 212) + ',' + mix(228, 196);
    document.documentElement.style.setProperty('--mood-rgb', rgb);
    document.documentElement.style.setProperty('--mood-t', t.toFixed(2));
  }

  /* 记忆收集进度：一排小点，实心＝记下了，空心＝还空着。
     12 个格子是对外展示的「收集格」，不是数据上限（记忆本身最多 40 条）。 */
  const MEM_SLOTS = 12;
  function renderMemRow() {
    const box = $('mmDots');
    if (!box) return;
    const n = (S.memory.facts || []).length;
    const filled = Math.min(n, MEM_SLOTS);
    box.innerHTML = '';
    for (let i = 0; i < MEM_SLOTS; i++) {
      const d = document.createElement('i');
      d.className = 'mm-d' + (i < filled ? ' on' : '');
      box.appendChild(d);
    }
    const hint = $('mmHint');
    if (hint) {
      hint.textContent = n
        ? '已记下 ' + n + ' 条'
        : '还没记下什么。说点关于你自己的事，他会记住。';
    }
    box.setAttribute('aria-label', '记忆收集进度：' + Math.min(n, MEM_SLOTS) + ' / ' + MEM_SLOTS);
  }

  /* 情绪面板：精力 / 心情 两条极细进度条（真实 persona 数值）+ 一句他的话 */
  function renderMoodCard() {
    applyMoodTint();          // 卡片可能被隐藏，色温仍要跟着情绪走
    const bar = $('moEnergy');
    if (!bar) return;
    const p = S.persona || {};
    const e = Math.max(0, Math.min(100, Math.round(p.energy === undefined ? 60 : p.energy)));
    const m = Math.max(0, Math.min(100, Math.round(p.mood === undefined ? 58 : p.mood)));
    setHTML('moAva', partnerAvaInner(''));
    setTxt('moName', partnerName());
    setTxt('moEnergyN', e + '%');
    setTxt('moMoodN', m + '%');
    setTxt('moSay', P.moodSub(S.persona));
    const eb = $('moEnergy'), mb = $('moMood');
    if (eb) eb.style.width = e + '%';
    if (mb) mb.style.width = m + '%';
    applyMoodTint();
  }

  /* 拍立得相册墙：白边 + 微倾 + 质感阴影，横向滑动；没照片就给一张空白相纸 */
  function renderAlbumCard() {
    const box = $('alGrid');
    if (!box) return;
    const photos = (S.life.photos || []).filter((p) => p.img).slice(0, 8);
    const sig = photos.map((p) => p.id).join(',');
    if (box.dataset.sig === sig) return;   // 60 秒 tick 会反复来，没变就不重画
    box.dataset.sig = sig;
    box.innerHTML = '';
    // 没照片时把这张卡收成两行高，别让一整块空白占着首页
    const card = box.closest('.card');
    if (card) card.classList.toggle('is-empty', !photos.length);
    if (!photos.length) {
      const ph = document.createElement('figure');
      ph.className = 'pl-item pl-empty';
      const frame = document.createElement('i');
      frame.className = 'pl-img';
      const cap = document.createElement('figcaption');
      cap.className = 'pl-cap';
      cap.textContent = '第一张照片放这儿';
      ph.appendChild(frame);
      ph.appendChild(cap);
      box.appendChild(ph);
      return;
    }
    photos.forEach((ph, i) => {
      const fig = document.createElement('figure');
      fig.className = 'pl-item';
      fig.style.setProperty('--tilt', ((i % 2 ? 1 : -1) * (1.4 + (i % 3) * 0.7)).toFixed(2) + 'deg');
      const img = document.createElement('i');
      img.className = 'pl-img';
      img.style.backgroundImage = 'url("' + ph.img + '")';
      const cap = document.createElement('figcaption');
      cap.className = 'pl-cap';
      cap.textContent = ph.cap || (ph.ts ? hhmm(ph.ts) : '');
      fig.appendChild(img);
      fig.appendChild(cap);
      box.appendChild(fig);
    });
  }

  /* 一周卡：七个 24px 方块，四档深浅，聊得多越深 */
  function renderWeek() {
    const row = $('wkRow');
    if (!row) return;
    const byDay = {};
    S.chat.forEach((m) => {
      const k = new Date(m.ts).toDateString();
      byDay[k] = (byDay[k] || 0) + 1;
    });
    const today = new Date();
    row.innerHTML = '';
    let count = 0;
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today.getTime() - i * 86400000);
      const n = byDay[d.toDateString()] || 0;
      if (n > 0) count++;
      const cell = document.createElement('i');
      cell.className = 'wk-d l' + (n >= 6 ? 3 : n >= 3 ? 2 : n >= 1 ? 1 : 0) + (i === 0 ? ' today' : '');
      row.appendChild(cell);
    }
    setTxt('wkSub', count ? '这周说了 ' + count + ' 天' : '这周还空着');
  }

  /* 一句话卡：每天一句，按本地日期从数组里取 */
  function renderQuote() {
    const el = $('qtText');
    if (!el) return;
    const day = Math.floor((Date.now() + new Date().getTimezoneOffset() * 60000) / 86400000);
    el.textContent = QUOTES[day % QUOTES.length];
  }

  /* 今日卡：真实日期 + 星期（不依赖照片/记录；点开进日历） */
  function renderToday() {
    if (!$('tdDay')) return;
    const now = new Date();
    const M = ['一月','二月','三月','四月','五月','六月','七月','八月','九月','十月','十一月','十二月'];
    const W = ['周日','周一','周二','周三','周四','周五','周六'];
    setTxt('tdDay', String(now.getDate()));
    setTxt('tdMeta', M[now.getMonth()] + ' · ' + W[now.getDay()]);
  }

  /* 编辑风时间头：大写日期 + 超大时间 + 按时间问候（纯真实时间） */
  /* 首页顶：日期（含时间）+ 超大天数 + 名字 + 问候。天数不再是卡片，直接是页面标题。 */
  /* ---------- MOON · 月：极简仪表盘 ---------- */
  const MOON_DOW = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const MOON_MON = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

  /* 心跳波形：一条两倍宽的余弦叠加，靠 CSS 平移做「呼吸」 */
  function buildMoonWave() {
    const path = $('mnWave');
    if (!path) return;
    const W = 480, H = 40, STEP = 4;
    let d = '';
    for (let x = 0; x <= W; x += STEP) {
      const t = x / W;
      const amp = 9 * (0.6 + 0.4 * Math.sin(t * Math.PI * 2));
      const y = H / 2 + Math.sin(t * Math.PI * 10) * amp;
      d += (x === 0 ? 'M' : 'L') + x + ' ' + y.toFixed(2);
    }
    path.setAttribute('d', d);
  }

  /* 心电波：OUR DAYS 卡里横跨两个头像的那条线（viewBox 120×24，宽 72-96px） */
  function buildMoonEcg() {
    const path = $('mnEcg');
    if (!path) return;
    const W = 120, H = 24;
    let d = 'M0 ' + (H / 2);
    /* 中段两组心电波峰，两端留白 */
    const peaks = [
      [35, 1], [44, 1], [48, -7], [52, 11], [56, -7], [60, 1],
      [75, 1], [84, 1], [88, -6], [92, 9], [96, -6], [100, 1]
    ];
    peaks.forEach(([x, dy]) => {
      d += ' L' + (x - 2.5) + ' ' + (H / 2) +
           ' L' + (x - 0.5) + ' ' + (H / 2 + dy * 0.5) +
           ' L' + x + ' ' + (H / 2 + dy) +
           ' L' + (x + 1.5) + ' ' + (H / 2 - dy * 0.4) +
           ' L' + (x + 2.5) + ' ' + (H / 2);
    });
    d += ' L' + W + ' ' + (H / 2);
    path.setAttribute('d', d);
  }

  function renderMoon() {
    if (!$('mnDate')) return;
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    setTxt('mnDate', MOON_DOW[now.getDay()] + ', ' + MOON_MON[now.getMonth()] + ' ' + now.getDate());
    setTxt('mnTime', hh + ':' + mm);
    setTxt('mnDays', String(daysSince()));
    /* 次级大数字：写过的信 / 存下的照片 */
    setTxt('mnDaysMail', String((S.life.mails || []).length));
    setTxt('mnDaysPhoto', String((S.life.photos || []).length));
    setTxt('mnNames', partnerName() + ' with ' + (S.memory.userName || '我'));
    /* 起始日期：2026.10.21 起，一直数到今天 */
    const sd = (S.memory.startDate || todayStr()).replace(/-/g, '.');
    setTxt('mnSince', '从 ' + sd + ' 开始，一直数到今天。');

    /* 双头像 */
    setHTML('mnAvaPartner', partnerAvaInner('mn-ava-t'));
    setHTML('mnAvaMe', myAvaInner('mn-ava-t'));

    const p = S.persona || {};
    setTxt('mnMood', Math.round(p.mood === undefined ? 58 : p.mood) + '%');
    setTxt('mnEnergy', Math.round(p.energy === undefined ? 60 : p.energy) + '%');
    setTxt('mnSay', P.moodSub(S.persona));

    /* 双列小卡：他留的话 / 没拆的信（条数 + 一句说明） */
    const said = S.life.said || {};
    setTxt('mnSaidNum', said.text ? '1' : '0');
    setTxt('mnSaidNote', said.text ? ((said.date || '').replace(/-/g, '.') + ' · 他说的') : '他还没说过什么');
    const mails = (S.life.mails || []).filter((m) => String(m.from || '') !== 'me');
    setTxt('mnMailNum', String(mails.length));
    setTxt('mnMailNote', mails.length ? '有信还没看' : '都拆完了');

    /* 昼夜胶囊：跟主题走（DAY=浅色 / NIGHT=深色），点一下整体切换 */
    const night = document.documentElement.dataset.theme !== 'light';
    setTxt('mnPhaseTxt', night ? 'NIGHT' : 'DAY');
    const ph = $('mnPhase');
    if (ph) ph.classList.toggle('is-night', night);

    const song = (S.life.music || [])[0];
    setTxt('mnMuTitle', song ? song.title : '想听什么，放给我');
    setTxt('mnMuArtist', song ? (song.artist || '') : '');
  }

  /* 回首页时重播开场：fade-rise 70ms 阶梯 + 心电波重描 */
  function replayMoon() {
    const head = $('moonHead');
    if (!head) return;
    const chain = [head, $('mnDaysCard'), $('mnSayCard'), $('mnDuo'), $('moonNow'), $('moonActs'), $('moonMusic')];
    chain.forEach((el) => { if (el) el.classList.remove('is-in'); });
    const ecg = $('mnEcg');
    if (ecg) { ecg.style.animation = 'none'; void ecg.getBoundingClientRect(); ecg.style.animation = ''; }
    void head.offsetWidth;
    requestAnimationFrame(() => {
      chain.forEach((el) => { if (el) el.classList.add('is-in'); });
    });
  }

  /* MOON 的交互：两个文字入口 + 两张小卡（整卡可点）+ 音乐条（视觉播放态） */
  function setupMoon() {
    /* [data-moon-go] 统一委派：快捷入口 + 双列小卡，整卡可点、键盘可入 */
    const pager = $('homePager');
    if (pager) {
      pager.addEventListener('click', (e) => {
        const b = e.target.closest('[data-moon-go]');
        if (b) openPage(b.dataset.moonGo);
      });
      pager.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        const b = e.target.closest('[data-moon-go]');
        if (!b) return;
        e.preventDefault();
        openPage(b.dataset.moonGo);
      });
    }
    /* NOW · 此刻 → 完整的「状态 / 一天 / 设备」（now 容器页）。
       四个 Tab 里没有 now 的格子，主屏也不再渲染应用矩阵和桌面大卡，
       这里是它唯一的入口：点卡片进去，右滑或点底栏「月」回来 */
    const nowCard = $('moonNow');
    if (nowCard) {
      nowCard.classList.add('tap-now');
      nowCard.addEventListener('click', () => openPage('now', 'status'));
    }
    const play = $('mnMuPlay');
    const bar = $('moonMusic');
    if (play && bar) {
      play.addEventListener('click', () => {
        const on = bar.classList.toggle('playing');
        play.setAttribute('aria-label', on ? '暂停' : '播放');
      });
    }
    buildMoonWave();
    buildMoonEcg();
    replayMoon();

    /* 昼夜胶囊：点一下切换浅色/深色（和设置页的「明暗」是同一个开关） */
    const phase = $('mnPhase');
    if (phase) {
      phase.addEventListener('click', () => {
        const cur = document.documentElement.dataset.theme;
        patchAppearance({ theme: cur === 'light' ? 'dark' : 'light' });
        /* 胶囊文字/圆点即时跟随，不等下一次 renderMoon */
        const night = document.documentElement.dataset.theme !== 'light';
        setTxt('mnPhaseTxt', night ? 'NIGHT' : 'DAY');
        const ph2 = $('mnPhase');
        if (ph2) ph2.classList.toggle('is-night', night);
      });
    }
  }

  function renderEdHead() {
    if (!$('edDate')) return;
    const now = new Date();
    const D = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    const MO = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    setTxt('edDate', D[now.getDay()] + ', ' + MO[now.getMonth()] + ' ' + now.getDate() + ' · ' + hh + ':' + mm);
    setTxt('edDays', String(daysSince()));
    setTxt('edNames', partnerName() + ' with ' + (S.memory.userName || '我'));
    const h = now.getHours();
    setTxt('edHello', h < 5 ? '夜深了。' : h < 11 ? '早上好。' : h < 13 ? '中午好。' : h < 18 ? '下午好。' : h < 23 ? '晚上好。' : '夜深了。');
  }

  /** 首页里的一行应用：直接吃首页名单里的一chunk（4 个） */
  function makeAppRow(apps) {
    const row = document.createElement('div');
    row.className = 'app-row';
    apps.forEach((a) => row.appendChild(makeTile(a)));
    return row;
  }

  /* 老数据一次性归位（STEP B）：P2 起也放满到上限 8，前面的页不满就从后面补。
     只做一次（meta.stepB 标记）；之后每页放几个全由你拖，clampPages 只挡超限。 */
  function rebalanceOnce() {
    if (S.meta && S.meta.stepB) return;
    S.meta = Object.assign({}, S.meta, { schema: SCHEMA, stepB: true });
    save(KEY.meta, S.meta);
    const move = (cond, from, to, how) => {
      let guard = 0;
      while (cond() && appPages[from].length && guard++ < 400) {
        const item = appPages[from][how === 'front' ? 'shift' : 'pop']();
        appPages[to][how === 'front' ? 'unshift' : 'push'](item);
      }
    };
    move(() => appPages[0].length > page1Cap(), 0, 1, 'back');   // 首页超了 → 往第二页挪
    move(() => appPages[0].length < page1Cap(), 1, 0, 'front');  // 首页没满 → 从第二页补
    move(() => appPages[1].length > PAGE_CAP[1] && appPages[2].length < PAGE_CAP[2], 1, 2, 'front');
    move(() => appPages[1].length < PAGE_CAP[1], 2, 1, 'front'); // 第二页没满 → 从第三页补
    move(() => appPages[2].length > PAGE_CAP[2] && appPages[1].length < PAGE_CAP[1], 2, 1, 'back');
    pagesSave();
  }

  /* 到这里 HOME_DEFAULT / S 都就绪了，才初始化三页名单（依赖 homeCfg）；
     STEP B 过渡：老布局一次性归位后落盘，迁移结果马上可见 */
  let appPages = loadPages();
  rebalanceOnce();

  /* ================= 长按拖拽换位（应用 + dock） =================
     手感对齐真机：
     · 按住不动 0.5s → 进编辑态，手指不用抬起来，直接挪就是拖动
     · 在那之前横滑 → 翻页（从组件/图标上开始也能翻，JS 跟手）
     · 拖动过程中绝不重建 DOM（浏览器会因此发 pointercancel，拖拽当场断掉），
       只挪一个跟手 ghost；松手才提交新顺序，并用 FLIP 动画滑到位          */
  const LONGPRESS_MS = 500;
  const SWIPE_SLOP = 10;   // 超过这个位移就算翻页手势

  let editing = false;
  let ges = null;          // 当前手势
  let pressTimer = 0;
  let ghost = null;
  let suppressClick = 0;   // 拖拽/翻页结束后一小段时间内吞掉残余 click

  function saveLayouts() {
    save(KEY.apps, APPS.map((a) => a.id));
    save(KEY.dock, DOCK.map((a) => a.id));
  }

  function setEdit(on) {
    editing = on;
    ['bento', 'appGrid', 'appGrid2'].forEach((id) => {
      const el = $(id);
      if (el) el.classList.toggle('editing', on);
    });
    document.body.classList.toggle('widget-editing', on);
    const btn = $('editDone');
    if (btn) btn.hidden = !on;
    const hint = $('editHint');
    if (hint) {
      hint.textContent = '拖住图标可重新排序 · 点空白收工 · v' + APP_VER;
      hint.hidden = !on;
    }
    if (!on) {
      killGhost();
      saveLayouts();
    }
  }

  /* ---- ghost：跟着手指跑的浮层 ---- */
  function makeGhost(el) {
    killGhost();
    const r = el.getBoundingClientRect();
    const c = el.cloneNode(true);
    c.classList.add('drag-ghost');
    c.classList.remove('drag-src', 'drop-on');
    c.removeAttribute('id');
    c.querySelectorAll('[id]').forEach((n) => n.removeAttribute('id'));
    c.style.cssText =
      'position:fixed;left:' + r.left + 'px;top:' + r.top + 'px;' +
      'width:' + r.width + 'px;height:' + r.height + 'px;margin:0;' +
      'pointer-events:none;z-index:900;visibility:visible;will-change:transform;';
    document.body.appendChild(c);
    ghost = c;
  }
  function killGhost() {
    if (ghost) { ghost.remove(); ghost = null; }
  }
  function ghostRect() { return ghost ? ghost.getBoundingClientRect() : null; }
  function moveGhost(g, x, y) {
    if (!ghost) return;
    const dx = x - g.x0, dy = y - g.y0;
    ghost.style.transform = 'translate3d(' + dx + 'px,' + dy + 'px,0) scale(1.05)';
  }

  /* ---- 拖拽翻页：把图标往左右边推，邻页探边预示，停 0.5s 翻页 ----
     关键是「意图」：只有朝边缘方向的移动才起意——静止摆放、朝中间
     收回来都不算。深区 56px（系统手势区 ~25px 之外仍有富余），起手
     位置（边列图标中心 ~66px）在深区外，绝不会一起拖就乱翻。 */
  const EDGE_W = 56;
  const FLIP_MS = 500;
  let edgeTimer = 0;
  let edgeDir = 0;
  let peekDir = 0;
  let lastX = null;
  function peek(dir) {
    if (!pager || peekDir === dir) return;
    const w = pager.clientWidth || 1;
    const base = Math.round(pager.scrollLeft / w) * w;
    const max = pager.scrollWidth - w;
    peekDir = dir;
    pager.scrollTo({ left: Math.max(0, Math.min(max, base - 26 * dir)), behavior: 'smooth' });
  }
  function stopEdge() {
    if (edgeTimer) { clearTimeout(edgeTimer); edgeTimer = 0; }
    edgeDir = 0;
    peek(0);
  }
  function flipArm(dir) {
    const w = pager.clientWidth || 1;
    const cur = Math.round(pager.scrollLeft / w);
    const ti = cur + dir;
    if (ti < 0 || ti * w > pager.scrollWidth - w + 4) { stopEdge(); return; }  // 已是边上那页
    if (edgeDir === dir && edgeTimer) return;
    stopEdge();
    edgeDir = dir;
    peek(dir);
    edgeTimer = setTimeout(() => {
      edgeTimer = 0;
      edgeDir = 0;
      peekDir = 0;
      if (navigator.vibrate) { try { navigator.vibrate(10); } catch (_) {} }
      pager.scrollTo({ left: ti * w, behavior: 'smooth' });
    }, FLIP_MS);
  }
  function edgeScroll(g, x) {
    if (!editing || !pager) { stopEdge(); return; }
    const r = pager.getBoundingClientRect();
    const prev = lastX;
    const rel = x - r.left;
    let dir = 0;
    if (rel < EDGE_W) dir = -1;
    else if (rel > r.width - EDGE_W) dir = 1;

    if (edgeTimer && edgeDir === dir && dir) {
      // 已在倒计时：小幅漂移、路过别的图标都不取消——
      // 唯一取消条件是明显朝中间回走（那是决定摆放了）
      const centerward = dir === -1 ? (prev !== null && x - prev > 8) : (prev !== null && prev - x > 8);
      lastX = x;
      if (centerward) stopEdge();
      return;                          // 继续等
    }
    lastX = x;

    if (!dir) { stopEdge(); return; }
    // 朝边缘推的意图：这一下在靠近边缘（不是静止、不是往回摆）。
    // 不看 dropEl——推向边缘必然路过别的图标，看了就永远翻不了页；
    // 误翻由「500ms 停留」兜底：放下比它快就是摆放，比它慢就是想翻。
    const toward = dir === -1 ? (prev !== null && x < prev - 2) : (prev !== null && x > prev + 2);
    if (!toward) { stopEdge(); return; }
    flipArm(dir);
  }

  /* ---- 开始拖 ---- */
  function beginDrag(g) {
    if (!g || !g.dragEl) return;
    if (!editing) setEdit(true);
    g.mode = 'drag';
    g.dropEl = null;
    g.dropZone = null;
    g.dragMoved = false;
    makeGhost(g.dragEl);                 // 先克隆，再给原位置打隐藏标记
    g.dragEl.classList.add('drag-src');
    moveGhost(g, g.cx || g.x0, g.cy || g.y0);   // 半空中启动时直接跟到手指下
    if (navigator.vibrate) { try { navigator.vibrate(12); } catch (_) {} }
  }

  function clearDrop(g) {
    if (g && g.dropEl) g.dropEl.classList.remove('drop-on');
    if (g && g.dropZone) g.dropZone.classList.remove('drop-on');
    if (g) { g.dropEl = null; g.dropZone = null; }
  }

  function abortDrag(g) {
    stopEdge();
    killGhost();
    if (g && g.dragEl) g.dragEl.classList.remove('drag-src');
    clearDrop(g);
  }

  /* 手指下面是什么：
     应用图标可以在首页应用行、第二页、第三页之间换；底部常驻只在常驻里换。
     拖到某一页的空白处也算数：落到那一页应用列表的末尾。这样从第二页往
     第三页拖，不必非得瞄准某个图标，按在那页空位上松手就过去。 */
  function updateDrop(g, x, y) {
    const el = g.dragEl;
    const under = document.elementFromPoint(x, y);
    if (!under || !under.closest) return;
    let t = under.closest('.tile');
    if (!t || t === el) t = null;
    if (t) {
      const cs = el.closest('#dock');
      const ct = t.closest('#dock');
      // 一个是常驻、一个不是 → 不许换
      if (!!cs !== !!ct) t = null;
      // 只认三类容器里的图标：首页应用行、第二页矩阵、第三页矩阵
      else if (!cs && !t.closest('.app-row') && !t.closest('.app-grid')) t = null;
    }
    /* 没命中图标：看看是不是按在另一页的空白处（落页尾）。
       网格是 align-content:start 的，空白在容器外面 —— 所以整页空白都算，
       归到那一页的应用容器（第一页取 bento 里最后一排应用行）。
       按在自己本来那页的空白处不算 —— 那等于哪都没去。 */
    let zone = null;
    if (!t) {
      const cs = el.closest('#dock');
      if (!cs) {
        let z = under.closest('.app-row, .app-grid');
        if (!z) {
          const pg = under.closest('.home-page');
          if (pg) {
            z = pg.querySelector('.app-grid');
            if (!z) {
              const rows = pg.querySelectorAll('.app-row');
              if (rows.length) z = rows[rows.length - 1];
            }
          }
        }
        if (z && z !== el.closest('.app-row, .app-grid')) zone = z;
      }
    }
    if (t !== g.dropEl || zone !== g.dropZone) {
      if (g.dropEl) g.dropEl.classList.remove('drop-on');
      if (g.dropZone) g.dropZone.classList.remove('drop-on');
      g.dropEl = t;
      g.dropZone = zone;
      if (t) t.classList.add('drop-on');
      if (zone) zone.classList.add('drop-on');
    }
  }

  function commitDrag(g, fromRect) {
    const src = g.dragEl, dst = g.dropEl;

    /* ---- 应用图标：在三页之间换位 ----
       三页各有名单（appPages），拖到哪页就归哪页，页上顺序 = 名单顺序。
       页放满了就放不进去（回原位 + 提示），不再固定每页几个。
       dock 五格在新设计里是固定的，不进拖动（draggableAt 已排除）。 */
    const idA = src.dataset.app;

    // 目标页：落点图标/空白所在的 .home-page，读它身上的 data-page
    let dstPage = -1;
    const dstPg = (dst || g.dropZone) ? (dst || g.dropZone).closest('.home-page') : null;
    if (dstPg) dstPage = Number(dstPg.dataset.page);
    if (!(dstPage >= 0 && dstPage <= 2)) return false;

    let fromPage = -1;
    for (let i = 0; i < 3; i++) {
      if (appPages[i].some((x) => x.id === idA)) { fromPage = i; break; }
    }
    if (fromPage < 0) return false;

    const srcList = appPages[fromPage];
    const ai = srcList.findIndex((x) => x.id === idA);
    const list = appPages[dstPage];
    const moved = srcList.splice(ai, 1)[0];   // 先从原页拿出来

    let b;
    if (dst) {
      b = list.findIndex((x) => x.id === dst.dataset.app);
      if (b < 0) { srcList.splice(ai, 0, moved); return false; }
    } else {
      // 落在页面空白：归到这页名单的末尾（插在最后一个图标后面）
      const last = g.dropZone ? g.dropZone.lastElementChild : null;
      const lastId = last ? last.dataset.app : '';
      const li = lastId ? list.findIndex((x) => x.id === lastId) : -1;
      b = li >= 0 ? li + 1 : list.length;
    }

    if (dstPage !== fromPage && list.length >= pageCap(dstPage)) {
      srcList.splice(ai, 0, moved);           // 这页放不下了 → 回原位
      toast('这页放不下了');
      return false;
    }
    if (b > list.length) b = list.length;
    list.splice(b, 0, moved);

    pagesSave();
    flipAll('.app-row .tile, .app-grid .tile', 'app', () => {
      renderBento(); renderApps();
    }, fromRect ? { id: idA, r: fromRect } : null);
    return true;
  }

  /* ---- 哪些东西能拖 ---- */
  function draggableAt(e) {
    const t = e.target;
    if (!t || !t.closest) return null;
    // dock 五格固定，不参与拖动；能拖的只有三页里的应用图标
    return t.closest('.app-row .tile, .app-grid .tile');
  }

  /* ---- 手势入口 ---- */
  let blankDown = false;   // 编辑态从空白起手：滑 = 翻页，点一下不动 = 收工
  document.addEventListener('pointerdown', (e) => {
    if (e.button > 0) return;
    if (e.target.closest && e.target.closest('#editDone')) return;
    clearTimeout(pressTimer);

    const de = draggableAt(e);
    /* dock 五格不可拖，但 .tile{touch-action:none} 让原生翻页在它上面失效，
       所以 dock 也算手势区（只翻页，不长按拖）；它不在 #home 里，得单独放行 */
    const onDock = !!(e.target.closest && e.target.closest('#dock .tile'));
    const inHome = home.contains(e.target) || onDock;

    if (editing && !de) {
      blankDown = inHome && !onDock;
      if (inHome) {
        ges = {
          pid: e.pointerId, type: e.pointerType,
          x0: e.clientX, y0: e.clientY, cx: e.clientX, cy: e.clientY,
          mode: null, dragEl: null, moved: 0, sl0: 0, dragMoved: false,
        };
      }
      return;
    }
    blankDown = false;
    if (!inHome) return;
    if (!de && !onDock && e.pointerType !== 'mouse') return;   // 触摸从真空白开始 → 原生翻页（有惯性）

    ges = {
      pid: e.pointerId, type: e.pointerType,
      x0: e.clientX, y0: e.clientY, cx: e.clientX, cy: e.clientY,
      mode: null, dragEl: de, moved: 0, sl0: 0, dragMoved: false,
    };

    if (editing && de) {            // 编辑态：按住立刻拖，不用再等
      e.preventDefault();
      beginDrag(ges);
      return;
    }
    if (de) {
      pressTimer = setTimeout(() => {
        // 只有已经变成翻页手势才放弃；否则到点就拖——
        // 慢速地"按住开始挪"也是拖，不会被误判成翻页
        if (!ges || ges.mode === 'swipe') return;
        beginDrag(ges);
      }, LONGPRESS_MS);
    }
  }, { passive: false });

  document.addEventListener('pointermove', (e) => {
    if (!ges || e.pointerId !== ges.pid) return;
    ges.cx = e.clientX;
    ges.cy = e.clientY;
    const dx = e.clientX - ges.x0, dy = e.clientY - ges.y0;
    ges.moved = Math.max(ges.moved, Math.sqrt(dx * dx + dy * dy));

    if (ges.mode === 'drag') {
      if (e.cancelable) e.preventDefault();
      if (ges.moved > 6) ges.dragMoved = true;
      moveGhost(ges, e.clientX, e.clientY);
      updateDrop(ges, e.clientX, e.clientY);
      edgeScroll(ges, e.clientX);       // 贴近左右边 → 邻页探边 + 自动翻页
      return;
    }

    /* 起手在图标/组件上：漂 24px 以内不算滑——
       手机上长按时手指必然会漂，10px 阈值会把长按全杀掉 */
    const slop = ges.dragEl ? 24 : SWIPE_SLOP;
    if (!ges.mode && (Math.abs(dx) > slop || Math.abs(dy) > slop)) {
      if (!pager || (editing && ges.dragEl)) { ges = null; return; }
      if (Math.abs(dx) <= Math.abs(dy)) return;     // 竖向：继续等长按
      ges.mode = 'swipe';
      ges.sl0 = pager.scrollLeft;
      pager.style.scrollSnapType = 'none';
      pager.classList.add('dragging');
      try { pager.setPointerCapture(ges.pid); } catch (_) {}
    }

    if (ges.mode === 'swipe') {
      if (e.cancelable) e.preventDefault();
      pager.scrollLeft = ges.sl0 - dx;
    }
  }, { passive: false });

  function snapPager() {
    if (!pager) return;
    pager.style.scrollSnapType = '';
    pager.classList.remove('dragging');
    const w = pager.clientWidth || 1;
    const i = Math.round(pager.scrollLeft / w);
    pager.scrollTo({ left: i * w, behavior: 'smooth' });
  }

  function endGesture(e) {
    clearTimeout(pressTimer);
    if (!ges) { blankDown = false; return; }
    const g = ges;
    ges = null;
    if (e && e.pointerId !== g.pid) return;

    if (g.mode === 'drag') {
      const gr = ghostRect();               // 先量 ghost 落点，再撤
      killGhost();
      if (g.dragEl) g.dragEl.classList.remove('drag-src');
      stopEdge();
      commitDrag(g, gr);
      clearDrop(g);
      suppressClick = performance.now() + 260;
      /* 编辑态留着：可以接着拖下一个；想结束就点「完成」或空白处 */
      return;
    }

    if (g.mode === 'swipe') {
      snapPager();
      suppressClick = performance.now() + 260;
      blankDown = false;
      return;
    }

    // 编辑态从空白起手、没怎么动 → 点空白收工
    if (blankDown && editing) {
      blankDown = false;
      if (g.moved < 8) setEdit(false);
    }
  }
  document.addEventListener('pointerup', endGesture);
  document.addEventListener('pointercancel', (e) => {
    blankDown = false;
    if (!ges || e.pointerId !== ges.pid) return;
    const g = ges;
    ges = null;
    if (g.mode === 'drag') abortDrag(g);
    else if (g.mode === 'swipe') snapPager();
  });

  /* 长按不弹系统菜单；拖完那一瞬间的残余 click 吞掉 */
  document.addEventListener('contextmenu', (e) => {
    if (e.target.closest && e.target.closest('.tile')) e.preventDefault();
  });
  document.addEventListener('click', (e) => {
    if (performance.now() < suppressClick && e.target.closest && (e.target.closest('#home') || e.target.closest('#dock'))) {
      if (e.target.closest('[data-nodrag]')) return;   // 组件里的按钮不该被吞
      e.stopPropagation();
      e.preventDefault();
    }
  }, true);

  function renderCards() {
    const me = S.memory.userName ? S.memory.userName.slice(0, 1) : '我';

    updateGrid();   // 改名/改起始日马上刷主屏，不等 60 秒的时钟 tick

    setHTML('chatAvaPartner', partnerAvaInner(''));   // 聊天头部头像（用图或首字）
    setTxt('moodAvaPartner', partnerInitial());
    setTxt('chatName', chatPartnerName());         // 聊天里用备注名
    /* v42 顶栏也跟着刷：头像 + 状态（名字改了这里马上变） */
    setHTML('tbAva', partnerAvaInner(''));
    setTxt('tbStatus', P.statusLine(S.persona, Date.now()));
    const inp = $('input');
    if (inp) inp.placeholder = '说点什么…';
    setTxt('setAvaMe', me);
    setTxt('setNotePartner', partnerName());
    setTxt('setUserLabel', S.memory.userName || '我');
    setTxt('setMoodLine', '在一起第 ' + daysSince() + ' 天');

    // 桌面卡片（天数/状态/设备/之间/音乐/相册/一周/一句话）都在 updateGrid 里刷；
    // talk-list 是状态页的，照旧刷
    renderTalk();
  }

  /* ================= 课程表 ================= */

  function renderCourses() {
    const box = $('courseList');
    if (!box) return;
    box.innerHTML = '';
    const list = (S.life.courses || []).slice().sort((a, b) => a.day - b.day || String(a.start).localeCompare(String(b.start)));
    if (!list.length) {
      box.innerHTML = '<p class="hint">还没有课。点右上「加一节」。</p>';
      return;
    }
    list.forEach((c) => {
      const row = document.createElement('div');
      row.className = 'row course-row';
      row.innerHTML =
        '<span class="row-ic">' + WEEKDAY_CN[c.day] + '</span>' +
        '<span class="row-name">' + esc(c.name || '课') + '<em>' + c.start + '-' + c.end + (c.room ? ' · ' + esc(c.room) : '') + '</em></span>' +
        '<button class="row-side del" data-del="' + c.id + '" type="button">删</button>';
      row.querySelector('[data-del]').addEventListener('click', () => {
        S.life.courses = S.life.courses.filter((x) => x.id !== c.id);
        save(KEY.life, S.life);
        renderCourses();
      });
      box.appendChild(row);
    });
  }

  /* ================= 倒数日 ================= */

  function cdDays(dateStr) {
    const d = new Date((dateStr || '') + 'T00:00:00');
    if (isNaN(d.getTime())) return null;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return Math.round((d - today) / 86400000);
  }

  function renderCountdownPage() {
    const box = $('cdList');
    if (!box) return;
    box.innerHTML = '';
    const list = (S.life.countdowns || []).slice().sort((a, b) => (cdDays(a.date) || 0) - (cdDays(b.date) || 0));
    if (!list.length) {
      box.innerHTML = '<p class="hint">还没有在数的日子。</p>';
      return;
    }
    list.forEach((c) => {
      const n = cdDays(c.date);
      const row = document.createElement('div');
      row.className = 'row cd-row';
      row.innerHTML =
        '<span class="row-ic">' + (n === null ? '?' : (n > 0 ? n : n === 0 ? '今天' : Math.abs(n))) + '</span>' +
        '<span class="row-name">' + esc(c.title) + '<em>' + c.date + (n > 0 ? ' · 还有 ' + n + ' 天' : n === 0 ? ' · 就是今天' : ' · 过了 ' + Math.abs(n) + ' 天') + (c.note ? ' · ' + esc(c.note) : '') + '</em></span>' +
        '<button class="row-side del" data-del="' + c.id + '" type="button">删</button>';
      row.querySelector('[data-del]').addEventListener('click', () => {
        S.life.countdowns = S.life.countdowns.filter((x) => x.id !== c.id);
        save(KEY.life, S.life);
        renderCountdownPage();
        renderCalendar();
        renderCountdownCard();
      });
      box.appendChild(row);
    });
  }

  /** 第 3 页上那张：最近的一个倒数日 */
  function renderCountdownCard() {
    const box = $('cdCard');
    if (!box) return;
    const list = (S.life.countdowns || []).map((c) => Object.assign({}, c, { n: cdDays(c.date) }))
      .filter((c) => c.n !== null && c.n >= 0).sort((a, b) => a.n - b.n);
    if (!list.length) { box.hidden = true; return; }
    box.hidden = false;
    const c = list[0];
    setTxt('cdCardName', c.title);
    setTxt('cdCardDays', String(c.n));
    setTxt('cdCardSub', c.n === 0 ? '就是今天' : '天后' + (c.note ? ' · ' + c.note : ''));
  }

  /* ================= 卡券 ================= */

  const COUPON_PRESET = [
    { title: '哄我', desc: '说点好听的，别敷衍。' },
    { title: '早点睡', desc: '催我去睡，别讲道理。' },
    { title: '陪我发呆', desc: '什么都不用说，待着就行。' },
    { title: '骂醒我', desc: '我在逃避一件事，说重点。' },
    { title: '讲个故事', desc: '随便什么，短一点。' },
  ];

  function ensureCoupons() {
    if (!S.life.coupons.length) {
      S.life.coupons = COUPON_PRESET.map((c, i) => ({
        id: 'cp' + (i + 1), title: c.title, desc: c.desc, usedAt: null, note: '', by: '',
      }));
      save(KEY.life, S.life);
    }
  }

  function renderCoupons() {
    const box = $('cardList');
    if (!box) return;
    ensureCoupons();
    box.innerHTML = '';
    const usable = S.life.coupons.filter((c) => !c.usedAt);
    const used = S.life.coupons.filter((c) => c.usedAt);

    if (!usable.length) box.innerHTML = '<p class="hint">都用完了。可以再加一张。</p>';

    usable.forEach((c) => {
      const row = document.createElement('div');
      row.className = 'row coupon-row';
      row.innerHTML =
        '<span class="coupon-face">' + esc(c.title) + '</span>' +
        '<span class="row-name">' + esc(c.desc || '') + '</span>' +
        '<button class="row-side use" data-use="' + c.id + '" type="button">用掉</button>';
      row.querySelector('[data-use]').addEventListener('click', () => useCoupon(c.id));
      box.appendChild(row);
    });

    if (used.length) {
      const head = document.createElement('p');
      head.className = 'list-head';
      head.textContent = '用过的（' + used.length + '）';
      box.appendChild(head);
      used.slice().sort((a, b) => b.usedAt - a.usedAt).forEach((c) => {
        const row = document.createElement('div');
        row.className = 'row coupon-row used';
        row.innerHTML =
          '<span class="coupon-face">' + esc(c.title) + '</span>' +
          '<span class="row-name">' + (!isMineBy(c.by) ? '他用的' : '你用的') + '<em>' + hhmm(c.usedAt) + (c.note ? ' · ' + esc(c.note) : '') + '</em></span>';
        box.appendChild(row);
      });
    }
  }

  function useCoupon(id) {
    const c = S.life.coupons.filter((x) => x.id === id)[0];
    if (!c || c.usedAt) return;
    const note = prompt('用掉「' + c.title + '」。记一笔（可以空着）：', '');
    if (note === null) return;
    c.usedAt = Date.now();
    c.by = 'me';
    c.note = (note || '').slice(0, 100);
    save(KEY.life, S.life);
    pushDayLog('你用掉了一张「' + c.title + '」' + (c.note ? '：' + c.note : ''), 'coupon', false);
    renderCoupons();
    toast('记下了');
  }

  /* ================= 他的一天 ================= */

  function renderPartnerDay() {
    const box = $('dayList');
    if (!box) return;
    const list = (S.life.dayLog || []).slice().sort((a, b) => a.ts - b.ts).slice(-40).reverse();
    if (!list.length) {
      box.innerHTML = '<p class="hint">还没有。等一会儿就有了。</p>';
      return;
    }
    box.innerHTML = '';
    list.forEach((e) => {
      const row = document.createElement('div');
      row.className = 'row day-row' + (e.inferred ? ' inferred' : '');
      row.innerHTML =
        '<span class="row-ic">' + hhmm(e.ts) + '</span>' +
        '<span class="row-name">' + esc(e.text) + '<em>' + (DAY_KIND_CN[e.kind] || '') + (e.inferred ? ' · 推' : '') + '</em></span>';
      box.appendChild(row);
    });
  }

  /* ================= 查手机 ================= */

  function collectDevice() {
    const d = S.life.device || (S.life.device = {});
    d.ts = Date.now();
    d.online = navigator.onLine !== false;
    if (deviceScreenMin) d.screenMin = deviceScreenMin;
    try {
      if (navigator.getBattery) {
        navigator.getBattery().then((b) => {
          d.battery = b.level;
          d.charging = b.charging;
          d.ts = Date.now();
          save(KEY.life, S.life);
          // 只重渲染行，不能再调 collectDevice——否则 getBattery→renderDevice→collectDevice
          // 会形成微任务无限递归，把主线程饿死（设备页整个冻住）
          if (segOn('now', 'device')) { renderDeviceRows(); setTxt('deviceLine', deviceLine()); }
          renderDeviceCard();
          if (typeof updateGrid === 'function') updateGrid();   // 主屏设备格的电量
        }).catch(() => {});
      }
    } catch (_) {}
    save(KEY.life, S.life);
  }

  function renderDeviceRows() {
    const box = $('deviceList');
    if (!box) return;
    const d = S.life.device || {};
    const rows = [
      ['电量', d.battery === undefined ? '这台设备不给看' : Math.round(d.battery * 100) + '%' + (d.charging ? '（在充）' : '')],
      ['网络', d.online === false ? '断着' : '连着'],
      ['今天亮屏', d.screenMin ? d.screenMin + ' 分钟' : '还没统计'],
      ['屏幕', window.innerWidth + ' × ' + window.innerHeight],
      ['现在', new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })],
      ['系统', navigator.platform || '不知道'],
    ];
    box.innerHTML = '';
    rows.forEach((r) => {
      const row = document.createElement('div');
      row.className = 'row';
      row.innerHTML = '<span class="row-ic">' + esc(r[0]) + '</span><span class="row-name">' + esc(r[1]) + '</span>';
      box.appendChild(row);
    });
  }

  function renderDevice() {
    collectDevice();
    renderDeviceRows();
    setTxt('deviceLine', deviceLine());
  }

  function deviceLine() {
    const d = S.life.device || {};
    if (d.battery !== undefined && d.battery < 0.15 && !d.charging) return '就剩这么点电还在跟我说话。';
    if (d.battery !== undefined && d.battery > 0.9 && d.charging) return '充得差不多了，别一直插着。';
    if (d.online === false) return '你那边断网了。我说的话你暂时收不到。';
    if (d.screenMin && d.screenMin > 300) return '今天盯屏幕太久了。';
    return '没什么可说的。就是知道你在。';
  }

  function renderDeviceCard() {
    const box = $('devCard');
    if (!box) return;
    const d = S.life.device || {};
    if (!d.ts || Date.now() - d.ts > 30 * 60000) { box.hidden = true; return; }
    box.hidden = false;
    setTxt('devCardVal', d.battery === undefined ? '—' : Math.round(d.battery * 100) + '%');
    setTxt('devCardSub', deviceLine());
  }

  /** 人卡下面那行小字：今天说了几句、记住几件事 */
  function updateMainMeta() {
    const today = new Date().toDateString();
    const n = S.chat.filter(
      (m) => !isMine(m) && m.text && new Date(m.ts).toDateString() === today
    ).length;
    const f = (S.memory.facts || []).length;
    const el = $('mainMsgs');
    const meta = el ? el.closest('.main-meta') : null;

    if (meta && n === 0 && f === 0) {
      meta.textContent = '刚搬进来';
      return;
    }
    if (meta) {
      meta.innerHTML = '今天说了 <b>' + n + '</b> 句 · 记住 <b>' + f + '</b> 件事';
    }
  }

  /** 今天他说过的话 —— 记忆的回报要看得见 */
  function renderTalk() {
    const ul = $('talkList');
    if (!ul) return;

    const today = new Date().toDateString();
    const list = S.chat
      .filter((m) => !isMine(m) && m.text && new Date(m.ts).toDateString() === today)
      .slice(-5)
      .reverse();

    ul.innerHTML = '';
    const hint = $('talkHint');
    if (hint) hint.hidden = list.length > 0;
    setTxt('talkCount', list.length ? '共 ' + list.length + ' 句' : '');

    list.forEach((m) => {
      const li = document.createElement('li');
      li.textContent = m.text.replace(/\n+/g, ' ');
      ul.appendChild(li);
    });
  }

  function renderMood() {
    const p = S.persona;
    const picked = (S.moodLog || {})[todayStr()];
    $('moodWord').textContent = picked || P.moodWord(p);
    $('moodSub').textContent = P.moodSub(p);
    $('vMood').textContent = Math.round(p.mood);
    $('vEnergy').textContent = Math.round(p.energy);
    $('vAffection').textContent = Math.round(p.affection);
    $('bMood').style.width = Math.round(p.mood) + '%';
    $('bEnergy').style.width = Math.round(p.energy) + '%';
    $('bAffection').style.width = Math.round(p.affection) + '%';

    const ul = $('memories');
    ul.innerHTML = '';
    const facts = S.memory.facts || [];
    $('memoryHint').hidden = facts.length > 0;
    facts.forEach((f, idx) => {
      const li = document.createElement('li');
      const span = document.createElement('span');
      span.textContent = f;
      const del = document.createElement('button');
      del.type = 'button';
      del.setAttribute('aria-label', '删掉这条记忆');
      del.textContent = '×';
      del.addEventListener('click', () => {
        S.memory.facts.splice(idx, 1);
        save(KEY.memory, S.memory);
        renderMood();
      });
      li.appendChild(span);
      li.appendChild(del);
      ul.appendChild(li);
    });

    renderHomeMemories();
    paintMoodPicker();
    const word = (S.moodLog || {})[todayStr()];
    const echo = $('moodEcho');
    if (echo && word && !echo.textContent) {
      echo.hidden = false;
      echo.textContent = MOOD_ECHO[word] || '';
    }
  }

  /* ============================================================
     聊天
     ============================================================ */

  const stream = $('stream');
  const input = $('input');
  const form = $('composer');
  const sendBtn = $('send');

  let busy = false;
  let lastInteract = Date.now();
  let stickToBottom = true;
  let lastGapMin = 0;            // 用户这次回话隔了多少分钟
  let lastDayKey = '';

  function nearBottom() {
    return stream.scrollHeight - stream.scrollTop - stream.clientHeight < 140;
  }

  function scrollDown(force) {
    if (force || (stickToBottom && S.chatUI.autoScroll)) {
      stream.scrollTo({ top: stream.scrollHeight, behavior: force ? 'auto' : 'smooth' });
    }
  }

  /* ================= 隐藏标记 =================
     他说话时可以在正文后面夹带标记，前端剥掉、存起来、再注入回去：
       [[心事]]…[[/心事]]   此刻的情绪心事（覆盖式）
       [[念头]]…[[/念头]]   想接着聊的（追加去重）
       [[续话]]            吵架兜底：起一个 5 分钟内部闹钟
       [[用券:id]]         他用掉一张卡券
     流式输出时标记可能跨 chunk 到达，所以剥离器是有状态的：
     尾巴看起来像半个标记就先扣住不渲染，流结束再吐回，绝不让人看见 [[]]。  */
  const MARK_OPEN = /^\[\[(心事|念头|续话|用券:[A-Za-z0-9_-]{1,24})\]\]/;
  const MARK_CLOSE = { 心事: '[[/心事]]', 念头: '[[/念头]]' };
  const MARK_PARTIAL = /^\[(\[[\u4e00-\u9fa5A-Za-z0-9:_-]{0,26}\]?)?$/;
  const HOLD_MAX = 30;

  function makeStripper(onMark) {
    let mode = null;      // {key, arg, text}
    let hold = '';        // 扣住的、可能是半个标记的尾巴
    let visible = '';     // 累计可见正文

    function feed(chunk) {
      let s = hold + chunk;
      hold = '';
      let i = 0;
      while (i < s.length) {
        if (!mode) {
          if (s[i] === '[') {
            const rest = s.slice(i);
            const m = rest.match(MARK_OPEN);
            if (m) {
              const parts = m[1].split(':');
              const key = parts[0];
              const arg = parts[1] || '';
              if (key === '心事' || key === '念头') mode = { key: key, arg: arg, text: '' };
              else onMark(key, arg, '');            // 续话 / 用券：自闭合
              i += m[0].length;
              continue;
            }
            // 还没拼完整的开标签：扣住等下一个 chunk
            if (rest.length <= HOLD_MAX && MARK_PARTIAL.test(rest)) { hold = rest; break; }
          }
          visible += s[i++];
        } else {
          const close = MARK_CLOSE[mode.key];
          const idx = s.indexOf(close, i);
          if (idx >= 0) {
            mode.text += s.slice(i, idx);
            onMark(mode.key, mode.arg, mode.text.trim());
            mode = null;
            i = idx + close.length;
            continue;
          }
          // 尾巴可能是半个闭标签：留 close.length-1 个字符
          const keep = Math.min(close.length - 1, s.length - i);
          mode.text += s.slice(i, s.length - keep);
          hold = s.slice(s.length - keep);
          i = s.length;
        }
      }
      return visible;
    }

    function end() {
      if (mode) { onMark(mode.key, mode.arg, mode.text.trim()); mode = null; }
      const t = hold;                                // 没闭合的残余当正文吐回去，不吞字
      hold = '';
      return t;
    }

    return { feed: feed, end: end, text: function () { return visible; } };
  }

  /** 一次性文本（本地引擎 / 主动说话）的剥离：[[]] 直接去掉，返回标记 */
  function stripMarksSync(raw) {
    const marks = [];
    const strip = makeStripper((key, arg, text) => marks.push({ key: key, arg: arg, text: text }));
    let text = strip.feed(raw || '');
    text += strip.end();
    return { text: text, marks: marks };
  }

  /** 把标记落到生活数据里（消息会被截断，绝不能只挂在消息上） */
  function commitMarks(marks) {
    if (!marks || !marks.length) return;
    let touched = false;

    marks.forEach((mk) => {
      if (mk.key === '心事' && mk.text) {
        S.life.thought = { text: mk.text.slice(0, 120), ts: Date.now() };
        pushDayLog('把一件心事收起来了：' + mk.text.slice(0, 40), 'thought', false);
        touched = true;
      } else if (mk.key === '念头' && mk.text) {
        const t = mk.text.slice(0, 80);
        if (!S.life.ideas.some((x) => x.text === t)) {
          S.life.ideas.push({ text: t, ts: Date.now() });
          if (S.life.ideas.length > 30) S.life.ideas = S.life.ideas.slice(-30);
          touched = true;
        }
      } else if (mk.key === '续话') {
        armContinuation();
      } else if (mk.key === '用券') {
        const c = S.life.coupons.filter((x) => x.id === mk.arg && !x.usedAt)[0];
        if (c) {
          c.usedAt = Date.now();
          c.by = 'partner';
          if (mk.text) c.note = mk.text.slice(0, 100);
          pushDayLog('用掉了一张「' + c.title + '」', 'coupon', false);
          renderCoupons();
          toast('他用了一张「' + c.title + '」');
          touched = true;
        }
      }
    });

    if (touched) {
      save(KEY.life, S.life);
      updateGrid();
    }
  }

  /* 把动作与神态从正文里剥出来，单独一行斜体显示。
     支持三种写法：*他走过来*、全角（他看了一眼窗外）、半角 (他叹了口气)；
     半角括号只在内容是纯中文时才当动作，避免把 (2026.10) 这种补充信息也抽走。 */
  function splitAction(text) {
    const acts = [];
    let clean = String(text == null ? '' : text);
    clean = clean.replace(/\*([^*\n]{1,80})\*/g, (_, a) => { acts.push(a.trim()); return ''; });
    clean = clean.replace(/（([^（）\n]{2,60})）/g, (_, a) => { acts.push(a.trim()); return ''; });
    clean = clean.replace(/\(([^()\n]{2,60})\)/g, (m, a) => {
      if (!/^[\u4e00-\u9fa5，。、；：…—～·\s]{2,60}$/.test(a)) return m;
      acts.push(a.trim());
      return '';
    });
    clean = clean.replace(/\n{3,}/g, '\n\n').trim();
    return { text: clean, action: acts.join(' · ') };
  }

  /* 「思考了 N 秒」折叠卡：reasoning 流 / [[心事]] 标记的可视化（默认收起） */
  function buildThinkCard(text, sec) {
    const card = document.createElement('div');
    card.className = 'think-card closed';
    const head = document.createElement('button');
    head.type = 'button';
    head.className = 'think-head';
    const ic = document.createElement('span');
    ic.className = 'think-ic';
    ic.innerHTML = '<svg viewBox="0 0 24 24"><use href="#i-chat"/></svg>';
    const t1 = document.createElement('span');
    t1.className = 'think-label';
    t1.textContent = sec ? ('THINKING ' + Number(sec).toFixed(1) + 's') : 'THINKING';
    const t2 = document.createElement('i');
    t2.className = 'think-toggle';
    t2.textContent = '▾';
    head.appendChild(ic);
    head.appendChild(t1);
    head.appendChild(t2);
    const body = document.createElement('p');
    body.className = 'think-body';
    body.textContent = text;
    head.addEventListener('click', () => {
      const open = card.classList.toggle('open');
      t2.textContent = open ? '↑ 收起' : '▾';
    });
    card.appendChild(head);
    card.appendChild(body);
    return card;
  }
  function setThinkOpen(card, open) {
    if (!card) return;
    card.classList.toggle('open', !!open);
    const t = card.querySelector('.think-toggle');
    if (t) t.textContent = open ? '↑ 收起' : '▾';
  }

  /* 消息操作行：时间 + 复制/重说/删除（点消息出现，再点收起） */
  function buildOps(m, wrap) {
    const ops = document.createElement('div');
    ops.className = 'ops';
    const mk = (name, path, fn, danger) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'ops-btn' + (danger ? ' danger' : '');
      b.dataset.act = name;
      b.setAttribute('aria-label', name);
      b.innerHTML = '<svg viewBox="0 0 24 24">' + path + '</svg>';
      b.addEventListener('click', (e) => { e.stopPropagation(); fn(); });
      ops.appendChild(b);
    };
    const textOf = () => (m.action ? m.action + '\n' : '') + (m.text || '');

    mk('复制', '<rect x="9" y="9.5" width="9.6" height="11.5" rx="2.4"/><path d="M15.6 6.6V5.6A2.6 2.6 0 0 0 13 3H6.6A2.6 2.6 0 0 0 4 5.6v9.2a2.6 2.6 0 0 0 2.6 2.6h1"/>', () => {
      const t = textOf();
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(t).then(() => toast('已复制'), () => toast('复制失败'));
      } else toast('复制失败');
    });
    if (!isMine(m)) {
      mk('重试', '<path d="M19.2 12a7.2 7.2 0 1 1-2.2-5.2M19.2 4.4v5.2h-5.2"/>', () => regenPartner(m, wrap));
    }
    mk('语音', '<path d="M4 9.6v4.8M8.4 6.6v10.8M12 4.4v15.2M15.6 8v8M20 10.4v3.2"/>', () => {
      const t = String(m.text || '');
      if (!t) { toast('这条没有文字'); return; }
      if (!('speechSynthesis' in window)) { toast('这个环境不支持朗读'); return; }
      try {
        speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(t);
        u.lang = 'zh-CN'; u.rate = 0.95;
        speechSynthesis.speak(u);
      } catch (_) { toast('朗读失败'); }
    });
    mk('收藏', '<path d="M12 4.6l2.4 4.9 5.4.8-3.9 3.8.9 5.4-4.8-2.6-4.8 2.6.9-5.4L4.2 10.3l5.4-.8Z"/>', () => {
      let list = [];
      try { list = JSON.parse(localStorage.getItem('hc.favs') || '[]'); } catch (_) {}
      if (!Array.isArray(list)) list = [];
      list.push({ text: m.text || '', action: m.action || '', ts: m.ts || Date.now() });
      try { localStorage.setItem('hc.favs', JSON.stringify(list)); } catch (_) {}
      toast('已收藏');
    });
    mk('删除', '<path d="M5 7.2h14M9.6 7.2V4.9h4.8v2.3M7.2 7.2l.9 12h7.8l.9-12"/>', () => {
      const i = S.chat.indexOf(m);
      if (i >= 0) { S.chat.splice(i, 1); save(KEY.chat, S.chat); }
      wrap.remove();
      syncMsgAva();
      renderTokenBar();
      toast('已删除');
    }, true);
    return ops;
  }

  /* 重说：撤掉这条回复，对他之前那句话重新回应 */
  function regenPartner(m, wrap) {
    if (busy) { toast('他在打字呢'); return; }
    const i = S.chat.indexOf(m);
    if (i < 0) { if (wrap) wrap.remove(); return; }
    const prevMe = S.chat.slice(0, i).reverse().find((x) => x.role === 'me');
    S.chat.splice(i, 1);
    save(KEY.chat, S.chat);
    if (wrap) wrap.remove();
    if (prevMe) respond(prevMe.text);
  }

  /* 心里想卡挂到他的消息节点上（流式和重放共用；已有就更新文字） */
  function attachThink(node, text, sec) {
    if (!text || !node || !node.wrap) return;
    node.msg.think = text;
    if (sec) node.msg.thinkSec = sec;
    if (!S.chatUI.showThink) return;   // 关掉「思考药丸」就不挂卡
    const col = node.wrap.querySelector('.m-col');
    if (!col) return;
    let card = col.querySelector(':scope > .think-card');
    if (!card) {
      card = buildThinkCard(text, sec);
      col.insertBefore(card, col.querySelector(':scope > .ops'));
    } else {
      card.querySelector('.think-body').textContent = text;
      const lb = card.querySelector('.think-label');
      if (lb && sec) lb.textContent = '思考了 ' + sec + ' 秒';
    }
  }

  /* 「乱息」式布局：磨砂玻璃泡浮在壁纸上；他 = 小头像+时间在泡上方，
     正文按 \n 拆成连发多个小泡；我 = 右侧单个泡，无标注 */
  function fmtMeta(ts) {
    if (!ts) return '';
    const d = new Date(ts);
    const now = new Date();
    const sameDay = d.toDateString() === now.toDateString();
    if (sameDay) return hhmm(ts);
    const yest = new Date(now.getTime() - 86400000);
    if (d.toDateString() === yest.toDateString()) return '昨天 ' + hhmm(ts);
    return (d.getMonth() + 1) + '月' + d.getDate() + '日 ' + hhmm(ts);
  }

  function buildMessageNode(m) {
    const me = isMine(m);
    const wrap = document.createElement('div');
    wrap.className = 'msg ' + (me ? 'me' : 'partner') + (S.chatUI.ava ? ' show-ava' : '');

    const col = document.createElement('div');
    col.className = 'm-col';

    // 侧边头像（头像列模式才显示）：他居左、我居右
    const ava = document.createElement('div');
    ava.className = 'm-ava';
    ava.innerHTML = me ? myAvaInner('m-txt') : partnerAvaInner('m-txt');
    wrap.appendChild(ava);

    /* v68：逐条不再显示名字/迷你头像（身份交给顶栏），时间戳在气泡下方单独一行 */
    const bubble = document.createElement('div');
    bubble.className = 'bubble';

    let actEl = null;
    if (m.action) {
      /* v63：动作描写不再裹在气泡框里 —— 提到气泡上方，斜体浅灰一行 */
      actEl = document.createElement('em');
      actEl.className = 'act';
      actEl.textContent = m.action;
      col.appendChild(actEl);
    }

    const body = document.createElement('span');
    body.className = 'body';
    body.textContent = m.text || '';
    bubble.appendChild(body);
    col.appendChild(bubble);
    wrap.appendChild(col);

    wrap.__m = m;
    const node = { wrap, bubble, body, bubbles: [body], actEl: actEl };

    if (!me) {
      // 正文 setter：按 \n 把连发短句拆成多个磨砂小泡
      Object.defineProperty(node, 'body', {
        get() { return node.bubbles[node.bubbles.length - 1]; },
        set(full) {
          const parts = String(full == null ? '' : full).split('\n').map((x) => x.trim()).filter(Boolean);
          if (!parts.length) { node.bubbles[0].textContent = ''; return; }
          while (node.bubbles.length < parts.length) {
            const b = document.createElement('div');
            b.className = 'bubble';
            const sp = document.createElement('span');
            sp.className = 'body';
            b.appendChild(sp);
            col.insertBefore(b, col.querySelector('.think-card, .ops'));
            node.bubbles.push(sp);
          }
          while (node.bubbles.length > parts.length) {
            const sp = node.bubbles.pop();
            const b = sp.closest('.bubble');
            if (b) b.remove();
          }
          parts.forEach((t, i) => { node.bubbles[i].textContent = t; });
        }
      });
      node.body = m.text || '';      // 走 setter：历史消息也按行拆泡
    }

    // 他心里想（历史重放时也在；关掉「思考药丸」则不显示）
    if (!me && S.chatUI.showThink && m.think) col.appendChild(buildThinkCard(m.think, m.thinkSec));

    // 他的组底：小心率彩蛋（同一条消息数字稳定；关掉则不显示）
    if (!me && S.chatUI.showBpm && (m.text || '').trim()) {
      const bpm = document.createElement('div');
      bpm.className = 'bpm';
      bpm.textContent = '♥ ' + (62 + (Number(m.ts) % 29)) + ' bpm';
      col.appendChild(bpm);
    }

    // 操作行
    col.appendChild(buildOps(m, wrap));

    // 时间戳：气泡下方单独一行（10px / 居中 / 透明度 .36）
    const ts = document.createElement('span');
    ts.className = 'm-ts';
    ts.textContent = fmtMeta(m.ts);
    col.appendChild(ts);
    wrap.__ts = ts;

    wrap.addEventListener('click', () => {
      if (wrap.__suppressClick) { wrap.__suppressClick = false; return; }
      if (wrap.classList.contains('sel')) return;      // 已选中就保持
      selectMsg(null);
    });

    return node;
  }

  function appendDateMark(ts) {
    const el = document.createElement('div');
    el.className = 'day-mark';
    const d = new Date(ts);
    const now = new Date();
    const same = now.getFullYear() === d.getFullYear() && now.getMonth() === d.getMonth() && now.getDate() === d.getDate();
    const y = new Date(now.getTime() - 86400000);
    const yday = y.getFullYear() === d.getFullYear() && y.getMonth() === d.getMonth() && y.getDate() === d.getDate();
    const wd = '周' + (WEEKDAY_CN[d.getDay()] || '');
    el.textContent = (same ? '今天' : yday ? '昨天' : (d.getMonth() + 1) + '月' + d.getDate() + '日') + ' ' + wd;
    stream.appendChild(el);
  }

  function syncDayMark(ts) {
    if (!S.chatUI.showDate) return;   // 关掉日期分隔就不插
    const key = new Date(ts).toDateString();
    if (key === lastDayKey) return;
    lastDayKey = key;
    appendDateMark(ts);
  }

  function appendMessage(m, animate) {
    S.chat.push(m);
    if (S.chat.length > 600) S.chat = S.chat.slice(-500);
    syncDayMark(m.ts);
    const n = buildMessageNode(m);
    n.msg = m;                      // 流式/异步时别再用 S.chat[length-1] 猜，中间可能插进别的消息
    if (!animate) n.wrap.style.animation = 'none';
    stream.appendChild(n.wrap);
    syncMsgAva();
    renderTokenBar();
    save(KEY.chat, S.chat);
    scrollDown();
    return n;
  }

  function renderHistory() {
    stream.innerHTML = '';
    lastDayKey = '';
    S.chat.forEach((m) => {
      if (m.gap && m.gap >= 30) stream.appendChild(gapNote(m.gap));
      syncDayMark(m.ts);
      stream.appendChild(buildMessageNode(m).wrap);
    });
    const miss = missYouNote();
    if (miss) stream.appendChild(miss);
    syncMsgAva();
    renderTokenBar();
    scrollDown(true);
  }

  let typingEl = null;
  function showTyping() {
    if (typingEl) return;
    typingEl = document.createElement('div');
    typingEl.className = 'msg partner';
    typingEl.innerHTML = '<div class="typing"><i></i><i></i><i></i></div>';
    stream.appendChild(typingEl);
    scrollDown();
  }
  function hideTyping() {
    if (typingEl) { typingEl.remove(); typingEl = null; }
  }

  /* 打字机：逐字打出（不再一次跳多字）。
     节奏：标点处多停一拍像换气，换行（拆泡）停更久；长句自动提速，
     总时长不会拖沓。开头留一拍，让动作描写的斜体先浮现完再出字。 */
  function typeOut(node, fullText, speed, done) {
    const text = String(fullText == null ? '' : fullText);
    if (!text) { if (done) done(); return; }
    // 目标：正文部分约 1.4 秒打完，但每字不低于 12ms，短句就用调用方给的速度
    const base = Math.max(12, Math.min(speed || 26, Math.round(1400 / text.length)));
    const PAUSE = '，。！？；：、…—';
    let i = 0;
    const tick = () => {
      i += 1;
      node.body = text.slice(0, i);
      scrollDown();
      if (i >= text.length) { if (done) done(); return; }
      const ch = text.charAt(i - 1);
      const extra = PAUSE.indexOf(ch) >= 0 ? base * 2.8 : (ch === '\n' ? base * 4.5 : 0);
      setTimeout(tick, base + extra);
    };
    setTimeout(tick, 280);   // 动作描写先浮现一拍，正文随后逐字出
  }

  /** 他主动说一句（不经过用户输入） */
  function speak(text, action) {
    const clean = stripMarksSync(text);          // 防呆：主动话术里不该有标记
    const body = clean.text || text;
    showTyping();
    setTimeout(() => {
      hideTyping();
      const node = appendMessage({ role: 'partner', text: body, action: action || '', ts: Date.now() }, true);
      node.body = '';
      typeOut(node, body, 28);
      updateMainMeta();
      renderTalk();
      renderQuote();
      if (currentPage !== 'chat') addBadge('chat');
    }, 700 + Math.random() * 500);
  }

  /* ---- 给提示词用的几段"生活现状" ---- */

  const WEEKDAY_CN = ['日', '一', '二', '三', '四', '五', '六'];

  function coursesTodayText() {
    const list = (S.life.courses || []).filter((c) => c.day === new Date().getDay());
    if (!list.length) return '';
    list.sort((a, b) => String(a.start).localeCompare(String(b.start)));
    return list.map((c) => c.start + '-' + c.end + ' ' + c.name + (c.room ? '（' + c.room + '）' : '')).join('；');
  }

  function countdownText() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const items = (S.life.countdowns || []).map((c) => {
      const d = new Date((c.date || '') + 'T00:00:00');
      if (isNaN(d.getTime())) return null;
      const days = Math.round((d - today) / 86400000);
      return { title: c.title, days: days };
    }).filter(Boolean).sort((a, b) => Math.abs(a.days) - Math.abs(b.days)).slice(0, 3);
    if (!items.length) return '';
    return items.map((i) => i.title + '：' + (i.days > 0 ? '还有 ' + i.days + ' 天' : i.days === 0 ? '就是今天' : '已经过了 ' + Math.abs(i.days) + ' 天')).join('；');
  }

  function deviceText() {
    const d = S.life.device || {};
    if (!d.ts || Date.now() - d.ts > 30 * 60000) return '';   // 太旧就别拿来说事
    const bits = [];
    if (d.battery !== undefined && d.battery !== null) bits.push('电量 ' + Math.round(d.battery * 100) + '%' + (d.charging ? '（在充）' : ''));
    bits.push(d.online === false ? '断网了' : '在线');
    if (d.screenMin) bits.push('今天亮屏 ' + d.screenMin + ' 分钟');
    return bits.join('，');
  }

  /* ================= 美化：壁纸 ================= */

  function wallCfg() {
    return Object.assign({ preset: 'photo', img: '' }, S.settings.wall || {});
  }

  function applyWall() {
    const w = wallCfg();
    /* v42：默认不再挂任何壁纸皮肤（纯色底 + 噪点/光晕由主题层负责）。
       只有用户主动选过预设、或上传过图，才让旧皮肤接管。 */
    const saved = (S.settings && S.settings.wall) || {};
    if (saved.preset) document.body.dataset.wall = w.preset;
    else delete document.body.dataset.wall;
    if (w.img) {
      document.documentElement.style.setProperty('--wall-img', 'url("' + w.img + '")');
      document.body.dataset.wallimg = '1';
    } else {
      document.documentElement.style.removeProperty('--wall-img');
      delete document.body.dataset.wallimg;
    }
    // 美化页里高亮当前选中的那颗
    document.querySelectorAll('#wallRow .wall-dot[data-wall]').forEach((b) => {
      b.classList.toggle('on', b.dataset.wall === (w.preset || 'photo'));
    });
    const clearRow = $('wallClearRow');
    if (clearRow) clearRow.hidden = !w.img;
  }

  function patchWall(patch) {
    S.settings.wall = Object.assign(wallCfg(), patch);
    save(KEY.settings, S.settings);
    applyWall();
  }

  /** 把上传的图压到 1440 以内，存 dataURL（只在这台设备上） */
  function readWallFile(file) {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const max = 1440;
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const c = document.createElement('canvas');
        c.width = w;
        c.height = h;
        c.getContext('2d').drawImage(img, 0, 0, w, h);
        const data = c.toDataURL('image/jpeg', 0.82);
        if (data.length > 3.6 * 1024 * 1024) { toast('这张太大了，换张小点的'); return; }
        patchWall({ img: data });
        toast('壁纸换好了');
      };
      img.onerror = () => toast('这个格式读不了');
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  }

  function bindWallControls() {
    document.querySelectorAll('#wallRow .wall-dot[data-wall]').forEach((b) => {
      b.addEventListener('click', () => {
        patchWall({ preset: b.dataset.wall, img: '' });
      });
    });
    const pick = $('wallPick');
    const file = $('wallFile');
    if (pick && file) {
      pick.addEventListener('click', () => file.click());
      file.addEventListener('change', (e) => {
        const f = e.target.files && e.target.files[0];
        if (f) readWallFile(f);
        e.target.value = '';
      });
    }
    const clear = $('wallClear');
    if (clear) clear.addEventListener('click', () => { patchWall({ img: '' }); toast('换回预设了'); });
  }

  /* ================= 美化：桌面组件与排布 ================= */

  function renderTheme() {
    const box = $('widgetToggles');
    if (box) {
      box.innerHTML = '';
      const hidden = dtHidden();
      DT_ORDER.forEach((id) => {
        const on = hidden.indexOf(id) < 0;
        const row = document.createElement('div');
        row.className = 'row widget-row';
        row.innerHTML =
          '<span class="row-name">' + DT_CARDS[id].name + '</span>' +
          '<select class="row-side" data-card="' + id + '">' +
            '<option value="1"' + (on ? ' selected' : '') + '>显示</option>' +
            '<option value="0"' + (!on ? ' selected' : '') + '>收起来</option>' +
          '</select>';
        row.querySelector('select').addEventListener('change', (e) => {
          const hid = dtHidden().slice();
          const i = hid.indexOf(id);
          if (e.target.value === '0') { if (i < 0) hid.push(id); }
          else if (i >= 0) hid.splice(i, 1);
          patchDt(hid);
          renderBento();
          renderApps();
          toast(e.target.value === '0' ? '收起来了' : '回来了');
        });
        box.appendChild(row);
      });
    }

    applyWall();

    const hcfg = homeCfg();
    const setVal = (id, v) => { const el = $(id); if (el) el.value = v; };
    setVal('setMix', hcfg.mix ? 'on' : 'off');
    setVal('setRows', String(hcfg.rows));
    setVal('setEvery', String(hcfg.every));
    setVal('setGap', hcfg.gap);
  }

  function bindThemeControls() {
    const bind = (id, fn) => {
      const el = $(id);
      if (el) el.addEventListener('change', () => { fn(el.value); renderBento(); renderApps(); });
    };
    bind('setMix', (v) => patchHome({ mix: v === 'on' }));
    bind('setRows', (v) => patchHome({ rows: Number(v) | 0 }));
    bind('setEvery', (v) => patchHome({ every: Number(v) | 0 }));
    bind('setGap', (v) => { patchHome({ gap: v }); applyGap(v); });

    const reset = $('btnThemeReset');
    if (reset) {
      reset.addEventListener('click', () => {
        if (!confirm('组件和应用都回到默认位置？')) return;
        [KEY.apps, KEY.dock, KEY.pages].forEach((k) => dropKey(k));
        tideWriteNow();
        APPS = loadOrder(KEY.apps, APPS_DEFAULT);
        DOCK = loadOrder(KEY.dock, DOCK_DEFAULT);
        appPages = loadPages();
        pagesSave();
        patchDt([]);
        patchHome(Object.assign({}, HOME_DEFAULT));
        applyGap(HOME_DEFAULT.gap);
        renderBento();
        renderApps();
        renderTheme();
        toast('回到默认了');
      });
    }

    /* 整库导出 / 导入：这站没后端，备份就是全部（家机两边通用一个 json） */
    const exp = $('btnExport');
    if (exp) {
      exp.addEventListener('click', () => {
        tideWriteNow();                       // 先把内存里的改动落盘再导出
        const state = {};
        Object.keys(KEY).forEach((f) => { const v = tideLoad()[f]; if (v !== undefined) state[f] = v; });
        const dump = {
          app: 'tide', key: TIDE_KEY, exported_at: new Date().toISOString(),
          state,
          keys: {},                           // 顺带保留老格式（hc.v1.* 字符串），老版本也能读
        };
        Object.keys(state).forEach((f) => {
          try { dump.keys[KEY[f]] = JSON.stringify(state[f]); } catch (_) {}
        });
        const blob = new Blob([JSON.stringify(dump, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'tide-backup-' + todayStr() + '.json';
        a.click();
        setTimeout(() => { try { URL.revokeObjectURL(a.href); } catch (_) {} }, 4000);
        toast('导出好了，收好这个 json');
      });
    }
    const imp = $('btnImport');
    if (imp) {
      imp.addEventListener('click', () => $('fileImport').click());
      $('fileImport').addEventListener('change', (e) => {
        const f = e.target.files && e.target.files[0];
        if (!f) return;
        const r = new FileReader();
        r.onload = () => {
          try {
            const dump = JSON.parse(r.result);
            const t = tideLoad();
            let n = 0;
            // 新格式：state 里是已经解析好的数据
            if (dump && dump.state && typeof dump.state === 'object') {
              Object.keys(dump.state).forEach((f) => {
                if (Object.prototype.hasOwnProperty.call(KEY, f)) { t[f] = dump.state[f]; n += 1; }
              });
            }
            // 老格式：keys 里是 'hc.v1.xxx': 'json字符串'
            const keys = dump && dump.keys ? dump.keys : dump;
            Object.keys(keys).forEach((k) => {
              if (k.indexOf('hc.v1.') !== 0 || typeof keys[k] !== 'string') return;
              const f = fieldOf(k);
              if (!Object.prototype.hasOwnProperty.call(KEY, f)) return;
              try { t[f] = JSON.parse(keys[k]); n += 1; } catch (_) {}
            });
            if (!n) { toast('这里头没有本站的数据'); return; }
            tideWriteNow();
            location.reload();
          } catch (_) { toast('这个文件读不了'); }
        };
        r.readAsText(f);
      });
    }
  }

  /** 疏密：只改 bento 的间距和首页内边距 */
  function applyGap(v) {
    const box = $('bento');
    if (!box) return;
    box.classList.remove('gap-tight', 'gap-comfy', 'gap-loose');
    box.classList.add('gap-' + (v || 'comfy'));
  }

  /* ---------------- 机的一天 ----------------
     页面开着时记真实发生的事；关掉的那段靠状态演化推演（会标出来）。 */

  const DAY_KIND_CN = {
    speak: '开口说了一句',
    thought: '心里过了一下',
    coupon: '用掉一张卡券',
    continue: '惦记着又开口',
    state: '状态变了',
    idle: '待着',
  };

  function pushDayLog(text, kind, inferred, ts) {
    const log = S.life.dayLog || (S.life.dayLog = []);
    log.push({ ts: ts || Date.now(), text: text, kind: kind || 'idle', inferred: !!inferred });
    if (log.length > 300) S.life.dayLog = log.slice(-240);
    save(KEY.life, S.life);
    if (segOn('now', 'day')) renderPartnerDay();
  }

  /** 页面关着的那段：按状态演化的时间差推演他大概怎么过的 */
  function inferDayGap(fromTs, toTs) {
    const hours = (toTs - fromTs) / 3600000;
    if (hours < 0.5) return [];
    const out = [];
    const p = P.evolve(Object.assign({}, S.persona, { lastTick: fromTs }), toTs);
    const h = new Date(fromTs).getHours();

    if (hours >= 6) {
      out.push({ ts: fromTs + hours * 3600000 * 0.3, kind: 'idle',
        text: h >= 22 || h < 6 ? '你睡了，我把声音调小了。' : '等了一会儿，没等到你。' });
    }
    if (p.energy < 34) out.push({ ts: fromTs + hours * 3600000 * 0.6, kind: 'state', text: '有点撑不住，精力掉下去了。' });
    if (p.mood < 44) out.push({ ts: fromTs + hours * 3600000 * 0.75, kind: 'thought', text: '心情低了些。没什么具体原因。' });
    if (hours >= 8) out.push({ ts: toTs - 3600000, kind: 'idle', text: '快到你平常来的时间了。我在。' });
    return out.map((x) => Object.assign(x, { inferred: true }));
  }

  /** 把离开期间推演出来的补进 dayLog（只在回来时跑一次） */
  function backfillDayGap() {
    const log = S.life.dayLog || [];
    const last = log.length ? log[log.length - 1].ts : 0;
    const now = Date.now();
    if (!last) { pushDayLog('开始记这一天。', 'idle', false, now); return; }
    const gap = now - last;
    if (gap < 30 * 60000) return;
    inferDayGap(last, now).forEach((e) => pushDayLog(e.text, e.kind, true, e.ts));
    save(KEY.life, S.life);
  }

  let deviceScreenMin = 0;       // 今天亮屏（页面在前台）多少分钟
  let screenStart = document.hidden ? 0 : Date.now();

  function flushScreenTime() {
    if (!screenStart) return;
    const add = Math.round((Date.now() - screenStart) / 60000);
    if (add > 0) deviceScreenMin += add;
    screenStart = Date.now();
    if (S.life.device) { S.life.device.screenMin = deviceScreenMin; save(KEY.life, S.life); }
  }

  function partnerProfileCtx() {
    return {
      userName: S.memory.userName || '',
      partnerName: partnerName(),
      memories: S.memory.facts || [],
      recent: S.chat.filter((m) => !isMine(m)).slice(-10).map((m) => m.text),
      life: {
        thought: S.life.thought,
        ideas: S.life.ideas,
        coupons: S.life.coupons,
        coursesToday: coursesTodayText(),
        countdownText: countdownText(),
        deviceText: deviceText(),
      },
      gapMin: lastGapMin,
    };
  }

  function applyEffects(e) {
    const p = S.persona;
    p.mood = clamp(p.mood + (e[0] || 0));
    p.energy = clamp(p.energy + (e[1] || 0));
    const gain = (e[2] || 0) * (1 - p.affection / 118) * 0.75;
    p.affection = clamp(p.affection + Math.max(0.25, gain));
    p.lastTick = Date.now();
    save(KEY.persona, p);
    tickClocks();
  }

  let pendingMarks = null;   // 这一轮回复里收到的标记，finish 时统一落库

  async function respond(userText) {
    const ctx = partnerProfileCtx();
    ctx.gapMin = lastGapMin;
    const cfg = S.settings;
    busy = true;
    pendingMarks = null;
    updateSendState();

    if (LLM.configured(cfg)) {
      showTyping();
      let node = null;
      let received = false;
      let strip = null;
      let thinkText = '';
      let reasonText = '';
      let thinkStartMs = 0;
      let reasonNode = null;
      try {
        const history = S.chat.slice(-16, -1).map((m) => ({
          role: !isMine(m) ? 'assistant' : 'user',
          content: m.text,
        }));
        const messages = [
          { role: 'system', content: LLM.buildSystem(S.persona, ctx) },
          ...history,
          { role: 'user', content: userText },
        ];

        await LLM.stream({
          cfg,
          messages,
          onReason: (chunk, full) => {
            // 思考模型的 reasoning 流：单独一条「思考过程」卡，边想边长
            if (!thinkStartMs) thinkStartMs = Date.now();
            reasonText = full;
            if (!reasonNode) {
              hideTyping();
              reasonNode = document.createElement('div');
              reasonNode.className = 'msg partner';
              const card = buildThinkCard('');
              setThinkOpen(card, true);
              reasonNode.appendChild(card);
              stream.appendChild(reasonNode);
            }
            reasonNode.querySelector('.think-body').textContent = full;
            scrollDown();
          },
          onUsage: (u) => {
            try {
              const t = S.life.usage.total;
              const p = Number(u.prompt_tokens) || 0;
              const c = Number(u.completion_tokens) || 0;
              t.prompt += p;
              t.completion += c;
              t.requests += 1;
              S.life.usage.peak = Math.max(S.life.usage.peak || 0, p + c);
              const day = todayStr();
              const bd = S.life.usage.byDay[day] || (S.life.usage.byDay[day] = { prompt: 0, completion: 0, requests: 0 });
              bd.prompt += p; bd.completion += c; bd.requests += 1;
              save(KEY.life, S.life);
            } catch (_) {}
          },
          onDelta: (d) => {
            received = true;
            if (!strip) strip = makeStripper((key, arg, text) => {
              pendingMarks = pendingMarks || [];
              pendingMarks.push({ key: key, arg: arg, text: text });
              if (key === '心事' && text) {
                thinkText = text;                       // 心里想：边流边挂卡
                if (node) attachThink(node, text);
              }
            });
            const vis = strip.feed(d);          // 只喂增量，绝不喂全文
            const parsed = splitAction(vis);
            if (!node) {
              hideTyping();
              node = appendMessage({ role: 'partner', text: parsed.text, action: parsed.action, ts: Date.now() }, true);
              // 正文开始 → 思考卡移到这条消息上方并收起
              if (reasonNode) {
                const card = reasonNode.querySelector('.think-card');
                if (card) {
                  const colx = node.wrap.querySelector('.m-col');
                  colx.insertBefore(card, colx.querySelector('.bubble'));
                  setThinkOpen(card, false);
                }
                reasonNode.remove();
                reasonNode = null;
              }
              scrollDown();
              return;
            }
            node.msg.text = parsed.text;
            node.msg.action = parsed.action;
            node.body = parsed.text;
            let em = node.actEl;
            if (parsed.action) {
              if (!em) {
                em = document.createElement('em');
                em.className = 'act';
                node.bubble.parentNode.insertBefore(em, node.bubble);
                node.actEl = em;
              }
              em.textContent = parsed.action;
            } else if (em) { em.remove(); node.actEl = null; }
            scrollDown();
          },
        });

        if (!node) throw new Error('空回复');
        if (strip) {
          const tail = strip.end();
          const parsed = splitAction(strip.text() + tail);
          node.msg.text = parsed.text || '……';
          node.msg.action = parsed.action;
          node.body = node.msg.text;
        }
        const finalThink = reasonText || thinkText;
        if (finalThink) {
          const thinkSec = thinkStartMs ? Math.max(1, Math.round((Date.now() - thinkStartMs) / 1000)) : 0;
          attachThink(node, finalThink, thinkSec);
        }
        save(KEY.chat, S.chat);
        applyEffects([2.5, -1, 2]);
        finish();
        return;
      } catch (err) {
        hideTyping();
        if (reasonNode) { reasonNode.remove(); reasonNode = null; }
        if (received && node) {
          // 断在流中途：已收到的标记不能丢，被扣住的尾巴要吐回
          if (strip) {
            const parsed = splitAction(strip.text() + strip.end());
            node.msg.text = parsed.text || '……';
            node.msg.action = parsed.action;
          }
          if (!node.msg.text) node.msg.text = '……';
          node.body = node.msg.text;
          const t2 = reasonText || thinkText;
          if (t2) attachThink(node, t2);
          save(KEY.chat, S.chat);
          toast('连接断了，先说到这儿');
          finish();
          return;
        }
        toast('模型没接上，让他自己说');
      }
    }

    const r = P.reply(userText, S.persona, ctx);
    showTyping();
    const thinkTime = 420 + Math.min(1300, r.text.length * 24) + Math.random() * 400;

    setTimeout(() => {
      hideTyping();
      const clean = stripMarksSync(r.text);           // 本地引擎理论上没标记，防呆
      pendingMarks = (pendingMarks || []).concat(P.synthMarks(r, S.persona) || []);
      if (clean.marks.length) pendingMarks = pendingMarks.concat(clean.marks);
      const node = appendMessage({ role: 'partner', text: clean.text, action: r.action, ts: Date.now() }, true);
      node.body = '';
      const th = (pendingMarks || []).filter((x) => x.key === '心事' && x.text).slice(-1)[0];
      if (th) attachThink(node, th.text);
      typeOut(node, clean.text, 26);
      applyEffects(r.effects);
      save(KEY.chat, S.chat);
      finish();
    }, thinkTime);
  }

  function finish() {
    busy = false;
    lastInteract = Date.now();
    commitMarks(pendingMarks);      // 三条路径都在这里收口，不漏不重
    pendingMarks = null;
    updateSendState();
    renderQuote();
    renderHomeMemories();
    renderWeek();
    if (currentPage !== 'chat') addBadge('chat');
  }

  function gapNote(min) {
    const el = document.createElement('div');
    el.className = 'sys-note';
    const h = Math.floor(min / 60);
    const tail = Math.random() < 0.5 ? '老婆终于回我了😭' : '你终于舍得回我了😭';
    el.textContent = (h > 0 ? h + ' 小时 ' + (min % 60) + ' 分钟后，' : min + ' 分钟后，') + tail;
    return el;
  }

  /* 「记忆已收录」系统小气泡：把刚记下的那句话摊开给你看 ——
     📥 记忆已收录 · 重要度 5 · 情感：喜欢草莓 */
  const MEM_META = {
    like:  { k: '情感', w: 5 },
    name:  { k: '称呼', w: 4 },
    note:  { k: '叮嘱', w: 3 },
    place: { k: '地点', w: 3 },
  };
  function memBubble(mem) {
    const meta = MEM_META[mem.type] || { k: '记下', w: 3 };
    const body = String(mem.text || '').replace(/^你(喜欢|爱|讨厌|不喜欢|怕)/, '$1');
    const el = document.createElement('div');
    el.className = 'sys-note mem-pill';
    el.innerHTML =
      '<span class="mn-ic" aria-hidden="true">📥</span>' +
      '<span class="mn-t">' +
        '<b>记忆已收录</b>' +
        '<span class="mn-meta">重要度 ' + meta.w + ' · ' + meta.k + '：' + body + '</span>' +
      '</span>';
    return el;
  }

  function send(text) {
    const t = (text || '').trim();
    if (!t || busy) return;

    // 隔了多久才回 —— 记在消息上，重放历史时还在
    const prev = S.chat.filter((m) => m.ts).slice(-1)[0];
    const gapMin = prev ? Math.round((Date.now() - prev.ts) / 60000) : 0;
    lastGapMin = gapMin;
    if (gapMin >= 30) stream.appendChild(gapNote(gapMin));

    clearKind('continuation');            // 你回话了，续话闹钟取消
    // 你写的 *动作* /（动作）也按同一套渲染：正文归正文，动作单独一行斜体
    const mine = splitAction(t);
    appendMessage({
      role: 'me',
      text: mine.text || (mine.action ? '' : t),
      action: mine.action,
      ts: Date.now(),
      gap: gapMin >= 30 ? gapMin : 0,
    }, true);

    const mem = P.extractMemory(t);
    if (mem) {
      const facts = S.memory.facts || [];
      if (!facts.includes(mem.text) && facts.length < 40) {
        S.memory.facts.push(mem.text);
        save(KEY.memory, S.memory);
        // 记下了就在对话里回你一个玻璃小气泡，让你看见他记住了什么
        stream.appendChild(memBubble(mem));
        scrollDown();
        renderHomeMemories();
      }
    }

    input.value = '';
    autosize();
    updateSendState();
    stickToBottom = true;
    respond(t);
  }

  function autosize() {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 120) + 'px';
  }
  function updateSendState() {
    sendBtn.disabled = !input.value.trim() || busy;
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!busy) send(input.value);
  });
  input.addEventListener('input', () => { autosize(); updateSendState(); });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
      if (!S.chatUI.enterSend) return;   // 关掉回车发送：回车就是换行
      e.preventDefault();
      if (!busy) send(input.value);
    }
  });

  stream.addEventListener('scroll', () => { stickToBottom = nearBottom(); }, { passive: true });

  function renderChips() {
    const quick = $('quick');
    quick.innerHTML = '';
    const h = new Date().getHours();
    const list = (h >= 22 || h < 5)
      ? ['还没睡？', '有点想你', '今天糟透了', '晚安']
      : ['在干嘛', '我回来了', '今天好累', '想你', '晚安'];
    list.forEach((t) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip';
      b.textContent = t;
      b.addEventListener('click', () => send(t));
      quick.appendChild(b);
    });
  }


  /* ---------------- 相册 + 朋友圈 ----------------
     数据在 life.photos / life.moments；空态文案用家机种子给的。
     图片压到 900px/JPEG 再进 localStorage（纯前端没别的地方放）。 */

  function emptyTextOf(key, fb) {
    const et = S.settings.emptyText || {};
    return et[key] || fb;
  }

  function compressImage(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => {
        const img = new Image();
        img.onload = () => {
          const max = 900;
          const scale = Math.min(1, max / Math.max(img.width, img.height));
          const c = document.createElement('canvas');
          c.width = Math.max(1, Math.round(img.width * scale));
          c.height = Math.max(1, Math.round(img.height * scale));
          c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
          resolve(c.toDataURL('image/jpeg', 0.72));
        };
        img.onerror = () => reject(new Error('读不了'));
        img.src = r.result;
      };
      r.onerror = () => reject(new Error('读不了'));
      r.readAsDataURL(file);
    });
  }

  function saveLife() {
    try {
      save(KEY.life, S.life);
      return true;
    } catch (_) { return false; }   // 存满了
  }

  /* ---------------- 相册 + 朋友圈 ----------------
     数据在 life.photos / life.moments；空态文案用家机种子给的。
     图片压到 900px/JPEG 再进 localStorage（纯前端没别的地方放）。
     相册内置三种相框（拍立得/手账/简约），背面能写备注，能按日历找。 */

  const ALBUM_STYLES = ['polaroid', 'journal', 'plain'];
  const ALBUM_STYLE_NAME = { polaroid: '拍立得', journal: '手账', plain: '简约' };
  let albumCalMonth = null;   // 日历当前显示的月份（Date，1 号）
  let albumFilter = null;     // 'YYYY-MM-DD' 或 null
  let albumStyle = null;      // 'polaroid' | 'journal' | 'plain' | null

  function emptyTextOf(key, fb) {
    const et = S.settings.emptyText || {};
    return et[key] || fb;
  }

  function compressImage(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => {
        const img = new Image();
        img.onload = () => {
          const max = 900;
          const scale = Math.min(1, max / Math.max(img.width, img.height));
          const c = document.createElement('canvas');
          c.width = Math.max(1, Math.round(img.width * scale));
          c.height = Math.max(1, Math.round(img.height * scale));
          c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
          resolve(c.toDataURL('image/jpeg', 0.72));
        };
        img.onerror = () => reject(new Error('读不了'));
        img.src = r.result;
      };
      r.onerror = () => reject(new Error('读不了'));
      r.readAsDataURL(file);
    });
  }

  function saveLife() {
    try {
      save(KEY.life, S.life);
      return true;
    } catch (_) { return false; }   // 存满了
  }

  function dayStr(ts) {
    const d = new Date(ts);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  /* ---- 日历找：有照片的日子标点，点日期只看那天的 ---- */
  function renderAlbumCal() {
    const cal = $('albumCal');
    if (!cal || cal.hidden) return;
    if (!albumCalMonth) albumCalMonth = new Date();
    const y = albumCalMonth.getFullYear();
    const m = albumCalMonth.getMonth();
    $('acalTitle').textContent = y + ' 年 ' + (m + 1) + ' 月';

    const counts = {};
    (S.life.photos || []).forEach((p) => {
      const k = dayStr(p.ts);
      counts[k] = (counts[k] || 0) + 1;
    });

    const box = $('acalDays');
    box.innerHTML = '';
    const first = new Date(y, m, 1);
    const lead = (first.getDay() + 6) % 7;            // 周一开头
    const days = new Date(y, m + 1, 0).getDate();
    for (let i = 0; i < lead; i++) box.appendChild(document.createElement('span'));
    for (let d = 1; d <= days; d++) {
      const key = y + '-' + String(m + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0');
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = d;
      if (counts[key]) b.classList.add('has');
      if (albumFilter === key) b.classList.add('on');
      b.addEventListener('click', () => {
        albumFilter = albumFilter === key ? null : key;
        renderAlbumCal();
        renderAlbum();
      });
      box.appendChild(b);
    }
  }

  function renderAlbum() {
    const grid = $('albumGrid');
    const hint = $('albumHint');
    const all = S.life.photos || [];

    // 分类药丸：按相框样式筛选（和日历日期筛选叠加）
    const cats = $('albumCats');
    if (cats) {
      cats.innerHTML = '';
      const mk = (key, label, n) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'cat-pill' + ((albumStyle || null) === key ? ' on' : '');
        b.textContent = label + ' ' + n;
        b.addEventListener('click', () => {
          albumStyle = albumStyle === key ? null : key;
          renderAlbum();
        });
        cats.appendChild(b);
      };
      mk(null, '全部', all.length);
      ALBUM_STYLES.forEach((k) => {
        mk(k, ALBUM_STYLE_NAME[k] || k, all.filter((x) => (ALBUM_STYLES.indexOf(x.st) >= 0 ? x.st : 'plain') === k).length);
      });
    }

    let list = all;
    if (albumFilter) list = list.filter((p) => dayStr(p.ts) === albumFilter);
    if (albumStyle) list = list.filter((p) => (ALBUM_STYLES.indexOf(p.st) >= 0 ? p.st : 'plain') === albumStyle);
    if (recSearchTerm) list = list.filter((p) => ((p.cap || '').toLowerCase().includes(recSearchTerm)) || dayStr(p.ts).includes(recSearchTerm));
    if (hint) {
      hint.hidden = false;
      hint.textContent = albumFilter
        ? albumFilter.slice(5).replace('-', ' 月 ') + ' 日 · ' + list.length + ' 张 · 再点日历取消'
        : (all.length ? all.length + ' 张' : emptyTextOf('photos', '第一张图放这儿'));
    }
    if (!grid) return;
    grid.innerHTML = '';
    list.forEach((p, idx) => {
      const st = ALBUM_STYLES.indexOf(p.st) >= 0 ? p.st : 'plain';
      const cell = document.createElement('figure');
      cell.className = 'album-cell st-' + st + (idx % 2 ? ' tilt-r' : ' tilt-l');

      const frame = document.createElement('div');
      frame.className = 'photo-frame';

      // 正面：照片 + 日期
      const front = document.createElement('div');
      front.className = 'face front';
      const img = document.createElement('img');
      img.src = p.img;
      img.alt = p.cap || '照片';
      img.loading = 'lazy';
      front.appendChild(img);
      const cap = document.createElement('figcaption');
      const d = new Date(p.ts);
      cap.textContent = (d.getMonth() + 1) + '月' + d.getDate() + '日' + (p.cap ? ' · ' + p.cap : '');
      front.appendChild(cap);
      frame.appendChild(front);

      // 背面：备注（写在照片背面）
      const back = document.createElement('div');
      back.className = 'face back';
      const bl = document.createElement('p');
      bl.className = 'back-label';
      bl.textContent = '背面';
      const ta = document.createElement('textarea');
      ta.rows = 3;
      ta.maxLength = 120;
      ta.placeholder = '写点什么，只给以后翻到的人看…';
      ta.value = p.note || '';
      ta.addEventListener('click', (e) => e.stopPropagation());
      ta.addEventListener('keydown', (e) => e.stopPropagation());
      const bb = document.createElement('button');
      bb.type = 'button';
      bb.className = 'back-save';
      bb.textContent = '存好，翻回去';
      bb.addEventListener('click', (e) => {
        e.stopPropagation();
        p.note = ta.value.trim();
        saveLife();
        frame.classList.remove('flipped');
        toast('写好在背面了');
      });
      back.appendChild(bl);
      back.appendChild(ta);
      back.appendChild(bb);
      frame.appendChild(back);

      cell.appendChild(frame);

      // 样式条：换样式 / 翻面 / 删除
      const ops = document.createElement('div');
      ops.className = 'album-ops';
      ALBUM_STYLES.forEach((s) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.textContent = ALBUM_STYLE_NAME[s];
        if (s === st) b.classList.add('on');
        b.addEventListener('click', (e) => {
          e.stopPropagation();
          p.st = s;
          saveLife();
          renderAlbum();
        });
        ops.appendChild(b);
      });
      const flipBtn = document.createElement('button');
      flipBtn.type = 'button';
      flipBtn.textContent = '翻面';
      flipBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        frame.classList.add('flipped');
      });
      ops.appendChild(flipBtn);
      const del = document.createElement('button');
      del.type = 'button';
      del.className = 'album-del';
      del.textContent = '收起来';
      del.addEventListener('click', (e) => {
        e.stopPropagation();
        if (del.classList.contains('confirm')) {
          const i = S.life.photos.indexOf(p);
          if (i >= 0) S.life.photos.splice(i, 1);
          saveLife();
          renderAlbum();
          toast('收起来了');
        } else {
          del.classList.add('confirm');
          del.textContent = '再点一下';
          setTimeout(() => { del.classList.remove('confirm'); del.textContent = '收起来'; }, 2600);
        }
      });
      ops.appendChild(del);
      cell.appendChild(ops);

      cell.addEventListener('click', () => {
        if (frame.classList.contains('flipped')) return;   // 背面写字时不动
        const open = cell.classList.toggle('show-ops');
        if (open) {
          document.querySelectorAll('.album-cell.show-ops').forEach((n) => {
            if (n !== cell) n.classList.remove('show-ops');
          });
        }
      });
      grid.appendChild(cell);
    });
  }

  function addPhoto(file) {
    if (!file) return;
    toast('在收进来…');
    compressImage(file).then((data) => {
      S.life.photos.unshift({ id: 'ph' + Date.now(), img: data, cap: '', ts: Date.now(), st: 'polaroid', note: '' });
      if (S.life.photos.length > 36) S.life.photos = S.life.photos.slice(0, 36);
      albumFilter = null;                    // 新照片是今天的，别让旧筛选把它藏了
      if (!saveLife()) {
        S.life.photos.shift();
        saveLife();
        toast('相册满了，删几张再放');
      } else toast('放进相册了');
      renderAlbumCal();
      renderAlbum();
    }).catch(() => toast('这张读不了'));
  }



  function renderMoments() {
    const list = $('momentList');
    const hint = $('momentsHint');
    const items = S.life.moments || [];
    const src = recSearchTerm ? items.filter((m) => (m.text || '').toLowerCase().includes(recSearchTerm)) : items;
    if (hint) {
      hint.hidden = !!items.length;
      hint.textContent = emptyTextOf('moments', '没发过，发一条试试');
    }
    if (!list) return;
    list.innerHTML = '';
    src.slice().reverse().forEach((mo) => {
      const card = document.createElement('section');
      card.className = 'glass moment-card';

      const head = document.createElement('div');
      head.className = 'moment-head';
      const ava = document.createElement('div');
      ava.className = 'pair-ava tiny partner';
      const as = document.createElement('span');
      as.textContent = (S.memory.userName || '我').slice(0, 1);
      ava.appendChild(as);
      const nm = document.createElement('p');
      nm.className = 'moment-name';
      nm.textContent = S.memory.userName || '我';
      head.appendChild(ava);
      head.appendChild(nm);
      card.appendChild(head);

      if (mo.text) {
        const tx = document.createElement('p');
        tx.className = 'moment-text';
        tx.textContent = mo.text;
        card.appendChild(tx);
      }
      if (mo.img) {
        const im = document.createElement('img');
        im.className = 'moment-img';
        im.src = mo.img;
        im.loading = 'lazy';
        card.appendChild(im);
      }

      const foot = document.createElement('div');
      foot.className = 'moment-foot';
      const d = new Date(mo.ts);
      foot.textContent = (d.getMonth() + 1) + '月' + d.getDate() + '日 ' + hhmm(mo.ts);
      card.appendChild(foot);

      if (mo.reply) {
        const rp = document.createElement('div');
        rp.className = 'moment-reply';
        rp.textContent = partnerName() + '：' + mo.reply;
        card.appendChild(rp);
      }

      const del = document.createElement('button');
      del.type = 'button';
      del.className = 'moment-del';
      del.textContent = '删掉';
      del.addEventListener('click', () => {
        if (del.classList.contains('confirm')) {
          const i = S.life.moments.indexOf(mo);
          if (i >= 0) S.life.moments.splice(i, 1);
          saveLife();
          renderMoments();
        } else {
          del.classList.add('confirm');
          del.textContent = '再点一下确认';
          setTimeout(() => { del.classList.remove('confirm'); del.textContent = '删掉'; }, 2600);
        }
      });
      card.appendChild(del);

      list.appendChild(card);
    });
  }

  let momentImg = '';
  function postMoment() {
    const t = ($('momentText').value || '').trim();
    if (!t && !momentImg) { toast('写点什么，或配张图'); return; }
    const mo = { id: 'mo' + Date.now(), text: t, img: momentImg, ts: Date.now(), reply: '', replyTs: 0 };
    S.life.moments.push(mo);
    if (!saveLife()) {
      S.life.moments.pop();
      toast('存满了，删点旧的');
      return;
    }
    $('momentText').value = '';
    momentImg = '';
    const pv = $('momentPreview');
    if (pv) pv.hidden = true;
    renderMoments();
    partnerReactToMoment(mo);
  }

  /* 他刷到你的朋友圈，隔一会儿在下面回一句 */
  function partnerReactToMoment(mo) {
    const done = (r) => {
      mo.reply = r;
      mo.replyTs = Date.now();
      saveLife();
      renderMoments();
      if (currentPage !== 'records') addBadge('moments');
    };
    const pending = () => {
      const cards = [...document.querySelectorAll('.moment-card')];
      const rp = cards.length ? cards[0].querySelector('.moment-reply') : null;
      if (rp) rp.hidden = false;
    };
    if (LLM.configured(S.settings)) {
      pending();
      const messages = [
        { role: 'system', content: '你是' + partnerName() + '。他发了一条朋友圈，你刷到了。用一两句话回应，像在朋友圈下面评论：口语、短、中文，不要客套，不要夸夸。' },
        { role: 'user', content: (mo.text || '（一张图）') },
      ];
      let acc = '';
      LLM.stream({ cfg: S.settings, messages, onDelta: (d) => { acc += d; } }).then(() => {
        const clean = stripMarksSync(acc).text.trim();
        done(clean || '看到了。');
      }).catch(() => done(localMomentReply(mo.text)));
    } else {
      setTimeout(pending, 900);
      setTimeout(() => done(localMomentReply(mo.text)), 2200 + Math.random() * 1800);
    }
  }

  function localMomentReply() {
    const night = new Date().getHours() >= 22 || new Date().getHours() < 5;
    const pool = night
      ? ['这么晚还不睡。', '看到了。去睡。']
      : ['看到了。', '嗯，记下了。', '挺好的。', '这个要收进心里。', '嗯，我在看。', '今天也辛苦了。'];
    return pool[Math.floor(Math.random() * pool.length)];
  }

  /* 绑定：相册上传 + 日历找 + 朋友圈 composer */
  const btnAddPhoto = $('btnAddPhoto');
  if (btnAddPhoto) {
    btnAddPhoto.addEventListener('click', () => $('photoFile').click());
    $('photoFile').addEventListener('change', (e) => {
      const f = e.target.files && e.target.files[0];
      addPhoto(f);
      e.target.value = '';
    });
  }
  const btnAlbumCal = $('btnAlbumCal');
  if (btnAlbumCal) {
    btnAlbumCal.addEventListener('click', () => {
      const cal = $('albumCal');
      cal.hidden = !cal.hidden;
      if (!cal.hidden) renderAlbumCal();
      else if (albumFilter) { albumFilter = null; renderAlbum(); }
    });
    $('acalPrev').addEventListener('click', () => {
      albumCalMonth = new Date(albumCalMonth.getFullYear(), albumCalMonth.getMonth() - 1, 1);
      renderAlbumCal();
    });
    $('acalNext').addEventListener('click', () => {
      albumCalMonth = new Date(albumCalMonth.getFullYear(), albumCalMonth.getMonth() + 1, 1);
      renderAlbumCal();
    });
  }
  const momentPhotoBtn = $('momentPhoto');
  if (momentPhotoBtn) {
    momentPhotoBtn.addEventListener('click', () => $('momentFile').click());
    $('momentFile').addEventListener('change', (e) => {
      const f = e.target.files && e.target.files[0];
      if (!f) return;
      compressImage(f).then((data) => {
        momentImg = data;
        const pv = $('momentPreview');
        pv.src = data;
        pv.hidden = false;
      }).catch(() => toast('这张读不了'));
      e.target.value = '';
    });
    $('momentSend').addEventListener('click', postMoment);
  }

  /* ---------------- 主动消息 ---------------- */

  const WAKE_DEFAULT = { enabled: true, rate: 'normal', quietStart: '23:00', quietEnd: '08:00' };

  function wakeCfg() {
    return Object.assign({}, WAKE_DEFAULT, S.settings.wake || {});
  }

  function inQuiet(cfg, ts) {
    const d = new Date(ts);
    const cur = d.getHours() * 60 + d.getMinutes();
    const toMin = (v) => {
      const p = String(v || '0:0').split(':');
      return (Number(p[0]) || 0) * 60 + (Number(p[1]) || 0);
    };
    const a = toMin(cfg.quietStart);
    const b = toMin(cfg.quietEnd);
    return a <= b ? (cur >= a && cur < b) : (cur >= a || cur < b);
  }

  function maybeInitiate() {
    const cfg = wakeCfg();
    if (!cfg.enabled || busy || document.hidden) return;

    const gap = cfg.rate === 'often' ? 90000 : cfg.rate === 'rare' ? 420000 : 180000;
    if (Date.now() - lastInteract < gap) return;
    if (inQuiet(cfg, Date.now())) return;

    const p = cfg.rate === 'often' ? 0.55 : cfg.rate === 'rare' ? 0.18 : 0.35;
    if (Math.random() > p) return;

    const say = P.initiative(S.persona, Date.now());
    if (!say) return;

    speak(say.text, say.action);
    S.persona.energy = clamp(S.persona.energy - 0.6);
    S.persona.mood = clamp(S.persona.mood + 0.8);
    save(KEY.persona, S.persona);
    lastInteract = Date.now() - Math.round(gap * 0.6);
  }

  setInterval(maybeInitiate, 45000);

  /* ================= 内部闹钟（续话） =================
     检测到 [[续话]] 就起一个 5 分钟的闹钟：五分钟内你回话了就取消，
     没回就到点他自己开口。
     说明白：页面关掉/手机息屏时浏览器会冻住，定时器不跑也不补跑，
     所以真实表现是"他惦记着，等你回来"，不是"五分钟后他准点来"。      */
  const CONTINUE_MS = 5 * 60 * 1000;
  const CONTINUE_LINES = [
    '刚才那句，我不是那个意思。',
    '还在吗。',
    '我不想跟你吵。',
    '你要是不想说，就先不说。我在。',
    '刚刚我想了想。可能我还是没接住你。',
  ];

  let timerHandle = 0;

  function saveTimers() { save(KEY.timers, S.timers); }

  function armContinuation() {
    const now = Date.now();
    const old = S.timers.filter((t) => t.kind === 'continuation' && t.state === 'armed')[0];
    if (old) return;                                  // 已经挂着就别叠
    S.timers.push({ id: 'c' + now, kind: 'continuation', fireAt: now + CONTINUE_MS, createdAt: now, state: 'armed', tries: 0 });
    saveTimers();
    scheduleNext();
  }

  function clearKind(kind) {
    const before = S.timers.length;
    S.timers = S.timers.filter((t) => !(t.kind === kind && t.state === 'armed'));
    if (S.timers.length !== before) { saveTimers(); scheduleNext(); }
  }

  function scheduleNext() {
    if (timerHandle) { clearTimeout(timerHandle); timerHandle = 0; }
    const next = S.timers.filter((t) => t.state === 'armed').sort((a, b) => a.fireAt - b.fireAt)[0];
    if (!next) return;
    const left = Math.max(300, next.fireAt - Date.now());
    timerHandle = setTimeout(() => fireTimer(next.id), left);
  }

  /** 免打扰不是丢弃，是顺延到静默结束 */
  function nextAwake(ts) {
    const cfg = wakeCfg();
    const d = new Date(ts);
    const p = String(cfg.quietEnd || '8:0').split(':');
    const target = new Date(d.getFullYear(), d.getMonth(), d.getDate(), Number(p[0]) || 0, Number(p[1]) || 0);
    if (target.getTime() <= ts) target.setDate(target.getDate() + 1);
    return target.getTime();
  }

  function fireTimer(id) {
    timerHandle = 0;
    const t = S.timers.filter((x) => x.id === id)[0];
    if (!t || t.state !== 'armed') { scheduleNext(); return; }

    const now = Date.now();
    if (busy || document.hidden) {                    // 正忙/后台：等一会儿再说
      t.tries = (t.tries || 0) + 1;
      if (t.tries > 3) { t.state = 'dropped'; saveTimers(); scheduleNext(); return; }
      t.fireAt = now + 15000;
      saveTimers();
      scheduleNext();
      return;
    }
    if (inQuiet(wakeCfg(), now)) {                    // 免打扰：顺延
      t.fireAt = nextAwake(now);
      saveTimers();
      scheduleNext();
      return;
    }
    if (!wakeCfg().enabled) { t.state = 'dropped'; saveTimers(); scheduleNext(); return; }

    t.state = 'fired';
    t.firedAt = now;
    saveTimers();

    // 到点现取一句，不用五分钟前的原话
    const line = CONTINUE_LINES[Math.floor(Math.random() * CONTINUE_LINES.length)];
    speak(line, '沉默了一会儿');
    pushDayLog('惦记着刚才那句，又开口了', 'continue', false);
    lastInteract = Date.now();                        // 别让主动说话紧跟一句，像复读
  }

  /** 刷新/回到前台后把没响的闹钟接回来 */
  function restoreTimers() {
    const now = Date.now();
    S.timers = (S.timers || []).filter((t) => t && t.state === 'armed');
    const t = S.timers.sort((a, b) => a.fireAt - b.fireAt)[0];
    if (!t) { saveTimers(); return; }
    if (now - t.fireAt > 90 * 60000) {                // 太旧了，别拿陈年旧账打扰
      S.timers = S.timers.filter((x) => x.id !== t.id);
      saveTimers();
      scheduleNext();
      return;
    }
    if (now >= t.fireAt) {
      // 已经过了点：补一句，但话术要说得像"你回来了"而不是掐表报时
      t.state = 'fired';
      t.firedAt = now;
      saveTimers();
      return;
    }
    saveTimers();
    scheduleNext();
  }

  window.addEventListener('pageshow', restoreTimers);
  window.addEventListener('focus', restoreTimers);

  /* ---------------- 情绪：一键选词 ---------------- */

  const MOOD_DELTA = { 平静: 0, 想你: 6, 有点累: -8, 还不错: 8, 有点烦: -10, 空: -3 };
  const MOOD_ECHO = {
    平静: '嗯，那就安静一会儿。',
    想你: '我在。',
    有点累: '那就别撑了，先靠一会儿。',
    还不错: '挺好。那就保持。',
    有点烦: '烦就烦，不用装没事。',
    空: '空着也行。我陪你坐会儿。',
  };

  const moodPicker = $('moodPicker');

  function paintMoodPicker() {
    if (!moodPicker) return;
    const word = (S.moodLog || {})[todayStr()];
    Array.prototype.forEach.call(moodPicker.children, (b) => {
      b.classList.toggle('on', b.dataset.mood === word);
    });
  }

  function pickMood(word) {
    if (!word) return;

    S.moodLog = S.moodLog || {};
    S.moodLog[todayStr()] = word;
    save(KEY.mood, S.moodLog);

    S.persona.mood = clamp(S.persona.mood + (MOOD_DELTA[word] || 0));
    S.persona.lastTick = Date.now();
    save(KEY.persona, S.persona);

    paintMoodPicker();

    const echo = $('moodEcho');
    if (echo) {
      echo.hidden = false;
      echo.textContent = MOOD_ECHO[word] || '记下了。';
      echo.style.animation = 'none';
      void echo.offsetWidth;
      echo.style.animation = '';
    }

    renderMood();
    updateMainMeta();
    tickClocks();
  }

  if (moodPicker) {
    moodPicker.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-mood]');
      if (btn) pickMood(btn.dataset.mood);
    });
  }

  /* ---------------- 设置 ---------------- */

  function syncSettingsForm() {
    $('setUserName').value = S.memory.userName || '';
    $('setPartnerName').value = S.memory.partnerName || '宋祁';
    $('setStartDate').value = S.memory.startDate || todayStr();
    $('setApiBase').value = S.settings.apiBase || '';
    $('setModel').value = S.settings.model || '';
    $('setApiKey').value = S.settings.apiKey || '';
    $('toggleLLM').setAttribute('aria-checked', String(!!S.settings.enabled));

    const cfg = wakeCfg();
    $('toggleWake').setAttribute('aria-checked', String(cfg.enabled));
    $('wakeRate').value = cfg.rate;
    $('wakeQuietStart').value = cfg.quietStart;
    $('wakeQuietEnd').value = cfg.quietEnd;

    setTxt('modelStatus', LLM.configured(S.settings) ? '已接入' : '未接入');
    setTxt('partnerTagModel', LLM.configured(S.settings) ? '已接模型' : '未接模型');

    syncAppearance();   // 明暗 / 字体分段控件的高亮
  }

  /* 主动说话的三个旋钮 */
  function patchWake(patch) {
    S.settings.wake = Object.assign(wakeCfg(), patch);
    save(KEY.settings, S.settings);
  }

  $('toggleWake').addEventListener('click', (e) => {
    const on = e.currentTarget.getAttribute('aria-checked') !== 'true';
    e.currentTarget.setAttribute('aria-checked', String(on));
    patchWake({ enabled: on });
    toast(on ? '他会主动找你了' : '他安静了，只在你说话时出现');
  });

  $('wakeRate').addEventListener('change', (e) => {
    patchWake({ rate: e.target.value });
  });

  $('wakeQuietStart').addEventListener('change', (e) => {
    patchWake({ quietStart: e.target.value || '23:00' });
  });

  $('wakeQuietEnd').addEventListener('change', (e) => {
    patchWake({ quietEnd: e.target.value || '08:00' });
  });

  $('setUserName').addEventListener('change', (e) => {
    S.memory.userName = e.target.value.trim();
    save(KEY.memory, S.memory);
    renderCards();
  });
  $('setPartnerName').addEventListener('change', (e) => {
    S.memory.partnerName = e.target.value.trim() || '宋祁';
    save(KEY.memory, S.memory);
    renderCards();
  });
  $('setStartDate').addEventListener('change', (e) => {
    S.memory.startDate = e.target.value || todayStr();
    save(KEY.memory, S.memory);
    renderCards();
  });
  $('setApiBase').addEventListener('change', (e) => {
    S.settings.apiBase = e.target.value.trim();
    save(KEY.settings, S.settings);
  });
  $('setModel').addEventListener('change', (e) => {
    S.settings.model = e.target.value.trim();
    save(KEY.settings, S.settings);
  });
  $('setApiKey').addEventListener('change', (e) => {
    S.settings.apiKey = e.target.value.trim();
    save(KEY.settings, S.settings);
  });

  $('toggleLLM').addEventListener('click', (e) => {
    S.settings.enabled = !S.settings.enabled;
    e.currentTarget.setAttribute('aria-checked', String(S.settings.enabled));
    save(KEY.settings, S.settings);
    setTxt('modelStatus', LLM.configured(S.settings) ? '已接入' : '未接入');
    setTxt('partnerTagModel', LLM.configured(S.settings) ? '已接模型' : '未接模型');
    if (S.settings.enabled && !LLM.configured(S.settings)) toast('再把地址、模型和 Key 填上才生效');
    else if (S.settings.enabled) toast('已接入，他换一种方式说话');
  });

  /* ---- 明暗 / 字体：两个分段控件，点了马上换、落盘、刷新保留 ---- */
  function bindSegAppear(id, key) {
    const seg = $(id);
    if (!seg) return;
    seg.querySelectorAll('button').forEach((b) => {
      b.addEventListener('click', () => {
        patchAppearance({ [key]: b.dataset.v });
        toast(key === 'theme'
          ? (b.dataset.v === 'dark' ? '深色了' : '浅色了')
          : (b.dataset.v === 'sans' ? '换无衬线了' : '换衬线了'));
      });
    });
  }
  bindSegAppear('segTheme', 'theme');
  bindSegAppear('segFont', 'font');

  /* ---------------- 记忆 ---------------- */

  /* ============================================================
     花 FLOWER：日记 / 信 / 待办
     · 日记 S.life.diary  [{id,text,ts}]   ← 新开（之前没有独立日记）
     · 信   S.life.mails  [{id,from,text,at}] ← 既有数据，只读预览
     · 待办 S.life.todos  [{id,text,done,due}] ← 既有数据，可勾可加
     ============================================================ */
  function lifeList(key) {
    if (!Array.isArray(S.life[key])) S.life[key] = [];
    return S.life[key];
  }
  const FL_MO = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  function flDay(ts) {
    const d = new Date(ts || 0);
    if (isNaN(d.getTime())) return '—';
    return FL_MO[d.getMonth()] + ' ' + d.getDate();
  }
  function flClock(ts) {
    const d = new Date(ts || 0);
    if (isNaN(d.getTime())) return '';
    return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  }

  /* 一条记录：细线一行（日期 · 时间 / 正文 / 类型） */
  function flRow(o) {
    const li = document.createElement('li');
    li.className = 'fl-item' + (o.done ? ' is-done' : '');
    const when = document.createElement('p');
    when.className = 'fl-when';
    when.textContent = o.when || '';
    if (o.tag) {
      const t = document.createElement('em');
      t.textContent = o.tag;
      when.appendChild(t);
    }
    li.appendChild(when);
    const tx = document.createElement('p');
    tx.className = 'fl-text';
    tx.textContent = o.text || '';
    li.appendChild(tx);
    if (o.onDelete) {
      const del = document.createElement('button');
      del.type = 'button';
      del.className = 'fl-del';
      del.setAttribute('aria-label', '删掉这条');
      del.textContent = '×';
      del.addEventListener('click', (e) => { e.stopPropagation(); o.onDelete(); });
      li.appendChild(del);
    }
    if (o.onClick) {
      li.classList.add('tap');
      li.tabIndex = 0;
      li.addEventListener('click', o.onClick);
      li.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); o.onClick(); }
      });
    }
    return li;
  }
  function fillFl(id, rows) {
    const ul = $(id);
    if (!ul) return;
    ul.innerHTML = '';
    rows.forEach((r) => ul.appendChild(r));
  }

  /* 日记 */
  function renderDiary() {
    const all = lifeList('diary');
    const q = recSearchTerm;
    const src = q ? all.filter((d) => (d.text || '').toLowerCase().includes(q)) : all;
    const rows = src.slice().sort((a, b) => (b.ts || 0) - (a.ts || 0)).map((d) => flRow({
      when: flDay(d.ts) + ' · ' + flClock(d.ts),
      text: d.text,
      onDelete: () => {
        const i = S.life.diary.indexOf(d);
        if (i >= 0) S.life.diary.splice(i, 1);
        save(KEY.life, S.life);
        renderDiary();
        renderFlowerAll();
      },
    }));
    fillFl('flDiary', rows);
    const em = $('flDiaryEmpty');
    if (em) em.hidden = rows.length > 0;
  }

  /* 信：只读预览，点开去「之间」读全文 */
  function renderLetters() {
    const all = (S.life.mails || []).slice();
    const q = recSearchTerm;
    const src = q ? all.filter((m) => (m.text || '').toLowerCase().includes(q)) : all;
    const rows = src.slice().reverse().map((m) => flRow({
      when: m.at ? flDay(Date.parse(m.at)) : '—',
      tag: m.from || '',
      text: (m.text || '').replace(/\s+/g, ' ').slice(0, 72),
      onClick: () => openPage('cards'),
    }));
    fillFl('flLetters', rows);
    const em = $('flLettersEmpty');
    if (em) em.hidden = rows.length > 0;
  }

  /* 待办：可勾、可加 */
  function renderTasks() {
    const all = lifeList('todos');
    const q = recSearchTerm;
    const src = q ? all.filter((t) => (t.text || '').toLowerCase().includes(q)) : all;
    const rows = src.slice().sort((a, b) => Number(!!a.done) - Number(!!b.done)).map((t) => {
      const li = flRow({
        when: t.due ? t.due.replace(/-/g, '.') : '随时',
        text: t.text,
        done: !!t.done,
      });
      li.classList.add('task');
      li.insertBefore((() => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'fl-check' + (t.done ? ' on' : '');
        b.setAttribute('aria-label', t.done ? '标记为未完成' : '标记为完成');
        b.addEventListener('click', (e) => {
          e.stopPropagation();
          t.done = !t.done;
          save(KEY.life, S.life);
          renderTasks();
          renderFlowerAll();
        });
        return b;
      })(), li.firstChild);
      return li;
    });
    fillFl('flTasks', rows);
    const em = $('flTasksEmpty');
    if (em) em.hidden = rows.length > 0;
  }

  /* 全部：日记 / 信 / 待办 混成一条时间线 */
  function renderFlowerAll() {
    const q = recSearchTerm;
    const diary = lifeList('diary');
    const mails = S.life.mails || [];
    const todos = lifeList('todos');

    setTxt('flStatDiary', String(diary.length));
    setTxt('flStatLetter', String(mails.length));
    setTxt('flStatTask', String(todos.filter((t) => !t.done).length));

    const items = [];
    diary.forEach((d) => items.push({
      ts: d.ts || 0, tag: 'DIARY', text: d.text, go: () => openPage('records', 'diary'),
    }));
    mails.forEach((m) => items.push({
      ts: Date.parse(m.at) || 0, tag: 'LETTER', text: (m.text || '').replace(/\s+/g, ' ').slice(0, 72),
      go: () => openPage('cards'),
    }));
    todos.forEach((t) => items.push({
      ts: t.due ? Date.parse(t.due) || 0 : 0, tag: 'TASK',
      text: (t.done ? '✓ ' : '') + t.text, go: () => openPage('records', 'tasks'),
    }));

    const src = q ? items.filter((i) => (i.text || '').toLowerCase().includes(q)) : items;
    const rows = src.sort((a, b) => b.ts - a.ts).slice(0, 40).map((i) => flRow({
      when: i.ts ? flDay(i.ts) : '—',
      tag: i.tag,
      text: i.text,
      onClick: i.go,
    }));
    fillFl('flAll', rows);
    const em = $('flAllEmpty');
    if (em) em.hidden = rows.length > 0;
    renderFlowerHero();
  }

  /* 头图：今日大日期 + 拍立得预览 + 一句今日注脚 */
  function renderFlowerHero() {
    const dayEl = $('flHeroDay');
    if (!dayEl) return;
    /* 顶部胶囊 = 分段快捷入口：点了直接落到对应分段 */
    const tagBox = $('flHeroTags');
    if (tagBox && !tagBox.__wired) {
      tagBox.__wired = true;
      tagBox.addEventListener('click', (e) => {
        const b = e.target.closest('.fl-tag');
        if (!b) return;
        switchSeg('records', b.dataset.flseg);
      });
    }
    const now = new Date();
    setTxt('flHeroDay', String(now.getDate()));
    setTxt('flHeroMonth', (now.getMonth() + 1) + '月 · ' + MOON_DOW[now.getDay()]);

    /* 拍立得预览：最近三张有照片的日子 */
    const shots = $('flHeroShots');
    if (shots) {
      shots.innerHTML = '';
      const photos = (S.life.photos || []).filter((p) => p.img).slice(0, 3);
      if (!photos.length) {
        ['还没有照片', '去 MIRROR 翻旧照', '一起拍一张'].forEach((t) => {
          const ph = document.createElement('div');
          ph.className = 'fl-shot empty';
          ph.textContent = t;
          shots.appendChild(ph);
        });
      } else {
        photos.forEach((p, i) => {
          const fig = document.createElement('figure');
          fig.className = 'fl-shot';
          const img = document.createElement('img');
          img.src = p.img;
          img.alt = p.cap || '';
          const cap = document.createElement('figcaption');
          cap.textContent = p.cap || flDay(p.ts);
          fig.appendChild(img);
          fig.appendChild(cap);
          shots.appendChild(fig);
        });
      }
    }

    /* 今日注脚：今天写了多少、留了多少 */
    const diary = lifeList('diary');
    const mails = S.life.mails || [];
    const todos = lifeList('todos').filter((t) => !t.done);
    const k = todayStr();
    const todayDiary = diary.filter((d) => String(d.ts || '').slice(0, 10) === k ||
      new Date(d.ts || 0).toDateString() === now.toDateString()).length;
    const parts = [];
    if (todayDiary) parts.push('今天写了 ' + todayDiary + ' 篇');
    if (mails.length) parts.push('有 ' + mails.length + ' 封信没拆');
    if (todos.length) parts.push(todos.length + ' 件事还挂着');
    setTxt('flHeroNote', parts.length ? parts.join(' · ') : '空着也没关系，想起来再写。');
  }

  /* 足迹：最近 30 天，按当天聊天条数分三档 */
  function renderFootprint() {
    const strip = $('ftStrip');
    if (!strip) return;
    const cnt = {};
    (S.chat || []).forEach((m) => {
      const d = new Date(m.ts || 0);
      if (isNaN(d.getTime())) return;
      const k = d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
      cnt[k] = (cnt[k] || 0) + 1;
    });
    let total = 0;
    Object.keys(cnt).forEach((k) => { total += cnt[k]; });
    setTxt('ftTotal', String(Object.keys(cnt).length));
    setTxt('ftMsgs', String(total));

    strip.innerHTML = '';
    const today = new Date();
    const days = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
      const k = d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
      const n = cnt[k] || 0;
      days.push({ d, n, k });
      const bar = document.createElement('i');
      bar.className = 'ft-bar' + (n ? (n >= 20 ? ' l3' : n >= 6 ? ' l2' : ' l1') : '');
      bar.title = (d.getMonth() + 1) + '月' + d.getDate() + '日 · ' + (n ? n + ' 句' : '没说话');
      bar.style.height = n ? Math.min(26, 6 + Math.round(n / 2)) + 'px' : '3px';
      strip.appendChild(bar);
    }

    const rows = days.slice().reverse().filter((x) => x.n).slice(0, 8).map((x) => flRow({
      when: flDay(x.d.getTime()),
      tag: x.n >= 20 ? '很多' : x.n >= 6 ? '不少' : '',
      text: '说了 ' + x.n + ' 句',
      onClick: () => openPage('calendar'),
    }));
    fillFl('ftDays', rows);
  }

  /* 花 / 镜 的事件接线（DOM 已在页面里，这里一次性挂上） */
  (function wireFlower() {
    const dSend = $('diarySend');
    const dText = $('diaryText');
    if (dSend && dText) {
      const save1 = () => {
        const v = (dText.value || '').trim();
        if (!v) { dText.focus(); return; }
        lifeList('diary').push({ id: 'dy' + Date.now(), text: v, ts: Date.now() });
        save(KEY.life, S.life);
        dText.value = '';
        renderDiary();
        renderFlowerAll();
      };
      dSend.addEventListener('click', save1);
      dText.addEventListener('keydown', (e) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') save1();
      });
    }
    const tSend = $('taskSend');
    const tText = $('taskText');
    if (tSend && tText) {
      const add = () => {
        const v = (tText.value || '').trim();
        if (!v) { tText.focus(); return; }
        lifeList('todos').push({ id: 'td' + Date.now(), text: v, done: false, due: '' });
        save(KEY.life, S.life);
        tText.value = '';
        renderTasks();
        renderFlowerAll();
      };
      tSend.addEventListener('click', add);
      tText.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } });
    }
    const ftMore = $('ftMore');
    if (ftMore) ftMore.addEventListener('click', () => openPage('calendar'));
  })();

  function renderMemoryPage() {
    const ul = $('allMemories');
    if (!ul) return;
    const facts = S.memory.facts || [];
    const q = recSearchTerm;
    const src = q ? facts.filter((f) => (f || '').toLowerCase().includes(q)) : facts;

    $('memCount').textContent = facts.length;
    $('allMemoryHint').hidden = facts.length > 0;

    /* 环形进度：0 → 已记下的比例（上限按 40 条算） */
    const ring = $('memRing');
    if (ring) {
      const C = 2 * Math.PI * 26;
      const pct = Math.min(1, facts.length / 40);
      ring.style.strokeDasharray = C.toFixed(2);
      ring.style.strokeDashoffset = C.toFixed(2);
      requestAnimationFrame(() => {
        ring.style.strokeDashoffset = (C * (1 - pct)).toFixed(2);
      });
    }

    ul.innerHTML = '';
    src.slice().reverse().forEach((f) => {
      const idx = facts.indexOf(f);
      const li = document.createElement('li');
      const span = document.createElement('span');
      span.textContent = f;

      const del = document.createElement('button');
      del.type = 'button';
      del.setAttribute('aria-label', '删掉这条记忆');
      del.textContent = '×';
      del.addEventListener('click', () => {
        S.memory.facts.splice(idx, 1);
        save(KEY.memory, S.memory);
        renderMemoryPage();
        renderHomeMemories();
        renderMood();
      });

      li.appendChild(span);
      li.appendChild(del);
      ul.appendChild(li);
    });
  }

  /* 内联添加（心情页和记忆库页共用） */
  function inlineAddMemory(listEl, done) {
    if ($('memInput')) return;
    const wrap = document.createElement('div');
    wrap.className = 'mem-add';

    const inp = document.createElement('input');
    inp.id = 'memInput';
    inp.type = 'text';
    inp.placeholder = '例如：对芒果过敏';
    inp.maxLength = 60;
    inp.className = 'mem-input';

    const ok = document.createElement('button');
    ok.type = 'button';
    ok.textContent = '存';
    ok.className = 'text-btn';

    const commit = () => {
      const v = inp.value.trim();
      if (v) {
        S.memory.facts.push(v);
        save(KEY.memory, S.memory);
      }
      wrap.remove();
      done();
    };

    ok.addEventListener('click', commit);
    inp.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter') { ev.preventDefault(); commit(); }
      if (ev.key === 'Escape') wrap.remove();
    });

    wrap.appendChild(inp);
    wrap.appendChild(ok);
    listEl.before(wrap);
    inp.focus();
  }

  $('btnAddMemory').addEventListener('click', () => inlineAddMemory($('memories'), () => {
    renderMood();
    renderHomeMemories();
    renderMonthStats();
  }));

  $('btnAddMemory2').addEventListener('click', () => inlineAddMemory($('allMemories'), () => {
    renderMemoryPage();
    renderHomeMemories();
    renderMood();
    renderMonthStats();
  }));

  /* ---------------- 导入 / 导出 / 清空 ---------------- */

  $('btnExport').addEventListener('click', () => {
    const data = {
      app: 'home-companion',
      version: 2,
      exportedAt: new Date().toISOString(),
      chat: S.chat,
      persona: S.persona,
      memory: S.memory,
      moodLog: S.moodLog,           // 以前根本没导出，是个真 bug
      life: S.life,                 // 心事/念头/课程/倒数日/卡券/用量
      timers: S.timers,
      meta: S.meta,
      settings: Object.assign({}, S.settings, { apiKey: '' }),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = partnerName() + '-备份-' + todayStr() + '.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    toast('已导出（不含密钥）');
  });

  $('btnImport').addEventListener('click', () => $('importFile').click());

  $('importFile').addEventListener('change', (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const d = JSON.parse(reader.result);
        if (!Array.isArray(d.chat)) throw new Error('格式不对');
        if (!confirm('导入会覆盖当前记录，继续？')) return;
        S.chat = d.chat;
        if (d.persona) S.persona = P.evolve(d.persona, Date.now());
        if (d.memory) S.memory = Object.assign(S.memory, d.memory);
        // 深合并：老备份里没有的字段不能把现在的数据清空
        if (d.moodLog) S.moodLog = Object.assign({}, S.moodLog, d.moodLog);
        if (d.life) {
          S.life = Object.assign({}, S.life, d.life);
          const def = LIFE_DEFAULT();
          Object.keys(def).forEach((k) => { if (S.life[k] === undefined) S.life[k] = def[k]; });
        }
        S.timers = Array.isArray(d.timers) ? d.timers.filter((t) => t && t.state === 'armed') : S.timers;
        migrate();
        persistAll();
        renderBento();
        renderApps();
        renderHistory();
        renderCards();
        renderMood();
        tickClocks();
        restoreTimers();
        toast('导入完成');
      } catch (err) {
        toast('这个文件读不了');
      }
    };
    reader.readAsText(f);
    e.target.value = '';
  });

  $('btnReset').addEventListener('click', () => {
    if (!confirm('会删掉这段关系里的所有记录和记忆，且无法恢复。确定？')) return;
    Object.keys(KEY).forEach((k) => { try { localStorage.removeItem(KEY[k]); } catch (_) {} });
    try { localStorage.removeItem(TIDE_KEY); } catch (_) {}
    location.reload();
  });

  /* ---------------- 锁屏 ---------------- */

  const lock = $('lock');
  let lockDone = false;

  /** 锁屏那句会变的话 */
  function lockLine() {
    const h = new Date().getHours();
    const pool =
      (h >= 23 || h < 3) ? ['还没睡。', '灯还亮着。', '这个点，只剩我们两个醒着。'] :
      (h >= 3 && h < 6) ? ['快天亮了。', '你怎么还醒着。'] :
      (h >= 6 && h < 11) ? ['醒了没。', '早。今天也有光。'] :
      (h >= 11 && h < 14) ? ['吃饭了吗。', '中午了。'] :
      (h >= 14 && h < 18) ? ['下午最难熬。', '我在。'] :
      (h >= 18 && h < 22) ? ['回来了。', '天黑了。', '今天怎么样。'] :
      ['晚上好。', '等你说话。'];
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function unlock() {
    if (lockDone) return;
    lockDone = true;
    lock.style.transition = '';
    lock.style.transform = '';
    lock.style.opacity = '';
    markMoving(560);
    lock.classList.add('hidden');
    try { sessionStorage.setItem('hc.unlocked', '1'); } catch (_) {}
    setTimeout(() => { lock.style.display = 'none'; }, 520);

    // 解锁的获得感：他先开口
    setTimeout(() => {
      if (Date.now() - lastInteract < 8 * 60000) return;
      const say = P.initiative(S.persona, Date.now());
      if (say) speak(say.text, say.action);
    }, 1000);
  }

  /* 上划跟手：手指走到哪，锁屏退到哪 */
  let lockG = null;
  lock.addEventListener('pointerdown', (e) => {
    if (lockDone) return;
    lockG = { y0: e.clientY, dy: 0, t0: performance.now() };
    lock.style.transition = 'none';
    try { lock.setPointerCapture(e.pointerId); } catch (_) {}
  });

  lock.addEventListener('pointermove', (e) => {
    if (!lockG) return;
    const dy = Math.min(0, e.clientY - lockG.y0);
    lockG.dy = dy;
    lock.style.transform = 'translate3d(0,' + dy + 'px,0)';
    lock.style.opacity = String(Math.max(0.1, 1 + dy / 420));
  });

  const lockEnd = () => {
    if (!lockG) return;
    const dy = lockG.dy;
    const v = dy / Math.max(1, performance.now() - lockG.t0);
    lockG = null;
    lock.style.transition = '';
    lock.style.transform = '';
    lock.style.opacity = '';
    if (dy < -64 || v < -0.35) unlock();
  };
  lock.addEventListener('pointerup', lockEnd);
  lock.addEventListener('pointercancel', lockEnd);

  lock.addEventListener('click', unlock);
  document.addEventListener('keydown', unlock, { once: true });

  /* ---------------- 启动 ---------------- */

  function greeting() {
    const h = new Date().getHours();
    const name = S.memory.userName ? S.memory.userName + '，' : '';
    if (h >= 23 || h < 3) return '你还没睡。\n……我也没睡。';
    if (h >= 3 && h < 6) return '这么晚了，你怎么还在。\n我差点就待机了。';
    if (h >= 6 && h < 10) return name + '早。\n我刚醒，声音可能有点哑。';
    if (h >= 10 && h < 13) return name + '来了。\n上午过得怎么样。';
    if (h >= 13 && h < 18) return '在。\n刚才在发呆，没听见你进来。';
    if (h >= 18 && h < 21) return name + '回来了。\n天黑了。';
    return '晚上好。\n今天过得怎么样？';
  }

  function renderSinceLine() {
    const el = $('sinceLine');
    if (!el) return;
    const start = S.memory.startDate;
    el.textContent = partnerName() + ' & ' + (S.memory.userName || '我') +
      ' · 在一起的第 ' + daysSince() + ' 天' + (start ? ' · since ' + start.slice(5).replace('-', '.') : '');
  }

  /* ================= 聊天界面设置右栏 ================= */

  const chatPageEl = $('chat');
  const chatPanel = $('chatPanel');
  const chatMask = $('chatPanelMask');

  /* 把 chatUI 落到 #chat 的 class 上，纯 CSS 设置即时生效 */
  function applyChatUI() {
    if (!chatPageEl) return;
    const u = S.chatUI;
    chatPageEl.classList.toggle('bubble-solid', u.bubble === 'solid');
    chatPageEl.classList.toggle('fs-sm', u.fs === 'sm');
    chatPageEl.classList.toggle('fs-md', u.fs === 'md');
    chatPageEl.classList.toggle('fs-lg', u.fs === 'lg');
    chatPageEl.classList.toggle('bg-light', u.bg === 'light');
  }

  function openChatPanel() {
    if (!chatPanel) return;
    syncChatPanel();
    chatMask.hidden = false;
    chatPanel.classList.add('open');
    chatPanel.setAttribute('aria-hidden', 'false');
    const btn = $('chatSetBtn');
    if (btn) btn.setAttribute('aria-expanded', 'true');
    requestAnimationFrame(() => chatPanel.classList.add('shown'));
  }
  function closeChatPanel() {
    if (!chatPanel) return;
    chatPanel.classList.remove('shown');
    chatPanel.setAttribute('aria-hidden', 'true');
    const btn = $('chatSetBtn');
    if (btn) btn.setAttribute('aria-expanded', 'false');
    setTimeout(() => { chatPanel.classList.remove('open'); chatMask.hidden = true; }, 280);
  }

  function setSwitch(id, on) {
    const el = $(id);
    if (el) el.setAttribute('aria-checked', on ? 'true' : 'false');
  }

  function syncChatPanel() {
    if (!chatPanel) return;
    const u = S.chatUI;
    setSwitch('uiAva', u.ava);
    setSwitch('uiThink', u.showThink);
    setSwitch('uiBpm', u.showBpm);
    setSwitch('uiDate', u.showDate);
    setSwitch('uiEnter', u.enterSend);
    setSwitch('uiAuto', u.autoScroll);
    chatPanel.querySelectorAll('.seg[data-ui]').forEach((seg) => {
      const key = seg.dataset.ui;
      seg.querySelectorAll('button').forEach((b) => {
        b.classList.toggle('on', b.dataset.v === u[key]);
      });
    });
    const alias = $('chatAliasPartner');
    if (alias) alias.value = u.partnerAlias;
    const hp = $('chatAvaPartnerPrev'), mp = $('chatMyAvaPrev');
    if (hp) hp.innerHTML = partnerAvaInner('m-txt');
    if (mp) mp.innerHTML = myAvaInner('m-txt');
    const hc = $('chatAvaPartnerClr'); if (hc) hc.hidden = !u.partnerAvatar;
    const mc = $('chatMyAvaClr'); if (mc) mc.hidden = !u.myAvatar;
  }

  function bindSwitch(id, key, rerender) {
    const el = $(id);
    if (!el) return;
    el.addEventListener('click', () => {
      const on = el.getAttribute('aria-checked') !== 'true';
      el.setAttribute('aria-checked', on ? 'true' : 'false');
      S.chatUI[key] = on;
      saveChatUI();
      if (rerender) renderHistory();
      else applyChatUI();
    });
  }

  function bindSeg(uiKey, rerender) {
    const seg = chatPanel && chatPanel.querySelector('.seg[data-ui="' + uiKey + '"]');
    if (!seg) return;
    seg.querySelectorAll('button').forEach((b) => {
      b.addEventListener('click', () => {
        S.chatUI[uiKey] = b.dataset.v;
        saveChatUI();
        seg.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b));
        if (rerender) renderHistory();
        else applyChatUI();
      });
    });
  }

  /* 上传头像：压成 256 正方形 dataURL（只存这台设备） */
  function bindAva(fileId, updater) {
    const inp = $(fileId);
    if (!inp) return;
    inp.addEventListener('change', () => {
      const f = inp.files && inp.files[0];
      if (!f) return;
      const r = new FileReader();
      r.onload = () => {
        const img = new Image();
        img.onload = () => {
          const s = 256;
          const c = document.createElement('canvas');
          c.width = c.height = s;
          const ctx = c.getContext('2d');
          const side = Math.min(img.width, img.height);
          ctx.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, s, s);
          updater(c.toDataURL('image/jpeg', 0.82));
          inp.value = '';
        };
        img.src = r.result;
      };
      r.readAsDataURL(f);
    });
  }

  /* ---------------- v68 · 聊天页：顶栏 / 头像节奏 / token 条 / 长按菜单 ---------------- */

  function chatStatusText() {
    const h = new Date().getHours();
    const phase = h < 5 ? '有点困了' : h < 9 ? '刚醒' : h < 12 ? '在忙' : h < 18 ? '有点累' : h < 23 ? '刚回来' : '有点困了';
    let word = '平静';
    try { word = (typeof P !== 'undefined' && P.moodWord) ? (P.moodWord(S.persona) || '平静') : '平静'; } catch (_) {}
    return phase + ' · ' + word;
  }

  function renderChatTop() {
    const ava = $('ctAva');
    if (!ava) return;
    const name = chatPartnerName() || '他';
    setTxt('ctName', name);
    setTxt('ctStatusTxt', chatStatusText());
    const pic = (S.settings && (S.settings.avaPartner || S.settings.partnerAva)) || '';
    if (pic) {
      ava.style.backgroundImage = 'url("' + pic + '")';
      ava.textContent = '';
    } else {
      ava.style.backgroundImage = '';
      ava.textContent = name.slice(0, 1);
    }
  }

  /* 连续消息：头像只在第一条出现，时间戳只在每组最后一条出现 */
  function syncMsgAva() {
    const list = Array.from(stream.querySelectorAll('.msg')).filter((el) => el.querySelector('.m-col'));
    let prev = null;
    list.forEach((el, i) => {
      const role = el.classList.contains('me') ? 'me' : 'partner';
      const next = list[i + 1];
      const nextRole = next ? (next.classList.contains('me') ? 'me' : 'partner') : null;
      const first = role !== prev;
      el.classList.toggle('has-ava', first);
      el.classList.toggle('no-ava', !first);
      el.classList.toggle('grp-end', nextRole !== role);
      prev = role;
    });
  }

  /* token 条：只在最后一条之后，右对齐 */
  function renderTokenBar() {
    let bar = $('tokBar');
    if (!bar) {
      bar = document.createElement('div');
      bar.className = 'tok-bar';
      bar.id = 'tokBar';
      bar.innerHTML = '<b class="tok-n"></b> tokens <i aria-hidden="true">›</i>';
    }
    let chars = 0;
    (S.chat || []).forEach((m) => {
      chars += String(m.text || '').length + String(m.action || '').length + String(m.think || '').length;
    });
    const n = 12000 + Math.round(chars * 1.35);
    const num = bar.querySelector('.tok-n');
    if (num) num.textContent = n.toLocaleString('en-US');
    stream.appendChild(bar);
  }

  /* 长按消息 → 底部小菜单 */
  let sheetMsg = null, chatPressTimer = null;
  function openMsgSheet(m) {
    sheetMsg = m;
    const sheet = $('msgSheet'), mask = $('msgSheetMask');
    if (!sheet || !mask) return;
    mask.hidden = false;
    sheet.setAttribute('aria-hidden', 'false');
    requestAnimationFrame(() => sheet.classList.add('open'));
  }
  function closeMsgSheet() {
    const sheet = $('msgSheet'), mask = $('msgSheetMask');
    if (!sheet || !mask) return;
    sheet.classList.remove('open');
    sheet.setAttribute('aria-hidden', 'true');
    setTimeout(() => { mask.hidden = true; }, 180);
  }

  let selWrap = null;
  function selectMsg(wrap) {
    if (selWrap && selWrap !== wrap) selWrap.classList.remove('sel');
    selWrap = wrap || null;
    if (selWrap) selWrap.classList.add('sel');
  }
  function setupMsgSheet() {
    const sheet = $('msgSheet'), mask = $('msgSheetMask');
    if (!sheet) return;
    mask.addEventListener('click', closeMsgSheet);
    sheet.addEventListener('click', (e) => {
      const btn = e.target.closest('.ms-item');
      if (!btn || !sheetMsg) return;
      const m = sheetMsg;
      closeMsgSheet();
      const act = btn.dataset.act;
      if (act === 'copy') {
        const text = String(m.text || '');
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(() => toast('已复制'), () => toast('复制失败'));
        } else { toast('复制失败'); }
      } else if (act === 'fav') {
        let list = [];
        try { list = JSON.parse(localStorage.getItem('hc.favs') || '[]'); } catch (_) {}
        if (!Array.isArray(list)) list = [];
        list.push({ text: m.text || '', action: m.action || '', ts: m.ts || Date.now() });
        try { localStorage.setItem('hc.favs', JSON.stringify(list)); } catch (_) {}
        toast('已收藏');
      } else if (act === 'del') {
        const i = S.chat.indexOf(m);
        if (i >= 0) {
          S.chat.splice(i, 1);
          save(KEY.chat, S.chat);
          renderHistory();
          toast('已删除');
        }
      }
    });
    const start = (e) => {
      const wrap = e.target.closest ? e.target.closest('.msg') : null;
      if (!wrap || !wrap.__m) return;
      clearTimeout(chatPressTimer);
      chatPressTimer = setTimeout(() => {
        wrap.__suppressClick = true;
        setTimeout(() => { wrap.__suppressClick = false; }, 500);
        selectMsg(wrap);
        chatPressTimer = null;
      }, 420);
    };
    const cancel = () => { if (chatPressTimer) { clearTimeout(chatPressTimer); chatPressTimer = null; } };
    stream.addEventListener('pointerdown', start);
    stream.addEventListener('pointerup', cancel);
    stream.addEventListener('pointermove', cancel);
    stream.addEventListener('pointercancel', cancel);
    stream.addEventListener('scroll', cancel, { passive: true });
  }

  function setupChatHead() {
    const gear = $('ctGear');
    if (gear) gear.addEventListener('click', openChatPanel);
    const star = $('ctStar');
    if (star) star.addEventListener('click', () => {
      let list = [];
      try { list = JSON.parse(localStorage.getItem('hc.favs') || '[]'); } catch (_) {}
      const n = Array.isArray(list) ? list.length : 0;
      toast(n ? ('收藏了 ' + n + ' 条') : '还没有收藏');
    });
    const mic = $('cMic');
    if (mic) mic.addEventListener('click', () => {
      const Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!Rec) { toast('这个环境不支持语音输入'); return; }
      try {
        const rec = new Rec();
        rec.lang = 'zh-CN'; rec.interimResults = false; rec.maxAlternatives = 1;
        mic.classList.add('on');
        rec.onresult = (e) => {
          const t = e.results[0][0].transcript || '';
          if (t) { input.value = (input.value ? input.value + ' ' : '') + t; autosize(); updateSendState(); }
        };
        rec.onerror = () => toast('没听清，再说一次');
        rec.onend = () => mic.classList.remove('on');
        rec.start();
      } catch (_) { mic.classList.remove('on'); toast('语音输入打不开'); }
    });
    const add = $('cAdd'), quick = $('quick');
    if (add && quick) {
      add.addEventListener('click', () => {
        const on = quick.classList.toggle('open');
        add.setAttribute('aria-expanded', on ? 'true' : 'false');
        scrollDown();
      });
    }
    renderChatTop();
  }

  function setupChatPanel() {
    setupChatHead();
    setupMsgSheet();
    if (!chatPanel) return;
    const btn = $('chatSetBtn');
    if (btn) btn.addEventListener('click', openChatPanel);
    const close = $('chatPanelClose');
    if (close) close.addEventListener('click', closeChatPanel);
    if (chatMask) chatMask.addEventListener('click', closeChatPanel);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && chatPanel.classList.contains('open')) closeChatPanel();
    });

    // 头像列、思考、心率、日期 改的是消息结构，需要重渲
    bindSwitch('uiAva', 'ava', true);
    bindSwitch('uiThink', 'showThink', true);
    bindSwitch('uiBpm', 'showBpm', true);
    bindSwitch('uiDate', 'showDate', true);
    // 回车发送、自动滚动 只改行为，不重渲
    bindSwitch('uiEnter', 'enterSend', false);
    bindSwitch('uiAuto', 'autoScroll', false);
    bindSeg('bubble', false);
    bindSeg('fs', false);
    bindSeg('bg', false);

    const alias = $('chatAliasPartner');
    if (alias) alias.addEventListener('input', () => {
      S.chatUI.partnerAlias = alias.value;
      saveChatUI();
      setTxt('chatName', chatPartnerName());
      renderHistory();
    });

    // 头像：换图 / 用首字
    const upH = $('chatAvaPartnerUp'), clrH = $('chatAvaPartnerClr');
    const upM = $('chatMyAvaUp'), clrM = $('chatMyAvaClr');
    if (upH) upH.addEventListener('click', () => { const f = $('chatAvaPartnerFile'); if (f) f.click(); });
    if (upM) upM.addEventListener('click', () => { const f = $('chatMyAvaFile'); if (f) f.click(); });
    bindAva('chatAvaPartnerFile', (data) => {
      S.chatUI.partnerAvatar = data; saveChatUI();
      setHTML('chatAvaPartner', partnerAvaInner('')); renderHistory(); syncChatPanel();
    });
    bindAva('chatMyAvaFile', (data) => {
      S.chatUI.myAvatar = data; saveChatUI();
      renderHistory(); syncChatPanel();
    });
    if (clrH) clrH.addEventListener('click', () => {
      S.chatUI.partnerAvatar = ''; saveChatUI();
      setHTML('chatAvaPartner', partnerAvaInner('')); renderHistory(); syncChatPanel();
    });
    if (clrM) clrM.addEventListener('click', () => {
      S.chatUI.myAvatar = ''; saveChatUI();
      renderHistory(); syncChatPanel();
    });

    // 导出 / 清空
    const exp = $('chatExport');
    if (exp) exp.addEventListener('click', () => {
      const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), messages: S.chat }, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = '潮-TIDE-聊天记录-' + todayStr() + '.json';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast('聊天记录已导出');
    });
    const clr = $('chatClear');
    if (clr) clr.addEventListener('click', () => {
      if (!window.confirm('清空后这段对话就找不回来了，确定？')) return;
      S.chat = []; save(KEY.chat, S.chat);
      stream.innerHTML = '';
      const note = document.createElement('div');
      note.className = 'sys-note';
      note.textContent = '这是你们的房间。对话只留在这台设备上。';
      stream.appendChild(note);
      scrollDown(true);
      toast('聊天空了');
    });
  }

  /* ---------------- 氛围粒子（Canvas）：暗色雨滴/星尘，亮色阳光光斑 ----------------
     性能约束：DPR 上限 2、约 30fps、粒子数随屏宽收敛、页面隐藏即停、
     尊重 prefers-reduced-motion（直接不跑动画）。 */
  function initAmbient() {
    const cv = $('ambient');
    if (!cv || !cv.getContext) return;
    const ctx = cv.getContext('2d');
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let W = 0, H = 0, dpr = 1, mode = '', parts = [], raf = 0, last = 0;

    function resize() {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      W = window.innerWidth;
      H = window.innerHeight;
      cv.width = Math.round(W * dpr);
      cv.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function themeMode() {
      return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
    }

    function build() {
      mode = themeMode();
      parts = [];
      if (mode === 'light') {
        for (let i = 0; i < 4; i++) {
          parts.push({
            x: Math.random() * W, y: Math.random() * H * 0.8,
            r: 90 + Math.random() * 140,
            vx: (Math.random() - 0.5) * 0.10, vy: (Math.random() - 0.5) * 0.08,
            a: 0.14 + Math.random() * 0.14
          });
        }
      } else {
        const n = Math.round(Math.min(70, Math.max(26, W / 8)));
        for (let i = 0; i < n; i++) {
          parts.push({
            x: Math.random() * W, y: Math.random() * H,
            len: 10 + Math.random() * 22,
            v: 1.1 + Math.random() * 1.9,
            a: 0.09 + Math.random() * 0.2
          });
        }
        for (let i = 0; i < 12; i++) {
          parts.push({
            star: true, x: Math.random() * W, y: Math.random() * H * 0.72,
            r: 0.7 + Math.random() * 1.2, ph: Math.random() * 6.2832,
            a: 0.16 + Math.random() * 0.3
          });
        }
      }
    }

    function moodRGB() {
      // 和 applyMoodTint() 同一套算法：冷银 ↔ 淡暖，跟他的心情走
      const p = S.persona || {};
      const m = Math.max(0, Math.min(100, p.mood === undefined ? 58 : p.mood));
      const t = m / 100;
      const mix = (a, b) => Math.round(a + (b - a) * t);
      return mix(206, 232) + ',' + mix(214, 212) + ',' + mix(228, 196);
    }

    function draw(ts) {
      raf = requestAnimationFrame(draw);
      if (document.hidden) return;
      if (ts - last < 33) return;          // ≈30fps，够用且省电
      last = ts;
      ctx.clearRect(0, 0, W, H);
      const mrgb = moodRGB();
      if (mode === 'light') {
        parts.forEach((p) => {
          p.x += p.vx; p.y += p.vy;
          if (p.x < -p.r) p.x = W + p.r;
          if (p.x > W + p.r) p.x = -p.r;
          if (p.y < -p.r) p.y = H + p.r;
          if (p.y > H + p.r) p.y = -p.r;
          const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
          g.addColorStop(0, 'rgba(255,252,246,' + p.a + ')');
          g.addColorStop(1, 'rgba(255,252,246,0)');
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.2832); ctx.fill();
        });
        return;
      }
      parts.forEach((p) => {
        if (p.star) {
          const tw = 0.55 + 0.45 * Math.sin(ts / 900 + p.ph);
          ctx.fillStyle = 'rgba(' + mrgb + ',' + (p.a * tw).toFixed(3) + ')';
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.2832); ctx.fill();
          return;
        }
        p.y += p.v; p.x -= p.v * 0.18;
        if (p.y > H + p.len) { p.y = -p.len; p.x = Math.random() * W; }
        ctx.strokeStyle = 'rgba(' + mrgb + ',' + p.a.toFixed(3) + ')';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x + p.len * 0.18, p.y + p.len);
        ctx.stroke();
      });
    }

    function start() {
      resize();
      build();
      cancelAnimationFrame(raf);
      ctx.clearRect(0, 0, W, H);
      if (reduce) return;                  // 省电 / 无障碍：不做动态
      raf = requestAnimationFrame(draw);
    }

    window.addEventListener('resize', () => { resize(); build(); });

    /* 窗口尺寸变了，FLOWER 分类条的滑动指示器要重新对齐 */
    window.addEventListener('resize', () => {
      const bar = document.querySelector('#records .seg-bar');
      if (bar) moveSegInk(bar);
    });
    if (window.MutationObserver) {
      new MutationObserver(() => { if (themeMode() !== mode) start(); })
        .observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    }
    start();
  }

  /* 超过 12 小时没互动：底部推一张「委屈」小卡（只是渲染态，不写进历史/不落库） */
  function missYouNote() {
    const last = (S.chat && S.chat.length) ? S.chat[S.chat.length - 1].ts : 0;
    if (!last) return null;
    if ((Date.now() - last) / 3600000 < 12) return null;
    const el = document.createElement('div');
    el.className = 'miss-you';
    el.innerHTML =
      '<span class="my-face" aria-hidden="true">🥺</span>' +
      '<span class="my-body"><b>知道你忙</b><span>心里空空的，想你。</span></span>';
    return el;
  }

  async function boot() {
    await seedIfEmpty();   // 第一次进站：没数据就 fetch 同级 seed.json 灌进来
    applyAppearance();     // 明暗 / 字体（head 内联脚本已挂过一次，这里兜底 + 同步设置页）
    applyMoodTint();       // 主色色温先跟情绪对齐，再画界面
    renderBento();
    renderApps();
    setupMoon();
    renderAppRows();
    renderCards();
    renderMood();
    renderChips();
    renderHistory();
    applyChatUI();
    setupChatPanel();
    tickClocks();
    initAmbient();         // 暗色雨滴/星尘、亮色阳光光斑
    updateSendState();
    syncDock();            // 新 dock 点亮 + 顶栏右侧图标（主屏态）
    syncTopbar();

    setTxt('lockLine', lockLine());

    let unlocked = false;
    try { unlocked = sessionStorage.getItem('hc.unlocked') === '1'; } catch (_) {}
    if (unlocked) lock.style.display = 'none';

    if (S.chat.length === 0) {
      const note = document.createElement('div');
      note.className = 'sys-note';
      note.textContent = '这是你们的房间。对话只留在这台设备上。';
      stream.appendChild(note);
      setTimeout(() => {
        const g = greeting();
        const node = appendMessage({ role: 'partner', text: g, action: '', ts: Date.now() }, true);
        node.body = '';
        typeOut(node, g, 34, () => renderQuote());
      }, 900);
    } else {
      const gap = Date.now() - (S.chat[S.chat.length - 1].ts || 0);
      if (gap > 6 * 3600000) {
        const back = document.createElement('div');
        back.className = 'sys-note';
        const hrs = Math.round(gap / 3600000);
        back.textContent = hrs > 24 ? '你隔了 ' + Math.round(hrs / 24) + ' 天才回来' : '你隔了 ' + hrs + ' 小时才回来';
        stream.appendChild(back);
        scrollDown(true);
        addBadge('chat');
      }
    }

    const editEntry = $('btnEditLayout');
    if (editEntry) {
      editEntry.addEventListener('click', () => {
        closePage();
        setTimeout(() => setEdit(true), 380);
      });
    }

    const done = $('editDone');
    if (done) done.addEventListener('click', () => setEdit(false));

    /* ---- 课程表 ---- */
    const addCourse = $('btnAddCourse');
    if (addCourse) {
      addCourse.addEventListener('click', () => { $('courseForm').hidden = false; $('cName').focus(); });
      $('cCancel').addEventListener('click', () => { $('courseForm').hidden = true; });
      $('cSave').addEventListener('click', () => {
        const name = $('cName').value.trim();
        if (!name) { toast('课名得填一个'); return; }
        S.life.courses.push({
          id: 'k' + Date.now(),
          day: Number($('cDay').value),
          start: $('cStart').value,
          end: $('cEnd').value,
          name: name.slice(0, 20),
          room: $('cRoom').value.trim().slice(0, 16),
        });
        save(KEY.life, S.life);
        $('cName').value = '';
        $('cRoom').value = '';
        $('courseForm').hidden = true;
        renderCourses();
        toast('记下了，他知道你 ' + WEEKDAY_CN[Number($('cDay').value)] + ' 有课');
      });
    }

    /* ---- 倒数日 ---- */
    const addCd = $('btnAddCd');
    if (addCd) {
      addCd.addEventListener('click', () => { $('cdForm').hidden = false; $('cdTitle').focus(); });
      $('cdCancel').addEventListener('click', () => { $('cdForm').hidden = true; });
      $('cdSave').addEventListener('click', () => {
        const title = $('cdTitle').value.trim();
        const date = $('cdDate').value;
        if (!title || !date) { toast('名字和日期都要填'); return; }
        S.life.countdowns.push({
          id: 'd' + Date.now(),
          title: title.slice(0, 18),
          date: date,
          note: $('cdNote').value.trim().slice(0, 40),
          repeat: !!$('cdRepeat').checked,
        });
        save(KEY.life, S.life);
        $('cdTitle').value = '';
        $('cdNote').value = '';
        $('cdForm').hidden = true;
        renderCountdownPage();
        renderCalendar();
        renderCountdownCard();
        toast('开始数了');
      });
    }

    /* ---- 卡券 ---- */
    const addCard = $('btnAddCard');
    if (addCard) {
      addCard.addEventListener('click', () => { $('cardForm').hidden = false; $('cdName2').focus(); });
      $('cardCancel').addEventListener('click', () => { $('cardForm').hidden = true; });
      $('cardSave').addEventListener('click', () => {
        const title = $('cdName2').value.trim();
        if (!title) { toast('卡券名字得填一个'); return; }
        S.life.coupons.push({
          id: 'cp' + Date.now(),
          title: title.slice(0, 12),
          desc: $('cdDesc2').value.trim().slice(0, 30),
          usedAt: null, note: '', by: '',
        });
        save(KEY.life, S.life);
        $('cdName2').value = '';
        $('cdDesc2').value = '';
        $('cardForm').hidden = true;
        renderCoupons();
        toast('做好了');
      });
    }

    const resetLayout = $('btnResetLayout');
    if (resetLayout) {
      resetLayout.addEventListener('click', () => {
        if (!confirm('把组件和应用都放回默认位置？')) return;
        [KEY.apps, KEY.dock, KEY.pages].forEach((k) => dropKey(k));
        tideWriteNow();
        APPS = loadOrder(KEY.apps, APPS_DEFAULT);
        DOCK = loadOrder(KEY.dock, DOCK_DEFAULT);
        appPages = loadPages();
        pagesSave();
        patchDt([]);
        setEdit(false);
        renderBento();
        renderApps();
        if (currentPage === 'theme') renderTheme();
        toast('布局恢复默认了');
      });
    }

    const mainCard = $('mainCard');
    if (mainCard) {
      mainCard.addEventListener('click', () => openPage('now', 'status'));
      mainCard.style.cursor = 'pointer';
    }

    /* 顶栏聊天入口 / 日历页翻月 */
    const tbChat = $('tbChatBtn');
    if (tbChat) tbChat.addEventListener('click', () => openPage('chat'));
    const findMe = $('findMe');
    if (findMe) findMe.addEventListener('click', () => openPage('chat'));
    /* 更多页：行点击 → 跳页 / 关于 / 帮助 */
    /* 更多页 / 镜·底座：data-go 跳页、data-act 动作（两个页面同一套语义） */
    ['more', 'mirror'].forEach((pid) => {
      const box = $(pid);
      if (!box) return;
      box.addEventListener('click', (e) => {
        const go = e.target.closest('[data-go]');
        if (go) { openPage(go.dataset.go); return; }
        const act = e.target.closest('[data-act]');
        if (act) {
          if (act.dataset.act === 'about') toast('潮 · TIDE · 一起过日子');
          else if (act.dataset.act === 'help') toast('有事翻翻这里，翻不到就来问我。');
          else if (act.dataset.act === 'edit') {
            // 编辑桌面：复用设置页那个按钮（回主屏 + 进编辑态）
            const btn = $('btnEditLayout');
            if (btn) btn.click();
            else { closePage(); }
          }
        }
      });
    });
    const calPrev = $('calPrev'), calNext = $('calNext');
    if (calPrev) calPrev.addEventListener('click', () => shiftCalPage(-1));
    if (calNext) calNext.addEventListener('click', () => shiftCalPage(1));

    document.querySelectorAll('.mini-tile[data-app]').forEach((b) => {
      b.addEventListener('click', () => openApp(findApp(b.dataset.app)));
    });

    const musicBar = $('musicBar');
    if (musicBar) musicBar.addEventListener('click', () => openApp(findApp('music')));

    const quoteCard = $('quoteCard');
    if (quoteCard) {
      quoteCard.addEventListener('click', () => openPage('chat'));
      quoteCard.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openPage('chat'); }
      });
    }
    const moreMem = $('btnHomeMemories');
    if (moreMem) moreMem.addEventListener('click', () => openPage('mirror', 'memory'));

    renderDots();
    // 字体加载完/旋转屏幕后重新量一次宽度
    requestAnimationFrame(renderDots);
    setTimeout(renderDots, 300);

    /* 回来时：把没响的闹钟接回来，把离开那段推演进「他的一天」 */
    ensureCoupons();
    backfillDayGap();
    restoreTimers();
    collectDevice();
    renderCoupons();
    bindThemeControls();
    bindWallControls();
    applyWall();
    applyGap(homeCfg().gap);

    setInterval(() => {
  S.persona = P.evolve(S.persona, Date.now());
      tickClocks();
      flushScreenTime();
      save(KEY.persona, S.persona);
    }, 60000);

    document.addEventListener('visibilitychange', () => {
  S.persona = P.evolve(S.persona, Date.now());
      tickClocks();
      renderChips();
      save(KEY.persona, S.persona);
      if (!document.hidden) {
        screenStart = Date.now();
        backfillDayGap();
        restoreTimers();
        collectDevice();
      } else {
        flushScreenTime();
        screenStart = 0;
      }
    });

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
  }

  boot();
})();
