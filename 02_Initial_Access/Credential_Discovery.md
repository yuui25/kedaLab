# 認証情報の発見

様々な場所・形式で認証情報が露出しているパターンと、その取得手順をまとめる。

---

## パターン1: PCAPファイルからの平文認証情報

### 着火条件
- PCAPファイル（ネットワークキャプチャ）が取得できた場合
- FTP / HTTP / Telnet など**平文通信プロトコル**のトラフィックが含まれている可能性がある

### 観点・着眼点
FTPは認証情報を**完全に平文で送信する**。Webアプリがネットワークキャプチャを保存・公開している場合、そのPCAPにログイン情報がそのまま含まれることがある。

### 手順

```bash
# FTPの認証情報を抽出
tshark -r capture.pcap -Y "ftp" -T fields -e frame.number -e ftp.request.command -e ftp.request.arg

# HTTPのBasic認証を抽出
tshark -r capture.pcap -Y "http.authorization" -T fields -e http.authorization

# 全トラフィックを確認（目視）
tshark -r capture.pcap | head -100

# strings コマンドで文字列として抽出（簡易）
strings capture.pcap | grep -i "user\|pass\|login\|auth" | head -50
```

### 注意点・落とし穴
- `PASS` コマンドの引数がパスワードになる。空パスワードでも `PASS` 行は出るため、前後の `USER` 行とセットで確認する
- PCAPが大きい場合 `strings` は GB 単位でも数秒で終わるが、誤マッチが多いため補助手段として使う
- `https` トラフィックは復号できない（鍵がない限り）。平文は `http` / `ftp` / `telnet` / `pop3` / `imap` など
- 認証情報を拾ったら **日付・ホスト名もメモしておく**。古すぎる PCAP のパスワードは現在変更されている可能性

---

## パターン2: スクリプトファイルへの平文パスワード埋め込み

### 着火条件
- SMBの SYSVOL 共有にアクセスできた
- スクリプトファイル（`.bat`, `.ps1`, `.vbs`）が取得できた

### 観点・着眼点
管理者がユーザーアカウント作成等を自動化するスクリプトに、パスワードを平文で記述していることがある。特に `net user` コマンドを含む `.bat` ファイルは要確認。

### 手順
```bash
# ダウンロードしたスクリプトを確認
cat users.bat

# 典型的なパターン
# net user A.Username P4ssw0rd1#123
```

### 注意点・落とし穴
- `.bat` / `.ps1` / `.vbs` だけでなく `.config` / `.ini` / `.xml` にも平文認証情報があることがある
- SYSVOL はドメイン参加ユーザーなら誰でも読めるのが既定。低権限アカウントでの横展開の糸口
- `findstr /si password *.xml *.ini *.txt` を Windows 側で実行するとまとめて拾える（対応する Linux 側は `grep -risE 'pass(word)?='`）
- **スケジュールタスク XML** / **スクリプト実行時の引数** にパスワードが渡されている場合もあるので、Groups.xml 以外も全部舐める

---

## パターン3: LDAPのカスタム属性への平文パスワード保存

### 着火条件
- LDAP認証情報が取得できており、ユーザー属性を列挙できる

### 観点・着眼点
Active Directoryの `info` フィールドや `description` フィールドに、管理者が一時パスワードや初期パスワードをメモとして記録していることがある。

### 手順
```bash
ldapsearch ... "(objectClass=user)" sAMAccountName info description \
  | grep -i "info\|description"
```

→ 詳細: `../../01_Reconnaissance/LDAP_Enumeration.md`

### 注意点・落とし穴
- `info` は GUI の「説明」欄とは別の目立たないフィールド。見落とされやすい分だけ平文パスワードが残りやすい
- 一時パスワードが書かれていても `userAccountControl` に `PASSWORD_EXPIRED` が立っていないか確認。既に使われなくなっている可能性
- `description` / `info` が暗号文っぽい場合、別フィールドに鍵が書かれていることもある（例: `extensionAttribute1`）

---

## パターン4: バイナリ・設定ファイルへのハードコード

### 着火条件
- 実行ファイル・設定ファイル・ライブラリが取得できた

### 観点・着眼点
開発者がアプリケーション内に認証情報を直接書き込んでいる場合がある（LDAP接続用パスワード等）。暗号化されていても、XOR程度の簡易暗号はバイナリ解析で復号できる。

→ 詳細: `../Binary_Analysis.md`

### 注意点・落とし穴
- `web.config` / `appsettings.json` / `.env` / `docker-compose.yml` は最優先で確認する（バイナリ解析より前）
- .NET バイナリは `strings` でも見つかることが多いが、UTF-16LE エンコードなので `strings -e l` を併用
- 見つかった認証情報が開発用で接続先が `localhost` や内部ホスト → そのホスト名が DNS で引けるか確認（パストラバーサル等で `/etc/hosts` を拾うと分かることがある）

---

## パターン5: Webアプリの内部データベースからハッシュを取得

### 着火条件
- パストラバーサルやファイル読み取り系の脆弱性で、アプリのデータディレクトリにアクセスできた
- Grafana / WordPress / Gitea 等のWebアプリが SQLite や MySQL を使って認証情報を保存している

### 観点・着眼点
Webアプリが独自の認証機構を持つ場合、OSのユーザーではなくアプリ独自のDBにパスワードハッシュを保存している。
ハッシュ形式はアプリによって異なり、Grafanaは PBKDF2-HMAC-SHA256、WordPress は MD5 ベース等。
**取得したDBファイルはまずテーブル一覧を確認し、ユーザー・認証関連テーブルを特定する。**

### 手順

```bash
# SQLite の場合 — テーブル一覧を確認
sqlite3 [FILE].db ".tables"

# ユーザー関連テーブルを確認
sqlite3 [FILE].db "SELECT * FROM user LIMIT 5;"

# カラム構成を確認
sqlite3 [FILE].db "PRAGMA table_info(user);"
```

#### Grafana（PBKDF2-HMAC-SHA256）の場合

```bash
# ユーザー情報の取得
sqlite3 grafana.db "SELECT id, name, login, email, password, salt FROM user;"

# 出力例:
# 1||admin|admin@localhost|[HEX_HASH]|[SALT]
# 2|username|username|user@domain.local|[HEX_HASH]|[SALT]
```

取得したハッシュを Hashcat (mode 10900) 形式に変換する：

```python
import base64, binascii

salt = b'[SALT_STRING]'
hash_hex = '[HEX_HASH]'
hash_bytes = binascii.unhexlify(hash_hex)
print(f'sha256:10000:{base64.b64encode(salt).decode()}:{base64.b64encode(hash_bytes).decode()}')
```

→ 変換後ハッシュのクラック: `../../05_Tools_Reference/Hashcat.md`（mode 10900）

### 注意点・落とし穴
- ハッシュが HEX 文字列で保存されている場合、Hashcat に渡す前に base64 形式に変換が必要（アプリ依存）
- salt が別カラムに保存されていることが多い。必ずセットで取得する
- admin アカウントのハッシュが強固でクラックできなくても、一般ユーザーのハッシュがクラックできることがある
- パスワードを取得できたら必ず他サービス（SSH, FTP, 管理画面等）でも試す（使い回し確認）

---

## パターン6: GPP (Group Policy Preferences) の cpassword

### 着火条件
- SYSVOL または Replication 共有に匿名または認証ありでアクセスできた
- `Policies/{GUID}/MACHINE/Preferences/Groups/Groups.xml` が取得できた
- XML内に `cpassword=` 属性が存在する

### 観点・着眼点

`cpassword` 属性が存在した時点で **ツール1コマンドで平文に復元できる**（誰でも即座に復号可能）。

`userName` 属性がドメインアカウントを指している場合（例: `DOMAIN\SVC_xxx`）、そのアカウントのドメインパスワードが得られる。ローカルアカウントを指している場合も、共通化されたローカル管理者パスワードである可能性が高く、ドメイン内の他端末への横展開で有効なケースが多い。

> 原理（なぜ AES 暗号化されていても復号できるのか・MS14-025 後の挙動・対象XMLの範囲） → `../../06_Concepts/GPP_Credential.md`

### 手順

```bash
# gpp-decrypt（Kali Linux 標準搭載）
gpp-decrypt '[cpassword 属性の値]'

# 取得できる情報を確認
# - userName: 対象アカウント（DOMAIN\username 形式）
# - cpassword: 復号するとパスワード
```

### 注意点・落とし穴
- `action="U"` は既存アカウントの更新（パスワード変更）を意味する。現在も有効なパスワードの可能性が高い
- `Groups.xml` 以外にも GPP 認証情報が保存されるファイルがある: `Services.xml`, `ScheduledTasks.xml`, `Printers.xml`, `Drives.xml` — いずれも同様に `cpassword` を含む可能性がある
- 取得したアカウントが低権限でも、そのアカウントで LDAP・SMB・BloodHound の認証が通るため、AD全体の列挙が一気に進む

→ 詳細な取得手順: `../../01_Reconnaissance/SMB_Enumeration.md`（GPPセクション）

---

## パターン7: Webアプリの .env ファイルからの認証情報取得

### 着火条件
- Webサーバ（nginx / Apache 等）の公開ディレクトリ（`/var/www/html/` 等）にシェルでアクセスできた
- PHP / Node.js / Laravel / Django 等のフレームワークベースのWebアプリが動作している

### 観点・着眼点
`.env` ファイルはWebアプリの設定を環境変数として管理するファイル。**本番環境ではDBの認証情報・APIキー・シークレットキー等が平文で格納されている**ことが多い。

www-data等の低権限ユーザーでシェルを取得した直後に確認するべき最優先ファイルの一つ。OSユーザーのパスワードとDBパスワードが使い回されているケースが多く、そのまま `su` や SSH での横展開に使える。

**確認すべきパスと優先順位：**

```bash
# Webルートの直下（最優先）
cat /var/www/html/.env
ls -la /var/www/html/

# フレームワーク特有のパス
cat /var/www/[アプリ名]/.env
cat /opt/[アプリ名]/.env
cat /srv/[アプリ名]/.env

# 隠しファイルを含めて一覧表示
ls -la /var/www/html/
```

`.env` が見つかったら以下を確認する：

```
DB_HOST=127.0.0.1
DB_DATABASE=app_prod
DB_USERNAME=admin
DB_PASSWORD=passowrd    ← これがOSユーザーでも使われている可能性
APP_KEY=base64:...               ← アプリの暗号化キー
```

### 手順

```bash
# カレントディレクトリのWebルートを確認
ls -la /var/www/html/

# .env の中身を確認
cat /var/www/html/.env

# 取得したパスワードを /etc/passwd のユーザーに対して試す
cat /etc/passwd | grep "/home"
# → ホームディレクトリを持つOSユーザーを確認
su [USERNAME]
# パスワードに .env の DB_PASSWORD 等を入力
```

### 注意点・落とし穴
- `.env` はデフォルトで隠しファイル（`.` 始まり）のため、`ls` だけでは見えない。`ls -la` で確認する
- DB_PASSWORD と OSユーザーのパスワードが同一になっているのは設定ミス（パスワード使い回し）だが、実際に多い
- `.env` が見つからない場合は `config.php`, `database.yml`, `appsettings.json`, `docker-compose.yml` 等も確認する
- アプリケーションによっては `.env.production` / `.env.local` 等の派生ファイルが存在する

---

## 認証情報を取得したら必ず試すこと

**パスワードの使い回し確認：**
取得した認証情報は、判明している**全てのサービス**で試す。

| 試すサービス | コマンド |
|------------|---------|
| SSH | `ssh [USER]@[IP]` |
| SMB | `smbclient -L //[IP] -U '[USER]%[PASS]'` |
| WinRM | `evil-winrm -i [IP] -u [USER] -p '[PASS]'` |
| FTP | `ftp [IP]` → ユーザー/パスを入力 |
| Web管理画面 | ブラウザで手動ログイン試行 |

**複数ユーザーへのスプレー：**
1つのパスワードが複数のユーザーに使われていることもある。
```bash
netexec smb [IP] -u users.txt -p '[PASSWORD]' --continue-on-success
```

---

## 関連技術
- PCAPからFTP認証情報 → SSHで同じ認証情報を試す
- LDAP認証情報でLDAPにアクセス → `../../01_Reconnaissance/LDAP_Enumeration.md`
- バイナリから認証情報 → `../Binary_Analysis.md`
- Webアプリのファイル読み取りでDBを取得 → `Web_Vulnerabilities/Path_Traversal.md`
- Grafana ハッシュのクラック → `../../05_Tools_Reference/Hashcat.md`
