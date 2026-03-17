  // ── STATE ──
  let currentMode = 'deep_research';
  let currentContent = '';
  let currentTitle = '';
  let history = JSON.parse(localStorage.getItem('nexus_history') || '[]');
  let startTime = 0;
  let timerInterval = null;

  // ── INIT ──
  renderHistory();

  // ── MODE SELECTION ──
  function selectMode(btn) {
    document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentMode = btn.dataset.mode;

    const badgeMap = {
      deep_research: ['badge-research', 'DEEP RESEARCH'],
      paper_crux: ['badge-paper', 'PAPER CRUX'],
      docs_simplifier: ['badge-docs', 'DOCS SIMPLIFIER'],
      custom: ['badge-custom', 'CUSTOM ANALYSIS']
    };
    const [cls, text] = badgeMap[currentMode];
    const badge = document.getElementById('modeBadge');
    badge.className = `output-badge ${cls}`;
    badge.textContent = text;

    document.getElementById('customGroup').style.display = currentMode === 'custom' ? 'block' : 'none';

    const placeholders = {
      deep_research: 'e.g. The complete landscape of large language models and their societal impact...',
      paper_crux: 'Paste paper title/abstract here, or upload the PDF below...',
      docs_simplifier: 'Paste documentation, API reference, or upload a guide...',
      custom: 'Enter your topic here...'
    };
    document.getElementById('topicInput').placeholder = placeholders[currentMode];
  }

  // ── FILE HANDLING ──
  function handleFileSelect(input) {
    const file = input.files[0];
    if (file) {
      document.getElementById('fileName').textContent = file.name;
      document.getElementById('fileSelected').style.display = 'block';
      document.querySelector('.file-drop-icon').textContent = '✅';
    }
  }

  const fileDrop = document.getElementById('fileDrop');
  fileDrop.addEventListener('dragover', (e) => { e.preventDefault(); fileDrop.classList.add('drag-over'); });
  fileDrop.addEventListener('dragleave', () => fileDrop.classList.remove('drag-over'));
  fileDrop.addEventListener('drop', (e) => {
    e.preventDefault();
    fileDrop.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) {
      const dt = new DataTransfer();
      dt.items.add(file);
      document.getElementById('fileInput').files = dt.files;
      handleFileSelect(document.getElementById('fileInput'));
    }
  });

  // ── RESEARCH ──
  async function startResearch() {
    const topic = document.getElementById('topicInput').value.trim();
    const file = document.getElementById('fileInput').files[0];
    const customInstruction = document.getElementById('customInstruction').value.trim();

    if (!topic && !file) {
      showToast('Please enter a topic or upload a file', 'error');
      return;
    }

    const btn = document.getElementById('analyzeBtn');
    btn.disabled = true;
    btn.classList.add('loading');

    document.getElementById('emptyState').style.display = 'none';
    document.getElementById('resultCard').classList.remove('visible');
    document.getElementById('exportBar').style.display = 'none';
    document.getElementById('progressWrap').classList.add('active');

    currentContent = '';
    currentTitle = topic || (file ? file.name : 'Analysis');
    document.getElementById('outputTitle').textContent = currentTitle;

    startTime = Date.now();
    updateTimer();
    timerInterval = setInterval(updateTimer, 500);

    try {
      const formData = new FormData();
      formData.append('mode', currentMode);
      formData.append('topic', topic);
      if (customInstruction) formData.append('custom_instruction', customInstruction);
      if (file) formData.append('file', file);

      const response = await fetch('/api/research/stream', { method: 'POST', body: formData });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Request failed');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      document.getElementById('resultCard').classList.add('visible');
      document.getElementById('renderedContent').innerHTML = '<span class="streaming-cursor"></span>';
      document.getElementById('rawContent').textContent = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop();

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === 'chunk') {
              currentContent += data.text;
              renderContent(currentContent, true);
            } else if (data.type === 'done') {
              currentContent = data.full_content || currentContent;
              renderContent(currentContent, false);
              updateStats(currentContent);
              saveToHistory(currentTitle, currentMode, currentContent);
              document.getElementById('exportBar').style.display = 'flex';
              showToast('Research complete!', 'success');
            } else if (data.type === 'error') {
              throw new Error(data.message);
            }
          } catch (e) {
            if (e.message.includes('JSON')) continue;
            throw e;
          }
        }
      }
    } catch (err) {
      showToast(err.message, 'error');
      document.getElementById('emptyState').style.display = 'flex';
      document.getElementById('resultCard').classList.remove('visible');
    } finally {
      btn.disabled = false;
      btn.classList.remove('loading');
      document.getElementById('progressWrap').classList.remove('active');
      clearInterval(timerInterval);
      updateTimer();
    }
  }

  function updateTimer() {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    document.getElementById('genTime').textContent = startTime ? `${elapsed}s` : '—';
  }

  // ── RENDER ──
  const renderer = new marked.Renderer();
  renderer.code = (code, lang) => {
    const validLang = lang && hljs.getLanguage(lang) ? lang : 'plaintext';
    const highlighted = hljs.highlight(typeof code === 'object' ? code.text : code, { language: validLang }).value;
    return `<pre data-lang="${validLang || ''}"><code class="hljs language-${validLang}">${highlighted}</code></pre>`;
  };

  marked.setOptions({ renderer, breaks: true, gfm: true });

  function renderContent(md, streaming) {
    const rendered = document.getElementById('renderedContent');
    const raw = document.getElementById('rawContent');
    const cursor = streaming ? '<span class="streaming-cursor"></span>' : '';
    rendered.innerHTML = marked.parse(md) + cursor;
    raw.textContent = md + (streaming ? '█' : '');

    // Scroll to bottom during streaming
    const body = rendered.closest('.result-body');
    if (streaming) body.scrollTop = body.scrollHeight;
  }

  function updateStats(content) {
    const words = content.trim().split(/\s+/).length;
    const sections = (content.match(/^#{1,3} .+/gm) || []).length;
    document.getElementById('wordCount').textContent = words.toLocaleString();
    document.getElementById('sectionCount').textContent = sections;
  }

  // ── TABS ──
  function switchTab(tab, btn) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('renderedContent').style.display = tab === 'rendered' ? 'block' : 'none';
    document.getElementById('rawContent').style.display = tab === 'raw' ? 'block' : 'none';
  }

  // ── EXPORT ──
  async function exportReport(format) {
    if (!currentContent) { showToast('Nothing to export', 'error'); return; }
    try {
      const res = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: currentContent, title: currentTitle, format })
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${currentTitle.slice(0,40)}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
      showToast(`Exported as .${format.toUpperCase()}`, 'success');
    } catch (e) {
      showToast(e.message, 'error');
    }
  }

  function copyToClipboard() {
    navigator.clipboard.writeText(currentContent).then(() => showToast('Copied to clipboard!', 'success'));
  }

  // ── HISTORY ──
  function saveToHistory(title, mode, content) {
    const item = { title, mode, content, date: new Date().toISOString(), words: content.trim().split(/\s+/).length };
    history.unshift(item);
    if (history.length > 20) history = history.slice(0, 20);
    localStorage.setItem('nexus_history', JSON.stringify(history));
    renderHistory();
  }

  function renderHistory() {
    const list = document.getElementById('historyList');
    if (!history.length) {
      list.innerHTML = '<div class="history-empty">No research history yet</div>';
      return;
    }
    list.innerHTML = history.map((item, i) => `
      <div class="history-item" onclick="loadHistory(${i})">
        <div class="history-item-title">${escHtml(item.title)}</div>
        <div class="history-item-meta">${item.mode.replace('_', ' ').toUpperCase()} · ${item.words.toLocaleString()} words · ${new Date(item.date).toLocaleDateString()}</div>
      </div>
    `).join('');
  }

  function loadHistory(i) {
    const item = history[i];
    currentContent = item.content;
    currentTitle = item.title;
    document.getElementById('outputTitle').textContent = item.title;
    document.getElementById('emptyState').style.display = 'none';
    document.getElementById('resultCard').classList.add('visible');
    document.getElementById('exportBar').style.display = 'flex';
    renderContent(item.content, false);
    updateStats(item.content);
  }

  function clearHistory() {
    history = [];
    localStorage.setItem('nexus_history', '[]');
    renderHistory();
    showToast('History cleared', 'success');
  }

  // ── TOAST ──
  function showToast(msg, type = '') {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.className = `toast show ${type}`;
    setTimeout(() => toast.classList.remove('show'), 3000);
  }

  // ── UTILS ──
  function escHtml(s) {
    return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  // Enter key shortcut
  document.getElementById('topicInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) startResearch();
  });