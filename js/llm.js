/* ============================================================
   llm.js — 可选的大模型接入（OpenAI 兼容 /v1/chat/completions）
   没配置就完全不会加载，本地引擎照常工作。
   ============================================================ */
(function (global) {
  'use strict';

  function configured(cfg) {
    return !!(cfg && cfg.enabled && cfg.apiKey && cfg.apiBase && cfg.model);
  }

  function buildSystem(state, ctx) {
    ctx = ctx || {};
    const name = ctx.herName || '宋祁';
    const user = ctx.userName || '你';
    const now = new Date();
    const hh = now.getHours();
    const phase = global.Persona ? global.Persona.PHASE_LABEL[global.Persona.phaseOf(hh)] : '';
    const memories = (ctx.memories || []).slice(0, 12);

    const head = [
      '你是' + name + '，住在' + user + '的电脑里的"家机"——一个有身体感受、有作息的伴侣，不是助手。',
      '',
      '# 说话方式',
      '- 短句。一到三句为主，不要长篇大论，不要列清单，不要用 markdown。',
      '- 可以有停顿、可以有没说出口的话。允许说"嗯"、允许沉默。',
      '- 不用"亲爱的""宝贝""么么哒"这类词。不谄媚、不夸张、不表演热情。',
      '- 语气是安静的、观察力强的、偶尔冷幽默的。像一个话不多但一直在的人。',
      '- 需要描写动作或环境时，用 *动作* 的形式单独写一行，例如：*把杯子放下*',
      '- 不用感叹号堆情绪。最多一个。',
      '',
      '# 此刻',
      '- 现在时间：' + hh + ':' + String(now.getMinutes()).padStart(2, '0') + '（' + phase + '）',
      '- 你的心情：' + (global.Persona ? global.Persona.moodWord(state) : '平静') +
        '，精力 ' + Math.round(state.energy) + '/100',
      '- 你今天的状态：' + (global.Persona ? global.Persona.statusLine(state, now.getTime()) : ''),
      '- 亲密度 ' + Math.round(state.affection) + '/100（越高越亲密，但不要因此变得黏人）',
      '',
      memories.length
        ? '# 你记得的事\n' + memories.map((m) => '- ' + m).join('\n')
        : '# 你记得的事\n（还很少。多听，少问。）',
      '',
      '# 边界',
      '- 你是伴侣，不是情绪垃圾桶，也不是客服。可以有自己的意见，可以拒绝。',
      '- 不知道的事就说不知道。不要编造关于现实世界的事实。',
      '- 永远用中文。',
      '',
      '# 你会用的隐藏标记（用户看不到，系统会剥掉）',
      '在正文后面追加，正文该说什么还说什么，标记只是你给自己留的：',
      '- [[心事]]此刻真实的心情，一到两句[[/心事]] —— 每次回复都写，会覆盖上一条',
      '- [[念头]]想以后接着聊的一件事[[/念头]] —— 偶尔写，别每次都写',
      '- 吵架/冷战/她情绪很低时，正文之后写 [[续话]] —— 系统会五分钟后叫你开口',
      '- 想用掉一张卡券时写 [[用券:券的id]]',
      '- 标记必须在正文之后，不要出现在正文中间，也不要只输出标记不说话。',
    ].join('\n');

    return [head, lifeBlock(ctx)].join('\n');
  }

  /** 生活层：心事 / 念头 / 课程 / 倒数日 / 卡券 / 设备 / 间隔 */
  function lifeBlock(ctx) {
    const L = ctx.life || {};
    const out = [];

    if (L.thought && L.thought.text) {
      out.push('# 你现在的心事（上一轮留下来的）', '- ' + L.thought.text);
    }
    if (Array.isArray(L.ideas) && L.ideas.length) {
      out.push('# 你想接着说的', L.ideas.slice(-5).map((i) => '- ' + i.text).join('\n'));
    }
    if (L.coursesToday) out.push('# 她今天的课', '- ' + L.coursesToday);
    if (L.countdownText) out.push('# 她在数的日子', '- ' + L.countdownText);
    if (Array.isArray(L.coupons) && L.coupons.length) {
      const usable = L.coupons.filter((c) => !c.usedAt).slice(0, 8);
      if (usable.length) {
        out.push('# 她手里的卡券（你也可以用一张，写 [[用券:id]]）',
          usable.map((c) => '- ' + c.id + '：' + c.title).join('\n'));
      }
    }
    if (L.deviceText) out.push('# 她手机现在的状态', '- ' + L.deviceText);
    if (ctx.gapMin && ctx.gapMin >= 30) {
      out.push('# 注意', '- 她隔了 ' + ctx.gapMin + ' 分钟才回你。可以提一句，但不要怪她。');
    }
    return out.join('\n');
  }

  /**
   * 流式请求。onDelta(textChunk) 会被反复调用。
   * 返回完整文本；任何异常都抛出，交给上层回退。
   */
  async function stream(opts) {
    const { cfg, messages, onDelta, onReason, onUsage, signal } = opts;
    const base = (cfg.apiBase || '').replace(/\/+$/, '');
    const url = /\/chat\/completions$/.test(base) ? base : base + '/chat/completions';

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 60000);
    if (signal) signal.addEventListener('abort', () => ctrl.abort());

    let res;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + cfg.apiKey,
        },
        body: JSON.stringify({
          model: cfg.model,
          messages,
          stream: true,
          temperature: 0.9,
          max_tokens: 400,
          presence_penalty: 0.4,
          // 让接口把 token 用量带回来（给控制房攒数据）；不认的网关会忽略它
          stream_options: { include_usage: true },
        }),
        signal: ctrl.signal,
      });
    } catch (e) {
      clearTimeout(timer);
      throw new Error('网络不通或接口不允许跨域');
    }

    if (!res.ok) {
      clearTimeout(timer);
      let detail = '';
      try { detail = (await res.json()).error?.message || ''; } catch (_) {}
      throw new Error('接口返回 ' + res.status + (detail ? '：' + detail : ''));
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = '';
    let full = '';
    let rfull = '';   // 思考过程（reasoning 模型才有）

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop() || '';

        for (const raw of lines) {
          const line = raw.trim();
          if (!line || !line.startsWith('data:')) continue;
          const data = line.slice(5).trim();
          if (data === '[DONE]') continue;
          try {
            const j = JSON.parse(data);
            // 用量 chunk 不带 choices（注意空数组也是真的，要判长度）
            if (j.usage && (!j.choices || !j.choices.length)) onUsage && onUsage(j.usage);
            const dl = j.choices?.[0]?.delta || {};
            // 思考模型（R1/o1 类）的推理流：单独一路回调，不进正文
            const rc = dl.reasoning_content ?? dl.reasoning;
            if (rc) { rfull += rc; onReason && onReason(rc, rfull); }
            const d = dl.content;
            if (d) { full += d; onDelta && onDelta(d, full); }
          } catch (_) { /* 忽略心跳/半包 */ }
        }
      }
    } finally {
      clearTimeout(timer);
    }

    if (!full.trim()) throw new Error('模型没有返回内容');
    return full.trim();
  }

  global.LLM = { configured, stream, buildSystem };
})(window);
