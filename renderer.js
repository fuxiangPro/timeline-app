// ─── Utilities ───────────────────────────────────────────────
function uuid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}
function daysBetween(a, b) {
  return (new Date(b) - new Date(a)) / 86400000;
}
function fmtDate(iso) {
  if (!iso) return '';
  const [, m, d] = iso.split('-');
  return `${+m}/${+d}`;
}
function today() {
  return new Date().toISOString().slice(0, 10);
}
function isOverdue(node) {
  return !node.completed && node.date < today();
}

// ─── State ───────────────────────────────────────────────────
let data = { mainLines: [] };

async function load() {
  data = await window.api.readData();
  if (!data.mainLines) data.mainLines = [];
  render();
}
async function save() {
  await window.api.writeData(data);
}

// ─── Render ──────────────────────────────────────────────────
function render() {
  const container = document.getElementById('lines-container');
  container.innerHTML = '';

  if (data.mainLines.length === 0) {
    container.innerHTML = `
      <div class="empty-hint">
        <div class="big">◎</div>
        鼠标移到底部，点击「新增主线」开始你的旅程
      </div>`;
    return;
  }

  const sorted = [...data.mainLines].sort((a, b) => {
    if (!a.startDate) return 1;
    if (!b.startDate) return -1;
    return a.startDate.localeCompare(b.startDate);
  });

  const pending = [];
  sorted.forEach((line, idx) => {
    const { wrap, trackWrap } = buildLineEl(line, idx);
    container.appendChild(wrap);
    pending.push({ line, trackWrap });
  });
  // trackWrap.offsetWidth is 0 until it's in the DOM, so defer renderTrack
  // until after all lines are appended — otherwise node px positions fall
  // back to 900 while the today-marker uses CSS % and they desync on resize.
  pending.forEach(({ line, trackWrap }) => renderTrack(line, trackWrap));
}

function buildLineEl(line, idx) {
  const wrap = document.createElement('div');
  wrap.className = 'main-line';
  wrap.dataset.id = line.id;

  // ── Header ──
  const header = document.createElement('div');
  header.className = 'line-header';

  // Index
  const indexEl = document.createElement('span');
  indexEl.className = 'line-index';
  indexEl.textContent = String(idx + 1).padStart(2, '0');

  // Name
  const nameEl = document.createElement('span');
  nameEl.className = 'line-name';
  nameEl.textContent = line.name || '未命名主线';
  nameEl.title = '点击编辑名称';
  nameEl.addEventListener('click', () => startEditName(line, nameEl));

  // Progress
  const nodes = line.nodes || [];
  const done = nodes.filter(n => n.completed).length;
  const total = nodes.length;
  const pct = total > 0 ? Math.round(done / total * 100) : 0;

  const progressEl = document.createElement('div');
  progressEl.className = 'line-progress';
  if (total > 0) {
    progressEl.innerHTML = `
      <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
      <span class="progress-text">${pct}%</span>`;
  }

  // Dates
  const datesEl = document.createElement('div');
  datesEl.className = 'line-dates';

  const startInput = createDateInput(line.startDate, v => {
    line.startDate = v; save(); render();
  });
  const sep = document.createElement('span');
  sep.className = 'date-sep';
  sep.textContent = '→';
  const endInput = createDateInput(line.endDate, v => {
    line.endDate = v; save(); renderTrack(line, trackWrap);
  });
  datesEl.append(startInput, sep, endInput);

  const spacer = document.createElement('div');
  spacer.className = 'line-spacer';

  // Delete button → inline confirm
  const delBtn = document.createElement('button');
  delBtn.className = 'btn-delete-line';
  delBtn.textContent = '×';
  delBtn.title = '删除此主线';
  delBtn.addEventListener('click', () => {
    showDeleteConfirm(delBtn, line, wrap);
  });

  header.append(indexEl, nameEl, progressEl, spacer, datesEl, delBtn);

  // ── Track ──
  const trackWrap = document.createElement('div');
  trackWrap.className = 'track-wrap';

  wrap.append(header, trackWrap);
  return { wrap, trackWrap };
}

function createDateInput(value, onChange) {
  const input = document.createElement('input');
  input.type = 'date';
  input.className = 'date-input';
  input.value = value || '';
  input.addEventListener('change', () => onChange(input.value));
  return input;
}

// ── Inline delete confirm ─────────────────────────────────────
function showDeleteConfirm(triggerBtn, line, wrap) {
  // Replace button with confirm UI
  const confirm = document.createElement('div');
  confirm.className = 'delete-confirm';
  confirm.innerHTML = `
    <span>删除「${line.name}」?</span>
    <button class="dc-cancel">取消</button>
    <button class="dc-ok">删除</button>`;

  triggerBtn.replaceWith(confirm);

  confirm.querySelector('.dc-cancel').addEventListener('click', () => {
    confirm.replaceWith(triggerBtn);
  });
  confirm.querySelector('.dc-ok').addEventListener('click', () => {
    wrap.style.transition = 'opacity 0.2s, transform 0.2s';
    wrap.style.opacity = '0';
    wrap.style.transform = 'translateY(-6px)';
    setTimeout(() => {
      data.mainLines = data.mainLines.filter(l => l.id !== line.id);
      save();
      render();
    }, 200);
  });

  // Auto-cancel after 4s
  const t = setTimeout(() => {
    if (confirm.parentNode) confirm.replaceWith(triggerBtn);
  }, 4000);
  confirm.querySelector('.dc-cancel').addEventListener('click', () => clearTimeout(t));
  confirm.querySelector('.dc-ok').addEventListener('click', () => clearTimeout(t));
}

// ── Track rendering ───────────────────────────────────────────
function renderTrack(line, trackWrap) {
  trackWrap.innerHTML = '';

  const nodes = line.nodes || [];
  const start = line.startDate;
  const end   = line.endDate;
  const totalDays = (start && end) ? daysBetween(start, end) : 0;

  const TRACK_RIGHT = 48; // reserve for add btn

  // Progress fill width
  const doneCount = nodes.filter(n => n.completed).length;
  const fillPct = nodes.length > 0 ? (doneCount / nodes.length) * 100 : 0;

  // Track line with fill
  const trackLine = document.createElement('div');
  trackLine.className = 'track-line';
  trackLine.innerHTML = `<div class="track-fill" style="width:${fillPct}%"></div>`;
  trackWrap.appendChild(trackLine);

  // Today marker
  if (start && end && today() >= start && today() <= end) {
    const todayPct = daysBetween(start, today()) / totalDays;
    const marker = document.createElement('div');
    marker.className = 'today-marker';
    marker.style.left = `calc(16px + (100% - 16px - 20px - ${TRACK_RIGHT}px) * ${todayPct})`;
    trackWrap.appendChild(marker);
  }

  // Add node button
  const addBtn = document.createElement('button');
  addBtn.className = 'btn-add-node';
  addBtn.textContent = '+';
  addBtn.title = '添加节点';
  addBtn.addEventListener('click', () => openNodeModal(line, trackWrap));
  trackWrap.appendChild(addBtn);

  // Calculate positions and resolve overlaps
  const trackW = (trackWrap.offsetWidth || 900) - 16 - 20 - TRACK_RIGHT;
  const MIN_GAP = 26; // px minimum between node centers

  const positioned = nodes.map(node => {
    let pct = 0;
    if (totalDays > 0) {
      if (node.date < start) pct = 0;
      else if (node.date > end) pct = 1;
      else pct = daysBetween(start, node.date) / totalDays;
    }
    return { node, px: pct * trackW };
  });

  // Sort by ideal position, push overlapping nodes right
  positioned.sort((a, b) => a.px - b.px);
  for (let i = 1; i < positioned.length; i++) {
    if (positioned[i].px - positioned[i - 1].px < MIN_GAP) {
      positioned[i].px = positioned[i - 1].px + MIN_GAP;
    }
  }

  // Two-layer rendering: build labels and circles separately, then append
  // ALL labels first and ALL circles after — so circles stack above any
  // sibling node's label that happens to extend over them.
  const renderItems = positioned.map(({ node, px }, nodeIdx) => {
    const isAbove = nodeIdx % 2 === 0;
    const leftStyle = `calc(16px + ${px}px)`;
    const stateCls = node.completed ? ' done' : (isOverdue(node) ? ' overdue' : '');

    // ── Labels layer ──
    const labelsWrap = document.createElement('div');
    labelsWrap.className = 'node-labels' + (isAbove ? ' label-above' : '') + stateCls;
    labelsWrap.style.left = leftStyle;

    const label = document.createElement('div');
    label.className = 'node-label';
    label.textContent = node.title;
    label.dataset.full = node.title;

    const dateLabel = document.createElement('div');
    dateLabel.className = 'node-date-label';
    dateLabel.textContent = fmtDate(node.date);

    labelsWrap.append(label, dateLabel);

    label.addEventListener('click', e => {
      e.stopPropagation();
      openNodeModal(line, trackWrap, node);
    });
    dateLabel.addEventListener('click', e => {
      e.stopPropagation();
      openNodeModal(line, trackWrap, node);
    });

    // ── Circle layer ──
    const circleWrap = document.createElement('div');
    circleWrap.className = 'node-circle-wrap' + stateCls;
    circleWrap.style.left = leftStyle;

    const circle = document.createElement('div');
    circle.className = 'node-circle';
    if (!node.completed) applyNodeColor(circle, node.color);

    const delBtn = document.createElement('button');
    delBtn.className = 'node-delete';
    delBtn.textContent = '×';
    delBtn.addEventListener('click', e => {
      e.stopPropagation();
      circleWrap.style.transition = 'opacity 0.18s, transform 0.18s';
      labelsWrap.style.transition = 'opacity 0.18s';
      circleWrap.style.opacity = '0';
      circleWrap.style.transform = 'translateX(-50%) scale(0.7)';
      labelsWrap.style.opacity = '0';
      setTimeout(() => {
        line.nodes = line.nodes.filter(n => n.id !== node.id);
        save();
        renderTrack(line, trackWrap);
        const wrap = trackWrap.closest('.main-line');
        if (wrap) refreshProgress(wrap, line);
      }, 180);
    });
    circle.appendChild(delBtn);
    circleWrap.appendChild(circle);

    circle.addEventListener('click', e => {
      e.stopPropagation();
      if (e.target === delBtn) return;
      node.completed = !node.completed;
      save();
      renderTrack(line, trackWrap);
      const wrap = trackWrap.closest('.main-line');
      if (wrap) refreshProgress(wrap, line);
    });

    return { labelsWrap, circleWrap };
  });

  renderItems.forEach(item => trackWrap.appendChild(item.labelsWrap));
  renderItems.forEach(item => trackWrap.appendChild(item.circleWrap));
}

function refreshProgress(wrap, line) {
  const nodes = line.nodes || [];
  const done  = nodes.filter(n => n.completed).length;
  const total = nodes.length;
  const pct   = total > 0 ? Math.round(done / total * 100) : 0;

  const progEl = wrap.querySelector('.line-progress');
  if (!progEl) return;
  if (total === 0) { progEl.innerHTML = ''; return; }
  let fill = progEl.querySelector('.progress-fill');
  let text = progEl.querySelector('.progress-text');
  if (!fill) {
    progEl.innerHTML = `<div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div><span class="progress-text">${pct}%</span>`;
  } else {
    fill.style.width = pct + '%';
    text.textContent = pct + '%';
  }
}

// ─── Edit Name ───────────────────────────────────────────────
function startEditName(line, nameEl) {
  const input = document.createElement('input');
  input.className = 'line-name-input';
  input.value = line.name || '';
  nameEl.replaceWith(input);
  input.focus(); input.select();

  function done() {
    const val = input.value.trim() || '未命名主线';
    line.name = val;
    save();
    const newSpan = document.createElement('span');
    newSpan.className = 'line-name';
    newSpan.textContent = val;
    newSpan.title = '点击编辑名称';
    newSpan.addEventListener('click', () => startEditName(line, newSpan));
    input.replaceWith(newSpan);
  }

  input.addEventListener('blur', done);
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); input.blur(); }
    if (e.key === 'Escape') { input.value = line.name || ''; input.blur(); }
  });
}

// ─── Node Modal ──────────────────────────────────────────────
let _modalCallback = null;

const NODE_COLORS = {
  pink:   { border: 'rgba(255,150,180,0.75)', bg: 'rgba(255,150,180,0.18)', glow: 'rgba(255,150,180,0.35)' },
  green:  { border: 'rgba(100,220,150,0.75)', bg: 'rgba(100,220,150,0.18)', glow: 'rgba(100,220,150,0.35)' },
  yellow: { border: 'rgba(255,215,70,0.75)',  bg: 'rgba(255,215,70,0.18)',  glow: 'rgba(255,215,70,0.35)'  },
  purple: { border: 'rgba(185,130,255,0.75)', bg: 'rgba(185,130,255,0.18)', glow: 'rgba(185,130,255,0.35)' },
};

function applyNodeColor(circle, color) {
  if (!color || !NODE_COLORS[color]) {
    circle.style.removeProperty('border-color');
    circle.style.removeProperty('background');
    circle.style.removeProperty('box-shadow');
    return;
  }
  const c = NODE_COLORS[color];
  circle.style.borderColor = c.border;
  circle.style.background  = c.bg;
  circle.style.boxShadow   = `inset 0 1px 0 rgba(255,255,255,0.20), 0 0 0 3px rgba(255,255,255,0.04), 0 0 10px ${c.glow}`;
}

function openNodeModal(line, trackWrap, editNode = null) {
  const overlay    = document.getElementById('modal-overlay');
  const titleInput = document.getElementById('node-title-input');
  const dateInput  = document.getElementById('node-date-input');
  const notesInput = document.getElementById('node-notes-input');

  document.getElementById('modal-title').textContent = editNode ? '编辑节点' : '新增节点';
  titleInput.value = editNode ? editNode.title : '';
  dateInput.value  = editNode ? editNode.date : (line.startDate || today());
  notesInput.value = editNode ? (editNode.notes || '') : '';

  // Color picker
  const currentColor = editNode ? (editNode.color || '') : '';
  document.querySelectorAll('.color-opt').forEach(el => {
    el.classList.toggle('selected', el.dataset.color === currentColor);
    el.onclick = () => {
      document.querySelectorAll('.color-opt').forEach(x => x.classList.remove('selected'));
      el.classList.add('selected');
    };
  });

  overlay.classList.add('open');
  setTimeout(() => titleInput.focus(), 50);

  _modalCallback = () => {
    const title = titleInput.value.trim();
    const date  = dateInput.value;
    if (!title || !date) {
      titleInput.focus();
      titleInput.style.borderColor = 'rgba(255,80,60,0.6)';
      setTimeout(() => titleInput.style.borderColor = '', 1000);
      return;
    }
    const notes = notesInput.value.trim();
    const color = (document.querySelector('.color-opt.selected') || {}).dataset?.color || '';
    if (editNode) {
      // Edit existing
      editNode.title = title;
      editNode.date  = date;
      editNode.notes = notes;
      editNode.color = color;
    } else {
      // Create new
      if (!line.nodes) line.nodes = [];
      line.nodes.push({ id: uuid(), title, date, notes, color, completed: false });
    }
    line.nodes.sort((a, b) => a.date.localeCompare(b.date));
    save();
    renderTrack(line, trackWrap);
    const wrap = trackWrap.closest('.main-line');
    if (wrap) refreshProgress(wrap, line);
    closeModal();
  };
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('open');
  _modalCallback = null;
}

// ─── Event Bindings ──────────────────────────────────────────
document.getElementById('btn-close').addEventListener('click', () => window.api.closeWindow());
document.getElementById('btn-min').addEventListener('click', () => window.api.minimizeWindow());
document.getElementById('btn-add-line').addEventListener('click', () => {
  const start = new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10);
  const end = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
  data.mainLines.push({ id: uuid(), name: `主线 ${data.mainLines.length + 1}`, startDate: start, endDate: end, nodes: [] });
  save();
  render();
  setTimeout(() => {
    const all = document.querySelectorAll('.line-name');
    const last = all[all.length - 1];
    if (last) last.dispatchEvent(new MouseEvent('click'));
  }, 50);
});

document.getElementById('modal-confirm').addEventListener('click', () => { if (_modalCallback) _modalCallback(); });
document.getElementById('modal-cancel').addEventListener('click', closeModal);
document.getElementById('modal-overlay').addEventListener('click', e => {
  if (e.target === document.getElementById('modal-overlay')) closeModal();
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeModal();
  if (e.key === 'Enter' && document.getElementById('modal-overlay').classList.contains('open')
      && e.target.tagName !== 'TEXTAREA') {
    e.preventDefault();
  }
});

// ─── Scroll Repaint Fix ───────────────────────────────────────
// webContents.invalidate() clears GPU compositing cache on each scroll frame
const _content = document.getElementById('content');
let _repaintRAF;
_content.addEventListener('scroll', () => {
  cancelAnimationFrame(_repaintRAF);
  _repaintRAF = requestAnimationFrame(() => window.api.repaint());
});

// ─── Tooltip ─────────────────────────────────────────────────
const tooltip = document.getElementById('node-tooltip');
let tooltipTimer;

document.addEventListener('mouseover', e => {
  const label = e.target.closest('.node-label');
  if (!label) return;
  const full = label.dataset.full;
  if (!full) return;
  clearTimeout(tooltipTimer);
  tooltipTimer = setTimeout(() => {
    const rect = label.getBoundingClientRect();
    tooltip.textContent = full;
    tooltip.style.left = (rect.left + rect.width / 2) + 'px';
    tooltip.style.top  = (rect.top - 28) + 'px';
    tooltip.style.opacity = '1';
  }, 300);
});

document.addEventListener('mouseout', e => {
  if (!e.target.closest('.node-label')) return;
  clearTimeout(tooltipTimer);
  tooltip.style.opacity = '0';
});

// ─── Opacity Slider ──────────────────────────────────────────
// 只调 #content 背景的 alpha，文字/圆圈/线条不受影响
document.getElementById('opacity-slider').addEventListener('input', e => {
  const v = e.target.value / 100;
  document.documentElement.style.setProperty('--master-opacity', v);
});

// ─── Hover Zones ─────────────────────────────────────────────
const app = document.getElementById('app');
const ZONE = 44; // px from edge to trigger

app.addEventListener('mousemove', e => {
  const h = app.clientHeight;
  app.classList.toggle('show-top',    e.clientY < ZONE);
  app.classList.toggle('show-bottom', e.clientY > h - ZONE);
});
app.addEventListener('mouseleave', () => {
  app.classList.remove('show-top', 'show-bottom');
});

// ─── Resize Re-render ────────────────────────────────────────
// Node positions are computed in px from offsetWidth at render time;
// today-marker uses CSS %. Without re-render they desync on resize.
let _resizeRAF;
window.addEventListener('resize', () => {
  cancelAnimationFrame(_resizeRAF);
  _resizeRAF = requestAnimationFrame(render);
});

// ─── Boot ────────────────────────────────────────────────────
load();
