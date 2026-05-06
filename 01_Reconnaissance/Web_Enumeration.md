# Web列挙

## robots.txt の確認

### 着火条件
Webポートが開いており、まず手動でサイト構造を把握したい場合。**ディレクトリ列挙の前に必ず確認する。**

### 観点・着眼点

`robots.txt` はクローラーに「アクセスさせたくないパス」を伝えるファイルだが、**攻撃者にとっては隠しディレクトリの地図になる。**

`Disallow:` エントリに含まれるパスは「隠したい重要なページ」である可能性が高い：
- 管理画面（`/admin`, `/wp-admin`, `/panel` 等）
- CMSのインストールパス（`/cms`, `/writeup` 等）
- 内部ドキュメント・バックアップ（`/private`, `/backup` 等）

```bash
curl -s http://[TARGET]/robots.txt
```

**nmap の `-sC`（デフォルトスクリプト）を使った場合、スキャン結果に自動で表示される：**
```
| http-robots.txt: 1 disallowed entry
|_/writeup/
```

### 手順

```bash
# 直接取得
curl -s http://[TARGET]/robots.txt

# Disallow エントリを抽出
curl -s http://[TARGET]/robots.txt | grep -i "disallow\|allow"
```

**見つけたパスへのアクセスで確認すること：**
1. パスが存在するか（404 か 200/301 か）
2. CMSや特定のアプリが動いているか（ログインページ・フッター・バージョン情報）
3. バージョンが判明したら即 `searchsploit [アプリ名] [バージョン]` で CVE 検索

### 注意点・落とし穴

- `robots.txt` が存在しない（404）場合でも、`/sitemap.xml` や `/sitemap_index.xml` に同等の情報がある場合がある
- `Disallow: /` だけの場合は全ブロックで情報量が少ない。次のディレクトリ列挙に移る
- サブドメイン・vhost では `/robots.txt` が別になる場合があるため、vhost ごとに確認する

---

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
→ 発見したvhostは `/etc/hosts` に追加して再調査する（原理 → `../06_Concepts/Hosts_File_For_AD.md`）

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
- `--append-domain` は gobuster v3.2 以降のオプション。`gobuster --version` で確認し、
  v3.2未満の場合はアップデートするか ffuf を代替として使う：
  `ffuf -w [WORDLIST]:FUZZ -u http://[DOMAIN]/ -H "Host: FUZZ.[DOMAIN]" -fw [FILTER]`

### 刺さらなかったとき・症状別の対処

**ファジング中にブラウザのログインセッションが切れる / 数回に1回しかログインできない：**

| 観測される症状 | 推定原因 | 対処 |
|--------------|---------|------|
| ファジング開始後にブラウザでログアウトされる | ロードバランサー / WAF が IP 単位でレート制限を発動。同一IPの大量リクエストでセッションを切る | スレッド数を絞る（`-t 5` 以下） / 遅延を入れる（`--delay 200ms`） |
| 大量の `429 Too Many Requests` | アプリ層のレート制限 | スレッド数を絞る + リクエスト間隔を空ける |
| 大量の `503` / `502` | バックエンドが詰まっている / WAF の throttle | ファジング停止して数分待ってから再開、ワードリストを短いものに変える |
| ブラウザでログインしても即ログアウト | セッションストアの IP/UA バインディング | ファジング停止中にブラウザで操作し、別IP からは触らない |
| 一定回数失敗で IP ブロック | WAF / IPS の自動遮断 | 停止して回避策（IP ローテーション・遅延）を考える。検知された証跡として記録 |

**ファジングと手動操作は分離する。** ロードバランサー配下のアプリでは、ファジング中の手動操作はセッションが切れる前提で動く。**まず手動でサイト構造把握 → ファジングはバックグラウンド走行 → 必要なら停止して手動再開**、の順序で進める。

```bash
# 例：負荷を抑えたファジング設定
gobuster dir -u http://[IP] -w [WORDLIST] -t 5 --delay 200ms -o gobuster_lowrate.txt
```

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
