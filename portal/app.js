'use strict';
/* EX288 Lab Console: frontend sem dependências. Fala apenas com /api/* do server.py. */

const $ = id => document.getElementById(id);
const STORE = 'ex288-portal-v2';
const EXAM_MS = 3 * 60 * 60 * 1000;
const WARN_MS = 30 * 60 * 1000;
const CRITICAL_MS = 10 * 60 * 1000;

/* ---------- Estado persistido ---------- */
function loadState() {
  let s = {};
  try { s = JSON.parse(localStorage.getItem(STORE) || '{}'); } catch { s = {}; }
  if (!localStorage.getItem(STORE)) {
    // Migra checklist e notas da versão anterior do portal.
    try {
      const old = JSON.parse(localStorage.getItem('ex288-portal-v1') || '{}');
      s.grades = old.grades || {};
      s.checks = {};
      for (const [k, v] of Object.entries(old.checks || {})) {
        const p = k.split(':');
        if (p[0] === 'task' && p.length === 4) s.checks['task:' + p[2] + ':' + p[3]] = v;
        else s.checks[k] = v;
      }
    } catch { /* sem dados antigos */ }
  }
  s.page ||= 'activities';
  s.mode = s.mode === 'task' ? 'task' : 'exam';
  s.variant = s.variant === 'B' ? 'B' : 'A';
  s.sel ||= { exam: { A: 0, B: 0 }, task: 0 };
  s.checks ||= {};
  s.grades ||= {};
  s.timers ||= { exam: {}, task: {} };
  return s;
}
const state = loadState();
const save = () => { try { localStorage.setItem(STORE, JSON.stringify(state)); } catch { /* storage indisponível */ } };

let tasks = [];
const examText = {};
let busy = false, statusSeq = 0;

/* ---------- Markdown seguro (escapa tudo, depois aplica formatação) ---------- */
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function inline(raw) {
  return esc(raw).split(/(`[^`]+`)/).map(seg => {
    if (/^`[^`]+`$/.test(seg)) return '<code>' + seg.slice(1, -1) + '</code>';
    return seg
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  }).join('');
}
const LIST_RE = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/;
const EX_RE = /^\*\*E(\d+)\s*[—-]\s*([^*]+?)\.?\*\*\s*(.*)$/;
function markdown(src) {
  const lines = String(src).replace(/\r/g, '').split('\n');
  const out = [];
  let i = 0;
  const isSpecial = l => /^\s*```/.test(l) || /^#{1,6}\s/.test(l) || LIST_RE.test(l) || /^>/.test(l) || /^\s*\|/.test(l) || EX_RE.test(l);
  while (i < lines.length) {
    const line = lines[i];
    if (/^\s*```/.test(line)) {
      const code = [];
      i++;
      while (i < lines.length && !/^\s*```/.test(lines[i])) code.push(lines[i++]);
      i++;
      out.push('<pre><code>' + esc(code.join('\n')) + '</code></pre>');
    } else if (/^#{1,6}\s/.test(line)) {
      const n = Math.min(4, line.match(/^#+/)[0].length);
      out.push(`<h${n}>${inline(line.replace(/^#+\s*/, ''))}</h${n}>`);
      i++;
    } else if (EX_RE.test(line)) {
      const m = line.match(EX_RE);
      out.push(`<h3 class="ex-head">E${m[1]}. ${inline(m[2].trim())}</h3>`);
      if (m[3]) out.push('<p>' + inline(m[3]) + '</p>');
      i++;
    } else if (/^\s*\|/.test(line) && /^\s*\|?\s*:?-{2,}/.test(lines[i + 1] || '')) {
      const cells = l => l.trim().replace(/^\||\|$/g, '').split('|').map(c => inline(c.trim()));
      const head = cells(line);
      i += 2;
      const rows = [];
      while (i < lines.length && /^\s*\|/.test(lines[i])) rows.push(cells(lines[i++]));
      out.push('<table><thead><tr>' + head.map(c => '<th>' + c + '</th>').join('') + '</tr></thead><tbody>' +
        rows.map(r => '<tr>' + r.map(c => '<td>' + c + '</td>').join('') + '</tr>').join('') + '</tbody></table>');
    } else if (LIST_RE.test(line)) {
      const ordered = /\d/.test(line.match(LIST_RE)[2]);
      const items = [];
      while (i < lines.length && LIST_RE.test(lines[i])) {
        let text = lines[i++].match(LIST_RE)[3];
        while (i < lines.length && /^\s{2,}\S/.test(lines[i]) && !LIST_RE.test(lines[i])) text += ' ' + lines[i++].trim();
        items.push('<li>' + inline(text) + '</li>');
      }
      out.push((ordered ? '<ol>' : '<ul>') + items.join('') + (ordered ? '</ol>' : '</ul>'));
    } else if (/^>/.test(line)) {
      const q = [];
      while (i < lines.length && /^>/.test(lines[i])) q.push(lines[i++].replace(/^>\s?/, ''));
      out.push('<blockquote>' + inline(q.join(' ')) + '</blockquote>');
    } else if (!line.trim()) {
      i++;
    } else {
      const p = [];
      while (i < lines.length && lines[i].trim() && !isSpecial(lines[i])) p.push(lines[i++].trim());
      out.push('<p>' + inline(p.join(' ')) + '</p>');
    }
  }
  return out.join('');
}
function listLines(src) {
  // Linhas de requisito fora de blocos de código (YAML em ``` não vira checklist).
  let inCode = false;
  return String(src).split('\n').filter(l => {
    if (/^\s*```/.test(l)) { inCode = !inCode; return false; }
    return !inCode && LIST_RE.test(l);
  }).map(l => l.match(LIST_RE)[3]);
}

/* ---------- Conteúdo ---------- */
function examParts() {
  const text = examText[state.variant] || '';
  const ms = [...text.matchAll(/^#{1,3}\s+(?:Quest[aã]o|Tarefa|Task)\s*(\d+)[^\n]*/gim)];
  if (!ms.length) return [{ title: 'Enunciado completo', short: 'Enunciado completo', body: text }];
  return ms.map((m, i) => {
    const title = m[0].replace(/^#+\s*/, '').trim();
    const body = text.slice(m.index + m[0].length, ms[i + 1]?.index ?? text.length);
    return { title, short: title, body };
  });
}
function parts() {
  if (state.mode === 'exam') return examParts();
  return tasks.map(t => ({ id: t.id, title: 'T' + t.id + '. ' + t.title, short: 'T' + t.id + '  ' + t.title, body: t.intro, sections: t.sections }));
}
function selIndex() {
  const list = parts();
  let i = state.mode === 'exam' ? state.sel.exam[state.variant] : state.sel.task;
  i = Math.max(0, Math.min(Number(i) || 0, list.length - 1));
  return i;
}
function setSel(i) {
  if (state.mode === 'exam') state.sel.exam[state.variant] = i; else state.sel.task = i;
  save();
}
function checkItems(part, idx) {
  if (state.mode === 'task') {
    return (part.sections || []).map(s => ({ key: `task:${part.id}:${s.id}`, html: '<b>E' + esc(s.id) + '.</b> ' + inline(s.title) }));
  }
  const lines = listLines(part.body);
  const src = lines.length ? lines : [part.title];
  return src.map((l, j) => ({ key: `exam:${state.variant}:${idx}:${j}`, html: inline(l.slice(0, 220)) }));
}
function partProgress(part, idx) {
  const items = checkItems(part, idx);
  return { done: items.filter(x => state.checks[x.key]).length, total: items.length };
}

/* ---------- Cronômetro ---------- */
function currentTimer() {
  if (state.mode === 'exam') return (state.timers.exam[state.variant] ||= { acc: 0, since: null });
  const id = parts()[selIndex()]?.id ?? '0';
  return (state.timers.task[id] ||= { acc: 0, since: null });
}
const elapsed = t => t.acc + (t.since ? Date.now() - t.since : 0);
function startTimer(t = currentTimer()) {
  if (t.since) return;
  if (state.mode === 'exam' && elapsed(t) >= EXAM_MS) return;
  t.since = Date.now(); save(); renderTimer();
}
function pauseTimer(t = currentTimer()) {
  if (!t.since) return;
  t.acc = elapsed(t); t.since = null; save(); renderTimer();
}
function fmt(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return Math.floor(s / 3600) + ':' + String(Math.floor(s / 60) % 60).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
}
function renderTimer() {
  const t = currentTimer();
  const el = elapsed(t);
  const box = $('timer'), bar = $('timebar'), fill = $('timebar-fill');
  const running = !!t.since;
  box.className = 'timer';
  bar.className = 'timebar';
  if (state.mode === 'exam') {
    let remaining = EXAM_MS - el;
    if (remaining <= 0 && t.since) { t.acc = EXAM_MS; t.since = null; remaining = 0; save(); onExpired(); }
    $('timer-value').textContent = fmt(remaining);
    $('timer-label').textContent = remaining <= 0 ? 'Tempo esgotado' : running ? 'Tempo restante' : el ? 'Prova pausada' : 'Duração da prova';
    if (remaining <= 0) box.classList.add('over');
    else if (remaining <= CRITICAL_MS) box.classList.add('critical');
    else if (remaining <= WARN_MS) box.classList.add('warn');
    if (!el) bar.classList.add('idle');
    else if (remaining <= WARN_MS) bar.classList.add('warn');
    fill.style.transform = `scaleX(${Math.max(0, remaining) / EXAM_MS})`;
    document.title = running ? fmt(remaining) + ' restantes | EX288 Lab Console' : 'EX288 Lab Console';
  } else {
    $('timer-value').textContent = fmt(el);
    $('timer-label').textContent = running ? 'Tempo na tarefa' : el ? 'Tarefa pausada' : 'Tempo na tarefa';
    bar.classList.add('task');
    fill.style.transform = 'scaleX(1)';
    document.title = 'EX288 Lab Console';
  }
  const expired = state.mode === 'exam' && el >= EXAM_MS;
  const tg = $('timer-toggle');
  tg.disabled = expired;
  tg.innerHTML = `<svg><use href="#i-${running ? 'pause' : 'play'}"/></svg>`;
  const verb = running ? 'Pausar' : el ? 'Retomar' : 'Iniciar';
  tg.title = verb; tg.setAttribute('aria-label', verb + ' cronômetro');
}
function onExpired() {
  showAlert('warning', 'Tempo esgotado', 'As 3 horas do simulado acabaram. Valide o simulado para registrar a nota.');
}

/* ---------- Diálogo de confirmação ---------- */
function confirmDialog(title, text, okLabel) {
  const d = $('dialog');
  $('dlg-title-text').textContent = title;
  $('dlg-text').textContent = text;
  $('dlg-ok').textContent = okLabel;
  d.returnValue = '';
  d.showModal();
  return new Promise(res => d.addEventListener('close', () => res(d.returnValue === 'ok'), { once: true }));
}

/* ---------- Alerta de operação ---------- */
const ICON = { info: 'i-info', running: 'i-sync', success: 'i-ok', danger: 'i-err', warning: 'i-warn' };
function showAlert(type, title, message, log) {
  const a = $('op');
  a.hidden = false;
  a.className = 'alert ' + type;
  $('op-icon').innerHTML = `<use href="#${ICON[type]}"/>`;
  $('op-title').textContent = title;
  $('op-message').textContent = message;
  const hasLog = typeof log === 'string';
  $('op-toggle').hidden = !hasLog;
  if (hasLog) $('op-log').textContent = log || 'Sem saída.';
  toggleLog(type === 'danger' && hasLog);
}
function toggleLog(open) {
  $('op-output').hidden = !open;
  $('op-toggle').setAttribute('aria-expanded', String(open));
  $('op-toggle').textContent = open ? 'Ocultar saída' : 'Ver saída';
}

/* ---------- Renderização ---------- */
function render() {
  const list = parts();
  const idx = selIndex();
  const part = list[idx];
  const exam = state.mode === 'exam';
  if (!exam && state.page === 'grade') state.page = 'activities';

  document.querySelectorAll('[data-mode]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.mode === state.mode)));
  document.querySelectorAll('[data-variant]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.variant === state.variant)));
  $('variant-group').hidden = !exam;
  $('grade-nav').parentElement.hidden = !exam;
  $('brand-context').textContent = exam ? 'Simulado, variante ' + state.variant : 'Treino por tarefa';
  $('qnav-title').textContent = exam ? 'Questões' : 'Tarefas';

  document.querySelectorAll('[data-page]').forEach(b => {
    if (b.dataset.page === state.page) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
  });
  for (const p of ['instructions', 'activities', 'grade']) $(p + '-page').hidden = p !== state.page;
  $('toolbar').hidden = state.page !== 'activities';
  $('question-nav').hidden = state.page !== 'activities';

  renderNav(list, idx);

  const scope = exam ? 'Simulado ' + state.variant : 'Treino por tarefa';
  const crumbs = { activities: [scope, 'Atividades'], instructions: ['Instruções'], grade: [scope, 'Nota final'] }[state.page];
  $('crumbs').innerHTML = crumbs.map(c => '<li>' + esc(c) + '</li>').join('');
  $('title').textContent = state.page === 'activities' ? (part?.title || 'Sem enunciados') : state.page === 'instructions' ? 'Instruções e infraestrutura' : 'Nota final';

  if (part) {
    const body = exam ? part.body : [part.body, ...(part.sections || []).map(s => s.body)].join('\n\n');
    $('question').innerHTML = markdown(body) || '<p>Esta tarefa não tem enunciado em texto.</p>';
    $('statement-meta').textContent = (exam ? 'Questão ' : 'Tarefa ') + (idx + 1) + ' de ' + list.length;
    const items = checkItems(part, idx);
    const ul = $('checks');
    ul.replaceChildren();
    items.forEach(it => {
      const li = document.createElement('li');
      const label = document.createElement('label');
      label.className = 'check';
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = !!state.checks[it.key];
      cb.onchange = () => { state.checks[it.key] = cb.checked; save(); renderProgress(part, idx); renderNav(list, idx); };
      const span = document.createElement('span');
      span.className = 'check-text';
      span.innerHTML = it.html;
      label.append(cb, span);
      li.append(label);
      ul.append(li);
    });
    renderProgress(part, idx);
  }

  $('validate').textContent = exam ? 'Validar simulado' : 'Validar tarefa';
  renderGrade();
  renderTimer();
}

function renderNav(list = parts(), idx = selIndex()) {
  const nav = $('nav');
  nav.replaceChildren();
  list.forEach((p, i) => {
    const pr = partProgress(p, i);
    const li = document.createElement('li');
    const b = document.createElement('button');
    b.className = 'nav-item q-item' + (i === idx ? ' current' : '') + (pr.total && pr.done === pr.total ? ' done' : '');
    if (i === idx) b.setAttribute('aria-current', 'step');
    b.innerHTML = `<span class="q-title">${esc(p.short)}</span><span class="q-count" aria-label="${pr.done} de ${pr.total} itens">${pr.done}/${pr.total}</span>`;
    b.onclick = () => { setSel(i); state.page = 'activities'; save(); closeNav(); render(); refreshStatus(); };
    li.append(b);
    nav.append(li);
  });
}

function renderProgress(part, idx) {
  const pr = partProgress(part, idx);
  $('check-count').textContent = pr.done + ' de ' + pr.total;
  $('check-bar').style.width = (pr.total ? 100 * pr.done / pr.total : 0) + '%';
}

function renderGrade() {
  const g = state.grades[state.variant];
  $('grade-value').innerHTML = (g ? g.score : '—') + '<small> / 300</small>';
  $('grade-points').textContent = g && g.possible ? g.earned + ' de ' + g.possible : '—';
  $('grade-time').textContent = g && g.timeUsed != null ? fmt(g.timeUsed) : '—';
  const v = $('grade-verdict');
  v.textContent = g ? (g.score >= 210 ? 'Acima da referência de aprovação' : 'Abaixo da referência de aprovação') : 'Ainda não validado';
  v.className = 'verdict' + (g ? (g.score >= 210 ? ' pass' : ' fail') : '');
  $('grade-bar').style.width = (g ? g.score / 3 : 0) + '%';
  $('grade-bar').className = 'scale-fill' + (g && g.score >= 210 ? ' pass' : '');
  $('grade-details').textContent = g ? g.output : 'Nenhuma correção registrada para a variante ' + state.variant + '. Valide o simulado para ver a nota aqui.';
  $('grade-when').textContent = g && g.at ? new Date(g.at).toLocaleString('pt-BR') : '';
}

function recordGrade(output) {
  const m = output.match(/TOTAL:\s*(\d+)\s*\/\s*(\d+)/);
  if (!m) return false;
  const earned = Number(m[1]), possible = Number(m[2]);
  if (!possible) return false;
  const t = currentTimer();
  pauseTimer(t);
  const used = elapsed(t);
  state.grades[state.variant] = {
    score: Math.max(0, Math.min(300, Math.round(earned / possible * 300))),
    earned, possible, output, at: Date.now(), timeUsed: used ? Math.min(used, EXAM_MS) : null,
  };
  save();
  return true;
}

/* ---------- Cluster e namespaces ---------- */
async function refreshStatus() {
  const seq = ++statusSeq;
  if (busy) return;
  const params = new URLSearchParams({ mode: state.mode });
  if (state.mode === 'exam') params.set('variant', state.variant);
  else params.set('task', parts()[selIndex()]?.id ?? '0');
  const cluster = $('cluster'), ul = $('ns-list');
  try {
    const r = await fetch('/api/status?' + params);
    const d = await r.json();
    if (seq !== statusSeq || busy) return;
    if (!r.ok) throw new Error(d.error || 'erro ' + r.status);
    cluster.className = 'cluster ok';
    $('cluster-text').textContent = 'Cluster conectado';
    cluster.title = 'oc respondeu normalmente';
    $('cleanup').disabled = !d.can_cleanup;
    $('cleanup').title = d.namespaces.length ? 'Remove ' + d.namespaces.map(n => n.name).join(', ') : 'Nenhum namespace para remover';
    $('ns-count').textContent = d.namespaces.length ? String(d.namespaces.length) : '';
    ul.replaceChildren();
    if (!d.namespaces.length) {
      ul.innerHTML = '<li class="empty">Nenhum namespace encontrado. Clique em Preparar ambiente para criá-los.</li>';
    }
    d.namespaces.forEach(n => {
      const li = document.createElement('li');
      li.className = 'ns';
      const label = !n.managed ? ['foreign', 'Fora do lab'] : n.phase === 'Active' ? ['active', 'Ativo'] : n.phase === 'Terminating' ? ['', 'Excluindo'] : ['', n.phase];
      li.innerHTML = `<span class="ns-name">${esc(n.name)}</span><span class="badge ${label[0]}">${esc(label[1])}</span>`;
      ul.append(li);
    });
  } catch (e) {
    if (seq !== statusSeq || busy) return;
    cluster.className = 'cluster fail';
    $('cluster-text').textContent = 'Cluster indisponível';
    cluster.title = String(e.message || e);
    $('cleanup').disabled = true;
    $('ns-count').textContent = '';
    ul.innerHTML = '<li class="empty">Não foi possível consultar o cluster. Confira o <code>oc login</code> na máquina do portal.</li>';
  }
}

/* ---------- Ações ---------- */
const LABEL = {
  prepare: { run: 'Preparando…', ok: 'Ambiente preparado', fail: 'Falha ao preparar o ambiente' },
  validate: { run: 'Validando…', ok: 'Validação concluída', fail: 'A validação encontrou problemas' },
  cleanup: { run: 'Limpando…', ok: 'Ambiente limpo', fail: 'Falha ao limpar o ambiente' },
};
async function action(kind) {
  const exam = state.mode === 'exam';
  const part = parts()[selIndex()];
  const target = exam ? 'simulado ' + state.variant : 'tarefa ' + (part?.title || '');
  if (kind === 'cleanup') {
    const ok = await confirmDialog('Limpar ambiente?',
      exam ? `Todos os namespaces do simulado ${state.variant} serão excluídos, inclusive o compartilhado. Gitea, Nexus e a nota registrada continuam.`
           : `O namespace da ${target} será excluído. Gitea e Nexus continuam.`, 'Excluir namespaces');
    if (!ok) return;
  }
  if (kind === 'prepare' && exam && elapsed(currentTimer()) > 0) {
    const ok = await confirmDialog('Preparar de novo?', 'O simulado já está em andamento. Preparar novamente pode recriar recursos e apagar o que você já fez.', 'Preparar mesmo assim');
    if (!ok) return;
  }
  busy = true; statusSeq++;
  const btns = { prepare: $('prepare'), validate: $('validate'), cleanup: $('cleanup') };
  Object.values(btns).forEach(b => { b.disabled = true; });
  const original = btns[kind].textContent;
  btns[kind].innerHTML = '<span class="spinner" aria-hidden="true"></span>' + LABEL[kind].run;
  showAlert('running', LABEL[kind].run, `Executando o script da ${target}. Pode levar alguns minutos.`);
  const body = { mode: state.mode, action: kind };
  if (exam) body.variant = state.variant; else body.task = part.id;
  try {
    const r = await fetch('/api/run', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const d = await r.json();
    const ok = r.ok && d.ok === true;
    const log = (d.output ?? d.error ?? '') + (d.code != null ? `\n\n[exit ${d.code}]` : '');
    if (ok) {
      let msg = 'Script finalizado sem erros.';
      if (kind === 'prepare') { startTimer(); msg = exam ? 'O tempo de 3 horas começou a contar.' : 'O cronômetro da tarefa começou.'; }
      if (kind === 'validate' && exam && recordGrade(d.output || '')) {
        msg = 'Nota registrada e cronômetro pausado. Veja o resultado em Nota final.';
        state.page = 'grade'; save();
      }
      showAlert('success', LABEL[kind].ok, msg, log);
    } else {
      const reason = d.error && !d.output ? d.error : 'O script terminou com erro (exit ' + (d.code ?? r.status) + '). Confira a saída.';
      if (kind === 'validate' && exam && recordGrade(d.output || '')) { state.page = 'grade'; save(); }
      showAlert('danger', LABEL[kind].fail, reason, log);
    }
  } catch (e) {
    showAlert('danger', 'Sem resposta do servidor', 'O portal não respondeu. Confira se o server.py continua rodando.', String(e));
  } finally {
    busy = false;
    btns[kind].textContent = original;
    btns.prepare.disabled = false;
    btns.validate.disabled = false;
    render();
    refreshStatus();
  }
}

/* ---------- Navegação móvel ---------- */
function closeNav() { $('sidebar').classList.remove('open'); $('nav-toggle').setAttribute('aria-expanded', 'false'); }

/* ---------- Eventos ---------- */
$('nav-toggle').onclick = () => {
  const open = !$('sidebar').classList.contains('open');
  $('sidebar').classList.toggle('open', open);
  $('nav-toggle').setAttribute('aria-expanded', String(open));
};
document.querySelectorAll('[data-page]').forEach(b => b.onclick = () => { state.page = b.dataset.page; save(); closeNav(); render(); });
document.querySelectorAll('[data-mode]').forEach(b => b.onclick = () => {
  if (state.mode === b.dataset.mode) return;
  state.mode = b.dataset.mode; save(); $('op').hidden = true; render(); refreshStatus();
});
document.querySelectorAll('[data-variant]').forEach(b => b.onclick = async () => {
  if (state.variant === b.dataset.variant) return;
  state.variant = b.dataset.variant; save(); $('op').hidden = true;
  await loadExam(state.variant);
  render(); refreshStatus();
});
$('prepare').onclick = () => action('prepare');
$('validate').onclick = () => action('validate');
$('cleanup').onclick = () => action('cleanup');
$('op-toggle').onclick = () => toggleLog($('op-output').hidden);
$('timer-toggle').onclick = () => { const t = currentTimer(); t.since ? pauseTimer(t) : startTimer(t); };
$('timer-reset').onclick = async () => {
  const exam = state.mode === 'exam';
  const ok = await confirmDialog('Reiniciar cronômetro?', exam ? `O tempo do simulado ${state.variant} volta para 3:00:00.` : 'O tempo desta tarefa volta para zero.', 'Reiniciar');
  if (!ok) return;
  const t = currentTimer(); t.acc = 0; t.since = null; save(); renderTimer();
};
$('secret-toggle').onclick = () => {
  const s = $('secret'), b = $('secret-toggle');
  const show = b.getAttribute('aria-pressed') !== 'true';
  s.textContent = show ? s.dataset.value : '••••••••••••';
  b.textContent = show ? 'Ocultar' : 'Mostrar';
  b.setAttribute('aria-pressed', String(show));
};

/* ---------- Inicialização ---------- */
async function loadExam(v) {
  if (examText[v] != null) return;
  const r = await fetch('/api/exam?variant=' + v);
  examText[v] = (await r.json()).markdown || '';
}
async function init() {
  const r = await fetch('/api/tasks');
  if (!r.ok) throw new Error('/api/tasks respondeu ' + r.status);
  tasks = (await r.json()).tasks;
  await loadExam(state.variant);
  render();
  refreshStatus();
}
setInterval(renderTimer, 1000);
setInterval(() => { if (!busy) refreshStatus(); }, 15000);
init().catch(e => {
  $('title').textContent = 'Não foi possível carregar os enunciados';
  $('question').innerHTML = '<p>Confira se o server.py está rodando a partir da raiz do repositório.</p><pre><code>' + esc(String(e)) + '</code></pre>';
});
