# SMB列挙

## 匿名・ゲストアクセスの確認

### 着火条件
445 (SMB) が開いている場合。特にWindows AD環境では最初に確認する。

### 観点・着眼点

**標準共有と非標準共有を区別する：**

| 標準共有名 | 用途 |
|-----------|------|
| `ADMIN$` | リモート管理 |
| `C$` | Cドライブ（管理者のみ） |
| `IPC$` | プロセス間通信 |
| `NETLOGON` | ログオンスクリプト |
| `SYSVOL` | グループポリシー・スクリプト |

→ **上記以外の共有名が存在する場合は必ずアクセスを試みる**

### 手順

**共有の一覧を取得（匿名）**
```bash
smbclient -L //[IP] -N
```

**共有の一覧を取得（認証あり）**
```bash
smbclient -L //[IP] -U '[DOMAIN]\[USER]%[PASSWORD]'
```

**非標準共有にアクセスしてファイル一覧を確認**
```bash
smbclient //[IP]/[SHARE_NAME] -N -c "ls"
# または
smbclient //[IP]/[SHARE_NAME] -U '[USER]%[PASSWORD]'
```

**ファイルをダウンロード**
```bash
smbclient //[IP]/[SHARE_NAME] -N -c "get [FILENAME] /tmp/[FILENAME]"
```

## SYSVOL の確認

### 観点・着眼点

SYSVOL に匿名アクセスできる場合、`scripts/` や `Policies/` 配下に：
- `.bat`, `.ps1`, `.vbs` スクリプト → **平文パスワードが含まれることがある**
- グループポリシー設定（GPO） → 設定不備の確認

### 手順

```bash
smbclient -N //[IP]/SYSVOL
smb: \> ls
smb: \> cd [DOMAIN]\scripts\
smb: \> ls
smb: \> get users.bat /tmp/users.bat
```

再帰的にダウンロード：
```bash
smbclient -N //[IP]/SYSVOL -c "recurse ON; prompt OFF; mget *" -D /tmp/sysvol
```

## enum4linux での網羅的な列挙

```bash
enum4linux -a [IP] | tee enum4linux.txt
```

ユーザー一覧・グループ・共有・パスワードポリシーを一括取得。

## 注意点・落とし穴

- `-N`（Null認証）が拒否されても、`guest`ユーザーでの認証 (`-U guest%`) が通ることがある
- SMB署名が有効（必須）な場合は中間者攻撃（NTLM リレー）は使えない
- ファイルに `.exe` や `.zip` がある場合は必ずダウンロードして内容を確認する（→ バイナリ解析）

### 関連技術
- スクリプトに平文パスワード → `../02_Initial_Access/Credential_Discovery.md`
- 実行ファイルが取得できた → `../02_Initial_Access/Binary_Analysis.md`
- 認証情報が取得できた → `LDAP_Enumeration.md` へ進む
