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

---

## パターン4: バイナリ・設定ファイルへのハードコード

### 着火条件
- 実行ファイル・設定ファイル・ライブラリが取得できた

### 観点・着眼点
開発者がアプリケーション内に認証情報を直接書き込んでいる場合がある（LDAP接続用パスワード等）。暗号化されていても、XOR程度の簡易暗号はバイナリ解析で復号できる。

→ 詳細: `../Binary_Analysis.md`

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
