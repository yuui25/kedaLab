---
name: kedalab
description: 現在の会話から汎用ナレッジを抽出し、kedalab に追記する。「kedalab に追加して」「今のナレッジを反映して」と言われたら起動。`/kedalab` で発火。kedalab フォルダ内で直接 CC を起動した場合の専用スキル（CVE 研究文脈は別の cve-research スキル）。
---

# kedalab — ナレッジ抽出と反映（kedalab プロジェクト直接版）

kedalab は keda の汎用ナレッジ集。**現在の会話で扱った技術・手法・落とし穴・判断ロジック** を、
特定プロジェクト・特定演習に依存しない形に翻訳して蓄積する。

cve-research プロジェクトから起動する場合は cve-research/.claude/skills/kedalab/ 配下の skill が使われる（engagements/ ログからの抽出を含む）。本 skill はそれより軽量で、**カレント会話のみを抽出対象**とする。

---

# 起動時に必ず Read するファイル

以下 4 ファイルは **kedalab の規範ソース**。これらに書かれた内容を絶対正として従う。
skill 本文と矛盾した場合は **4 ファイル側が優先**。

1. `./CLAUDE.md` — 書き込み手順・フォルダ構成
2. `./WRITING_GUIDE.md` — 書き方ルール・禁止事項・自己チェック grep
3. `./README.md` — 全体方針・状況からの導線テーブル
4. `./TECHNIQUES_INDEX.md` — 既存ナレッジ一覧

加えて状況に応じて：

- `./TECHNIQUES_INDEX_AI_ML.md` — AI/ML 系トピック扱い時
- `./TECHNIQUES_INDEX_MITRE.md` / `./TECHNIQUES_INDEX_WSTG.md` — 該当 ID がある時
- `./_pending/README.md` — `_pending/` への新規作成時
- `./_workspace/conventions/Folder_Convention_20260515.md` — フォルダ規約

---

# 大原則

## 既存ファイル優先

- **新規ファイルを作る前に既存ファイルへの追記で済むかを必ず検討**
- `TECHNIQUES_INDEX.md` を keyword 検索して関連トピックを確認
- 既存ファイルの構造・トーンに従う

## 配置先判定

WRITING_GUIDE.md の「公開コンテンツと作業領域の区別」表に従う：

| 内容 | 配置先 |
|---|---|
| 技術手順・概念（汎用化済み）| `00_Playbook/` 〜 `07_AI_Red_Teaming/` |
| 未公開 CVE 関連（embargo 中）| `_pending/` |
| レビュー・メタ文書・下書き・タスク・定義 | `_workspace/<分類>/` |

`_` 始まりのトップレベルは公開対象外（kedaweb 不可視・GitHub 非 push）。

## システム固有値の徹底排除

WRITING_GUIDE.md「禁止事項」「例示に使ってはいけない具体値」表に従う：

- プロジェクト名・製品名は記載しない（CVE 番号は published のもののみ）
- ファイルパス・関数名・行番号は記載しない（バグクラス表現に書き換える）
- バージョン番号は「修正の境界として意味があるとき」のみ
- 演習由来語・固有値・Kali 名指しは禁止

## ナレッジの粒度

「**着火条件 + 観点・着眼点 + 手順 + 落とし穴**」。コマンド集ではなく**攻撃者の思考トレース**。

---

# 標準ワークフロー

## Step 1 — 現在の会話から学びを抽出

会話で扱った内容を以下に分類：

| カテゴリ | 例 |
|---|---|
| 技術手順 | 新コマンド・新 exploit pattern・新ツール使用法 |
| 概念（なぜ）| プロトコル仕様・ライブラリ挙動・OS 振る舞いの「知らなかった原理」|
| 落とし穴 | 「こう書くと通らない」「環境差でこう変わる」具体例 |
| 方法論 | 「この判断はこうフローで進める」等のメタ手順 |

各項目について `TECHNIQUES_INDEX.md` で既存有無を確認。

## Step 2 — 配置先を決定

1. 既存ファイルに追記できるならその該当セクションへ
2. 既存ファイルの「関連」リンクで参照されるべきならリンク追加
3. 新規ファイル必要なら配置フォルダ判定（CLAUDE.md 手順 3 に従う）

## Step 3 — ユーザに反映方針を確認

抽出した学びと配置候補を提示し、実行可否を確認。
**ユーザ承認なく既存ファイルを編集しない**。

提示フォーマット例：

```
今回の会話から以下を kedalab に反映できます:

[既存ファイル追記]
- <filepath> に「XXX」セクションを追加（現状の章立てに沿った形で挿入）

[既存ファイル参照リンク]
- <filepath> の「関連技術」に <new_concept> へのリンクを追加

[新規 _pending ファイル]
- _pending/<FILENAME>.md を新規作成（理由: <embargo 関連 / 固有値含む可能性>）

進めてよいですか?
```

## Step 4 — 反映実行

ユーザ承認後：

1. 該当ファイルを Edit または新規 Write
2. 関連インデックス（TECHNIQUES_INDEX*.md）を更新
   - `_pending/` 配下はインデックス登録しない。代わりに `_pending/README.md` に「公開時に追加するインデックスエントリ」として記録
3. README.md 導線テーブル更新が必要なら実施（`00_Playbook/` 新規作成時）
4. **PostToolUse hook（`.claude/hooks/kedaweb-compat.ps1`）が自動実行される**
   - kedaweb 不変条件チェック
   - WRITING_GUIDE 自己チェック grep
   - 違反があれば追加コンテキストとして報告される

## Step 5 — 完了報告

ユーザに以下を伝える：

- 変更したファイルのリスト
- 公開待ち項目があれば embargo 期限と公開時の移動先
- hook のチェック結果（違反検出ゼロを確認）

---

# やってはいけない

- **kedalab 配下の既存ファイルをユーザ承認なく書き換えない**
- **`_pending/README.md` の登録を忘れない**
- **CVE 番号を「ありそう」で記載しない**（NVD/GHSA で published 確認）
- **会話の全項目を機械的に書こうとしない**（「次に同じ状況に出会ったら役立つか」でフィルタ）
- **会話の経緯・タイムスタンプ・案件 ID を kedalab 本文に書かない**（汎用化方針違反）

---

# 引数による起動

- `/kedalab` のみ: 現在の会話全体を対象に抽出
- `/kedalab <トピック>`: トピックに絞って抽出（例: `/kedalab SSRF`）
- `/kedalab pending-review`: `_pending/` 配下の棚卸し（関連 CVE が published になっていないか確認）

---

# 関連コマンド

- `/check-kedaweb` — kedalab 全体に対する kedaweb 不変条件 + WRITING_GUIDE 自己チェックの一括実行
- `/promote <file>` — `_pending/` または `_workspace/drafts/` のファイルを正規フォルダへ昇格

---

# 規範

詳細は以下を参照：

- `./CLAUDE.md`
- `./WRITING_GUIDE.md`
- `./_workspace/conventions/Folder_Convention_20260515.md`
