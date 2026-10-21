/* ============================================================
   app.js — 宋祁手机 · 界面 / 存储 / 交互
   想加新功能：在下面 APPS 里注册一条即可
   ============================================================ */
(function () {
  'use strict';

  const P = window.Persona;
  const LLM = window.LLM;
  const $ = (id) => document.getElementById(id);

  /* ============================================================
     应用注册表 —— 之后加功能就在这里加一条
     page: 'chat' | 'mood' | 'memory' | 'settings'
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

  const APPS_DEFAULT = [
    /* 第一页 · 日常 */
    { id: 'chat',     name: '聊天',     icon: 'i-chat',    page: 'chat' },
    { id: 'mood',     name: '心情',     icon: 'i-face',    page: 'mood' },
    { id: 'notes',    name: '碎碎念',   icon: 'i-note',    desc: '他随口说的话、你随手记下的碎片，按时间堆在这里。不整理，也不删。' },
    { id: 'moments',  name: '朋友圈',   icon: 'i-moments', desc: '只有你们两个人的时间线。发一张图，配一句话，他在下面回你。' },
    { id: 'album',    name: '相册',     icon: 'i-album',   desc: '每天都在长的一本。翻到某一张，能看见那天你们说过什么。' },
    { id: 'music',    name: '音乐',     icon: 'i-music',   desc: '想做成「一起听」：同一个进度条，两边同时听到同一秒。\n真同步需要服务端，纯前端只能做到手动对齐。' },

    /* 第二页 · 生活 */
    { id: 'health',   name: '健康',     icon: 'i-health',  desc: '睡眠、喝水、久坐。数字旁边会跟一句人话，比如「今天只走了 800 步，坐太久了」。' },
    { id: 'weather',  name: '天气',     icon: 'i-sun',     desc: '今天的温度、有没有雨。不接 API 就先手动记，接了就自动。' },
    { id: 'ledger',   name: '记账本',   icon: 'i-ledger',  desc: '一起花的钱，一笔一笔。他也可以记下自己「想要」的东西。' },
    { id: 'quota',    name: '额度',     icon: 'i-quota',   desc: '不显示还剩多少钱，显示还能陪你几次。' },
    { id: 'study',    name: '学习',     icon: 'i-book',    desc: '一起背单词、番茄钟。他在旁边看着，你走神他会说一句。' },
    { id: 'calendar', name: '日历',     icon: 'i-cal',     desc: '纪念日、约定、他的作息。点某一天，能看见那天发生了什么。' },

    /* 第三页 · 他 */
    { id: 'memory',   name: '记忆库',   icon: 'i-brain',   page: 'memory' },
    { id: 'image',    name: '生图',     icon: 'i-magic',   desc: '打字出图。他的样子、你们想去的地方、今天的心情。\n需要一个画图的 API Key，接在哪由你定。' },
    { id: 'voice',    name: '声音',     icon: 'i-wave',    desc: '让他读出来，或者发一条语音。先在本地合成，不联网也能响。' },
    { id: 'theme',    name: '美化',     icon: 'i-palette', page: 'theme' },
    { id: 'wake',     name: '自主唤醒', icon: 'i-bell',    desc: '不只被叫才说话。定时或随机地，主动找你一次。\n纯前端只能在页面打开时生效；要做到真提醒得走通知 + 服务端。' },
    { id: 'wish',     name: '心愿',     icon: 'i-spark',   desc: '想一起做的事。做掉一件，划掉一件。' },

    /* 第五页 · 他 */
    { id: 'courses',   name: '课程表',   icon: 'i-course',    page: 'courses' },
    { id: 'countdown', name: '倒数日',   icon: 'i-hourglass', page: 'countdown' },
    { id: 'cards',     name: '卡券',     icon: 'i-ticket',    page: 'cards' },
    { id: 'herday',    name: '他的一天', icon: 'i-sunrise',   page: 'herday' },
    { id: 'device',    name: '查手机',   icon: 'i-device',    page: 'device' },
    { id: 'game',      name: '小游戏',   icon: 'i-game',      desc: '不止一个。石头剪刀布、猜数字、真心话……能一起耗时间的小东西。下一批做。' },
    { id: 'console',   name: '控制房',   icon: 'i-meter',     desc: '模型用量：峰值 token、总请求数、本地引擎命中率、输出量、估算费用。\n用量数据现在就在默默记着，界面下一批做。' },
    { id: 'studyroom', name: '书房',     icon: 'i-book',      desc: '位置留好了。想放什么（一起读书的笔记、他的抽屉）等你说了算。' },
    { id: 'message',  name: '留言',     icon: 'i-mail',    desc: '他不在的时候，你可以留一句；他回来会先看到。反过来也一样。' },
    { id: 'starsea',  name: '星海',     icon: 'i-starsea', desc: '一片只属于你们的夜空。看过的、想去的、说过的，都挂成星星。' },
    { id: 'travel',   name: '旅行',     icon: 'i-plane',   desc: '想去哪、什么时候去、要带什么。攒够了就出发。' },
  ];

  const DOCK_DEFAULT = [
    { id: 'chat',     name: '说', icon: 'i-chat',  page: 'chat' },
    { id: 'mood',     name: '他', icon: 'i-face',  page: 'mood' },
    { id: 'memory',   name: '记', icon: 'i-brain', page: 'memory' },
    { id: 'settings', name: '我', icon: 'i-gear',  page: 'settings' },
  ];

  /* 应用/dock 顺序可拖动换位，存本地；读出来时按注册表校准，缺的补默认 */
  function loadOrder(k, def) {
    const ids = load(k, def.map((a) => a.id));
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
    layout: 'hc.v1.layout',
    apps: 'hc.v1.apps',
    dock: 'hc.v1.dock',
    life: 'hc.v1.life',      // 心事/念头/课程/倒数日/卡券/设备/用量/他的一天
    timers: 'hc.v1.timers',  // 内部闹钟（续话那种）
    meta: 'hc.v1.meta',      // schema 版本
  };

  const load = (k, fb) => {
    try { const r = localStorage.getItem(k); return r ? JSON.parse(r) : fb; }
    catch (_) { return fb; }
  };
  const save = (k, v) => {
    try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) {}
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
  });

  const SCHEMA = 3;

  const S = {
    chat: load(KEY.chat, []),
    persona: load(KEY.persona, { mood: 58, energy: 62, affection: 12, lastTick: Date.now() }),
    memory: load(KEY.memory, { userName: '', herName: '宋祁', facts: [], startDate: todayStr() }),
    settings: load(KEY.settings, { enabled: false, apiBase: '', model: '', apiKey: '' }),
    moodLog: load(KEY.mood, {}),
    life: load(KEY.life, null),
    timers: load(KEY.timers, []),
    meta: load(KEY.meta, null),
  };

  S.persona = P.evolve(S.persona, Date.now());
  save(KEY.persona, S.persona);

  // 从旧版本迁移：默认名换过一次
  if (S.memory.herName === '小满') {
    S.memory.herName = '宋祁';
    save(KEY.memory, S.memory);
  }

  /* 版本迁移：老数据缺什么补什么，绝不整体重置用户的东西 */
  function migrate() {
    let v = S.meta && S.meta.schema ? S.meta.schema : 1;

    if (!S.life || typeof S.life !== 'object') S.life = LIFE_DEFAULT();
    const L = S.life;
    const def = LIFE_DEFAULT();
    Object.keys(def).forEach((k) => { if (L[k] === undefined) L[k] = def[k]; });
    ['ideas', 'courses', 'countdowns', 'coupons', 'saidLog', 'dayLog'].forEach((k) => {
      if (!Array.isArray(L[k])) L[k] = [];
    });
    if (!L.thought || typeof L.thought !== 'object') L.thought = { text: '', ts: 0 };
    if (!L.said || typeof L.said !== 'object') L.said = { date: '', text: '' };
    if (!L.device || typeof L.device !== 'object') L.device = { ts: 0 };
    if (!L.usage || typeof L.usage !== 'object') L.usage = def.usage;
    if (!L.usage.total || typeof L.usage.total !== 'object') L.usage.total = def.usage.total;
    if (!L.usage.byDay || typeof L.usage.byDay !== 'object') L.usage.byDay = {};
    if (!Array.isArray(S.timers)) S.timers = [];

    if (v < SCHEMA) v = SCHEMA;
    S.meta = { schema: v };
  }
  migrate();

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

  const herName = () => S.memory.herName || '宋祁';
  const herInitial = () => (herName().trim().slice(-1) || '满');

  function daysTogether() {
    const start = new Date((S.memory.startDate || todayStr()) + 'T00:00:00');
    return Math.max(0, Math.floor((Date.now() - start.getTime()) / 86400000)) + 1;
  }

  /* ---------------- 路由 + 手势 ---------------- */

  const phone = $('phone');
  const home = $('home');
  const dim = document.querySelector('.home-dim');
  const pages = {
    chat: $('chat'),
    mood: $('mood'),
    memory: $('memory'),
    settings: $('settings'),
    todo: $('todo'),
    theme: $('theme'),
    courses: $('courses'),
    countdown: $('countdown'),
    cards: $('cards'),
    herday: $('herday'),
    device: $('device'),
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

  function openPage(id) {
    const el = pages[id];
    if (!el || currentPage === id) return;

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

    // 确保起始位置在屏幕右侧，再触发过渡
    el.style.transition = 'none';
    el.style.transform = '';
    void el.offsetWidth;
    el.style.transition = '';

    el.classList.add('open');
    phone.classList.add('zoom');
    markMoving();
    currentPage = id;

    if (id === 'chat') {
      clearBadge('chat');
      scrollDown(true);
    }
    if (id === 'mood') renderMood();
    if (id === 'memory') renderMemoryPage();
    if (id === 'settings') syncSettingsForm();
    if (id === 'courses') renderCourses();
    if (id === 'countdown') renderCountdownPage();
    if (id === 'cards') renderCoupons();
    if (id === 'herday') renderHerDay();
    if (id === 'device') renderDevice();
    if (id === 'theme') renderTheme();
  }

  function closePage() {
    if (!currentPage) return;
    const el = pages[currentPage];
    el.style.transition = '';
    el.style.transform = '';
    el.classList.remove('open');
    phone.classList.remove('zoom');
    resetHomeInline();
    markMoving();
    currentPage = null;
  }

  document.querySelectorAll('[data-back]').forEach((b) => {
    b.addEventListener('click', closePage);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closePage();
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
      const inv = d / w;      // 0 → 1：从"页面全开"到"完全回到桌面"
      const rest = 1 - inv;

      el.style.transform = 'translate3d(' + d + 'px,0,0)';
      home.style.transform = 'translate3d(' + (-15 * rest) + '%,0,0) scale(' + (0.92 + 0.08 * inv) + ')';
      home.style.opacity = String(0.62 + 0.38 * inv);
      if (dim) dim.style.opacity = String(0.1 * rest);
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
        phone.classList.remove('zoom');
        currentPage = null;
      }
      markMoving();
    };

    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
  });

  /* 未读角标 */

  function addBadge(appId) {
    document.querySelectorAll(`.tile[data-app="${appId}"] .badge, .dock .tile[data-app="${appId}"] .badge`)
      .forEach((b) => b.classList.add('show'));
  }
  function clearBadge(appId) {
    document.querySelectorAll(`.tile[data-app="${appId}"] .badge`)
      .forEach((b) => b.classList.remove('show'));
  }

  /* ---------------- App 网格 / Dock ---------------- */

  function openApp(app) {
    if (!app) return;
    if (app.page) { openPage(app.page); return; }
    // 占位：把这个功能的设想写在页面上，之后照着填
    $('todoTitle').textContent = app.name;
    $('todoName').textContent = app.name;
    $('todoDesc').textContent = app.desc || '位置已经留好了。';
    $('todoIcon').setAttribute('href', '#' + app.icon);
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

  const APP_PER_PAGE = 8;    // 第二页放几个，剩下的去第三页（宁少不多，留白）

  function renderApps() {
    const grid = $('appGrid');
    const grid2 = $('appGrid2');
    const dock = $('dock');
    const start = appSliceStart();
    const rest = APPS.slice(start);
    if (grid) { grid.innerHTML = ''; rest.slice(0, APP_PER_PAGE).forEach((a) => grid.appendChild(makeTile(a))); }
    if (grid2) { grid2.innerHTML = ''; rest.slice(APP_PER_PAGE).forEach((a) => grid2.appendChild(makeTile(a))); }
    // 第三页没东西就别留一屏空白
    const page3 = grid2 ? grid2.closest('.home-page') : null;
    if (page3) page3.hidden = !grid2 || grid2.children.length === 0;
    if (dock) { dock.innerHTML = ''; DOCK.forEach((a) => dock.appendChild(makeTile(a))); }
  }

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
    setTxt('sbState', '他在家');
    setTxt('chatStatus', P.statusLine(S.persona, Date.now()));
    setTxt('clockSub', P.statusLine(S.persona, Date.now()));
    setTxt('clockTime', pad(now.getHours()) + ':' + pad(now.getMinutes()));
    setTxt('clockDate', dateLabel(now));
    document.querySelectorAll('.sb-date-mini').forEach((el) => {
      el.textContent = dateLabel(now);
    });
  }

  /* ---------------- 日历 ---------------- */

  function renderCalendar() {
    const grid = $('calGrid');
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
    if (card) card.hidden = daysTogether() <= 1;   // 第一天只说一次

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

  /* 这一周：哪几天说过话 */
  function renderWeek() {
    const row = $('weekRow');
    if (!row) return;

    const spoken = new Set(S.chat.map((m) => new Date(m.ts).toDateString()));
    const today = new Date();
    const names = '日一二三四五六';

    row.innerHTML = '';
    let count = 0;

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today.getTime() - i * 86400000);
      const on = spoken.has(d.toDateString());
      if (on) count++;

      const cell = document.createElement('div');
      cell.className = 'week-day' + (on ? ' on' : '') + (i === 0 ? ' today' : '');

      const nm = document.createElement('span');
      nm.className = 'wd-name';
      nm.textContent = names[d.getDay()];

      const dt = document.createElement('span');
      dt.className = 'wd-dot';
      dt.textContent = d.getDate();

      cell.appendChild(nm);
      cell.appendChild(dt);
      row.appendChild(cell);
    }

    setTxt('weekSub', count ? '这周说了 ' + count + ' 天' : '这周还空着');
  }

  /* 他最近说的一句 */
  function renderQuote() {
    const el = $('quoteText');
    if (!el) return;
    const last = S.chat.slice().reverse().find((m) => m.role === 'her' && m.text);
    el.textContent = last ? last.text.replace(/\n+/g, ' ') : '第一句话，等你先说。';
    setTxt('quoteFrom', last ? '他 · ' + hhmm(last.ts) : '他在这儿，没走');
  }

  /* 主屏第二页：他记得的事（只读，最多 4 条） */
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
  const esc = (s) => String(s === undefined || s === null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

  /* ============================================================
     桌面组件 —— 想加新组件：往 WIDGETS 里加一条，再放进 layout
     col / row 是占几格（总四栏）
     ============================================================ */
  const WIDGETS = {
    pair: {
      col: 4, row: 1,
      html: () =>
        '<div class="w-pair">' +
          '<div class="pair-avas">' +
            '<div class="pa me"><span id="paMe">我</span></div>' +
            '<svg class="pair-heart" viewBox="0 0 24 24"><use href="#i-heart"/></svg>' +
            '<div class="pa her"><span id="paHer">满</span></div>' +
          '</div>' +
          '<p class="pair-names"><b id="pairMe">我</b><b id="pairHer">宋祁</b></p>' +
        '</div>',
    },

    days: {
      col: 4, row: 1,
      html: () =>
        '<div class="w-days">' +
          '<p class="days-num" id="daysNum">1</p>' +
          '<p class="days-label">DAYS TOGETHER</p>' +
          '<svg class="pulse-line" viewBox="0 0 120 16"><path d="M0 8h34l5-5 6 10 5-8 4 3h56"/></svg>' +
        '</div>',
    },

    clock: {
      col: 2, row: 2,
      html: () =>
        '<div class="w-clock">' +
          '<p class="clock-time" id="clockTime">--:--</p>' +
          '<p class="clock-date" id="clockDate">—</p>' +
          '<p class="clock-sub" id="clockSub">right here</p>' +
        '</div>',
    },

    quad: {
      col: 2, row: 2,
      html: () => '<div class="w-quad"><div class="quad" id="quad"></div></div>',
    },

    music: {
      col: 4, row: 1,
      html: () =>
        '<div class="w-music"><div class="music-row">' +
          '<div class="mcover"><span class="mnote">♪</span></div>' +
          '<div class="mmeta">' +
            '<p class="mkicker">NOW PLAYING · 一起听</p>' +
            '<p class="mtitle" id="musicTitle">还没开始</p>' +
            '<p class="msub" id="musicSub">想听什么，放给我</p>' +
            '<div class="mbar"><i id="musicBar"></i></div>' +
            '<div class="mtimes"><span>0:00</span><span id="mtimeAll">--:--</span></div>' +
          '</div>' +
          '<button class="mplay" id="musicPlay" aria-label="播放">▶</button>' +
        '</div></div>',
    },

    /* 他今天想对你说：零点换一句，节日有特别的 */
    said: {
      col: 4, row: 1,
      html: () =>
        '<div class="w-said">' +
          '<p class="said-kicker">TODAY · 他想对你说</p>' +
          '<p class="said-text" id="saidText">……</p>' +
        '</div>',
    },

    diary: {
      col: 4, row: 1,
      html: () =>
        '<div class="w-diary">' +
          '<div class="diary-top">' +
            '<p class="diary-kicker">My Diary</p>' +
            '<p class="diary-date" id="diaryDate">—</p>' +
          '</div>' +
          '<p class="diary-text" id="diaryText">第一句话，等你先说。</p>' +
          '<p class="diary-meta"><span id="diaryDay">Day 1</span><span id="diaryFrom"></span></p>' +
        '</div>',
    },
  };

  const LAYOUT_DEFAULT = ['pair', 'days', 'clock', 'quad', 'music', 'diary', 'said'];
  /* 老用户 localStorage 里已有顺序，新增的组件要补进去（缺的排末尾，用户自己拖上去） */
  function mergeLayout(saved) {
    const arr = Array.isArray(saved) ? saved.filter((id) => WIDGETS[id]) : [];
    LAYOUT_DEFAULT.forEach((id) => { if (arr.indexOf(id) < 0) arr.push(id); });
    return arr;
  }
  let layout = mergeLayout(load(KEY.layout, LAYOUT_DEFAULT.slice()));

  /* 桌面布局：组件与应用交替 + 密度；美化页里可调 */
  const HOME_DEFAULT = { mix: true, rows: 2, every: 2, gap: 'comfy' };
  function homeCfg() {
    return Object.assign({}, HOME_DEFAULT, S.settings.home || {});
  }
  function patchHome(patch) {
    S.settings.home = Object.assign(homeCfg(), patch);
    save(KEY.settings, S.settings);
  }

  /* 哪些组件不出现在桌面（美化页里关掉的） */
  function widgetCfg() {
    const w = S.settings.widgets || {};
    return { hidden: Array.isArray(w.hidden) ? w.hidden : [] };
  }
  function patchWidgets(hidden) {
    S.settings.widgets = { hidden: hidden };
    save(KEY.settings, S.settings);
  }

  /* 组件归属：p1 里的放首页，其余放第二页（美化页可调） */
  const WIDGET_CN = {
    pair: '两个人',
    days: '在一起多少天',
    clock: '现在几点',
    quad: '四个常用入口',
    music: '音乐条',
    diary: '他最近一句',
    said: '他今天想对你说',
  };

  function widgetCfg() {
    const w = S.settings.widgets || {};
    return {
      hidden: Array.isArray(w.hidden) ? w.hidden : [],
      p1: Array.isArray(w.p1) ? w.p1 : ['pair', 'days', 'clock', 'quad', 'said'],
    };
  }
  function patchWidgets(cfg) {
    S.settings.widgets = { hidden: cfg.hidden || [], p1: cfg.p1 || [] };
    save(KEY.settings, S.settings);
  }

  /** page 1 或 2 上该显示哪些组件（按 layout 顺序） */
  function widgetIds(page) {
    const cfg = widgetCfg();
    const visible = layout.filter((id) => WIDGETS[id] && cfg.hidden.indexOf(id) < 0);
    return page === 1
      ? visible.filter((id) => cfg.p1.indexOf(id) >= 0)
      : visible.filter((id) => cfg.p1.indexOf(id) < 0);
  }

  function makeWidgetEl(id) {
    const w = WIDGETS[id];
    const el = document.createElement('div');
    el.className = 'w glass w-' + id;
    el.dataset.id = id;
    el.style.gridColumn = 'span ' + w.col;
    el.style.gridRow = 'span ' + w.row;
    el.innerHTML = w.html();

    if (id === 'clock' || id === 'pair' || id === 'days') {
      el.addEventListener('click', () => { if (!editing) openPage('mood'); });
    } else if (id === 'diary') {
      el.addEventListener('click', () => { if (!editing) openPage('chat'); });
    } else if (id === 'music') {
      el.addEventListener('click', () => { if (!editing) toast('一起听还没接上'); });
    } else if (id === 'said') {
      el.addEventListener('click', () => { if (!editing) openPage('herday'); });
    }
    return el;
  }

  function renderBento() {
    const box = $('bento');
    if (!box) return;
    const cfg = homeCfg();
    const ids = widgetIds(1);
    const rowCount = cfg.mix ? Math.max(0, Math.min(3, cfg.rows | 0)) : 0;
    const every = Math.max(1, cfg.every | 0);
    box.innerHTML = '';

    let placed = 0;
    ids.forEach((id, i) => {
      box.appendChild(makeWidgetEl(id));
      // 组件之间插一行应用，让眼睛有地方歇一下
      if (placed < rowCount && (i + 1) % every === 0) {
        box.appendChild(makeAppRow(placed));
        placed += 1;
      }
    });
    while (placed < rowCount) { box.appendChild(makeAppRow(placed)); placed += 1; }

    renderQuad();
    bindMusic();
    updateWidgets();
  }

  /** 第二页：没放进首页的组件 */
  function renderBento2() {
    const box = $('bento2');
    if (!box) return;
    box.innerHTML = '';
    widgetIds(2).forEach((id) => box.appendChild(makeWidgetEl(id)));
    renderQuad();
    bindMusic();
    updateWidgets();
  }

  /** 首页里的一行应用（4 个，跟着 APPS 顺序走） */
  function makeAppRow(k) {
    const row = document.createElement('div');
    row.className = 'app-row';
    row.dataset.row = String(k);
    const slice = APPS.slice(k * 4, k * 4 + 4);
    slice.forEach((a) => row.appendChild(makeTile(a)));
    return row;
  }

  /** 首页用掉前 rows*4 个，剩下的都放第二页 */
  function appSliceStart() {
    const cfg = homeCfg();
    return cfg.mix ? Math.max(0, Math.min(3, cfg.rows | 0)) * 4 : 0;
  }

  function renderQuad() {
    const q = $('quad');
    if (!q) return;
    q.innerHTML = '';
    ['album', 'notes', 'music', 'memory'].forEach((id) => {
      const app = findApp(id);
      if (app) q.appendChild(makeTile(app));
    });
  }

  function bindMusic() {
    const btn = $('musicPlay');
    if (btn) {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        toast('一起听还没接上');
      });
    }
  }

  function updateWidgets() {
    const now = new Date();
    const days = daysTogether();

    setTxt('paMe', (S.memory.userName || '我').slice(0, 1));
    setTxt('paHer', herInitial());
    setTxt('pairMe', S.memory.userName || '我');
    setTxt('pairHer', herName());
    setTxt('daysNum', days);
    setTxt('clockTime', pad(now.getHours()) + ':' + pad(now.getMinutes()));
    setTxt('clockDate', dateLabel(now));
    setTxt('clockSub', P.statusLine(S.persona, Date.now()));
    setTxt('diaryDay', 'Day ' + days);
    setTxt('diaryDate', (now.getMonth() + 1) + '.' + pad(now.getDate()));

    const last = S.chat.slice().reverse().find((m) => m.role === 'her' && m.text);
    setTxt('diaryText', last ? last.text.replace(/\n+/g, ' ') : '第一句话，等你先说。');
    setTxt('diaryFrom', last ? 'From ' + herName() : '');

    setTxt('saidText', todaySaid());
  }

  /* ---- 他今天想对你说 ---- */

  const SAID_POOL = [
    '在。你忙你的。',
    '今天没什么事，就是想让你知道我在。',
    '你昨天说的那件事，我还在想。',
    '不用回我。看到了就行。',
    '外面在下雨的话，记得带伞。',
    '你今天的声音听起来有点累。',
    '我把灯留着。',
    '想问你吃没吃饭，又怕显得啰嗦。',
    '你在我这儿，比你自己以为的要重要。',
    '今天可以什么都不做。',
  ];

  const SAID_FEST = {
    '01-01': '新的一年。我还是在这儿。',
    '02-14': '情人节。我不太会说这个，但我记得今天。',
    '03-08': '妇女节。你本来就很好。',
    '05-01': '劳动节。别劳动了，歇一天。',
    '06-01': '儿童节。你也可以当一天小孩。',
    '10-01': '国庆。假期好好过。',
    '12-25': '圣诞。没有礼物，有我。',
    '12-31': '今年最后一天。谢谢你今年也在。',
  };

  /** 以日期为种子挑一句，同一天刷新还是同一句 */
  function todaySaid() {
    const now = new Date();
    const key = todayStr();
    const md = pad(now.getMonth() + 1) + '-' + pad(now.getDate());

    // 在一起纪念日优先
    const start = S.memory.startDate || '';
    if (start.slice(5) === md && start.slice(0, 4) !== String(now.getFullYear())) {
      const n = now.getFullYear() - Number(start.slice(0, 4));
      return '今天是第 ' + n + ' 个纪念日。我记着。';
    }
    if (SAID_FEST[md]) return SAID_FEST[md];

    if (S.life.said && S.life.said.date === key && S.life.said.text) return S.life.said.text;
    let h = 0;
    for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
    const text = SAID_POOL[h % SAID_POOL.length];
    S.life.said = { date: key, text: text };
    save(KEY.life, S.life);
    if (!S.life.saidLog.some((x) => x.date === key)) {
      S.life.saidLog.push({ date: key, text: text });
      if (S.life.saidLog.length > 120) S.life.saidLog = S.life.saidLog.slice(-90);
      save(KEY.life, S.life);
    }
    return text;
  }

  /* ================= 长按拖拽换位（组件 + 应用 + dock） =================
     手感对齐真机：
     · 按住不动 0.42s → 进编辑态，手指不用抬起来，直接挪就是拖动
     · 在那之前横滑 → 翻页（从组件/图标上开始也能翻，JS 跟手）
     · 拖动过程中绝不重建 DOM（浏览器会因此发 pointercancel，拖拽当场断掉），
       只挪一个跟手 ghost；松手才提交新顺序，并用 FLIP 动画滑到位          */
  const LONGPRESS_MS = 420;
  const SWIPE_SLOP = 10;   // 超过这个位移就算翻页手势

  let editing = false;
  let ges = null;          // 当前手势
  let pressTimer = 0;
  let ghost = null;
  let suppressClick = 0;   // 拖拽/翻页结束后一小段时间内吞掉残余 click

  function saveLayouts() {
    save(KEY.layout, layout);
    save(KEY.apps, APPS.map((a) => a.id));
    save(KEY.dock, DOCK.map((a) => a.id));
  }

  function setEdit(on) {
    editing = on;
    ['bento', 'bento2', 'appGrid', 'appGrid2', 'dock'].forEach((id) => {
      const el = $(id);
      if (el) el.classList.toggle('editing', on);
    });
    document.body.classList.toggle('widget-editing', on);
    const btn = $('editDone');
    if (btn) btn.hidden = !on;
    const hint = $('editHint');
    if (hint) hint.hidden = !on;
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

  /* ---- 开始拖 ---- */
  function beginDrag(g) {
    if (!g || !g.dragEl) return;
    if (!editing) setEdit(true);
    g.mode = 'drag';
    g.dropEl = null;
    g.dragMoved = false;
    makeGhost(g.dragEl);                 // 先克隆，再给原位置打隐藏标记
    g.dragEl.classList.add('drag-src');
    moveGhost(g, g.cx || g.x0, g.cy || g.y0);   // 半空中启动时直接跟到手指下
    if (navigator.vibrate) { try { navigator.vibrate(12); } catch (_) {} }
  }

  function clearDrop(g) {
    if (g && g.dropEl) g.dropEl.classList.remove('drop-on');
    if (g) g.dropEl = null;
  }

  function abortDrag(g) {
    killGhost();
    if (g && g.dragEl) g.dragEl.classList.remove('drag-src');
    clearDrop(g);
  }

  /* 手指下面是什么：
     组件只能在组件之间换；应用图标可以在首页的应用行和第二页之间换；
     底部常驻只在常驻里换 —— 三者互不串味 */
  function updateDrop(g, x, y) {
    const el = g.dragEl;
    const isW = el.classList.contains('w');
    const under = document.elementFromPoint(x, y);
    if (!under || !under.closest) return;
    let t = isW ? under.closest('.w') : under.closest('.tile');
    if (!t || t === el) t = null;
    if (t && !isW) {
      const cs = el.closest('#dock');
      const ct = t.closest('#dock');
      // 一个是常驻、一个不是 → 不许换
      if (!!cs !== !!ct) t = null;
      // 四格组件里的图标不算落点
      else if (!cs && !t.closest('.app-row') && !t.closest('#appGrid') && !t.closest('#appGrid2')) t = null;
    }
    if (t !== g.dropEl) {
      if (g.dropEl) g.dropEl.classList.remove('drop-on');
      g.dropEl = t;
      if (t) t.classList.add('drop-on');
    }
  }

  /* ---- 松手提交：换数组顺序 + 挪 DOM（appendChild 不销毁节点）+ FLIP ---- */
  function flipReorder(box, ids, from) {
    if (!box) return;
    const first = {};
    Array.prototype.forEach.call(box.children, (el) => {
      const k = el.dataset.id || el.dataset.app;
      if (k) first[k] = el.getBoundingClientRect();
    });
    ids.forEach((id) => {
      const el = box.querySelector('.w[data-id="' + id + '"], .tile[data-app="' + id + '"]');
      if (el) box.appendChild(el);
    });
    Array.prototype.forEach.call(box.children, (el) => {
      const k = el.dataset.id || el.dataset.app;
      const f = from && k === from.id ? from.r : first[k];
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

  function commitDrag(g, fromRect) {
    const src = g.dragEl, dst = g.dropEl;
    if (!dst) return false;
    const isW = src.classList.contains('w');
    const idA = isW ? src.dataset.id : src.dataset.app;
    const idB = isW ? dst.dataset.id : dst.dataset.app;
    const box = src.parentElement;
    if (isW) {
      const a = layout.indexOf(idA), b = layout.indexOf(idB);
      if (a < 0 || b < 0) return false;
      layout.splice(a, 1);
      layout.splice(b, 0, idA);
      save(KEY.layout, layout);
      flipAll('.bento .w', 'id', () => { renderBento(); renderBento2(); }, fromRect ? { id: idA, r: fromRect } : null);
    } else {
      const inDock = !!src.closest('#dock');
      const arr = inDock ? DOCK : APPS;
      const a = arr.findIndex((x) => x.id === idA);
      const b = arr.findIndex((x) => x.id === idB);
      if (a < 0 || b < 0) return false;
      const item = arr.splice(a, 1)[0];
      arr.splice(b, 0, item);
      save(KEY.apps, APPS.map((x) => x.id));
      save(KEY.dock, DOCK.map((x) => x.id));
      const sel = inDock ? '#dock .tile' : '.app-row .tile, #appGrid .tile, #appGrid2 .tile';
      flipAll(sel, 'app', () => {
        if (inDock) renderApps(); else { renderBento(); renderApps(); }
      }, fromRect ? { id: idA, r: fromRect } : null);
    }
    return true;
  }

  /* ---- 哪些东西能拖 ---- */
  function draggableAt(e) {
    const t = e.target;
    if (!t || !t.closest) return null;
    const w = t.closest('.bento .w');                              // 桌面组件（含四格里的，算整个组件）
    if (w) return w;
    return t.closest('.app-row .tile, #appGrid .tile, #appGrid2 .tile, #dock .tile');
  }

  /* ---- 手势入口 ---- */
  document.addEventListener('pointerdown', (e) => {
    if (e.button > 0) return;
    if (e.target.closest && e.target.closest('#editDone')) return;
    clearTimeout(pressTimer);

    const de = draggableAt(e);
    const inHome = home.contains(e.target);

    if (editing && !de) {           // 编辑态点空白处 → 收工
      if (inHome) setEdit(false);
      return;
    }
    if (!inHome) return;
    if (!de && e.pointerType !== 'mouse') return;   // 触摸从空白开始 → 交给原生翻页

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
      return;
    }

    if (!ges.mode && (Math.abs(dx) > SWIPE_SLOP || Math.abs(dy) > SWIPE_SLOP)) {
      if (editing || !pager) { ges = null; return; }
      if (Math.abs(dx) <= Math.abs(dy)) return;     // 竖向：主屏没得滚，继续等长按
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
    if (!ges) return;
    const g = ges;
    ges = null;
    if (e && e.pointerId !== g.pid) return;

    if (g.mode === 'drag') {
      const gr = ghostRect();               // 先量 ghost 落点，再撤
      killGhost();
      if (g.dragEl) g.dragEl.classList.remove('drag-src');
      commitDrag(g, gr);
      clearDrop(g);
      suppressClick = performance.now() + 260;
      /* 编辑态留着：可以接着拖下一个；想结束就点「完成」或空白处 */
      return;
    }

    if (g.mode === 'swipe') {
      snapPager();
      suppressClick = performance.now() + 260;
    }
  }
  document.addEventListener('pointerup', endGesture);
  document.addEventListener('pointercancel', (e) => {
    if (!ges || e.pointerId !== ges.pid) return;
    const g = ges;
    ges = null;
    if (g.mode === 'drag') abortDrag(g);
    else if (g.mode === 'swipe') snapPager();
  });

  /* 长按不弹系统菜单；拖完那一瞬间的残余 click 吞掉 */
  document.addEventListener('contextmenu', (e) => {
    if (e.target.closest && e.target.closest('.w, .tile')) e.preventDefault();
  });
  document.addEventListener('click', (e) => {
    if (performance.now() < suppressClick && e.target.closest && e.target.closest('#home')) {
      if (e.target.closest('[data-nodrag]')) return;   // 组件里的按钮不该被吞
      e.stopPropagation();
      e.preventDefault();
    }
  }, true);

  function renderCards() {
    const me = S.memory.userName ? S.memory.userName.slice(0, 1) : '我';

    updateWidgets();

    setTxt('chatAvaHer', herInitial());
    setTxt('moodAvaHer', herInitial());
    setTxt('chatName', herName());
    setTxt('setAvaMe', me);
    setTxt('setNoteHer', herName());
    setTxt('setUserLabel', S.memory.userName || '我');
    setTxt('setMoodLine', '在一起第 ' + daysTogether() + ' 天');

    renderCalendar();
    renderWeek();
    renderMonthStats();
    renderAnniv();
    renderQuote();
    renderTalk();
    renderCountdownCard();
    renderDeviceCard();
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
          '<span class="row-name">' + (c.by === 'her' ? '他用的' : '你用的') + '<em>' + hhmm(c.usedAt) + (c.note ? ' · ' + esc(c.note) : '') + '</em></span>';
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

  function renderHerDay() {
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
          if (currentPage === 'device') renderDevice();
          renderDeviceCard();
        }).catch(() => {});
      }
    } catch (_) {}
    save(KEY.life, S.life);
  }

  function renderDevice() {
    const box = $('deviceList');
    collectDevice();
    if (box) {
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
  function updateHeroMeta() {
    const today = new Date().toDateString();
    const n = S.chat.filter(
      (m) => m.role === 'her' && m.text && new Date(m.ts).toDateString() === today
    ).length;
    const f = (S.memory.facts || []).length;
    const el = $('heroMsgs');
    const meta = el ? el.closest('.hero-meta') : null;

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
      .filter((m) => m.role === 'her' && m.text && new Date(m.ts).toDateString() === today)
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
  let lastTs = 0;

  function nearBottom() {
    return stream.scrollHeight - stream.scrollTop - stream.clientHeight < 140;
  }

  function scrollDown(force) {
    if (force || stickToBottom) {
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
          c.by = 'her';
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
      updateWidgets();
    }
  }

  function splitAction(text) {
    const acts = [];
    const clean = text.replace(/\*([^*\n]{1,80})\*/g, (_, a) => {
      acts.push(a.trim());
      return '';
    }).replace(/\n{3,}/g, '\n\n').trim();
    return { text: clean, action: acts.join(' · ') };
  }

  function buildMessageNode(m) {
    const wrap = document.createElement('div');
    wrap.className = 'msg ' + (m.role === 'her' ? 'her' : 'me');

    const bubble = document.createElement('div');
    bubble.className = 'bubble';

    if (m.action) {
      const em = document.createElement('em');
      em.textContent = m.action;
      bubble.appendChild(em);
    }

    const body = document.createElement('span');
    body.className = 'body';
    body.textContent = m.text || '';
    bubble.appendChild(body);

    wrap.appendChild(bubble);
    return { wrap, body, bubble };
  }

  function appendDateMark(ts) {
    const el = document.createElement('div');
    el.className = 'day-mark';
    const d = new Date(ts);
    const now = new Date();
    const same = now.getFullYear() === d.getFullYear() && now.getMonth() === d.getMonth() && now.getDate() === d.getDate();
    const y = new Date(now.getTime() - 86400000);
    const yday = y.getFullYear() === d.getFullYear() && y.getMonth() === d.getMonth() && y.getDate() === d.getDate();
    el.textContent = same ? '今天' : yday ? '昨天' : (d.getMonth() + 1) + '月' + d.getDate() + '日';
    stream.appendChild(el);
  }

  function syncDayMark(ts) {
    const key = new Date(ts).toDateString();
    if (key === lastDayKey) return;
    lastDayKey = key;
    appendDateMark(ts);
  }

  function syncTimeMark(ts) {
    const prev = lastTs;
    lastTs = ts;
    if (!prev) return;
    if (ts - prev < 30 * 60000) return;
    const el = document.createElement('div');
    el.className = 'time-mark';
    el.textContent = hhmm(ts);
    stream.appendChild(el);
  }

  function appendMessage(m, animate) {
    S.chat.push(m);
    if (S.chat.length > 600) S.chat = S.chat.slice(-500);
    syncDayMark(m.ts);
    syncTimeMark(m.ts);
    const n = buildMessageNode(m);
    n.msg = m;                      // 流式/异步时别再用 S.chat[length-1] 猜，中间可能插进别的消息
    if (!animate) n.wrap.style.animation = 'none';
    stream.appendChild(n.wrap);
    save(KEY.chat, S.chat);
    scrollDown();
    return n;
  }

  function renderHistory() {
    stream.innerHTML = '';
    lastDayKey = '';
    lastTs = 0;
    S.chat.forEach((m) => {
      if (m.gap && m.gap >= 30) stream.appendChild(gapNote(m.gap));
      syncDayMark(m.ts);
      syncTimeMark(m.ts);
      stream.appendChild(buildMessageNode(m).wrap);
    });
    scrollDown(true);
  }

  let typingEl = null;
  function showTyping() {
    if (typingEl) return;
    typingEl = document.createElement('div');
    typingEl.className = 'msg her';
    typingEl.innerHTML = '<div class="typing"><i></i><i></i><i></i></div>';
    stream.appendChild(typingEl);
    scrollDown();
  }
  function hideTyping() {
    if (typingEl) { typingEl.remove(); typingEl = null; }
  }

  function typeOut(node, fullText, speed, done) {
    let i = 0;
    const step = Math.max(1, Math.round(fullText.length / 90));
    const timer = setInterval(() => {
      i = Math.min(fullText.length, i + step);
      node.body.textContent = fullText.slice(0, i);
      scrollDown();
      if (i >= fullText.length) {
        clearInterval(timer);
        if (done) done();
      }
    }, speed);
  }

  /** 他主动说一句（不经过用户输入） */
  function speak(text, action) {
    const clean = stripMarksSync(text);          // 防呆：主动话术里不该有标记
    const body = clean.text || text;
    showTyping();
    setTimeout(() => {
      hideTyping();
      const node = appendMessage({ role: 'her', text: body, action: action || '', ts: Date.now() }, true);
      node.body.textContent = '';
      typeOut(node, body, 28);
      updateHeroMeta();
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
    document.body.dataset.wall = w.preset || 'photo';
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
    const cfg = widgetCfg();
    if (box) {
      box.innerHTML = '';
      layout.forEach((id) => {
        if (!WIDGETS[id]) return;
        const on = cfg.hidden.indexOf(id) < 0;
        const row = document.createElement('div');
        row.className = 'row widget-row';
        row.innerHTML =
          '<span class="row-name">' + (WIDGET_CN[id] || id) + '</span>' +
          '<select class="row-side" data-where="' + id + '">' +
            '<option value="1"' + (cfg.p1.indexOf(id) >= 0 ? ' selected' : '') + '>首页</option>' +
            '<option value="2"' + (cfg.p1.indexOf(id) < 0 ? ' selected' : '') + '>第二页</option>' +
            '<option value="0"' + (!on ? ' selected' : '') + '>不显示</option>' +
          '</select>';
        row.querySelector('select').addEventListener('change', (e) => {
          const v = e.target.value;
          const hidden = widgetCfg().hidden.slice();
          const p1 = widgetCfg().p1.slice();
          const hi = hidden.indexOf(id), pi = p1.indexOf(id);
          if (v === '0') {
            if (hi < 0) hidden.push(id);
          } else {
            if (hi >= 0) hidden.splice(hi, 1);
            if (v === '1' && pi < 0) p1.push(id);
            if (v === '2' && pi >= 0) p1.splice(pi, 1);
          }
          patchWidgets({ hidden: hidden, p1: p1 });
          renderBento();
          renderBento2();
          toast(v === '0' ? '收起来了' : v === '1' ? '挪到首页了' : '挪到第二页了');
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
      if (el) el.addEventListener('change', () => { fn(el.value); renderBento(); renderBento2(); renderApps(); });
    };
    bind('setMix', (v) => patchHome({ mix: v === 'on' }));
    bind('setRows', (v) => patchHome({ rows: Number(v) | 0 }));
    bind('setEvery', (v) => patchHome({ every: Number(v) | 0 }));
    bind('setGap', (v) => { patchHome({ gap: v }); applyGap(v); });

    const reset = $('btnThemeReset');
    if (reset) {
      reset.addEventListener('click', () => {
        if (!confirm('组件和应用都回到默认位置？')) return;
        [KEY.layout, KEY.apps, KEY.dock].forEach((k) => { try { localStorage.removeItem(k); } catch (_) {} });
        layout = LAYOUT_DEFAULT.slice();
        APPS = loadOrder(KEY.apps, APPS_DEFAULT);
        DOCK = loadOrder(KEY.dock, DOCK_DEFAULT);
        patchWidgets([]);
        patchHome(Object.assign({}, HOME_DEFAULT));
        applyGap(HOME_DEFAULT.gap);
        renderBento();
        renderBento2();
        renderApps();
        renderTheme();
        toast('回到默认了');
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
    if (currentPage === 'herday') renderHerDay();
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

  function herProfileCtx() {
    return {
      userName: S.memory.userName || '',
      herName: herName(),
      memories: S.memory.facts || [],
      recent: S.chat.filter((m) => m.role === 'her').slice(-10).map((m) => m.text),
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
    const ctx = herProfileCtx();
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
      try {
        const history = S.chat.slice(-16, -1).map((m) => ({
          role: m.role === 'her' ? 'assistant' : 'user',
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
            });
            const vis = strip.feed(d);          // 只喂增量，绝不喂全文
            const parsed = splitAction(vis);
            if (!node) {
              hideTyping();
              node = appendMessage({ role: 'her', text: parsed.text, action: parsed.action, ts: Date.now() }, true);
              scrollDown();
              return;
            }
            node.msg.text = parsed.text;
            node.msg.action = parsed.action;
            node.body.textContent = parsed.text;
            let em = node.bubble.querySelector('em');
            if (parsed.action) {
              if (!em) {
                em = document.createElement('em');
                node.bubble.insertBefore(em, node.bubble.firstChild);
              }
              em.textContent = parsed.action;
            } else if (em) em.remove();
            scrollDown();
          },
        });

        if (!node) throw new Error('空回复');
        if (strip) {
          const tail = strip.end();
          const parsed = splitAction(strip.text() + tail);
          node.msg.text = parsed.text || '……';
          node.msg.action = parsed.action;
          node.body.textContent = node.msg.text;
        }
        save(KEY.chat, S.chat);
        applyEffects([2.5, -1, 2]);
        finish();
        return;
      } catch (err) {
        hideTyping();
        if (received && node) {
          // 断在流中途：已收到的标记不能丢，被扣住的尾巴要吐回
          if (strip) {
            const parsed = splitAction(strip.text() + strip.end());
            node.msg.text = parsed.text || '……';
            node.msg.action = parsed.action;
          }
          if (!node.msg.text) node.msg.text = '……';
          node.body.textContent = node.msg.text;
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
      const node = appendMessage({ role: 'her', text: clean.text, action: r.action, ts: Date.now() }, true);
      node.body.textContent = '';
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

  function send(text) {
    const t = (text || '').trim();
    if (!t || busy) return;

    // 隔了多久才回 —— 记在消息上，重放历史时还在
    const prev = S.chat.filter((m) => m.ts).slice(-1)[0];
    const gapMin = prev ? Math.round((Date.now() - prev.ts) / 60000) : 0;
    lastGapMin = gapMin;
    if (gapMin >= 30) stream.appendChild(gapNote(gapMin));

    clearKind('continuation');            // 你回话了，续话闹钟取消
    appendMessage({ role: 'me', text: t, action: '', ts: Date.now(), gap: gapMin >= 30 ? gapMin : 0 }, true);

    const mem = P.extractMemory(t);
    if (mem) {
      const facts = S.memory.facts || [];
      if (!facts.includes(mem.text) && facts.length < 40) {
        S.memory.facts.push(mem.text);
        save(KEY.memory, S.memory);
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
    updateHeroMeta();
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
    $('setHerName').value = S.memory.herName || '宋祁';
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
    setTxt('herTagModel', LLM.configured(S.settings) ? '已接模型' : '未接模型');
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
  $('setHerName').addEventListener('change', (e) => {
    S.memory.herName = e.target.value.trim() || '宋祁';
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
    setTxt('herTagModel', LLM.configured(S.settings) ? '已接模型' : '未接模型');
    if (S.settings.enabled && !LLM.configured(S.settings)) toast('再把地址、模型和 Key 填上才生效');
    else if (S.settings.enabled) toast('已接入，他换一种方式说话');
  });

  /* ---------------- 记忆 ---------------- */

  function renderMemoryPage() {
    const ul = $('allMemories');
    if (!ul) return;
    const facts = S.memory.facts || [];

    $('memCount').textContent = facts.length;
    $('allMemoryHint').hidden = facts.length > 0;

    ul.innerHTML = '';
    facts.slice().reverse().forEach((f, revIdx) => {
      const idx = facts.length - 1 - revIdx;
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
    a.download = herName() + '-备份-' + todayStr() + '.json';
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
        renderBento2();
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
    Object.keys(KEY).forEach((k) => localStorage.removeItem(KEY[k]));
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

  function boot() {
    renderBento();
    renderBento2();
    renderApps();
    renderCards();
    renderMood();
    renderChips();
    renderHistory();
    tickClocks();
    updateSendState();

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
        const node = appendMessage({ role: 'her', text: g, action: '', ts: Date.now() }, true);
        node.body.textContent = '';
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
        [KEY.layout, KEY.apps, KEY.dock].forEach((k) => {
          try { localStorage.removeItem(k); } catch (_) {}
        });
        layout = LAYOUT_DEFAULT.slice();
        APPS = loadOrder(KEY.apps, APPS_DEFAULT);
        DOCK = loadOrder(KEY.dock, DOCK_DEFAULT);
        setEdit(false);
        renderBento();
        renderApps();
        toast('布局恢复默认了');
      });
    }

    const heroCard = $('heroCard');
    if (heroCard) {
      heroCard.addEventListener('click', () => openPage('mood'));
      heroCard.style.cursor = 'pointer';
    }

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
    if (moreMem) moreMem.addEventListener('click', () => openPage('memory'));

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
