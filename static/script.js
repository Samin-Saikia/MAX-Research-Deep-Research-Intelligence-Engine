const MODES = window.MODES;
let currentMode = 'deep_research';
let fullContent = '';
let currentTitle = '';
let startTime = 0;
let sourceCount = 0;
let statsInterval = null;

// ── Init ────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', function() {
  renderModes();
  loadHistory();
  checkSearchStatus();
  document.getElementById('submit-btn').innerHTML = '<span>⚡</span> Analyze Now';
  document.getElementById('submit-btn').addEventListener('click', submitResearch);
  document.getElementById('tab-rendered').addEventListener('click', () => switchTab('rendered'));
  document.getElementById('tab-raw').addEventListener('click', () => switchTab('raw'));
  document.getElementById('copy-btn').addEventListener('click', copyContent);
  document.querySelectorAll('.export-btn').forEach(btn => {
    btn.addEventListener('click', () => exportReport(btn.dataset.fmt));
  });
  document.getElementById('topic-input').addEventListener('keydown', function(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') submitResearch();
  });

  const fileInput = document.getElementById('file-input');
  fileInput.addEventListener('change', function() {
    if (this.files[0]) {
      const fn = document.getElementById('file-name');
      fn.textContent = '📎 ' + this.files[0].name;
      fn.style.display = 'block';
    }
  });

  const fileDrop = document.getElementById('file-drop');
  fileDrop.addEventListener('dragover', function(e) {
    e.preventDefault();
    this.classList.add('drag-over');
  });
  fileDrop.addEventListener('dragleave', function() {
    this.classList.remove('drag-over');
  });
  fileDrop.addEventListener('drop', function(e) {
    e.preventDefault();
    this.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) {
      fileInput.files = e.dataTransfer.files;
      const fn = document.getElementById('file-name');
      fn.textContent = '📎 ' + file.name;
      fn.style.display = 'block';
    }
  });
});

async function checkSearchStatus() {
  try {
    const r = await fetch('/api/search-status');
    const d = await r.json();
    const badge = document.getElementById('search-badge');
    const text = document.getElementById('search-badge-text');
    if (d.serper_enabled) {
      badge.className = 'search-badge active';
      text.textContent = 'Web Search Active';
    } else {
      badge.className = 'search-badge inactive';
      text.textContent = 'No Web Search';
    }
  } catch(e) {}
}

// ── Mode Rendering ──────────────────────────────────────────────────────────

const modeIcons = {
  deep_research: '📡',
  paper_crux: '🧬',
  docs_simplifier: '⚡',
  custom: '🎯'
};

function renderModes() {
  const container = document.getElementById('mode-list');
  container.innerHTML = '';
  for (const [key, mode] of Object.entries(MODES)) {
    const card = document.createElement('div');
    card.className = 'mode-card' + (key === currentMode ? ' active' : '');
    card.dataset.mode = key;
    card.innerHTML = `
      <div class="mode-icon">${modeIcons[key] || '📋'}</div>
      <div class="mode-info">
        <h4>${mode.name}</h4>
        <p>${mode.description}</p>
      </div>`;
    card.addEventListener('click', () => selectMode(key));
    container.appendChild(card);
  }
}

function selectMode(mode) {
  currentMode = mode;
  document.querySelectorAll('.mode-card').forEach(c => {
    c.classList.toggle('active', c.dataset.mode === mode);
  });
  const customWrap = document.getElementById('custom-instruction-wrap');
  if (mode === 'custom') {
    customWrap.classList.add('visible');
  } else {
    customWrap.classList.remove('visible');
  }
  const placeholders = {
    deep_research: 'e.g. The geopolitics of rare earth minerals',
    paper_crux: 'Paste abstract or describe the paper...',
    docs_simplifier: 'e.g. Docker Compose, React Hooks, Rust ownership...',
    custom: 'Enter your topic here...'
  };
  document.getElementById('topic-input').placeholder = placeholders[mode] || 'Enter your topic...';
}

// ── Research Submission ──────────────────────────────────────────────────────

async function submitResearch() {
  const topic = document.getElementById('topic-input').value.trim();
  const fileInput = document.getElementById('file-input');
  const customInstruction = document.getElementById('custom-instruction').value.trim();

  if (!topic && !fileInput.files[0]) {
    document.getElementById('topic-input').focus();
    return;
  }

  setLoading(true);
  clearOutput();
  sourceCount = 0;
  startTime = Date.now();
  currentTitle = topic || 'Research Report';
  fullContent = '';

  // Reset search pills
  document.getElementById('search-pills').innerHTML = '';
  document.getElementById('search-progress').classList.remove('visible');

  // Build form data
  const formData = new FormData();
  formData.append('mode', currentMode);
  formData.append('topic', topic);
  if (customInstruction) formData.append('custom_instruction', customInstruction);
  if (fileInput.files[0]) formData.append('file', fileInput.files[0]);

  // Start time updater
  statsInterval = setInterval(updateTime, 500);

  const evtSource = new EventSource('/api/research/stream?' + new URLSearchParams({
    mode: currentMode,
    topic: topic,
    custom_instruction: customInstruction
  }).toString());

  // Use fetch for POST with file
  const response = await fetch('/api/research/stream', {
    method: 'POST',
    body: formData
  });

  if (!response.ok) {
    showError('Request failed: ' + response.status);
    setLoading(false);
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop();

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      try {
        const evt = JSON.parse(line.slice(6));
        handleEvent(evt);
      } catch(e) {}
    }
  }

  clearInterval(statsInterval);
  setLoading(false);
  if (fullContent) {
    document.getElementById('export-bar').classList.add('visible');
    saveToHistory(currentTitle, currentMode, fullContent);
    loadHistory();
  }
}

function handleEvent(evt) {
  switch(evt.type) {
    case 'status':
      showStatus(evt.message);
      if (evt.queries) {
        document.getElementById('search-progress').classList.add('visible');
        const pills = document.getElementById('search-pills');
        pills.innerHTML = '';
        evt.queries.forEach(q => {
          const pill = document.createElement('div');
          pill.className = 'search-pill searching';
          pill.id = 'pill-' + btoa(q).replace(/=/g,'');
          pill.textContent = q;
          pills.appendChild(pill);
        });
      }
      break;

    case 'search_done':
      sourceCount += evt.count;
      document.getElementById('stat-sources').textContent = sourceCount;
      // Mark pill as done
      const pillId = 'pill-' + btoa(evt.query).replace(/=/g,'');
      const pill = document.getElementById(pillId);
      if (pill) {
        pill.className = 'search-pill done';
        pill.textContent = '✓ ' + evt.query + ' (' + evt.count + ')';
      }
      break;

    case 'start':
      hideStatus();
      document.getElementById('search-progress').classList.remove('visible');
      document.getElementById('empty-state').style.display = 'none';
      document.getElementById('output-body').style.display = 'block';
      break;

    case 'chunk':
      fullContent += evt.text;
      renderOutput(fullContent, true);
      break;

    case 'done':
      fullContent = evt.full_content;
      renderOutput(fullContent, false);
      updateStats();
      break;

    case 'error':
      showError(evt.message);
      break;
  }
}

// ── Output Rendering ─────────────────────────────────────────────────────────

function renderOutput(content, streaming) {
  marked.setOptions({ highlight: (code, lang) => {
    if (lang && hljs.getLanguage(lang)) {
      return hljs.highlight(code, { language: lang }).value;
    }
    return hljs.highlightAuto(code).value;
  }});

  const body = document.getElementById('output-body');
  body.innerHTML = marked.parse(content) + (streaming ? '<span class="cursor"></span>' : '');

  // Re-apply highlight.js
  body.querySelectorAll('pre code').forEach(el => hljs.highlightElement(el));

  // Auto-scroll
  const container = document.querySelector('.output-container');
  container.scrollTop = container.scrollHeight;

  // Raw
  document.getElementById('output-raw-content').textContent = content;

  updateStats();
}

function updateStats() {
  const words = fullContent.trim().split(/\s+/).filter(Boolean).length;
  const sections = (fullContent.match(/^#{1,3} /mg) || []).length;
  document.getElementById('stat-words').textContent = words.toLocaleString();
  document.getElementById('stat-sections').textContent = sections;
}

function updateTime() {
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  document.getElementById('stat-time').textContent = elapsed + 's';
}

// ── UI Helpers ───────────────────────────────────────────────────────────────

function switchTab(tab) {
  document.getElementById('output-rendered').className = tab === 'rendered' ? 'active' : '';
  document.getElementById('output-raw').className = tab === 'raw' ? 'active' : '';
  document.getElementById('tab-rendered').className = 'tab-btn' + (tab === 'rendered' ? ' active' : '');
  document.getElementById('tab-raw').className = 'tab-btn' + (tab === 'raw' ? ' active' : '');
}

function clearOutput() {
  document.getElementById('output-body').innerHTML = '';
  document.getElementById('output-raw-content').textContent = '';
  document.getElementById('empty-state').style.display = 'flex';
  document.getElementById('export-bar').classList.remove('visible');
  document.getElementById('error-banner').classList.remove('visible');
  document.getElementById('stat-words').textContent = '0';
  document.getElementById('stat-sections').textContent = '0';
  document.getElementById('stat-time').textContent = '—';
  document.getElementById('stat-sources').textContent = '—';
}

function setLoading(state) {
  const btn = document.getElementById('submit-btn');
  btn.disabled = state;
  btn.innerHTML = state
    ? '<span style="display:inline-block;animation:spin .7s linear infinite;border:2px solid #fff3;border-top-color:#fff;border-radius:50%;width:14px;height:14px;"></span> Analyzing...'
    : '<span>⚡</span> Analyze Now';
}

function showStatus(msg) {
  const el = document.getElementById('status-msg');
  el.classList.remove('hidden');
  document.getElementById('status-text').textContent = msg;
}

function hideStatus() {
  document.getElementById('status-msg').classList.add('hidden');
}

function showError(msg) {
  const banner = document.getElementById('error-banner');
  banner.classList.add('visible');
  document.getElementById('error-text').textContent = msg;
  hideStatus();
}

async function copyContent() {
  if (!fullContent) return;
  await navigator.clipboard.writeText(fullContent);
}

// ── Export ───────────────────────────────────────────────────────────────────

async function exportReport(format) {
  if (!fullContent) return;
  const r = await fetch('/api/export', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ content: fullContent, title: currentTitle, format })
  });
  if (r.ok) {
    const blob = await r.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = currentTitle.replace(/[^a-z0-9]/gi, '_').slice(0, 50) + '.' + format;
    a.click();
    URL.revokeObjectURL(url);
  }
}

// ── History ──────────────────────────────────────────────────────────────────

function saveToHistory(title, mode, content) {
  let history = [];
  try { history = JSON.parse(localStorage.getItem('max_research_history') || '[]'); } catch(e) {}
  history.unshift({ title, mode, content, ts: Date.now() });
  history = history.slice(0, 20);
  localStorage.setItem('max_research_history', JSON.stringify(history));
}

function loadHistory() {
  let history = [];
  try { history = JSON.parse(localStorage.getItem('max_research_history') || '[]'); } catch(e) {}
  const container = document.getElementById('history-list');
  container.innerHTML = '';
  history.forEach((item, idx) => {
    const el = document.createElement('div');
    el.className = 'history-item';
    const ago = timeAgo(item.ts);
    el.innerHTML = `<h5>${escapeHtml(item.title)}</h5><span>${MODES[item.mode]?.name || item.mode} · ${ago}</span>`;
    el.addEventListener('click', () => {
      fullContent = item.content;
      currentTitle = item.title;
      document.getElementById('empty-state').style.display = 'none';
      renderOutput(item.content, false);
      document.getElementById('export-bar').classList.add('visible');
    });
    container.appendChild(el);
  });
}

function timeAgo(ts) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return Math.floor(s/60) + 'm ago';
  if (s < 86400) return Math.floor(s/3600) + 'h ago';
  return Math.floor(s/86400) + 'd ago';
}

function escapeHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}