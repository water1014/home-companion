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
    const name = ctx.herName || '小满';
    const user = ctx.userName || '你';
    const now = new Date();
    const hh = now.getHours();
    const phase = global.Persona ? global.Persona.PHASE_LABEL[global.Persona.phaseOf(hh)] : '';
    const memories = (ctx.memories || []).slice(0, 12);

    return [
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
    ].join('\n');
  }

  /**
   * 流式请求。onDelta(textChunk) 会被反复调用。
   * 返回完整文本；任何异常都抛出，交给上层回退。
   */
  async function stream(opts) {
    const { cfg, messages, onDelta, signal } = opts;
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
            const d = j.choices?.[0]?.delta?.content;
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
