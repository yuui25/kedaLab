/* =============================================================
   kedalab — STATIC metadata only.
   Techniques / playbooks / decision-tree are loaded at runtime
   by parsing the actual kedalab markdown files (single source of
   truth = kedalab itself).
   ============================================================= */
window.KEDA_DATA = {
  meta: {
    name: "kedalab",
    tagline: "Penetration Testing & AI Red Teaming Knowledge Base",
    version: "1.0"
  },

  // Phase visual metadata. Folder prefix → phase id (see phaseFromPath in app.js).
  // Add a new phase here if a new top-level numbered folder is introduced.
  phases: [
    { id: "playbook", code: "00", name: "Playbook",                jp: "判断フロー",       color: "#94a3b8", glyph: "▣", desc: "「次に何をすべきか」のフロー", dir: "00_Playbook" },
    { id: "recon",    code: "01", name: "Reconnaissance",          jp: "偵察・列挙",       color: "#00ff9c", glyph: "◈", desc: "サービス・ホスト・Web 調査", dir: "01_Reconnaissance" },
    { id: "initial",  code: "02", name: "Initial Access",          jp: "初期アクセス",     color: "#00d4ff", glyph: "◆", desc: "最初の足がかりを得る",       dir: "02_Initial_Access" },
    { id: "linux",    code: "03", name: "Post-Access · Linux",     jp: "Linux 侵入後",    color: "#ffb800", glyph: "▲", desc: "Linux 権限昇格・列挙",        dir: "03_Post_Access_Linux" },
    { id: "windows",  code: "04", name: "Post-Access · Windows AD", jp: "Windows AD 侵入後", color: "#ff3d8a", glyph: "✦", desc: "AD・Kerberos・ACE 濫用",     dir: "04_Post_Access_Windows_AD" },
    { id: "tools",    code: "05", name: "Tools Reference",         jp: "ツール辞典",       color: "#a78bfa", glyph: "◉", desc: "Nmap・Impacket・hashcat ほか", dir: "05_Tools_Reference" },
    { id: "concepts", code: "06", name: "Concepts",                jp: "原理・背景",       color: "#64ffda", glyph: "❖", desc: "「なぜそれが効くか」",          dir: "06_Concepts" },
    { id: "ai",       code: "07", name: "AI Red Teaming",          jp: "AI レッドチーム",  color: "#ff00ff", glyph: "⌬", desc: "LLM・敵対的サンプル・Extraction", dir: "07_AI_Red_Teaming" }
  ],

  // External meta-files — surfaced in the "Raw" section.
  indexFiles: [
    { name: "TECHNIQUES_INDEX.md",       file: "TECHNIQUES_INDEX.md",       desc: "ペネトレスト系 全技術" },
    { name: "TECHNIQUES_INDEX_AI_ML.md", file: "TECHNIQUES_INDEX_AI_ML.md", desc: "AI/ML 全技術" },
    { name: "TECHNIQUES_INDEX_MITRE.md", file: "TECHNIQUES_INDEX_MITRE.md", desc: "MITRE ATT&CK マッピング" },
    { name: "TECHNIQUES_INDEX_WSTG.md",  file: "TECHNIQUES_INDEX_WSTG.md",  desc: "OWASP WSTG マッピング" },
    { name: "README.md",                 file: "README.md",                 desc: "リポジトリ全体README" },
    { name: "WRITING_GUIDE.md",          file: "WRITING_GUIDE.md",          desc: "書き方ガイド" },
    { name: "CLAUDE.md",                 file: "CLAUDE.md",                 desc: "AI への指示" }
  ],

  // ===========================================================
  // Populated at runtime — DO NOT hand-edit these.
  // ===========================================================
  techniques: [],
  playbookList: [],
  situations: []        // parsed from README's「最初に開くファイル」table
};
