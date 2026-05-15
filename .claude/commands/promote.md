---
description: _pending/ または _workspace/drafts/ のファイルを正規フォルダへ昇格させる（チェックリスト付き）
argument-hint: [_pending または _workspace 配下のファイルパス]
allowed-tools: Read, Grep, Bash, Edit, Write
---

引数で指定されたファイルを kedalab の正規フォルダ（`00_Playbook/` 〜 `07_AI_Red_Teaming/`）に昇格させます。

引数: $ARGUMENTS

## 昇格手順

### Step 1: 対象ファイルの確認

`$ARGUMENTS` で指定されたファイルを Read し、以下を確認：

- ファイルパスが `_pending/` または `_workspace/drafts/` 配下にあるか
- ファイル内容を把握（技術内容・関連 CVE / 演習由来語の有無）

### Step 2: 公開可能性の判定

#### `_pending/` の場合（CVE 関連）

関連 CVE の状態を確認：

```bash
# 関連 CVE 番号を Read で読んだ内容から抽出
# 各 CVE について NVD / GHSA で published 状態か確認
gh api repos/<org>/<repo>/security-advisories  # GHSA の場合
# https://nvd.nist.gov/vuln/detail/CVE-YYYY-NNNNN  # NVD の場合
```

- ✅ Published → Step 3 に進む
- ❌ Reserved / Triage 中 → 「まだ公開できません」と報告して終了

#### `_workspace/drafts/` の場合

- 公開判定はユーザに確認：「このファイルを公開してよいですか？ 含まれる固有値の検出を行います」
- ユーザが OK したら Step 3 に進む

### Step 3: WRITING_GUIDE 自己チェック

WRITING_GUIDE.md 末尾の自己チェック grep を該当ファイルに対して実行：

```bash
# 各パターンを grep。1 件でもヒットしたら、プレースホルダ化・抽象化が必要
grep -nE "HTB|HackTheBox|Hack The Box|TryHackMe|OSCP|VulnHub" "$ARGUMENTS"
grep -nE "user\.txt|root\.txt|flag\.txt|攻略|リタイアマシン" "$ARGUMENTS"
grep -nE "10\.10\.|corp\.local|Password123!|P@ssw0rd1234!" "$ARGUMENTS"
grep -nE "<[a-z][a-z _-]+>" "$ARGUMENTS"
# CVE 由来固有値（プロジェクト名・関数名・行番号）
grep -nE "v[0-9]+\.[0-9]+\.[0-9]+|\.ts:[0-9]+|\.js:[0-9]+" "$ARGUMENTS"
```

ヒットがあれば：
1. 該当箇所をユーザに提示
2. プレースホルダ化（`[UPPER_SNAKE_CASE]`）または抽象表現への書き換えを提案
3. ユーザ承認後 Edit で修正
4. 再 grep してゼロを確認

### Step 4: kedaweb 不変条件チェック

以下を確認：

- `## 関連技術` または `### 関連技術` セクションが存在するか
- セクション内に `前：` / `後：` / `関連：` ラベル + バッククォート相対パスがあるか

欠落していたら：
1. ファイル内容から「前にあるべき技術」「後に進むべき技術」を推定
2. ユーザに提示・承認を取って Edit で追記

### Step 5: 配置先フォルダの決定

ファイル内容から判定して、ユーザに確認：

| 内容の性質 | 推奨配置先 |
|---|---|
| 判断フロー（pentest 中に引く分岐木） | `00_Playbook/` |
| 偵察・列挙・サービス調査 | `01_Reconnaissance/` |
| 初期侵入・認証情報取得 | `02_Initial_Access/`（Web の場合は `02_Initial_Access/Web_Vulnerabilities/`）|
| Linux 侵入後 | `03_Post_Access_Linux/` |
| Windows AD 侵入後 | `04_Post_Access_Windows_AD/` |
| ツール別リファレンス | `05_Tools_Reference/` |
| 動作原理・背景知識 | `06_Concepts/`（AI/ML は `06_Concepts/AI_ML/`）|
| AI Red Teaming 攻撃手順 | `07_AI_Red_Teaming/<サブフォルダ>/` |

### Step 6: 移動と関連ファイル更新

ユーザ承認後：

```bash
# 1. ファイル移動
mv "$ARGUMENTS" "<決定した配置先>/"

# 2. TECHNIQUES_INDEX*.md に 1 行追記
# - 通常技術: TECHNIQUES_INDEX.md
# - AI/ML: TECHNIQUES_INDEX_AI_ML.md
# 既存エントリの粒度に揃える

# 3. MITRE ATT&CK ID / WSTG ID があれば二次インデックスにも追記
# - TECHNIQUES_INDEX_MITRE.md
# - TECHNIQUES_INDEX_WSTG.md

# 4. 00_Playbook/ への新規追加なら README.md の導線テーブル更新

# 5. _pending/ から昇格した場合は _pending/README.md の該当エントリを削除（または「公開済み」マーク）
```

### Step 7: 双方向リンクの更新

関連技術セクションで「前：」「後：」に挙げたファイル側にも、本ファイルへの逆リンクを追加：

- 本ファイルが A の「後：」に位置する → A 側に「後：<本ファイル>」を追加
- 本ファイルが B の「前：」に位置する → B 側に「前：<本ファイル>」を追加

### Step 8: 検証

```bash
# kedaweb 不変条件 + WRITING_GUIDE 自己チェックを再実行
/check-kedaweb
```

違反ゼロを確認したら完了報告。

## 完了報告フォーマット

```
✅ <ファイル名> を <配置先> へ昇格しました

更新箇所:
- 移動: <旧パス> → <新パス>
- TECHNIQUES_INDEX*.md: +1 行
- 双方向リンク追加: <A>.md, <B>.md
- (該当時) MITRE/WSTG インデックス更新
- (該当時) _pending/README.md の該当エントリ削除

検証:
- kedaweb 不変条件: 全パス
- WRITING_GUIDE 自己チェック: 全パス
```

## 補足

- ユーザ承認を都度取りながら進めること
- 一括実行（無人モード）はしない。各ステップでユーザの確認待ち
- 規約詳細: `_workspace/conventions/Folder_Convention_20260515.md`
