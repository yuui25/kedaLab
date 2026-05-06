# Windows AD 攻略フロー

AD環境（ドメインコントローラーが存在するWindows環境）での調査から権限昇格までの判断フロー。

---

## 案件開始条件の確認

> AD特有の用語（Kerberos・NTLM・BloodHound・ACE 等）が初出の場合 → `../06_Concepts/AD_Terminology.md` で確認する

**このファイルを開いたら最初にここを読む。** 何が手元にあるかでスタート位置が変わる。

| 提供されている情報 | 開始位置 |
|------------------|---------|
| IPのみ | Step 1（ポートスキャン）から始める |
| 低権限SQLユーザー（ID/パス）が提供済み | Step 2 を確認しつつ、Step 3「MSSQL経由」へ進む |
| ドメインユーザー（ID/パス）が提供済み | Step 2 を確認後、Step 4（BloodHound）から直接始める |
| ドメインユーザーのNTLMハッシュのみ提供済み | Step 2 を確認後、Step 3.5（Pass-The-Hash でスプレー / 直接 evil-winrm `-H`）へ進む |

> **「認証情報が提供済み」でも Step 2（匿名アクセス）は必ず確認する。**
> 匿名で取れる情報（GPP認証情報・SYSVOL内スクリプト）が別の権限昇格経路になることがある。

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
[3.5 パスワードスプレー → 初期シェル取得]  ← ハッシュクラックと並行して進める
       ↓
[4. LDAP / BloodHound でAD全体を把握 ＋ 侵入後列挙（Enumeration_Checklist.md）]
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

を確認する。`/etc/hosts` に **ホスト名・ドメイン名・FQDN** の3つを登録しておく。

```
10.10.10.10  dc01 dc01.corp.local corp.local
```

> 原理（なぜ IP では Kerberos / LDAP / TLS が動かないのか・どのドメイン名を登録すべきか・原状回復） → `../06_Concepts/Hosts_File_For_AD.md`

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
| 案件開始時に低権限SQLユーザーが提供済み | MSSQL に接続してDB内ハッシュ取得 → クラック または スプレー |
| Replication / SYSVOL に `Groups.xml` がある | `cpassword` 属性を `gpp-decrypt` で復号 → GPP認証情報取得 |
| 非標準SMB共有にファイルがある | ダウンロードして内容確認（バイナリ解析含む） |
| SYSVOL に .bat / .ps1 がある | 平文パスワードを探す |
| .NET バイナリが取得できた | 逆コンパイル→ハードコード認証情報の確認 |
| Webアプリがある | Webの脆弱性から認証情報取得 |
| 1433 番ポート（MSSQL）が開いている | MSSQL 経由でDB内ハッシュ取得 → クラック または スプレー |

→ バイナリ解析: `../02_Initial_Access/Binary_Analysis.md`
→ 認証情報発見: `../02_Initial_Access/Credential_Discovery.md`
→ MSSQL 経由の詳細手順: `../02_Initial_Access/MSSQL_Exploitation.md`
→ Web脆弱性はOSに依存しない: `../02_Initial_Access/Web_Vulnerabilities/`（Windows上のWebアプリでも手法は同じ）

> **ハッシュ取得時点で Step 3.5 のパスワードスプレーも並行で開始する。**
> ハッシュのクラック完了を待ってから次に進むと数日待ちになることがある。
> 取得したハッシュをクラックに回しつつ、**他ユーザーへのパスワード使い回し**・**よくある初期パスワード**・**RID brute で得たユーザーリストへのスプレー** を並行で進める（Step 3.5 参照）。
> hashcat の推定完了時間が現実的でない場合は、担当者・クライアントに平文パスワードの提供を確認するのも正当な選択肢（グレーボックス案件）。

---

## Step 3.5 — パスワードスプレー → 初期シェル取得

Step 3 で認証情報（ハッシュまたは平文）が手に入ったら、ドメインユーザー全体にスプレーをかけてシェル取得を目指す。**ハッシュのクラックと並行して進める。**

### ドメインユーザーリストの取得（RID bruteforce）

手元にある認証情報でユーザーリストを作る。MSSQL・SMB どちらの認証情報でも実行できる。

> `nxc` は NetExec（旧 CrackMapExec）のコマンド名。SMB・WinRM・MSSQL 等への認証テスト・情報取得を一括で行うツール。Kali標準搭載。詳細 → `../05_Tools_Reference/Netexec.md`

> **コマンド内の `[DOMAIN]` は Step 1 で取得した実際のドメイン名（NetBIOS 名）に置換する。**
> 例：ドメイン `corp.local` なら `CORP` に置き換える（NetBIOS 名は通常ドメイン名の先頭ラベルを大文字化）。
> 置換しないと正規表現がマッチせず、grep が空になって `users` ファイルが空のまま気づかない。

```bash
# [Kali] MSSQL 経由（SQLユーザーで接続した場合 → --local-auth が必要）
nxc mssql [IP] -u [USER] -p '[PASSWORD]' --local-auth --rid-brute \
  | grep -oP '[DOMAIN]\\\w+\.\w+' | cut -d'\' -f2 | tee users

# [Kali] SMB 経由（ドメインユーザーで接続した場合）
nxc smb [IP] -u [USER] -p '[PASSWORD]' --rid-brute \
  | grep -oP '[DOMAIN]\\\w+\.\w+' | cut -d'\' -f2 | tee users
```

> **正規表現 `\w+\.\w+` は `firstname.lastname` 形式専用。** 組織のユーザー命名規則が違う場合（`jdunn` 形式・`user001` 形式・`-` を含む 等）は刺さらない。その場合は `\\\S+` のようにより広く受ける形に変える。詳細は `../05_Tools_Reference/Netexec.md` の「刺さらなかったとき」を参照。

→ 詳細（`--local-auth` の意味・パイプラインの読み方）: `../05_Tools_Reference/Netexec.md`

### パスワードスプレー

```bash
# [Kali] WinRM に対してスプレー
nxc winrm [IP] -u users -p '[PASSWORD]' --continue-on-success
# → (Pwn3d!) が出たユーザーが evil-winrm で接続可能

# [Kali] SMB に対してスプレー（WinRM が通らない場合）
nxc smb [IP] -u users -p '[PASSWORD]' --continue-on-success
```

**出力の読み方：**

| 出力 | 意味 | 次のアクション |
|------|------|--------------|
| `[+] ... (Pwn3d!)` | 認証成功 + 管理者/Remote Management Users 権限あり | `evil-winrm` でシェル取得可能（次の手順） |
| `[+] ...`（`(Pwn3d!)` なし） | 認証は通るが WinRM 経由でシェルを取れない（Remote Management Users グループ外） | SMB ・LDAP ・MSSQL 等の他プロトコルで使えるか試す。BloodHound でこのユーザーの権限を確認する |
| `[-] ... STATUS_LOGON_FAILURE` | パスワード不一致 | 別のパスワード候補を試す |
| `[-] ... STATUS_ACCOUNT_LOCKED_OUT` | ロックアウト発動 | スプレー停止。ロックアウトポリシー確認後に時間を空ける |

**スプレーに使うパスワードの候補（優先順位順）：**

1. Step 3 で取得済みの平文パスワード（他ユーザーへの使い回しを確認）
2. hashcat で短時間（目安：30分以内）でクラックできたパスワード
3. よくある初期パスワード（`Welcome1`・`Password1`・組織名+数字 等）
4. hashcat の推定完了時間が現実的でない（1日以上）場合 → **担当者・クライアントに平文パスワードの提供を確認する**（グレーボックス案件では正当な選択肢）

→ 詳細: `../05_Tools_Reference/Netexec.md`

### WinRM 接続（シェル取得）

```bash
# [Kali] (Pwn3d!) が出たユーザーで接続
evil-winrm -i [IP] -u [USER] -p '[PASSWORD]'
```

→ 詳細（evil-winrm の使い方・ファイル転送・PoC のアップロード）: `../02_Initial_Access/Protocol_Exploitation.md`（WinRMセクション）

### シェル取得後の次ステップ

**シェルを取ったら以下の2つを並行して進める：**

| やること | 参照先 |
|---------|--------|
| 侵入後の列挙（whoami /all・OSバージョン確認・inetpub 等） | `../04_Post_Access_Windows_AD/Enumeration_Checklist.md` |
| BloodHound でAD全体を把握 | Step 4 へ / `../05_Tools_Reference/BloodHound.md` |

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
bloodhound-python -u [USER] -p '[PASSWORD]' -ns [DC_IP] -d [DOMAIN] -c All
# [DC_IP] は単一ホスト案件では [IP] と同じ。
# AD が複数DCで構成されている場合のみ DNS が解決できる DC のIPを別途指定する。
```

BloodHound の「Shortest Paths to Domain Admins」で権限昇格の経路を確認する。

> **このコマンドは Linux（攻撃側）から1回実行すれば十分。** Windows シェル取得後の `Enumeration_Checklist.md` Step 2 でも BloodHound が登場するが、ここで実行済みであれば再実行は不要（同じデータを取得するだけ）。

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

**事前準備（必須）：**

```bash
export KRB5CCNAME=[チケットファイルのパス]   # [Kali]
```

```bash
secretsdump.py -k -no-pass -just-dc-ntlm -target-ip [IP] administrator@[DC_FQDN]   # [Kali]
```

取得した Administrator の NTLM ハッシュで Pass-The-Hash：

```bash
evil-winrm -i [IP] -u Administrator -H '[NTLM_HASH]'
```

→ 詳細: `../04_Post_Access_Windows_AD/Credential_Dumping.md`
