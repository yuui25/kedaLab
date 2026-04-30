# Windows AD 攻略フロー

AD環境（ドメインコントローラーが存在するWindows環境）での調査から権限昇格までの判断フロー。

---

## Step 0 — OS判定・AD環境の確認

> **「Windows か Linux か」の初手判定 → `00_OS_Identification.md` を参照。**
> Windows と確定した上でこのファイルを開いていること。

**AD環境かどうかの見分け方：**

nmap スキャンで以下のポートが複数開いていれば AD 環境と判断する：

| ポート | サービス | 意味 |
|--------|---------|------|
| 53 | DNS | ドメイン名前解決 |
| 88 | Kerberos | Kerberos認証 ← これがあれば AD 確定 |
| 389 / 636 | LDAP / LDAPS | ディレクトリサービス |
| 445 | SMB | ファイル共有 |
| 5985 | WinRM | リモート管理 |
| 3268 / 3269 | Global Catalog | フォレスト全体のLDAP |

→ 詳細: `../01_Reconnaissance/Network_Scanning.md`

---

## フロー概要

```
[1. ドメイン情報の特定]
       ↓
[2. 匿名・ゲストアクセスの確認]（認証情報なしでできること）
       ↓
[3. 初期認証情報の取得]
       ↓
[4. LDAP / BloodHound でAD全体を把握]
       ↓
[5. 権限チェーンの特定]
       ↓
[6. 昇格・横断移動]
       ↓
[7. DCSync → 全ハッシュ取得]
```

---

## Step 1 — ドメイン情報の特定

nmap の `-sC` スクリプトスキャン結果から：
- ドメイン名（例: `corp.local`）
- ホスト名
- OS バージョン（Windows Server 20xx）

を確認する。`/etc/hosts` にドメインとIPを登録しておく。

---

## Step 2 — 匿名・ゲストアクセスの確認（認証情報なし）

### SMB匿名アクセス

```bash
smbclient -L //[IP] -N
```

**非標準の共有名に注目。** `ADMIN$`, `C$`, `IPC$`, `NETLOGON`, `SYSVOL` 以外の共有があればアクセスを試みる。

### SYSVOL / Replication の匿名アクセス

```bash
# SYSVOL または Replication 共有を再帰的に列挙
smbclient -N //[IP]/SYSVOL -c "recurse ON; ls" 2>/dev/null
smbclient -N //[IP]/Replication -c "recurse ON; ls" 2>/dev/null
```

**確認する優先フォルダ：**
1. `[domain.name]/Policies/{GUID}/MACHINE/Preferences/Groups/Groups.xml` → **`cpassword` があれば GPP 認証情報**
2. `[domain.name]/scripts/` → `.bat` / `.ps1` → 平文パスワードの可能性

**`[domain.name]`（例: `corp.local`）という名前のフォルダが見えたら必ず降りる。** SYSVOL系の共有は、ドメイン名と同名フォルダがルート直下に存在するのが正常構造。

→ 詳細（ナビゲーション観点・GPP手順）: `../01_Reconnaissance/SMB_Enumeration.md`

### ASREPRoasting（認証情報なし）

事前認証不要のアカウントがあれば認証情報なしでハッシュを取得できる。ユーザーリストがあれば試す。

→ 詳細: `../04_Post_Access_Windows_AD/Kerberos_Attacks/ASREPRoasting.md`
→ 認証情報なしでのユーザー列挙: `../01_Reconnaissance/LDAP_Enumeration.md`（匿名バインド確認）

---

## Step 3 — 初期認証情報の取得

| 状況 | 手法 |
|------|------|
| Replication / SYSVOL に `Groups.xml` がある | `cpassword` 属性を `gpp-decrypt` で復号 → GPP認証情報取得 |
| 非標準SMB共有にファイルがある | ダウンロードして内容確認（バイナリ解析含む） |
| SYSVOL に .bat / .ps1 がある | 平文パスワードを探す |
| .NET バイナリが取得できた | 逆コンパイル→ハードコード認証情報の確認 |
| Webアプリがある | Webの脆弱性から認証情報取得 |
| 1433 番ポート（MSSQL）が開いている | MSSQL 経由でDB内ハッシュ取得 → クラック または スプレー |

→ バイナリ解析: `../02_Initial_Access/Binary_Analysis.md`
→ 認証情報発見: `../02_Initial_Access/Credential_Discovery.md`
→ MSSQL 経由の詳細手順: `../02_Initial_Access/MSSQL_Exploitation.md`
→ Web脆弱性の探索手順は `Linux_Attack_Flow.md` の Step 2〜3 を参照

---

## Step 4 — LDAP / BloodHound でAD全体を把握

認証情報が取得できたら、まず全体像を把握する。これが最重要ステップ。

### LDAP でユーザー情報を確認

```bash
ldapsearch -x -H ldap://[IP] -D "[DOMAIN]\[USER]" -w '[PASSWORD]' \
  -b "DC=[domain],DC=[tld]" "(objectClass=user)" sAMAccountName info description
# 例：ドメインが corp.local なら -b "DC=corp,DC=local"
```

**`info` フィールドや `description` フィールドにパスワードが平文で書かれている場合がある。**

→ 詳細: `../01_Reconnaissance/LDAP_Enumeration.md`

### BloodHound で権限チェーンを可視化

```bash
bloodhound-python -u [USER] -p '[PASSWORD]' -ns [IP] -d [DOMAIN] -c All
```

BloodHound の「Shortest Paths to Domain Admins」で権限昇格の経路を確認する。

→ 詳細: `../05_Tools_Reference/BloodHound.md`

---

## Step 5 — 権限チェーンの判断

→ BloodHoundの画面操作（Shortest Paths to Domain Adminsの場所・ノード右クリック）: `../05_Tools_Reference/BloodHound.md`

BloodHound で発見した ACE（アクセス制御エントリ）に応じて手法を選ぶ：

| 発見した権限 | 対応する攻撃手法 |
|-------------|----------------|
| GenericAll（オブジェクトへの完全制御） | パスワードリセット、Shadow Credentials、RBCD設定 |
| GenericWrite（属性の書き込み） | SPN設定 → Kerberoasting、logon script設定 |
| WriteDACL（DACLの変更） | GenericAll相当の権限を自分に付与 |
| SeMachineAccountPrivilege | コンピューターアカウントを作成 → RBCD攻撃 |
| SeEnableDelegationPrivilege | Unconstrained Delegation設定 → Printer Bug |

→ ACE濫用の詳細: `../04_Post_Access_Windows_AD/ACE_Abuse/`

---

## Step 6 — 昇格・横断移動

### RBCD（Resource-Based Constrained Delegation）攻撃

**発動条件:** 対象コンピューターオブジェクトに `GenericAll` / `GenericWrite` + `SeMachineAccountPrivilege`

1. コンピューターアカウントを作成（`addcomputer.py`）
2. DCの `msDS-AllowedToActOnBehalfOfOtherIdentity` に新アカウントのSIDを設定（`rbcd.py`）
3. S4U2Self/S4U2Proxy でAdministratorのチケット取得（`getST.py`）
4. Pass-The-Ticket でアクセス

→ 詳細: `../04_Post_Access_Windows_AD/Delegation_Attacks/RBCD.md`

### Unconstrained Delegation + Printer Bug

**発動条件:** Unconstrained Delegationが設定できるアカウント + DC上のPrinter Spoolerサービスが有効

1. Unconstrained Delegation を設定したコンピューターアカウントを作成
2. DNS レコードと SPN を追加
3. krbrelayx でリスナーを起動
4. printerbug で DC を強制認証 → DC の TGT をキャプチャ
5. TGT で DCSync

→ 詳細: `../04_Post_Access_Windows_AD/Delegation_Attacks/Unconstrained.md`

### Kerberoasting

**発動条件:** 認証済みユーザー + SPN 付きユーザーが存在する

→ 詳細: `../04_Post_Access_Windows_AD/Kerberos_Attacks/Kerberoasting.md`

---

## Step 7 — DCSync → 全ハッシュ取得

DCに対する複製権限（DCSync）が取得できたら：

```bash
# [Kali] 事前に export KRB5CCNAME=[チケットファイルのパス] を実行しておくこと
secretsdump.py -k -no-pass -just-dc-ntlm -target-ip [IP] administrator@[DC_FQDN]
```

取得した Administrator の NTLM ハッシュで Pass-The-Hash：

```bash
evil-winrm -i [IP] -u Administrator -H '[NTLM_HASH]'
```

→ 詳細: `../04_Post_Access_Windows_AD/Credential_Dumping.md`
