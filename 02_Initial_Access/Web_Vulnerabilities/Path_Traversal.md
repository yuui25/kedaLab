# パストラバーサル（ディレクトリトラバーサル）

## 概要

Webアプリケーションがファイルパスのサニタイズを適切に行っていない場合、`../` 等のシーケンスを使ってWebルート外のファイルを読み取れる。アプリ固有の既知CVEとして公開されているケースも多い。

---

## 着火条件

- Webサービスが動いており、バージョンが特定できた
- そのバージョンにパストラバーサルのCVEが存在する（searchsploit / NVD で確認）
- ファイルダウンロード・プラグイン読み込み・画像表示など、パスを受け取るエンドポイントがある

---

## 環境前提

- 実行環境: テスター端末
- 必要なツール: `curl`（ペネトレ用Linuxディストリ標準搭載）、`searchsploit`（同左）、ブラウザ（任意）
- インターネットアクセス: NVD / GitHub での CVE 詳細確認時に必要。`searchsploit` 自体はオフラインで動作（事前に `searchsploit -u` でDB更新したものを利用）

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
ホスト名がランダムな16進数文字列（例: `172.17.0.2 [CONTAINER_ID]`）であればDockerコンテナ内で動作している。コンテナIDが判明すれば後続の悪用で使える。

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

## アプリ固有 CVE の具体ペイロード

バージョン特定後に、該当する CVE の具体的なペイロード（プラグイン経由の `../` パス、データベース取得手順等）が必要な場合は CVE_Notes.md を参照する：

- **Grafana 8.0.0〜8.3.0（CVE-2021-43798）** → `../../05_Tools_Reference/CVE_Notes.md`

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

## 刺さらなかったとき

| 症状 | 推定原因 | 次のアクション |
|------|----------|--------------|
| `../` をエンコードなしで送って 400 / 403 | パスのサニタイズあり または WAF の単純パターン検知 | `%2F` / `%252F`（ダブルエンコード）/ `..%c0%af` 等のエンコードバリアントを試す |
| `--path-as-is` なしで送って 200 が返るが `../` が消えている | curl が `../` を正規化している | `curl --path-as-is` を必ず付ける |
| ファイルは読めるが内容が空 | Webアプリのデフォルトディレクトリ・実行 cwd が想定と違う | `curl ... "/proc/self/cwd"` `curl ... "/proc/self/environ"` で実際のパスを特定 |
| 全ての `/etc/passwd` 取得試行が 404 | パストラバーサルではなく特定ディレクトリ配下のみアクセス可（チャートパス制限） | アプリ固有 CVE のペイロード（プラグイン経由パス等）を試す → `../../05_Tools_Reference/CVE_Notes.md` |
| Dockerコンテナ内で `/etc/hosts` がランダム16進ホスト名 | コンテナ内に閉じている | コンテナ内のアプリ設定DB（Grafana等）が次の獲物。ホスト側ファイルは諦める |

---

## 注意点・落とし穴

- `--path-as-is` オプションを使わないと `curl` が `../` を正規化してしまう
- WAFが `../` を検出する場合はエンコード（`%2F`, `%252F`）を試みる
- Dockerコンテナ内でのパストラバーサルはコンテナ内のファイルしか読めない（ホストは不可）
  - ただしコンテナ内のアプリ設定DB（Grafana等）は取得できる
- 取得したファイルが空 or エラーの場合：Webサーバープロセスが動作しているカレントディレクトリを確認する
  `curl ... "/proc/self/cwd"` → Webサーバープロセスの実行ディレクトリへのシンボリックリンクを返す
  `curl ... "/proc/self/environ"` → プロセスの環境変数（パス情報を含む）を返す
  （/proc はLinuxカーネルが仮想的にファイルとして提供する情報領域。プロセスごとのディレクトリが /proc/[PID]/ に存在する）
- 失敗した手法の記録：エンコードなしの `../` のみ試して失敗するケースは多い。必ずエンコードも試す

---

## 関連技術

- 前：バージョン確認・CVE 検索 → `../../01_Reconnaissance/Web_Enumeration.md`
- 前：searchsploit でのエクスプロイト検索 → `../../05_Tools_Reference/Searchsploit.md`
- 関連：アプリ × バージョン固有のペイロード集 → `../../05_Tools_Reference/CVE_Notes.md`
- 後：取得したDB/設定ファイルからの認証情報抽出 → `../Credential_Discovery.md`
- 後：Grafana ハッシュのクラック（PBKDF2-HMAC-SHA256） → `../../05_Tools_Reference/Hashcat.md`
