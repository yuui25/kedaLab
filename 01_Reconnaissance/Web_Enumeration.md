# Web列挙

## ディレクトリ・エンドポイントの列挙

### 着火条件
80 / 443 / 8080 等のWebポートが開いている場合。

### 観点・着眼点

ブラウザで確認した後、以下を意識する：
- URLの構造に連番や予測可能なIDが含まれていないか（→ IDORの可能性）
- どのフレームワーク・言語を使っているか（エラーページ・ヘッダーから）
- ファイルのダウンロード機能があるか
- 管理者パネルへのリンクが存在しないか

### 手順

**ディレクトリ列挙（gobuster）**
```bash
gobuster dir -u http://[IP] -w /usr/share/wordlists/dirbuster/directory-list-2.3-medium.txt \
  -o gobuster_root.txt
```

**拡張子を指定したファイル探索**
```bash
gobuster dir -u http://[IP] -w [WORDLIST] -x php,txt,html,bak -o gobuster_ext.txt
```

**vhost（仮想ホスト）のファジング**
```bash
gobuster vhost -u http://[DOMAIN] -w /usr/share/seclists/Discovery/DNS/subdomains-top1million-5000.txt \
  --append-domain -o vhost_fuzz.txt
```
→ 発見したvhostは `/etc/hosts` に追加して再調査する

### エンドポイントの連番・IDを確認する（IDOR）

URLが `/data/3` や `/download/5` のような形式の場合：
- ID を `0` や `1` から順に変えてアクセスを試みる
- 認可チェックなしで他ユーザーのデータが取得できる可能性がある

→ 詳細: `../02_Initial_Access/Web_Vulnerabilities/IDOR.md`

### 注意点・落とし穴

- gobuster は `--timeout` と `-t`（スレッド数）の調整でスキャンが安定する
- レスポンスサイズが同じものが大量にある場合はフィルタリングが必要（`--exclude-length`）
- vhost のファジングでは必ずベースドメインを `/etc/hosts` に登録してから実施する
- HTTPS の場合は `-k` オプションで証明書チェックをスキップ

---

## Webアプリのバージョン特定と CVE 検索

### 着火条件
Webサービスが動いており、使用しているアプリケーション（Grafana, WordPress, Jenkins, GitLab 等）が特定できた場合。
バージョンが判明すれば既知 CVE を検索できる可能性がある。

### 観点・着眼点
**バージョンを確認できたら、ディレクトリ列挙より先に CVE 検索を行う。**
既知の重大脆弱性（パストラバーサル / RCE 等）があれば、そちらが最短経路になることが多い。

### 手順

**よく使われるバージョン確認エンドポイント:**

```bash
# Grafana
curl -s http://[IP]:[PORT]/api/health
# → {"commit":"...","database":"ok","version":"8.0.0"}

# 汎用: HTTP ヘッダーにバージョンが含まれることがある
curl -sI http://[IP]/ | grep -i "server\|x-powered-by\|x-version"

# ログインページやエラーページにバージョン表記がある場合
curl -s http://[IP]/login | grep -i "version\|v[0-9]"
```

**searchsploit で CVE を検索:**

```bash
# アプリ名 + バージョンで検索
searchsploit grafana 8.0

# CVE 番号がわかっている場合
searchsploit CVE-2021-43798

# エクスプロイトの内容を確認
searchsploit -x [PATH_FROM_RESULTS]

# 作業ディレクトリにコピー
searchsploit -m [PATH_FROM_RESULTS]
```

**NVD / GitHub でも確認:**
- https://nvd.nist.gov/vuln/search → バージョン + アプリ名で検索
- `site:github.com [アプリ名] [バージョン] exploit` または `CVE-[年]-[番号]`

### 注意点・落とし穴
- バージョンがページに表示されていない場合でも、`/robots.txt`・ソースのコメント・エラーメッセージに含まれることがある
- searchsploit の結果が古い PoC の場合、コードを読んで必要なパラメータ修正を行ってから実行する
- CVE がなくても「設定ファイルのデフォルト認証情報」（admin:admin 等）を試すことも忘れずに

### 関連技術
- searchsploit の詳細 → `../05_Tools_Reference/Searchsploit.md`
- 見つかった脆弱性がパストラバーサルの場合 → `../02_Initial_Access/Web_Vulnerabilities/Path_Traversal.md`

---

### 関連技術
- 連番IDを発見 → `../02_Initial_Access/Web_Vulnerabilities/IDOR.md`
- ログインフォームを発見 → `../02_Initial_Access/Web_Vulnerabilities/SQLi.md`
- バージョン確認から CVE 検索 → `../05_Tools_Reference/Searchsploit.md`
