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
    ['#ffe4ec', '#f8c6d5', '#bf6b83'],
    ['#e2eefc', '#c3d8f3', '#6885ab'],
    ['#fdf0dc', '#f6ddb8', '#a8814c'],
    ['#ece4fc', '#d8c8f5', '#8268ab'],
    ['#e0f4e8', '#c3e6d3', '#5f9478'],
    ['#ffe9e0', '#f9cfc0', '#b87360'],
  ];

  function tintFor(id) {
    let h = 7;
    for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 9973;
    return TINTS[h % TINTS.length];
  }

  const APPS = [
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
    { id: 'theme',    name: '美化',     icon: 'i-palette', desc: '换壁纸、换主题、换他说话的风格。同一个房间，不同的光。' },
    { id: 'wake',     name: '自主唤醒', icon: 'i-bell',    desc: '不只被叫才说话。定时或随机地，主动找你一次。\n纯前端只能在页面打开时生效；要做到真提醒得走通知 + 服务端。' },
    { id: 'wish',     name: '心愿',     icon: 'i-spark',   desc: '想一起做的事。做掉一件，划掉一件。' },

    /* 第四页 · 我们的 */
    { id: 'message',  name: '留言',     icon: 'i-mail',    desc: '他不在的时候，你可以留一句；他回来会先看到。反过来也一样。' },
    { id: 'starsea',  name: '星海',     icon: 'i-starsea', desc: '一片只属于你们的夜空。看过的、想去的、说过的，都挂成星星。' },
    { id: 'travel',   name: '旅行',     icon: 'i-plane',   desc: '想去哪、什么时候去、要带什么。攒够了就出发。' },
  ];

  const DOCK = [
    { id: 'chat',     name: '说', icon: 'i-chat',  page: 'chat' },
    { id: 'mood',     name: '他', icon: 'i-face',  page: 'mood' },
    { id: 'memory',   name: '记', icon: 'i-brain', page: 'memory' },
    { id: 'settings', name: '我', icon: 'i-gear',  page: 'settings' },
  ];

  /* ---------------- 存储 ---------------- */

  const KEY = {
    chat: 'hc.v1.chat',
    persona: 'hc.v1.persona',
    memory: 'hc.v1.memory',
    settings: 'hc.v1.settings',
    mood: 'hc.v1.mood',
    layout: 'hc.v1.layout',
  };

  const load = (k, fb) => {
    try { const r = localStorage.getItem(k); return r ? JSON.parse(r) : fb; }
    catch (_) { return fb; }
  };
  const save = (k, v) => {
    try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) {}
  };

  const pad = (n) => String(n).padStart(2, '0');
  const todayStr = () => {
    const d = new Date();
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  };

  const S = {
    chat: load(KEY.chat, []),
    persona: load(KEY.persona, { mood: 58, energy: 62, affection: 12, lastTick: Date.now() }),
    memory: load(KEY.memory, { userName: '', herName: '宋祁', facts: [], startDate: todayStr() }),
    settings: load(KEY.settings, { enabled: false, apiBase: '', model: '', apiKey: '' }),
    moodLog: load(KEY.mood, {}),
  };

  S.persona = P.evolve(S.persona, Date.now());
  save(KEY.persona, S.persona);

  // 从旧版本迁移：默认名换过一次
  if (S.memory.herName === '小满') {
    S.memory.herName = '宋祁';
    save(KEY.memory, S.memory);
  }

  const persistAll = () => {
    save(KEY.chat, S.chat);
    save(KEY.persona, S.persona);
    save(KEY.memory, S.memory);
    save(KEY.settings, S.settings);
    save(KEY.mood, S.moodLog);
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
    b.addEventListener('click', () => openApp(app));
    return b;
  }

  function renderApps() {
    const grid = $('appGrid');
    const dock = $('dock');
    grid.innerHTML = '';
    dock.innerHTML = '';
    APPS.forEach((a) => grid.appendChild(makeTile(a)));
    DOCK.forEach((a) => dock.appendChild(makeTile(a)));
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
    for (let d = 1; d <= total; d++) {
      const s = document.createElement('span');
      s.textContent = d;
      if (d === now.getDate()) s.className = 'today';
      else if (start.getFullYear() === y && start.getMonth() === m && d === start.getDate()) s.className = 'anniv';
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

    /* 手机上翻页交给原生滑动（有惯性、有吸附）；
       桌面鼠标拖拽不会产生原生滚动，这里补一套 */
    let mdrag = null;
    let dragged = false;

    pager.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'mouse') return;
      mdrag = { x0: e.clientX, sl: pager.scrollLeft };
      dragged = false;
    });

    window.addEventListener('pointermove', (e) => {
      if (!mdrag) return;
      const dx = e.clientX - mdrag.x0;
      if (!dragged && Math.abs(dx) > 6) {
        dragged = true;
        pager.style.scrollSnapType = 'none';
        pager.classList.add('dragging');
      }
      if (!dragged) return;
      pager.scrollLeft = mdrag.sl - dx;
    });

    window.addEventListener('pointerup', () => {
      if (!mdrag) return;
      const moved = dragged;
      mdrag = null;
      if (!moved) return;
      pager.style.scrollSnapType = '';
      pager.classList.remove('dragging');
      const w = pager.clientWidth || 1;
      const i = Math.round(pager.scrollLeft / w);
      pager.scrollTo({ left: i * w, behavior: 'smooth' });
      setTimeout(() => { dragged = false; }, 80);
    });

    // 拖完那一下别误触发图标
    pager.addEventListener('click', (e) => {
      if (dragged) { e.stopPropagation(); e.preventDefault(); }
    }, true);
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
      col: 4, row: 2,
      html: () =>
        '<div class="w-music"><div class="music-row">' +
          '<div class="mcover"></div>' +
          '<div class="mmeta">' +
            '<p class="mkicker">NOW PLAYING</p>' +
            '<p class="mtitle" id="musicTitle">还没开始</p>' +
            '<div class="mbar"><i id="musicBar"></i></div>' +
          '</div>' +
          '<button class="mplay" id="musicPlay" aria-label="播放">▶</button>' +
        '</div></div>',
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

  const LAYOUT_DEFAULT = ['pair', 'days', 'clock', 'quad', 'music', 'diary'];
  let layout = load(KEY.layout, LAYOUT_DEFAULT.slice());

  function renderBento() {
    const box = $('bento');
    if (!box) return;
    box.innerHTML = '';

    layout.forEach((id) => {
      const w = WIDGETS[id];
      if (!w) return;
      const el = document.createElement('div');
      el.className = 'w glass w-' + id;
      el.dataset.id = id;
      el.style.gridColumn = 'span ' + w.col;
      el.style.gridRow = 'span ' + w.row;
      el.innerHTML = w.html();
      box.appendChild(el);

      if (id === 'clock' || id === 'pair' || id === 'days') {
        el.addEventListener('click', () => { if (!editing) openPage('mood'); });
      } else if (id === 'diary') {
        el.addEventListener('click', () => { if (!editing) openPage('chat'); });
      } else if (id === 'music') {
        el.addEventListener('click', () => { if (!editing) toast('一起听还没接上'); });
      }
    });

    renderQuad();
    bindMusic();
    updateWidgets();
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
  }

  /* ---- 长按进入编辑，拖动换位 ---- */
  let editing = false;
  let dragId = null;
  let pressTimer = 0;
  let press = null;

  function setEdit(on) {
    editing = on;
    const box = $('bento');
    if (box) box.classList.toggle('editing', on);
    document.body.classList.toggle('widget-editing', on);
    const btn = $('editDone');
    if (btn) btn.hidden = !on;
    const hint = $('editHint');
    if (hint) hint.hidden = !on;
    if (!on) {
      dragId = null;
      document.querySelectorAll('.w.dragging').forEach((w) => w.classList.remove('dragging'));
      save(KEY.layout, layout);
    }
  }

  function startDrag(id) {
    const el = document.querySelector('.w[data-id="' + id + '"]');
    if (!el) return;
    dragId = id;
    el.classList.add('dragging');
  }

  function swapTo(targetId) {
    if (!dragId || !targetId || targetId === dragId) return;
    const a = layout.indexOf(dragId);
    const b = layout.indexOf(targetId);
    if (a < 0 || b < 0) return;

    layout.splice(a, 1);
    layout.splice(b, 0, dragId);
    renderBento();
    startDrag(dragId);
    save(KEY.layout, layout);
  }

  /* 用 document 级事件：手指滑出格子也不会断 */
  document.addEventListener('pointerdown', (e) => {
    if (e.target.closest('#editDone')) return;
    const w = e.target.closest('.w');
    if (!w) return;
    const id = w.dataset.id;

    if (editing) {
      e.preventDefault();
      startDrag(id);
      return;
    }

    press = { x: e.clientX, y: e.clientY, id };
    clearTimeout(pressTimer);
    pressTimer = setTimeout(() => {
      if (!press) return;
      setEdit(true);
      startDrag(press.id);
      if (navigator.vibrate) { try { navigator.vibrate(12); } catch (_) {} }
      press = null;
    }, 420);
  }, { passive: false });

  document.addEventListener('pointermove', (e) => {
    // 还没进入编辑：手一动就取消长按（避免误触）
    if (press && !editing) {
      if (Math.abs(e.clientX - press.x) > 10 || Math.abs(e.clientY - press.y) > 10) {
        clearTimeout(pressTimer);
        press = null;
      }
    }

    if (!dragId) return;
    if (e.cancelable) e.preventDefault();

    const under = document.elementFromPoint(e.clientX, e.clientY);
    const target = under && under.closest ? under.closest('.w') : null;
    if (target) swapTo(target.dataset.id);
  }, { passive: false });

  function stopDrag() {
    clearTimeout(pressTimer);
    press = null;
    dragId = null;
    document.querySelectorAll('.w.dragging').forEach((w) => w.classList.remove('dragging'));
  }
  document.addEventListener('pointerup', stopDrag);
  document.addEventListener('pointercancel', stopDrag);

  // 长按不要弹系统菜单
  document.addEventListener('contextmenu', (e) => {
    if (e.target.closest('.w')) e.preventDefault();
  });

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
    showTyping();
    setTimeout(() => {
      hideTyping();
      const node = appendMessage({ role: 'her', text, action: action || '', ts: Date.now() }, true);
      node.body.textContent = '';
      typeOut(node, text, 28);
      updateHeroMeta();
      renderTalk();
      renderQuote();
      if (currentPage !== 'chat') addBadge('chat');
    }, 700 + Math.random() * 500);
  }

  function herProfileCtx() {
    return {
      userName: S.memory.userName || '',
      herName: herName(),
      memories: S.memory.facts || [],
      recent: S.chat.filter((m) => m.role === 'her').slice(-10).map((m) => m.text),
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

  async function respond(userText) {
    const ctx = herProfileCtx();
    const cfg = S.settings;
    busy = true;
    updateSendState();

    if (LLM.configured(cfg)) {
      showTyping();
      let node = null;
      let received = false;
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
          onDelta: (_d, full) => {
            received = true;
            const parsed = splitAction(full);
            if (!node) {
              hideTyping();
              node = appendMessage({ role: 'her', text: parsed.text, action: parsed.action, ts: Date.now() }, true);
              scrollDown();
              return;
            }
            const m = S.chat[S.chat.length - 1];
            m.text = parsed.text;
            m.action = parsed.action;
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
        save(KEY.chat, S.chat);
        applyEffects([2.5, -1, 2]);
        finish();
        return;
      } catch (err) {
        hideTyping();
        if (received && node) {
          const m = S.chat[S.chat.length - 1];
          if (!m.text) m.text = '……';
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
      const node = appendMessage({ role: 'her', text: r.text, action: r.action, ts: Date.now() }, true);
      node.body.textContent = '';
      typeOut(node, r.text, 26);
      applyEffects(r.effects);
      save(KEY.chat, S.chat);
      finish();
    }, thinkTime);
  }

  function finish() {
    busy = false;
    lastInteract = Date.now();
    updateSendState();
    renderQuote();
    renderHomeMemories();
    renderWeek();
    if (currentPage !== 'chat') addBadge('chat');
  }

  function send(text) {
    const t = (text || '').trim();
    if (!t || busy) return;

    appendMessage({ role: 'me', text: t, action: '', ts: Date.now() }, true);

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
        persistAll();
        renderHistory();
        renderCards();
        renderMood();
        tickClocks();
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

    setInterval(() => {
      S.persona = P.evolve(S.persona, Date.now());
      tickClocks();
      save(KEY.persona, S.persona);
    }, 60000);

    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        S.persona = P.evolve(S.persona, Date.now());
        tickClocks();
        renderChips();
        save(KEY.persona, S.persona);
      }
    });

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
  }

  boot();
})();
