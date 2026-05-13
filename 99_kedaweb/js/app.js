/* =============================================================
   kedalab — app logic
   ============================================================= */
(() => {
  "use strict";
  const D = window.KEDA_DATA;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const phaseById = {};
  D.phases.forEach(p => (phaseById[p.id] = p));

  const isFile = location.protocol === "file:";
  let dataLoaded = false;
  const loaderErrors = [];

  function setPill(text, cls) {
    const el = document.getElementById("loaderPill");
    if (!el) return;
    el.textContent = text;
    el.classList.remove("ok", "err", "loading");
    if (cls) el.classList.add(cls);
  }
  setPill("⋯ kedaweb script started", "loading");

  // Recomputed every time after data loads/updates.
  let phaseCounts = {};
  let cveCount = 0;
  function recomputeStats() {
    phaseCounts = {};
    D.phases.forEach(p => (phaseCounts[p.id] = 0));
    D.techniques.forEach(t => (phaseCounts[t.p] = (phaseCounts[t.p] || 0) + 1));
    cveCount = D.techniques.filter(
      t => (t.tags || []).includes("cve") || /CVE-\d{4}-\d+/i.test(t.n)
    ).length;
  }
  recomputeStats(); // initial zero-fill so renders don't see undefined

  // ============================================================
  // kedalab loader — single source of truth = kedalab MDs
  // ============================================================
  async function fetchMd(path) {
    const res = await fetch("../" + path);
    if (!res.ok) throw new Error("HTTP " + res.status + " " + path);
    return res.text();
  }

  // Parse all markdown tables from a document. Returns [{ headers, rows }].
  function parseMdTables(md) {
    const tables = [];
    const lines = md.split(/\r?\n/);
    const splitCells = s => s.replace(/^\|/, "").replace(/\|$/, "").split("|").map(c => c.trim());
    let i = 0;
    while (i < lines.length) {
      const line = lines[i].trim();
      if (!line.startsWith("|")) { i++; continue; }
      const next = (lines[i + 1] || "").trim();
      if (!/^\|[\s|:\-]+\|$/.test(next)) { i++; continue; }
      const headers = splitCells(line);
      const rows = [];
      i += 2;
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        rows.push(splitCells(lines[i].trim()));
        i++;
      }
      tables.push({ headers, rows });
    }
    return tables;
  }

  // First `*.md` path in a cell (handles backticks).
  function extractFile(cell) {
    if (!cell) return null;
    const m = cell.match(/`([^`]+\.md)`/) || cell.match(/(?:^|\s)([\w][\w\-./]*\.md)\b/);
    return m ? m[1] : null;
  }

  // All `*.md` paths anywhere in a cell.
  function extractFiles(cell) {
    if (!cell) return [];
    const out = [];
    const re = /`([^`]+\.md)`/g;
    let m;
    while ((m = re.exec(cell)) !== null) out.push(m[1]);
    return out;
  }

  function cleanName(s) {
    return s
      .replace(/^\*\*/, "")
      .replace(/\*\*$/, "")
      .replace(/\\\|/g, "|")
      .trim();
  }

  // Map a root-relative file path → phase id (folder prefix).
  function phaseFromPath(file) {
    if (!file) return null;
    if (file.startsWith("06_Concepts/AI_ML/")) return "ai";
    if (file.startsWith("07_")) return "ai";
    if (file.startsWith("06_")) return "concepts";
    if (file.startsWith("05_")) return "tools";
    if (file.startsWith("04_")) return "windows";
    if (file.startsWith("03_")) return "linux";
    if (file.startsWith("02_")) return "initial";
    if (file.startsWith("01_")) return "recon";
    return null; // 00_Playbook etc.
  }

  function deriveTags(name, file) {
    const tags = new Set();
    if (/CVE-\d{4}-\d+/i.test(name)) tags.add("cve");
    const p = phaseFromPath(file);
    if (p) tags.add(p);
    const base = (file.split("/").pop() || "").replace(/\.md$/i, "").toLowerCase();
    base.split(/[_\-]/).forEach(w => { if (w.length > 2) tags.add(w); });
    return Array.from(tags).slice(0, 5);
  }

  // Load TECHNIQUES_INDEX*.md → flat technique list.
  async function loadTechniques() {
    const out = [];
    for (const src of ["TECHNIQUES_INDEX.md", "TECHNIQUES_INDEX_AI_ML.md"]) {
      let md;
      try { md = await fetchMd(src); }
      catch (e) { console.warn("[loader]", e.message); continue; }
      const tables = parseMdTables(md);
      for (const tbl of tables) {
        if (tbl.headers.length < 2) continue;
        for (const row of tbl.rows) {
          if (row.length < 2) continue;
          const file = extractFile(row[row.length - 1]);
          const name = cleanName(row[0]);
          if (!file || !name) continue;
          const p = phaseFromPath(file);
          if (!p) continue;
          out.push({ n: name, p, f: file, tags: deriveTags(name, file) });
        }
      }
    }
    return out;
  }

  // Extract H1 title from a markdown source.
  function extractH1(md) {
    const m = md.match(/^#\s+(.+)$/m);
    return m ? m[1].trim() : null;
  }

  // Markdown cache to avoid refetching the same file.
  const _mdCache = new Map();
  async function getMd(file) {
    if (_mdCache.has(file)) return _mdCache.get(file);
    const md = await fetchMd(file);
    _mdCache.set(file, md);
    return md;
  }

  function shortLabel(file) {
    if (!file) return "";
    return file.split("/").pop().replace(/\.md$/, "").replace(/_/g, " ");
  }

  // ---- Quick Start: parse README's「最初に開くファイル」table ------------
  // Each row → { situation, file (first .md cited), note (free text after) }
  // The 「ドメインのみ」row points to recon → OS判定 (two files); we take the
  // first as the entry. Layout-wise this works fine because the row text still
  // mentions the second one.
  async function loadSituations() {
    let md;
    try { md = await getMd("README.md"); }
    catch { return []; }
    const tables = parseMdTables(md);
    let target = null;
    for (const t of tables) {
      const h0 = t.headers[0] || "";
      if (h0.includes("手元にある情報")) { target = t; break; }
    }
    if (!target) return [];
    return target.rows
      .map(row => {
        const situation = cleanName(row[0] || "");
        const cell = row[1] || "";
        const files = extractFiles(cell);
        const file = files[0];
        // Note = cell text with backticked paths replaced by their basename so
        // the flow narrative ("DNS列挙 で IP 特定 → OS判定 へ") stays readable.
        const note = cell
          .replace(/`([^`]+\.md)`/g, (_, p) =>
            p.split("/").pop().replace(/\.md$/, "")
          )
          .replace(/\s+/g, " ")
          .trim();
        return { situation, file, note };
      })
      .filter(r => r.situation && r.file);
  }

  // Pick an emoji/icon based on situation keywords.
  function iconForSituation(s) {
    const t = s.toLowerCase();
    if (t.includes("認証")) return "🔑";
    if (t.includes("ドメイン")) return "📁";
    if (t.includes("インターネット") || t.includes("露出")) return "📡";
    if (t.includes("web診断") || t.includes("網羅")) return "🔬";
    if (t.includes("web")) return "🌐";
    if (t.includes("linux")) return "🐧";
    if (t.includes("windows")) return "🪟";
    if (t.includes("内部") || t.includes("vlan")) return "🔌";
    if (t.includes("ip")) return "⚫";
    return "▣";
  }
  function colorForSituation(s) {
    const t = s.toLowerCase();
    if (t.includes("linux")) return "#ffb800";
    if (t.includes("windows")) return "#ff3d8a";
    if (t.includes("web診断") || t.includes("網羅")) return "#a78bfa";
    if (t.includes("web")) return "#00d4ff";
    if (t.includes("認証")) return "#64ffda";
    if (t.includes("ドメイン")) return "#ff00ff";
    if (t.includes("内部")) return "#a78bfa";
    if (t.includes("露出")) return "#ff3d8a";
    return "#00ff9c";
  }

  // Fetch a playbook MD, extract H1 + the「フロー概要」(or first fenced block,
  // or first paragraph) for preview purposes.
  async function loadPlaybookPreview(file) {
    const md = await getMd(file);
    const h1 = extractH1(md) || file.split("/").pop().replace(/\.md$/, "");

    // Look for any of: フロー概要 / 判定の優先順位 / 概要 — extract until the
    // next ## heading.
    const summarySections = ["フロー概要", "判定の優先順位", "概要", "案件開始条件の確認"];
    let summary = "";
    let summaryHeading = "";
    for (const name of summarySections) {
      const re = new RegExp("^##\\s+" + name + "\\s*$\\n([\\s\\S]*?)(?=^##\\s|\\Z)", "m");
      const m = md.match(re);
      if (m) { summaryHeading = name; summary = m[1].trim(); break; }
    }
    // Fallback: first non-quote paragraph after H1
    if (!summary) {
      const body = md.replace(/^#\s+.*$/m, "").trim();
      const para = body.split(/\n\n+/).find(p => !p.startsWith(">") && !p.startsWith("#"));
      if (para) summary = para.trim();
    }
    return { h1, summary, summaryHeading };
  }

  // ============================================================
   // Boot sequence
  // ============================================================
  const bootLines = [
    "[boot] kedalab terminal v1.0",
    "[boot] initializing kernel modules ........... [OK]",
    "[boot] mounting /knowledge_base .............. [OK]",
    "[boot] loading techniques catalog ............ [OK]",
    "[boot] indexing CVE database ................. [OK]",
    "[boot] loading playbooks ..................... [OK]",
    "[boot] linking AI red teaming module ......... [OK]",
    "[boot] starting matrix subsystem ............. [OK]",
    "",
    "  ██ ▄█▀▓█████ ▓█████▄  ▄▄▄       ██▓    ▄▄▄       ▄▄▄▄   ",
    "  ██▄█▒ ▓█   ▀ ▒██▀ ██▌▒████▄    ▓██▒   ▒████▄    ▓█████▄ ",
    " ▓███▄░ ▒███   ░██   █▌▒██  ▀█▄  ▒██░   ▒██  ▀█▄  ▒██▒ ▄██",
    " ▓██ █▄ ▒▓█  ▄ ░▓█▄   ▌░██▄▄▄▄██ ▒██░   ░██▄▄▄▄██ ▒██░█▀  ",
    " ▒██▒ █▄░▒████▒░▒████▓  ▓█   ▓██▒░██████▒▓█   ▓██▒░▓█  ▀█▓",
    "",
    "[ok] welcome. press [ctrl+k] to search, [esc] to close."
  ];
  const bootEl = $("#boot-log");
  let bi = 0, ci = 0, current = "";
  function boot() {
    if (bi >= bootLines.length) {
      setTimeout(() => {
        $("#boot").classList.add("fade");
        setTimeout(() => $("#boot").remove(), 800);
        triggerReveal();
      }, 350);
      return;
    }
    const line = bootLines[bi];
    if (ci < line.length) {
      current += line[ci++];
      bootEl.innerHTML = render() + '<span class="cursor"></span>';
      const speed = line.startsWith("[boot]") || line.startsWith("[ok]") ? 6 : 2;
      setTimeout(boot, speed);
    } else {
      current += "\n";
      ci = 0;
      bi++;
      setTimeout(boot, line === "" ? 80 : 60);
    }
  }
  function render() {
    return current
      .replace(/\[OK\]/g, '<span style="color:#00ff9c">[OK]</span>')
      .replace(/\[boot\]/g, '<span style="color:#5b6f8a">[boot]</span>')
      .replace(/\[ok\]/g, '<span style="color:#00ff9c">[ok]</span>');
  }
  boot();

  // ============================================================
  // Render chain (phase nodes)
  // ============================================================
  function renderChain() {
    const c = $("#chainGrid");
    c.innerHTML = D.phases.map(p => `
      <div class="chain-node" data-phase="${p.id}" style="--node-c: ${p.color};">
        <div class="code">${p.code}</div>
        <div class="glyph">${p.glyph}</div>
        <div class="name">${p.name}</div>
        <div class="jp">${p.jp}</div>
        <div class="count"><strong>${phaseCounts[p.id]}</strong></div>
      </div>
    `).join("");
    $$(".chain-node", c).forEach(el => {
      el.addEventListener("click", () => {
        const pid = el.dataset.phase;
        // scroll to browser, set filter
        setFilter(pid);
        document.getElementById("browser").scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  }

  // ============================================================
  // Render playbooks
  // ============================================================
  function renderPlaybooks() {
    const g = $("#pbGrid");
    const list = D.playbookList || [];
    if (!list.length) {
      const msg = isFile
        ? "⚠ file:// では Playbook 一覧を取得できません — HTTP サーバ経由で開いてください"
        : (!dataLoaded
            ? "› fetching README.md & playbooks …"
            : (loaderErrors.length
                ? `✕ Playbook 読み込み失敗：${escapeHtml(loaderErrors.join(" / "))}`
                : "Playbook が見つかりません（README.md の `00_Playbook/*.md` 参照を確認）"));
      g.innerHTML = `<div class="tb-empty">${msg}</div>`;
      return;
    }
    g.innerHTML = list.map(pb => `
      <div class="pb-card" data-file="${pb.file}">
        <div class="pb-icon">${pb.icon || "📋"}</div>
        <div class="pb-body">
          <div class="pb-name">${escapeHtml(pb.name)}</div>
          <div class="pb-entry">${escapeHtml(pb.entry || "")}</div>
        </div>
      </div>
    `).join("");
    $$(".pb-card", g).forEach(el => {
      el.addEventListener("click", () => openMD(el.dataset.file));
    });
  }

  // ============================================================
  // Render Quick Start (situation wizard)
  // ============================================================
  let qsActiveIdx = -1;

  function renderQuickstart() {
    const grid = $("#qsGrid");
    const expand = $("#qsExpand");
    const list = D.situations || [];

    if (!list.length) {
      const msg = isFile
        ? "⚠ file:// では Quick Start を取得できません — HTTP サーバ経由で開いてください"
        : !dataLoaded
          ? "› fetching README.md …"
          : (loaderErrors.length
              ? "✕ 読み込みエラー：" + escapeHtml(loaderErrors.join(" / "))
              : "状況テーブルが README.md に見つかりません（「最初に開くファイル」表を確認）");
      grid.innerHTML = `<div class="tb-empty" style="grid-column:1/-1">${msg}</div>`;
      expand.innerHTML = "";
      return;
    }

    grid.innerHTML = list.map((s, i) => {
      const c = colorForSituation(s.situation);
      const icon = iconForSituation(s.situation);
      const isActive = i === qsActiveIdx;
      const sub = shortLabel(s.file);
      return `
        <div class="qs-card${isActive ? ' active' : ''}" data-i="${i}" style="--qc: ${c};">
          <div class="qs-icon">${icon}</div>
          <div class="qs-title">${escapeHtml(s.situation)}</div>
          <div class="qs-sub">${escapeHtml(sub)}</div>
        </div>
      `;
    }).join("");

    $$(".qs-card", grid).forEach(el => {
      el.addEventListener("click", () => onQsCardClick(+el.dataset.i));
    });

    if (qsActiveIdx >= 0 && list[qsActiveIdx]) {
      renderQsPreview(qsActiveIdx);
    } else {
      expand.innerHTML = "";
    }
  }

  async function onQsCardClick(idx) {
    if (qsActiveIdx === idx) {
      // toggle off
      qsActiveIdx = -1;
    } else {
      qsActiveIdx = idx;
    }
    renderQuickstart();
    if (qsActiveIdx >= 0) {
      // smooth scroll the expand panel into view
      requestAnimationFrame(() => {
        const exp = $("#qsExpand");
        if (exp) exp.scrollIntoView({ behavior: "smooth", block: "nearest" });
      });
    }
  }

  async function renderQsPreview(idx) {
    const exp = $("#qsExpand");
    const s = (D.situations || [])[idx];
    if (!s || !exp) return;
    const color = colorForSituation(s.situation);
    exp.innerHTML = `
      <div class="qs-preview" style="--qc: ${color};">
        <div class="qs-pv-tag">RECOMMENDED PLAYBOOK</div>
        <div class="qs-pv-title">Loading …</div>
        <div class="qs-pv-file">${escapeHtml(s.file)}</div>
        <div class="qs-pv-loading">› fetching ${escapeHtml(s.file)} …</div>
      </div>
    `;

    try {
      const { h1, summary, summaryHeading } = await loadPlaybookPreview(s.file);
      // Truncate very long summaries
      let body = summary || "(本文を開いて全体を確認してください)";
      if (body.length > 1400) body = body.slice(0, 1400) + "\n\n… (省略)";

      const noteHtml = s.note
        ? `<p style="margin:8px 0 0;color:var(--fg-2);font-size:11px;">📌 ${escapeHtml(s.note)}</p>`
        : "";

      exp.innerHTML = `
        <div class="qs-preview" style="--qc: ${color};">
          <div class="qs-pv-tag">RECOMMENDED PLAYBOOK</div>
          <div class="qs-pv-title">${escapeHtml(h1)}</div>
          <div class="qs-pv-file">${escapeHtml(s.file)}</div>
          ${noteHtml}
          <div class="qs-pv-body">
            ${summaryHeading ? `<h4>## ${escapeHtml(summaryHeading)}</h4>` : ""}
            ${miniMarkdown(body)}
          </div>
          <div class="qs-pv-actions">
            <button class="qs-btn" data-act="open">📖 この Playbook を開く</button>
            <button class="qs-btn secondary" data-act="close">閉じる</button>
          </div>
        </div>
      `;
      $("[data-act='open']", exp).addEventListener("click", () => openMD(s.file));
      $("[data-act='close']", exp).addEventListener("click", () => onQsCardClick(idx));
    } catch (e) {
      exp.innerHTML = `
        <div class="qs-preview" style="--qc: ${color};">
          <div class="qs-pv-tag">PREVIEW UNAVAILABLE</div>
          <div class="qs-pv-title">${escapeHtml(s.file)}</div>
          <div class="qs-pv-body" style="color:var(--acc-r);">✕ ${escapeHtml(String(e.message || e))}</div>
          <div class="qs-pv-actions">
            <button class="qs-btn" data-act="open">📖 とにかく開く</button>
          </div>
        </div>
      `;
      $("[data-act='open']", exp).addEventListener("click", () => openMD(s.file));
    }
  }

  // Tiny markdown renderer for previews — handles code-blocks, lists,
  // bold/italic/inline-code. Reuses the same escaping rules.
  function miniMarkdown(src) {
    src = src.replace(/\r\n/g, "\n");

    // Fenced code blocks
    const fences = [];
    src = src.replace(/```([^\n]*)\n([\s\S]*?)```/g, (m, lang, code) => {
      fences.push(code);
      return `F${fences.length - 1}`;
    });

    // Escape HTML
    src = src.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

    // Inline code
    src = src.replace(/`([^`]+)`/g, "<code>$1</code>");
    // Bold
    src = src.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    // Italic (only inside text, avoid breaking **bold**)
    src = src.replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>");

    // Bullet lists
    src = src.replace(/(?:^[ \t]*[-*]\s+.*\n?)+/gm, block => {
      const items = block.trim().split("\n").map(l => l.replace(/^[ \t]*[-*]\s+/, ""));
      return "<ul>" + items.map(i => `<li>${i}</li>`).join("") + "</ul>";
    });

    // Paragraphs
    const html = src.split(/\n{2,}/).map(chunk => {
      const t = chunk.trim();
      if (!t) return "";
      if (/^<(ul|ol|pre|h\d)/.test(t)) return t;
      if (/^F\d+/.test(t)) return t;
      return "<p>" + t.replace(/\n/g, "<br>") + "</p>";
    }).join("\n");

    // Restore code blocks
    return html.replace(/F(\d+)/g, (_, i) => {
      const code = fences[+i].replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      return `<pre>${code}</pre>`;
    });
  }

  // ============================================================
  // Render raw index files
  // ============================================================
  function renderRaw() {
    const g = $("#rawGrid");
    g.innerHTML = D.indexFiles.map(it => `
      <div class="pb-card" data-file="${it.file}">
        <div class="pb-icon">📄</div>
        <div class="pb-body">
          <div class="pb-name">${it.name}</div>
          <div class="pb-entry" style="--p-c: var(--acc-v);">${it.desc}</div>
        </div>
      </div>
    `).join("");
    $$(".pb-card", g).forEach(el => {
      el.addEventListener("click", () => openMD(el.dataset.file));
    });
  }

  // ============================================================
  // Technique browser — filters + grid
  // ============================================================
  let currentPhase = "all";
  let currentQuery = "";

  function renderToolbar() {
    const tb = $("#tbToolbar");
    const total = D.techniques.length;
    const phases = [
      { id: "all", name: "All", color: "var(--fg-0)", count: total }
    ].concat(D.phases.map(p => ({
      id: p.id,
      name: p.name,
      color: p.color,
      count: phaseCounts[p.id]
    })));
    tb.innerHTML = phases.map(p => `
      <button class="filter-chip${p.id === currentPhase ? ' active' : ''}"
              data-phase="${p.id}"
              style="--chip-c: ${p.color};">
        ${p.name} <span class="badge">${p.count}</span>
      </button>
    `).join("");
    $$(".filter-chip", tb).forEach(b => {
      b.addEventListener("click", () => setFilter(b.dataset.phase));
    });
  }

  function setFilter(phaseId) {
    currentPhase = phaseId;
    renderToolbar();
    renderTechniques();
  }

  function matchQuery(t, q) {
    if (!q) return true;
    const hay = (t.n + " " + (t.tags || []).join(" ") + " " + (t.f || "")).toLowerCase();
    return q.toLowerCase().split(/\s+/).filter(Boolean).every(tok => hay.includes(tok));
  }

  function renderTechniques() {
    const g = $("#tbGrid");
    const empty = $("#tbEmpty");
    const filtered = D.techniques.filter(t => {
      const okPhase = currentPhase === "all" || t.p === currentPhase;
      return okPhase && matchQuery(t, currentQuery);
    });
    // update count badge on the collapsible header (visible while folded)
    const countEl = document.getElementById("browserCount");
    if (countEl) {
      countEl.textContent = D.techniques.length
        ? `${filtered.length} / ${D.techniques.length}`
        : "—";
    }
    if (!filtered.length) {
      g.innerHTML = "";
      empty.style.display = "block";
      empty.textContent = isFile
        ? "⚠ file:// では技術リストを取得できません — HTTP サーバ経由で開いてください"
        : (!dataLoaded
            ? "› fetching TECHNIQUES_INDEX.md …"
            : (loaderErrors.length
                ? "✕ 読み込みエラー：" + loaderErrors.join(" / ")
                : "該当なし — フィルタを解除するか別キーワードを試して"));
      return;
    }
    empty.style.display = "none";
    g.innerHTML = filtered.map(t => {
      const p = phaseById[t.p];
      const tagsHtml = (t.tags || []).slice(0, 4).map(x => `<span class="tag">${x}</span>`).join("");
      return `
        <div class="tech-card" data-file="${t.f}" style="--tc: ${p.color};">
          <div class="tech-name">${escapeHtml(t.n)}</div>
          <div class="tech-meta">
            <span class="tech-phase">${p.code} · ${p.name}</span>
            <span class="tech-file">${t.f}</span>
          </div>
          <div class="tech-tags">${tagsHtml}</div>
        </div>
      `;
    }).join("");
    $$(".tech-card", g).forEach(el => {
      el.addEventListener("click", () => openMD(el.dataset.file));
    });
  }

  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, c => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
  }

  // ============================================================
  // Top search — uses palette
  // ============================================================
  $("#topSearch").addEventListener("input", e => {
    currentQuery = e.target.value;
    if (currentQuery) expandCollapsible("browser");
    renderTechniques();
    document.getElementById("browser").scrollIntoView({ behavior: "smooth", block: "start" });
  });

  // ---- collapsible section helpers ----
  function expandCollapsible(id) {
    const sec = document.getElementById(id);
    if (!sec || !sec.classList.contains("collapsible")) return;
    sec.dataset.collapsed = "false";
    const btn = sec.querySelector(".coll-header");
    if (btn) btn.setAttribute("aria-expanded", "true");
  }
  function bindCollapsibles() {
    $$(".collapsible .coll-header").forEach(btn => {
      btn.addEventListener("click", () => {
        const sec = btn.closest(".collapsible");
        const closed = sec.dataset.collapsed === "true";
        sec.dataset.collapsed = closed ? "false" : "true";
        btn.setAttribute("aria-expanded", closed ? "true" : "false");
      });
    });
    // Also: clicking a Chain or QuickStart phase chip should auto-expand Browser
  }
  bindCollapsibles();

  // intercept setFilter calls (from chain card / phase chip) so Browser opens
  const _origSetFilter = setFilter;
  setFilter = function (phaseId) {
    expandCollapsible("browser");
    _origSetFilter(phaseId);
  };

  // ============================================================
  // Cmd palette
  // ============================================================
  const palette = $("#palette");
  const paletteInput = $("#paletteInput");
  const paletteList = $("#paletteList");
  let paletteSel = 0;
  let paletteHits = [];

  function openPalette() {
    palette.classList.add("open");
    paletteInput.value = "";
    paletteSel = 0;
    paletteHits = D.techniques.slice(0, 40);
    drawPalette();
    setTimeout(() => paletteInput.focus(), 30);
  }
  function closePalette() {
    palette.classList.remove("open");
  }

  function drawPalette() {
    if (!paletteHits.length) {
      paletteList.innerHTML = `<div class="palette-empty">該当なし</div>`;
      return;
    }
    paletteList.innerHTML = paletteHits.slice(0, 40).map((t, i) => {
      const p = phaseById[t.p];
      return `
        <div class="palette-item ${i === paletteSel ? 'sel' : ''}" data-i="${i}">
          <span class="pi-name">${escapeHtml(t.n)}</span>
          <span class="pi-phase" style="color:${p.color}">${p.code}</span>
          <span class="pi-file">${t.f}</span>
        </div>
      `;
    }).join("");
    $$(".palette-item", paletteList).forEach(el => {
      el.addEventListener("click", () => {
        const t = paletteHits[+el.dataset.i];
        closePalette();
        openMD(t.f);
      });
      el.addEventListener("mouseenter", () => {
        paletteSel = +el.dataset.i;
        $$(".palette-item", paletteList).forEach(x => x.classList.remove("sel"));
        el.classList.add("sel");
      });
    });
  }

  paletteInput.addEventListener("input", e => {
    const q = e.target.value;
    paletteSel = 0;
    if (!q) {
      paletteHits = D.techniques.slice(0, 40);
    } else {
      paletteHits = D.techniques.filter(t => matchQuery(t, q)).slice(0, 60);
    }
    drawPalette();
  });

  paletteInput.addEventListener("keydown", e => {
    if (e.key === "Escape") return closePalette();
    if (e.key === "ArrowDown") { e.preventDefault(); paletteSel = Math.min(paletteSel + 1, paletteHits.length - 1); drawPalette(); scrollSel(); }
    if (e.key === "ArrowUp")   { e.preventDefault(); paletteSel = Math.max(paletteSel - 1, 0); drawPalette(); scrollSel(); }
    if (e.key === "Enter") {
      const t = paletteHits[paletteSel];
      if (t) { closePalette(); openMD(t.f); }
    }
  });
  function scrollSel() {
    const el = $(".palette-item.sel", paletteList);
    if (el) el.scrollIntoView({ block: "nearest" });
  }

  document.addEventListener("keydown", e => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      if (palette.classList.contains("open")) closePalette();
      else openPalette();
    }
    if (e.key === "Escape") {
      closePalette();
      closeModal();
    }
  });

  palette.addEventListener("click", e => {
    if (e.target === palette) closePalette();
  });

  // ============================================================
  // MD viewer
  // ============================================================
  const modal = $("#modal");
  const modalBody = $("#modalBody");
  const modalPath = $("#modalPath");
  $("#modalClose").addEventListener("click", closeModal);
  modal.addEventListener("click", e => {
    if (e.target === modal) closeModal();
  });

  function closeModal() {
    modal.classList.remove("open");
    modalBody.innerHTML = "";
  }

  async function openMD(file) {
    if (!file) return;
    modal.classList.add("open");
    // breadcrumb-like path
    const parts = file.split("/");
    modalPath.innerHTML = parts.map((p, i) =>
      i === parts.length - 1 ? `<span class="seg-acc">${p}</span>` : p
    ).join(" / ");
    modalBody.innerHTML = `<div class="modal-loading">› fetching <code>${file}</code> …</div>`;

    // file:// vs http
    const isFile = location.protocol === "file:";
    if (isFile) {
      modalBody.innerHTML = `
        <div class="modal-error">
          <div style="font-size:18px;color:var(--acc-r);">⚠ file:// プロトコルでは fetch が制限されます</div>
          <p style="margin-top:18px;color:var(--fg-1);">ローカルHTTPサーバ経由で開いてください：</p>
          <code>python -m http.server 8000</code>
          <p style="margin-top:18px;color:var(--fg-2);font-size:11px;">
            （kedalab ルートで実行 → <code>http://localhost:8000/99_kedaweb/</code> を開く）
          </p>
          <p style="margin-top:24px;">代わりに <strong>GitHub / ローカル</strong>の原本：</p>
          <code>${file}</code>
        </div>
      `;
      return;
    }

    try {
      const url = "../" + file;
      const res = await fetch(url);
      if (!res.ok) throw new Error("HTTP " + res.status);
      const text = await res.text();
      modalBody.innerHTML = `<div class="md">${markdown(text)}</div>`;
      modalBody.scrollTop = 0;
      const baseDir = file.split("/").slice(0, -1).join("/");
      // linkify plain-text .md paths in the body (tables, code, sentences)
      linkifyMdPaths(modalBody, baseDir);
      // intercept explicit markdown links to open in modal
      $$("a", modalBody).forEach(a => {
        if (a.classList.contains("md-auto")) return; // already wired
        const href = a.getAttribute("href");
        if (href && href.endsWith(".md") && !href.startsWith("http")) {
          a.addEventListener("click", e => {
            e.preventDefault();
            const resolved = resolvePath(baseDir, href);
            openMD(resolved);
          });
        }
      });
    } catch (err) {
      modalBody.innerHTML = `
        <div class="modal-error">
          <div style="font-size:18px;">✕ ファイルを読み込めませんでした</div>
          <p style="margin-top:14px;color:var(--fg-1);">${escapeHtml(String(err))}</p>
          <code>${file}</code>
        </div>
      `;
    }
  }

  // walk text nodes, replace ".md" path strings with clickable anchors
  function linkifyMdPaths(root, baseDir) {
    const SKIP = new Set(["A", "PRE", "SCRIPT", "STYLE"]);
    // matches: optional ./ or ../, word/digit segments, ending in .md
    const RE = /(?:\.{1,2}\/)?(?:[\w][\w\-]*\/)*[\w][\w\-]*\.md\b/g;

    function walk(node) {
      if (node.nodeType === 1) {
        if (SKIP.has(node.tagName)) return;
        Array.from(node.childNodes).forEach(walk);
        return;
      }
      if (node.nodeType !== 3) return;
      const text = node.nodeValue;
      if (!RE.test(text)) return;
      RE.lastIndex = 0;

      const frag = document.createDocumentFragment();
      let lastIdx = 0;
      let m;
      while ((m = RE.exec(text)) !== null) {
        if (m.index > lastIdx) {
          frag.appendChild(document.createTextNode(text.slice(lastIdx, m.index)));
        }
        const raw = m[0];
        // resolve: root-relative if no ./ or ../ prefix, else relative to baseDir
        const resolved = (raw.startsWith("./") || raw.startsWith("../"))
          ? resolvePath(baseDir, raw)
          : raw;
        const a = document.createElement("a");
        a.className = "md-auto";
        a.href = "#";
        a.dataset.md = resolved;
        a.textContent = raw;
        a.title = "→ " + resolved;
        frag.appendChild(a);
        lastIdx = m.index + raw.length;
      }
      if (lastIdx < text.length) {
        frag.appendChild(document.createTextNode(text.slice(lastIdx)));
      }
      node.parentNode.replaceChild(frag, node);
    }

    walk(root);

    root.querySelectorAll("a.md-auto").forEach(a => {
      a.addEventListener("click", e => {
        e.preventDefault();
        openMD(a.dataset.md);
      });
    });
  }

  function resolvePath(base, rel) {
    if (rel.startsWith("./")) rel = rel.slice(2);
    const parts = (base ? base.split("/") : []).concat(rel.split("/"));
    const out = [];
    for (const p of parts) {
      if (p === "." || p === "") continue;
      if (p === "..") out.pop();
      else out.push(p);
    }
    return out.join("/");
  }

  // ============================================================
  // Minimal markdown renderer
  // ============================================================
  function markdown(src) {
    // normalize newlines
    src = src.replace(/\r\n/g, "\n");

    // extract fenced code blocks first (placeholder)
    const fences = [];
    src = src.replace(/```([^\n]*)\n([\s\S]*?)```/g, (m, lang, code) => {
      const idx = fences.length;
      fences.push({ lang: lang.trim(), code });
      return ` F${idx} `;
    });

    // tables: convert "| a | b |\n| --- |\n| ... |" blocks
    src = src.replace(/((?:^\|.*\|[ \t]*\n)+)/gm, block => {
      const lines = block.trim().split("\n").map(l => l.trim());
      if (lines.length < 2 || !/^\|[\s:|\-]+\|$/.test(lines[1])) return block;
      const rows = lines.filter((_, i) => i !== 1).map(l =>
        l.replace(/^\|/, "").replace(/\|$/, "").split("|").map(c => c.trim())
      );
      const head = rows[0];
      const body = rows.slice(1);
      let html = "<table><thead><tr>" + head.map(h => `<th>${inline(h)}</th>`).join("") + "</tr></thead>";
      html += "<tbody>" + body.map(r => "<tr>" + r.map(c => `<td>${inline(c)}</td>`).join("") + "</tr>").join("") + "</tbody></table>";
      return html;
    });

    // headers
    src = src.replace(/^#{6}\s+(.*)$/gm, (m, c) => "<h6>" + inline(c) + "</h6>");
    src = src.replace(/^#{5}\s+(.*)$/gm, (m, c) => "<h5>" + inline(c) + "</h5>");
    src = src.replace(/^####\s+(.*)$/gm, (m, c) => "<h4>" + inline(c) + "</h4>");
    src = src.replace(/^###\s+(.*)$/gm, (m, c) => "<h3>" + inline(c) + "</h3>");
    src = src.replace(/^##\s+(.*)$/gm, (m, c) => "<h2>" + inline(c) + "</h2>");
    src = src.replace(/^#\s+(.*)$/gm, (m, c) => "<h1>" + inline(c) + "</h1>");

    // hr
    src = src.replace(/^---+$/gm, "<hr>");

    // blockquotes (single line)
    src = src.replace(/^>\s?(.*)$/gm, (m, c) => "<blockquote>" + inline(c) + "</blockquote>");

    // lists
    src = src.replace(/(?:^[ \t]*[-*]\s+.*\n?)+/gm, block => {
      const items = block.trim().split("\n").map(l => l.replace(/^[ \t]*[-*]\s+/, ""));
      return "<ul>" + items.map(i => `<li>${inline(i)}</li>`).join("") + "</ul>";
    });
    src = src.replace(/(?:^[ \t]*\d+\.\s+.*\n?)+/gm, block => {
      const items = block.trim().split("\n").map(l => l.replace(/^[ \t]*\d+\.\s+/, ""));
      return "<ol>" + items.map(i => `<li>${inline(i)}</li>`).join("") + "</ol>";
    });

    // paragraphs — split on blank lines, wrap non-block lines
    const html = src.split(/\n{2,}/).map(chunk => {
      if (/^<(h\d|ul|ol|table|blockquote|hr|pre)/.test(chunk.trim())) return chunk;
      if (/^ F\d+ /.test(chunk.trim())) return chunk;
      const t = chunk.trim();
      if (!t) return "";
      return "<p>" + inline(t.replace(/\n/g, " ")) + "</p>";
    }).join("\n");

    // re-insert fences
    return html.replace(/ F(\d+) /g, (_, i) => {
      const f = fences[+i];
      const code = escapeHtml(f.code);
      return `<pre><code class="lang-${escapeHtml(f.lang)}">${highlight(code, f.lang)}</code></pre>`;
    });
  }

  function inline(s) {
    // escape first
    s = s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    // inline code
    s = s.replace(/`([^`]+)`/g, "<code>$1</code>");
    // bold
    s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    // italic
    s = s.replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>");
    // links
    s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
    // auto link
    s = s.replace(/(?<!["'>=])(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');
    return s;
  }

  // very light syntax highlighting for code blocks
  function highlight(code, lang) {
    if (!lang) return code;
    const kw = {
      bash: /\b(if|then|fi|for|do|done|while|case|esac|in|echo|sudo|export|cd|ls|cat|grep|awk|sed|find|chmod|chown|mkdir|rm|cp|mv|tar|gzip|gunzip|wget|curl|nmap|nc|python3?|bash|sh)\b/g,
      python: /\b(def|class|import|from|return|if|elif|else|for|while|try|except|with|as|in|not|and|or|is|None|True|False|self|lambda|pass|break|continue|yield)\b/g,
      powershell: /\b(Get-|Set-|New-|Remove-|Add-|Invoke-|Where-Object|ForEach-Object|Select-|param|function|return|if|else|elseif|foreach|while|try|catch|finally)/g,
      sql: /\b(SELECT|INSERT|UPDATE|DELETE|FROM|WHERE|JOIN|UNION|GROUP|ORDER|BY|LIMIT|HAVING|AS|AND|OR|NOT|NULL|TRUE|FALSE|EXEC|EXECUTE)\b/gi
    };
    const re = kw[lang.toLowerCase()];
    if (re) code = code.replace(re, '<span style="color:#ff3d8a">$&</span>');
    // strings
    code = code.replace(/("([^"\\]|\\.)*"|'([^'\\]|\\.)*')/g, '<span style="color:#ffb800">$1</span>');
    // comments
    code = code.replace(/(#[^\n]*)/g, '<span style="color:#5b6f8a">$1</span>');
    // CVE / hex
    code = code.replace(/(CVE-\d{4}-\d+)/g, '<span style="color:#00d4ff">$1</span>');
    return code;
  }

  // ============================================================
  // Stat counters
  // ============================================================
  function animateCounters() {
    setStat("statTotal", D.techniques.length);
    setStat("statPhases", D.phases.length);
    setStat("statPlay", (D.playbookList || []).length);
    setStat("statCVE", cveCount);
    setStat("statAI", phaseCounts.ai);
  }
  function setStat(id, target) {
    const el = document.getElementById(id);
    if (!el) return;
    const duration = 1100;
    const start = performance.now();
    function step(t) {
      const k = Math.min((t - start) / duration, 1);
      const v = Math.floor(target * (1 - Math.pow(1 - k, 3)));
      el.textContent = v;
      if (k < 1) requestAnimationFrame(step);
      else el.textContent = target;
    }
    requestAnimationFrame(step);
  }

  // ============================================================
  // Reveal on scroll
  // ============================================================
  function triggerReveal() {
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add("in");
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.08 });
    $$(".reveal").forEach(el => io.observe(el));
  }

  // Footer meta is updated by updateFooter() inside renderAll().

  // ============================================================
  // Bootstrap — load kedalab data then render
  // ============================================================
  function showFileBanner() {
    if (!isFile) return;
    const banner = document.createElement("div");
    banner.style.cssText = `
      position: fixed; top: 60px; left: 0; right: 0; z-index: 95;
      background: rgba(255, 61, 138, 0.12);
      border-bottom: 1px solid rgba(255, 61, 138, 0.4);
      color: #ff3d8a; font-family: var(--mono); font-size: 12px;
      padding: 8px 16px; text-align: center;
    `;
    banner.innerHTML = `
      ⚠ <strong>file://</strong> プロトコルでは fetch がブロックされます — kedalab 内容は読み込めません。
      <code style="background:rgba(0,0,0,0.4);padding:1px 6px;border-radius:3px;color:#00ff9c;margin-left:4px">
        python -m http.server 8000
      </code> など、HTTP サーバ経由で開いてください。
    `;
    document.body.appendChild(banner);
  }

  async function loadKedalabData() {
    if (isFile) {
      setPill("⚠ file:// — no fetch", "err");
      return;
    }
    setPill("⋯ fetching TECHNIQUES_INDEX.md", "loading");
    try {
      D.techniques = await loadTechniques();
      console.log("[loader] techniques:", D.techniques.length);
    } catch (e) {
      console.warn("[loader] techniques failed:", e);
      loaderErrors.push("techniques: " + e.message);
    }
    setPill("⋯ fetching README & playbooks", "loading");
    try {
      D.situations = await loadSituations();
      console.log("[loader] situations:", D.situations.length);
    } catch (e) {
      console.warn("[loader] situations failed:", e);
      loaderErrors.push("situations: " + e.message);
    }
    // Playbook cards = unique playbook files referenced by situations, in
    // first-appearance order, with H1 as label.
    const seen = new Set();
    const playbookFiles = (D.situations || [])
      .map(s => s.file)
      .filter(f => f && !seen.has(f) && seen.add(f));
    D.playbookList = await Promise.all(playbookFiles.map(async f => {
      let name = f.split("/").pop().replace(/\.md$/, "");
      try {
        const md = await getMd(f);
        const t = extractH1(md);
        if (t) name = t;
      } catch (e) { /* keep filename */ }
      return { name, file: f, entry: shortLabel(f), icon: "📋" };
    }));
    recomputeStats();
  }

  // Render everything. Safe to call before data loads — empty arrays just
  // produce a skeleton UI with "loading…" messages. Each renderer is wrapped
  // so one failing renderer cannot break the rest of the page.
  function safeCall(name, fn) {
    try { fn(); }
    catch (e) {
      console.error("[render:" + name + "]", e);
      loaderErrors.push(name + ": " + e.message);
    }
  }
  function renderAll() {
    safeCall("chain",       renderChain);
    safeCall("quickstart",  renderQuickstart);
    safeCall("playbooks",   renderPlaybooks);
    safeCall("raw",         renderRaw);
    safeCall("toolbar",     renderToolbar);
    safeCall("techniques",  renderTechniques);
    safeCall("footer",      updateFooter);
  }

  function updateFooter() {
    const meta = $("#footMeta");
    if (!meta) return;
    meta.textContent = dataLoaded
      ? `Techniques: ${D.techniques.length} · Phases: ${D.phases.length} · Playbooks: ${(D.playbookList || []).length}`
      : "› fetching kedalab/ …";
  }

  // 1) Synchronous initial render → user sees scaffolding immediately
  showFileBanner();
  renderAll();

  // 2) After kedalab data is loaded → re-render with real content and animate stats
  loadKedalabData()
    .catch(e => {
      console.error("[loader] unexpected:", e);
      loaderErrors.push("unexpected: " + e.message);
    })
    .finally(() => {
      dataLoaded = true;
      renderAll();
      animateCounters();
      if (loaderErrors.length) {
        setPill("✕ " + loaderErrors.length + " err — see console", "err");
      } else if (isFile) {
        setPill("⚠ file:// fallback", "err");
      } else {
        const t = D.techniques.length;
        const p = (D.playbookList || []).length;
        setPill(`✓ ${t} techniques · ${p} playbooks`, "ok");
      }
    });
})();
