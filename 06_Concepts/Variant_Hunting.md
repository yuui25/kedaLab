# バリアントハンティング（Variant Hunting）

## このファイルの位置づけ

**参照元**: CVE 研究・脆弱性調査全般

既知の CVE を起点に「同じバグクラスの脆弱性を別プロジェクトで探す」手法の原理と思考プロセスを解説する。
新規研究者が最初の CVE を取得するための最も実績が高いアプローチ。

---

## 概念：なぜバリアントが存在するのか

セキュリティ修正は「報告された箇所だけ直す」ことが多い。以下の理由でバリアントが生まれる。

| 理由 | 具体例 |
|------|-------|
| **同じパターンが別ファイルに存在する** | sink を持つファイル A は修正されたが、同じバグクラスを持つ sibling ファイル B（同じエンコーダ・同じレンダリング経路を使う別画面コンポーネント）が未修正のまま残る |
| **フォークが修正を取り込んでいない** | 親リポが DOMPurify を追加したが fork 先はそのまま |
| **姉妹プロジェクトが同じコードを共有している** | 公開済み CVE があるプロジェクトの fork、または同カテゴリ（例：「Electron ノートアプリ」「Java ベース MQ クライアント」等）の別実装が、ライブラリ・UI コンポーネント・サニタイズロジックの同一パターンを保持しているケースは頻出 |
| **修正が不完全（partial fix）** | `resolveClass()` は修正したが `resolveProxyClass()` は未対応のまま |

---

## 手順：5ステップ

### Step 1 — バグクラスを抽出する

既知 CVE の advisory / diff を読み、「何が危険パターンか」を一言で言語化する。

例（バグクラスの言語化フォーマット）：
- 「Electron 系デスクトップアプリで **サーバー保存値 → サニタイズなし innerHTML 代入 + `nodeIntegration:true`** → XSS が RCE まで到達する」
- 「Java の `ObjectInputStream` で **`resolveClass()` には allowlist があるが `resolveProxyClass()` が同等チェックを通らない** → 任意クラスデシリアライズ RCE」
- 「`decodeURIComponent` 等の URL デコードが **HTML 用エンコーダの脅威モデル外** で適用され、`%XX` エンコード `<` がエンコーダを素通りして innerHTML に到達する」

バグクラスは「ライブラリ名」「製品名」ではなく **「条件 + sink + 結果」の3要素** で書く。
こう書いておくと、別実装に当てはめたときに「この条件は揃うか？」を 1 つずつ照合できる。

### Step 2 — 類似プロジェクトを見つける

バグクラスが同じカテゴリのプロジェクトを探す。

**探し方の例**:
- GitHub search: `"nodeIntegration: true" language:typescript` のように **危険パターンそのもの** をキーワードに検索（プロジェクト名で探さない。コード片で探す）
- カテゴリ検索: 「Electron note app」「self-hosted wiki」「Electron markdown editor」
- awesome-xxx 系リスト: `awesome-selfhosted` / `awesome-electron` 等でカテゴリを一覧する
- GitHub の "Similar repositories" / "Related topics" を辿る
- フォーク一覧: 元リポの fork を調べる（Settings → Insights → Forks）

### Step 3 — 危険パターンを grep で探す

対象リポジトリのソースコードを取得し、バグクラスの「危険パターン」を grep する。

```bash
# [Attacker] ローカルにクローン済みの場合
grep -rn "\.html(" src/ --include="*.ts"
grep -rn "innerHTML" src/ --include="*.ts"
grep -rn "nodeIntegration" src/ --include="*.ts"

# [外部API] GitHub API 経由で直接ファイルを確認する場合
# (クローンしなくても生ファイルを取得できる)
gh api repos/[ORG]/[REPO]/contents/src/path/to/file.ts \
  --jq '.content' | base64 -d
```

**シグナル**: grep でヒットしたら「exists = 候補確定」ではなく「データフローを確認する必要がある」という意味。

### Step 4 — データフローを確認する（脆弱性の確認）

sink を見つけたら「ユーザーが制御できるデータがその sink に到達するか」を確認する。

```
ユーザー入力
  → サーバー保存（PUT /api/... ）
  → サーバー返却（GET /api/... → JSON）
  → クライアント描画
  → sink: .html(data) ← ここにユーザー制御データが到達するか？
```

中間にサニタイズがあれば safe。なければ脆弱。

### Step 5 — PoC を段階的に構築する

| レベル | 内容 | 提出可能か |
|--------|------|---------|
| Level 1 | コードを読んで「理論上脆弱」 | 弱い（証拠なし） |
| Level 2 | ブラウザ単体で危険パターンが動作することを確認 | 可（原理の証明） |
| Level 3 | 実際のアプリで発火を確認（alert 等） | 強い（実証済み） |

Level 3 は必ず自分が所有・管理するインスタンスで確認する。第三者環境には一切ペイロードを送らない。

---

## 思考トレースのモデルケース（Electron アプリの XSS→RCE バリアントを探す場合）

特定プロジェクトの固有値を伏せて、5ステップが実際にどう回るかを思考の流れで残す。
別のバグクラスに置き換えるときも同じ骨格が使える。

```
1. 起点となる公開 CVE / advisory を読む
   → バグクラスを 3 要素で言語化する：
     条件: Electron アプリで webPreferences に nodeIntegration:true（または contextIsolation:false）
     sink: jQuery .html() / innerHTML / dangerouslySetInnerHTML
     結果: ユーザー制御データが描画される → require('child_process') 到達 → RCE

2. 同カテゴリの類似プロジェクトを列挙する
   → 検索軸: カテゴリ（例「self-hosted note app (Electron)」）/ awesome-XXX リスト
            / 起点プロジェクトの fork 一覧 / 「Similar repositories」
   → 起点 CVE が修正していない 同パターン保持プロジェクトを候補化（[CANDIDATE_REPO]）

3. 候補リポジトリを grep する（危険パターンそのものを探す）
   → grep -rn "\.html(" src/client/ --include="*.ts"
   → grep -rn "innerHTML\s*=" src/ --include="*.ts"
   → 例: [CLIENT_RENDERING_FILE]:[LINE] で
        this.$[ELEMENT].html([SERVER_RESPONSE_FIELD]) のような形でヒット

4. データフローを確認する（grep ヒット ≠ 脆弱）
   → [SERVER_RESPONSE_FIELD] が API レスポンス由来（例: GET /api/[RESOURCE]/[ID]）
   → 経路上に DOMPurify.sanitize() などのサニタイズなし
   → ユーザーが書き込めるフィールド（タイトル・名前・コメント等）→ 到達確認

5. webPreferences を確認する（RCE エスカレーションゲート）
   → grep -rn "nodeIntegration" src/ --include="*.ts"
   → nodeIntegration: true が複数箇所で明示されている
   → contextIsolation: false / webSecurity: false の有無も確認

6. PoC Level 2: ブラウザ単体（poc_xss_sim.html）で innerHTML ペイロードが
   alert を発火できることを原理確認
7. PoC Level 3: 自分が所有・管理する候補アプリの脆弱バージョンをインストールし、
   実機で XSS → require('child_process') による RCE を発火確認
   （第三者環境には一切ペイロードを送らない）
8. ベンダー報告 → CNA を通じて CVE 申請
```

> 上の `[CANDIDATE_REPO]` `[CLIENT_RENDERING_FILE]:[LINE]` `[SERVER_RESPONSE_FIELD]` 等は、
> 実案件では実体名に置き換わる。**自分の調査ノートで使うときも、kedalab に逆輸入する際は
> 角括弧プレースホルダに戻す**（特に発見が未公開 / 報告中の段階では絶対に固有値を持ち込まない）。

---

## よくある落とし穴

| 落とし穴 | 対処 |
|---------|------|
| **修正済み CVE の変種を探して既存の CVE と重複してしまう** | OSV / GHSA で対象リポジトリの既知 CVE を先に確認する |
| **fork 先が既に修正している** | fork 先のコミット履歴や PR を確認してから報告する |
| **「コードが存在する」と「ユーザーが到達できる」は別** | 認証なしで到達できるエンドポイントかを確認する |
| **PoC なしで報告する** | Level 2 以上の PoC を必ず添付する。「理論上危険」だけでは CVE が通りにくい |
| **リポジトリが archived でも諦める** | 脆弱バージョンのユーザーはいる。CVE 申請は有効 |

---

## 探索対象の優先度付け

| 優先度 | 条件 |
|--------|------|
| 高 | フォーク元と同じコードを持つ fork（修正未反映の可能性）|
| 高 | 同じ問題ドメイン（ノートアプリ / メールクライアント等）の別プロジェクト |
| 中 | 同じライブラリ・フレームワークを使う別プロジェクト |
| 低 | 問題ドメインが違うが同じ技術スタック（Electron）を使うだけ |
