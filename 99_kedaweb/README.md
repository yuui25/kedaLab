# kedaweb

kedalab のナレッジを動的に閲覧する SPA。サイバーパンク・ターミナル風 UI。

## アーキテクチャ — kedalab MD が単一の真実

**kedaweb はメンテ不要。** すべてのコンテンツは実行時に kedalab の MD ファイルをパースして生成される。

| 表示要素 | 取得元 | 自動同期 |
|---------|--------|---------|
| 技術カード一覧（Browser） | `TECHNIQUES_INDEX.md` + `TECHNIQUES_INDEX_AI_ML.md` のテーブル | ✓ |
| Playbook カード | `README.md` 内の `00_Playbook/*.md` 参照 | ✓ |
| 決定木マインドマップ | 各 Playbook を fetch → MD 内リンクを再帰的に追跡 | ✓ |
| MD 本文ビューア | 該当 `.md` を直接 fetch | ✓ |
| フェーズ（色・グリフ） | `js/data.js` にハードコード | △ 新フォルダ追加時のみ |

**つまり**: kedalab で新しい技術を `TECHNIQUES_INDEX.md` に追記すれば、kedaweb のリロードだけで反映される。data.js を触る必要はない。

唯一の例外は **新しいトップフォルダの追加**（例: `08_Cloud_Identity/` を本格スコープ化したとき）。その場合だけ `js/data.js` の `phases` 配列に1行と、`js/app.js` の `phaseFromPath()` に1行追加する。

## 起動方法

`.md` を `fetch` で読み込むため、ローカル HTTP サーバ経由で開く必要がある（`file://` だと CORS で弾かれる）。

kedalab ルート（`CLAUDE.md` がある階層）で、いずれかを実行：

```powershell
# Python (3.x)
python -m http.server 8000

# Node.js
npx http-server -p 8000 -c-1

# PHP
php -S localhost:8000

# VS Code: "Live Server" 拡張で 99_kedaweb/index.html を開く
```

ブラウザで開く：

```
http://localhost:8000/99_kedaweb/
```

> `file://` で開いた場合は警告バナーが出る。UI は動くが本文プレビュー・技術リスト・決定木は空になる。

## 機能

| 機能 | 説明 |
|------|------|
| ブート演出 | ターミナル風ログ + ASCIIアートでオープニング |
| マトリックスレイン | 背景の Canvas アニメーション |
| 攻撃チェーン可視化 | 7フェーズのカード。クリックでフィルタへジャンプ |
| **決定木** | 7 つの Playbook を起点に MD のリンクを実行時に追跡。クリックで展開（lazy load）、循環参照は `↻` で表示 |
| プレイブック起点 | `README.md` から自動抽出 |
| 技術ブラウザ | フェーズ別フィルタ・全文検索。`TECHNIQUES_INDEX.md` から自動生成 |
| Cmd+K パレット | グローバル検索（↑↓ + Enter） |
| Markdown ビューア | 実際の `.md` を fetch して整形表示。プレーンテキストの `.md` パスは自動でクリック可能リンクに |
| 統計カウンタ | 起動時に easing アニメ |

## キーボード

| キー | 動作 |
|------|------|
| `Ctrl+K` / `Cmd+K` | コマンドパレットを開閉 |
| `↑ / ↓` | パレット内移動 |
| `Enter` | パレットで選択中の技術を開く |
| `Esc` | パレット / モーダルを閉じる |

## ファイル構成

```
99_kedaweb/
├── index.html              # SPA エントリ
├── css/styles.css          # ネオン・サイバーパンクテーマ
├── js/
│   ├── data.js             # フェーズメタデータ・インデックスファイル名（静的）
│   ├── matrix.js           # 背景レイン
│   └── app.js              # ローダ・パーサ・ロジック・MDレンダラ
└── README.md
```

依存ゼロ（Google Fonts のみ CDN）。フレームワーク非使用、Vanilla JS。
