/* ============================================================
   app.js — 界面 / 存储 / 交互
   ============================================================ */
(function () {
  'use strict';

  const P = window.Persona;
  const LLM = window.LLM;

  /* ---------------- 存储 ---------------- */

  const KEY = {
    chat: 'hc.v1.chat',
    persona: 'hc.v1.persona',
    memory: 'hc.v1.memory',
    settings: 'hc.v1.settings',
  };

  const load = (k, fb) => {
    try {
      const raw = localStorage.getItem(k);
      return raw ? JSON.parse(raw) : fb;
    } catch (_) { return fb; }
  };
  const save = (k, v) => {
    try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) { /* 配额满了就算了 */ }
  };

  const todayStr = () => {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  };

  const S = {
    chat: load(KEY.chat, []),
    persona: load(KEY.persona, { mood: 58, energy: 62, affection: 12, lastTick: Date.now() }),
    memory: load(KEY.memory, { userName: '', herName: '小满', facts: [], startDate: todayStr() }),
    settings: load(KEY.settings, { enabled: false, apiBase: '', model: '', apiKey: '' }),
  };

  /* 启动时按离线时长推进状态 */
  S.persona = P.evolve(S.persona, Date.now());
  save(KEY.persona, S.persona);

  const persistAll = () => {
    save(KEY.chat, S.chat);
    save(KEY.persona, S.persona);
    save(KEY.memory, S.memory);
    save(KEY.settings, S.settings);
  };

  /* ---------------- DOM ---------------- */

  const $ = (id) => document.getElementById(id);
  const stream = $('stream');
  const input = $('input');
  const form = $('composer');
  const sendBtn = $('send');
  const quick = $('quick');
  const statusLine = $('statusLine');
  const avatar = $('avatar');

  let busy = false;
  let lastInteract = Date.now();
  let stickToBottom = true;

  /* ---------------- 工具 ---------------- */

  const clamp = P.clamp;
  const hhmm = (ts) => {
    const d = new Date(ts);
    return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  };

  function dayLabel(ts) {
    const d = new Date(ts);
    const now = new Date();
    const sameDay = (a, b) =>
      a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
    if (sameDay(d, now)) return '今天';
    const y = new Date(now.getTime() - 86400000);
    if (sameDay(d, y)) return '昨天';
    if (d.getFullYear() === now.getFullYear()) return (d.getMonth() + 1) + '月' + d.getDate() + '日';
    return d.getFullYear() + '年' + (d.getMonth() + 1) + '月' + d.getDate() + '日';
  }

  function toast(text) {
    const el = $('toast');
    el.textContent = text;
    el.classList.add('show');
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove('show'), 2600);
  }

  function nearBottom() {
    return stream.scrollHeight - stream.scrollTop - stream.clientHeight < 140;
  }

  function scrollDown(force) {
    if (force || stickToBottom) {
      stream.scrollTo({ top: stream.scrollHeight, behavior: force ? 'auto' : 'smooth' });
    }
  }

  /** 从 LLM 输出里分离 *动作* 与正文 */
  function splitAction(text) {
    const acts = [];
    const clean = text.replace(/\*([^*\n]{1,80})\*/g, (_, a) => {
      acts.push(a.trim());
      return '';
    }).replace(/\n{3,}/g, '\n\n').trim();
    return { text: clean, action: acts.join(' · ') };
  }

  /* ---------------- 渲染 ---------------- */

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
    el.textContent = dayLabel(ts);
    stream.appendChild(el);
  }

  /* 时间分隔：同一段对话里，超过半小时才出现一次 */
  let lastTs = 0;
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

  let lastDayKey = '';

  function syncDayMark(ts) {
    const key = new Date(ts).toDateString();
    if (key === lastDayKey) return;
    lastDayKey = key;
    appendDateMark(ts);
  }

  function renderHistory() {
    stream.innerHTML = '';
    lastDayKey = '';
    lastTs = 0;
    S.chat.forEach((m) => {
      syncDayMark(m.ts);
      syncTimeMark(m.ts);
      const n = buildMessageNode(m);
      stream.appendChild(n.wrap);
    });
    scrollDown(true);
  }

  function appendMessage(m, animate) {
    S.chat.push(m);
    // 控制历史长度，避免 localStorage 撑爆
    if (S.chat.length > 600) S.chat = S.chat.slice(-500);

    syncDayMark(m.ts);
    syncTimeMark(m.ts);
    const n = buildMessageNode(m);
    if (animate === false) {
      stream.appendChild(n.wrap);
    } else {
      n.wrap.style.animation = 'none';
      stream.appendChild(n.wrap);
      void n.wrap.offsetWidth;
      n.wrap.style.animation = '';
    }
    save(KEY.chat, S.chat);
    scrollDown();
    return n;
  }

  /* 打字指示器 */
  let typingEl = null;
  function showTyping() {
    if (typingEl) return;
    typingEl = document.createElement('div');
    typingEl.className = 'msg her';
    typingEl.innerHTML = '<div class="typing"><i></i><i></i><i></i></div>';
    stream.appendChild(typingEl);
    avatar.classList.add('typing');
    scrollDown();
  }
  function hideTyping() {
    if (typingEl) { typingEl.remove(); typingEl = null; }
    avatar.classList.remove('typing');
  }

  /** 逐字显示 */
  function typeOut(node, fullText, speed, done) {
    let i = 0;
    const step = Math.max(1, Math.round(fullText.length / 90));
    const timer = setInterval(() => {
      i = Math.min(fullText.length, i + step);
      node.body.textContent = fullText.slice(0, i);
      scrollDown();
      if (i >= fullText.length) {
        clearInterval(timer);
        done && done();
      }
    }, speed);
  }

  /* ---------------- 顶栏 / 面板 ---------------- */

  function renderStatus() {
    statusLine.textContent = P.statusLine(S.persona, Date.now());
  }

  function renderPanel() {
    const p = S.persona;
    $('moodWord').textContent = P.moodWord(p);
    $('moodSub').textContent = P.moodSub(p);
    $('vMood').textContent = Math.round(p.mood);
    $('vEnergy').textContent = Math.round(p.energy);
    $('vAffection').textContent = Math.round(p.affection);
    $('bMood').style.width = Math.round(p.mood) + '%';
    $('bEnergy').style.width = Math.round(p.energy) + '%';
    $('bAffection').style.width = Math.round(p.affection) + '%';

    // 记忆
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
      del.onclick = () => {
        S.memory.facts.splice(idx, 1);
        save(KEY.memory, S.memory);
        renderPanel();
      };
      li.appendChild(span);
      li.appendChild(del);
      ul.appendChild(li);
    });

    // 天数
    const start = new Date((S.memory.startDate || todayStr()) + 'T00:00:00');
    const days = Math.max(0, Math.floor((Date.now() - start.getTime()) / 86400000)) + 1;
    $('daysCount').textContent = days;
    $('sinceDate').textContent = '从 ' + (S.memory.startDate || todayStr()) + ' 算起';
  }

  /* ---------------- 对话核心 ---------------- */

  function herProfileCtx() {
    return {
      userName: S.memory.userName || '',
      herName: S.memory.herName || '小满',
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
    renderStatus();
  }

  async function respond(userText) {
    const ctx = herProfileCtx();
    const cfg = S.settings;

    busy = true;

    /* --- 优先走大模型 --- */
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
            } else if (em) {
              em.remove();
            }
            scrollDown();
          },
        });

        if (!node) throw new Error('空回复');

        save(KEY.chat, S.chat);
        applyEffects([2.5, -1, 2]);
        busy = false;
        lastInteract = Date.now();
        return;
      } catch (err) {
        hideTyping();

        // 已经吐出一部分内容：保留，不再叠一条回复
        if (received && node) {
          const m = S.chat[S.chat.length - 1];
          if (!m.text) m.text = '……';
          save(KEY.chat, S.chat);
          busy = false;
          lastInteract = Date.now();
          toast('连接断了，先说到这儿');
          return;
        }

        toast('模型没接上，让她自己说');
      }
    }

    /* --- 本地人格引擎兜底 --- */
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
      busy = false;
      lastInteract = Date.now();
    }, thinkTime);
  }

  function send(text) {
    const t = (text || '').trim();
    if (!t || busy) return;

    const m = { role: 'me', text: t, action: '', ts: Date.now() };
    appendMessage(m, true);

    // 记忆抽取
    const mem = P.extractMemory(t);
    if (mem) {
      const exists = (S.memory.facts || []).some((f) => f === mem.text);
      if (!exists && S.memory.facts.length < 40) {
        S.memory.facts.push(mem.text);
        save(KEY.memory, S.memory);
        renderPanel();
      }
    }

    input.value = '';
    autosize();
    updateSendState();
    stickToBottom = true;
    respond(t);
  }

  /* ---------------- 输入框 ---------------- */

  function autosize() {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 132) + 'px';
  }

  function updateSendState() {
    sendBtn.disabled = !input.value.trim() || busy;
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (busy) return;
    send(input.value);
  });

  input.addEventListener('input', () => {
    autosize();
    updateSendState();
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
      e.preventDefault();
      if (!busy) send(input.value);
    }
  });

  /* 快捷短语 */
  const CHIPS = ['在干嘛', '我回来了', '今天好累', '想你', '晚安'];
  function renderChips() {
    quick.innerHTML = '';
    // 深夜换一组
    const h = new Date().getHours();
    const list = h >= 22 || h < 5 ? ['还没睡？', '有点想你', '今天糟透了', '晚安'] : CHIPS;
    list.forEach((t) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip';
      b.textContent = t;
      b.onclick = () => send(t);
      quick.appendChild(b);
    });
  }

  /* ---------------- 面板 / 设置 ---------------- */

  const panel = $('panel');
  const settings = $('settings');

  function openPanel(open) {
    panel.classList.toggle('open', open);
    panel.setAttribute('aria-hidden', String(!open));
    document.body.classList.toggle('panel-open', open);
    if (open) renderPanel();
  }

  function openSettings(open) {
    settings.classList.toggle('open', open);
    settings.setAttribute('aria-hidden', String(!open));
    if (open) syncSettingsForm();
  }

  $('btnPanel').onclick = () => openPanel(!panel.classList.contains('open'));
  $('btnClosePanel').onclick = () => openPanel(false);
  $('btnSettings').onclick = () => openSettings(true);
  $('btnCloseSettings').onclick = () => openSettings(false);

  settings.addEventListener('click', (e) => {
    if (e.target === settings) openSettings(false);
  });

  // 点空白处关面板
  document.addEventListener('click', (e) => {
    if (!panel.classList.contains('open')) return;
    if (panel.contains(e.target) || $('btnPanel').contains(e.target)) return;
    openPanel(false);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { openPanel(false); openSettings(false); }
  });

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
  });
  $('setHerName').addEventListener('change', (e) => {
    S.memory.herName = e.target.value.trim() || '小满';
    $('herName').textContent = S.memory.herName;
    save(KEY.memory, S.memory);
  });
  $('setStartDate').addEventListener('change', (e) => {
    S.memory.startDate = e.target.value || todayStr();
    save(KEY.memory, S.memory);
    renderPanel();
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
    if (S.settings.enabled && !LLM.configured(S.settings)) {
      toast('再把地址、模型和 Key 填上才生效');
    } else if (S.settings.enabled) {
      toast('已接入，她换一种方式说话');
    }
  });

  // 添加记忆（内联输入）
  $('btnAddMemory').onclick = () => {
    if (document.getElementById('memInput')) return;
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
        renderPanel();
      }
      wrap.remove();
    };
    ok.onclick = commit;
    inp.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter') { ev.preventDefault(); commit(); }
      if (ev.key === 'Escape') wrap.remove();
    });
    wrap.appendChild(inp);
    wrap.appendChild(ok);
    $('memories').before(wrap);
    inp.focus();
  };

  /* ---------------- 导入 / 导出 / 清空 ---------------- */

  $('btnExport').onclick = () => {
    const data = {
      app: 'home-companion',
      version: 1,
      exportedAt: new Date().toISOString(),
      chat: S.chat,
      persona: S.persona,
      memory: S.memory,
      settings: Object.assign({}, S.settings, { apiKey: '' }),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = '小满-备份-' + todayStr() + '.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    toast('已导出（不含密钥）');
  };

  $('btnImport').onclick = () => $('importFile').click();

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
        renderStatus();
        renderPanel();
        openSettings(false);
        toast('导入完成');
      } catch (err) {
        toast('这个文件读不了');
      }
    };
    reader.readAsText(f);
    e.target.value = '';
  });

  $('btnReset').onclick = () => {
    if (!confirm('会删掉这段关系里的所有记录和记忆，且无法恢复。确定？')) return;
    Object.values(KEY).forEach((k) => localStorage.removeItem(k));
    location.reload();
  };

  /* ---------------- 主动消息 ---------------- */

  function maybeInitiate() {
    if (busy || document.hidden) return;
    if (Date.now() - lastInteract < 180000) return; // 3 分钟内刚聊过就不打扰
    if (Math.random() > 0.35) return;

    const say = P.initiative(S.persona, Date.now());
    if (!say) return;

    showTyping();
    setTimeout(() => {
      hideTyping();
      const m = { role: 'her', text: say.text, action: say.action, ts: Date.now() };
      const node = appendMessage(m, true);
      node.body.textContent = '';
      typeOut(node, say.text, 30);
      S.persona.energy = clamp(S.persona.energy - 0.6);
      S.persona.mood = clamp(S.persona.mood + 0.8);
      save(KEY.persona, S.persona);
      lastInteract = Date.now() - 120000;
    }, 900 + Math.random() * 900);
  }

  setInterval(maybeInitiate, 75000);

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
    $('herName').textContent = S.memory.herName || '小满';
    renderStatus();
    renderChips();
    renderPanel();
    renderHistory();

    if (S.chat.length === 0) {
      const note = document.createElement('div');
      note.className = 'sys-note';
      note.textContent = '这是你们的房间。对话只留在这台设备上。';
      stream.appendChild(note);

      setTimeout(() => {
        const g = greeting();
        const m = { role: 'her', text: g, action: '', ts: Date.now() };
        const node = appendMessage(m, true);
        node.body.textContent = '';
        typeOut(node, g, 34);
      }, 700);
    } else {
      const gap = Date.now() - (S.chat[S.chat.length - 1].ts || 0);
      if (gap > 6 * 3600000) {
        const back = document.createElement('div');
        back.className = 'sys-note';
        const hrs = Math.round(gap / 3600000);
        back.textContent = hrs > 24 ? '你隔了 ' + Math.round(hrs / 24) + ' 天才回来' : '你隔了 ' + hrs + ' 小时才回来';
        stream.appendChild(back);
        scrollDown(true);
      }
    }

    stream.addEventListener('scroll', () => {
      stickToBottom = nearBottom();
      document.querySelector('.topbar').classList.toggle('scrolled', stream.scrollTop > 6);
    }, { passive: true });

    // 每 60 秒刷新一次状态文案（时间在走）
    setInterval(() => {
      S.persona = P.evolve(S.persona, Date.now());
      renderStatus();
      save(KEY.persona, S.persona);
    }, 60000);

    // 页面回到前台，结算离线时间
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        S.persona = P.evolve(S.persona, Date.now());
        renderStatus();
        save(KEY.persona, S.persona);
        renderChips();
      }
    });

    updateSendState();

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
  }

  boot();
})();
