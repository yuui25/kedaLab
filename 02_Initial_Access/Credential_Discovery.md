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
