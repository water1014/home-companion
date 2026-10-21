/* ============================================================
   app.js — 小满手机 · 界面 / 存储 / 交互
   想加新功能：在下面 APPS 里注册一条即可
   ============================================================ */
(function () {
  'use strict';

  const P = window.Persona;
  const LLM = window.LLM;
  const $ = (id) => document.getElementById(id);

  /* ============================================================
     应用注册表 —— 之后加功能就在这里加一条
     page: 'chat' | 'mood' | 'settings'（已有页面）
     page 留空 = 占位抽屉（点开是"还没盖好"）
     ============================================================ */
  const APPS = [
    { id: 'chat',  name: '聊天', icon: 'i-chat',  page: 'chat' },
    { id: 'mood',  name: '心情', icon: 'i-face',  page: 'mood' },
    { id: 'music', name: '音乐', icon: 'i-music' },
    { id: 'memo',  name: '回忆', icon: 'i-photo' },
    { id: 'wish',  name: '心愿', icon: 'i-star' },
    { id: 'mail',  name: '信箱', icon: 'i-mail' },
  ];

  const DOCK = [
    { id: 'chat',     name: '聊天', icon: 'i-chat',  page: 'chat' },
    { id: 'mail',     name: '信箱', icon: 'i-mail' },
    { id: 'memo',     name: '回忆', icon: 'i-photo' },
    { id: 'settings', name: '我的', icon: 'i-gear',  page: 'settings' },
  ];

  /* ---------------- 存储 ---------------- */

  const KEY = {
    chat: 'hc.v1.chat',
    persona: 'hc.v1.persona',
    memory: 'hc.v1.memory',
    settings: 'hc.v1.settings',
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
    memory: load(KEY.memory, { userName: '', herName: '小满', facts: [], startDate: todayStr() }),
    settings: load(KEY.settings, { enabled: false, apiBase: '', model: '', apiKey: '' }),
  };

  S.persona = P.evolve(S.persona, Date.now());
  save(KEY.persona, S.persona);

  const persistAll = () => {
    save(KEY.chat, S.chat);
    save(KEY.persona, S.persona);
    save(KEY.memory, S.memory);
    save(KEY.settings, S.settings);
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

  const herName = () => S.memory.herName || '小满';
  const herInitial = () => (herName().trim()[0] || '满');

  function daysTogether() {
    const start = new Date((S.memory.startDate || todayStr()) + 'T00:00:00');
    return Math.max(0, Math.floor((Date.now() - start.getTime()) / 86400000)) + 1;
  }

  /* ---------------- 路由 + 手势 ---------------- */

  const phone = $('phone');
  const home = $('home');
  const dim = document.querySelector('.home-dim');
  const pages = { chat: $('chat'), mood: $('mood'), settings: $('settings'), todo: $('todo') };

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

  function makeTile(app) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'tile';
    b.dataset.app = app.id;
    b.innerHTML =
      '<span class="tile-ic"><svg><use href="#' + app.icon + '"/></svg><i class="badge"></i></span>' +
      '<span class="tile-name">' + app.name + '</span>';
    b.addEventListener('click', () => {
      if (app.page) openPage(app.page);
      else {
        $('todoTitle').textContent = app.name;
        $('todoIcon').setAttribute('href', '#' + app.icon);
        openPage('todo');
      }
    });
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
    const t = pad(now.getHours()) + ':' + pad(now.getMinutes());
    $('lockClock').textContent = t;
    $('homeClock').textContent = t;
    $('lockDate').textContent = dateLabel(now);
    $('clockDate').textContent = dateLabel(now);
    $('sbDate').textContent = dateLabel(now);
    $('sbEnergy').textContent = Math.round(S.persona.energy);
    $('clockStatus').textContent = P.statusLine(S.persona, Date.now());
    $('chatStatus').textContent = P.statusLine(S.persona, Date.now());
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

  /* ---------------- 卡片 / 头像 ---------------- */

  function renderCards() {
    const days = daysTogether();
    $('lockDays').textContent = days;
    $('homeDays').textContent = days;
    $('lockSince').textContent = 'SINCE ' + (S.memory.startDate || todayStr()).replace(/-/g, '.');

    const me = S.memory.userName ? S.memory.userName.slice(0, 1) : '我';
    ['lockAvaMe', 'homeAvaMe', 'setAvaMe'].forEach((id) => { $(id).textContent = me; });
    ['lockAvaHer', 'homeAvaHer', 'chatAvaHer', 'moodAvaHer'].forEach((id) => { $(id).textContent = herInitial(); });

    $('lockNames').textContent = 'Me & ' + herName();
    $('chatName').textContent = herName();
    $('setNoteHer').textContent = herName();
    $('setUserLabel').textContent = S.memory.userName || '我';
    $('setMoodLine').textContent = P.moodSub(S.persona);
    renderCalendar();
  }

  function renderMood() {
    const p = S.persona;
    $('moodWord').textContent = P.moodWord(p);
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

  function typeOut(node, fullText, speed) {
    let i = 0;
    const step = Math.max(1, Math.round(fullText.length / 90));
    const timer = setInterval(() => {
      i = Math.min(fullText.length, i + step);
      node.body.textContent = fullText.slice(0, i);
      scrollDown();
      if (i >= fullText.length) clearInterval(timer);
    }, speed);
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
        toast('模型没接上，让她自己说');
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

  function maybeInitiate() {
    if (busy || document.hidden) return;
    if (Date.now() - lastInteract < 180000) return;
    if (Math.random() > 0.35) return;

    const say = P.initiative(S.persona, Date.now());
    if (!say) return;

    showTyping();
    setTimeout(() => {
      hideTyping();
      const node = appendMessage({ role: 'her', text: say.text, action: say.action, ts: Date.now() }, true);
      node.body.textContent = '';
      typeOut(node, say.text, 30);
      S.persona.energy = clamp(S.persona.energy - 0.6);
      S.persona.mood = clamp(S.persona.mood + 0.8);
      save(KEY.persona, S.persona);
      tickClocks();
      lastInteract = Date.now() - 120000;
      if (currentPage !== 'chat') addBadge('chat');
    }, 900 + Math.random() * 900);
  }

  setInterval(maybeInitiate, 75000);

  /* ---------------- 设置 ---------------- */

  function syncSettingsForm() {
    $('setUserName').value = S.memory.userName || '';
    $('setHerName').value = S.memory.herName || '小满';
    $('setStartDate').value = S.memory.startDate || todayStr();
    $('setApiBase').value = S.settings.apiBase || '';
    $('setModel').value = S.settings.model || '';
    $('setApiKey').value = S.settings.apiKey || '';
    $('toggleLLM').setAttribute('aria-checked', String(!!S.settings.enabled));
  }

  $('setUserName').addEventListener('change', (e) => {
    S.memory.userName = e.target.value.trim();
    save(KEY.memory, S.memory);
    renderCards();
  });
  $('setHerName').addEventListener('change', (e) => {
    S.memory.herName = e.target.value.trim() || '小满';
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
    if (S.settings.enabled && !LLM.configured(S.settings)) toast('再把地址、模型和 Key 填上才生效');
    else if (S.settings.enabled) toast('已接入，她换一种方式说话');
  });

  $('btnAddMemory').addEventListener('click', () => {
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
      renderMood();
    };
    ok.addEventListener('click', commit);
    inp.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter') { ev.preventDefault(); commit(); }
      if (ev.key === 'Escape') wrap.remove();
    });
    wrap.appendChild(inp);
    wrap.appendChild(ok);
    $('memories').before(wrap);
    inp.focus();
  });

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
    renderApps();
    renderCards();
    renderMood();
    renderChips();
    renderHistory();
    tickClocks();
    updateSendState();

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
        typeOut(node, g, 34);
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

    $('clockStatus').addEventListener('click', () => openPage('mood'));
    $('daysCard').addEventListener('click', () => openPage('mood'));

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
