# LDAP列挙

## ユーザー・属性の確認

### 着火条件
389 (LDAP) または 636 (LDAPS) が開いており、AD環境と判断した場合。
認証情報（LDAPユーザーの資格情報）が取得できた時点で実施する。

### 観点・着眼点

**標準属性以外のカスタム属性に注目：**
- `info` フィールド → **平文パスワードが書かれていることがある**
- `description` フィールド → 同様にパスワードメモが含まれることがある
- `memberOf` → ユーザーが所属するグループ（権限の確認）

### 手順

**基本的なユーザー列挙**
```bash
ldapsearch -x -H ldap://[IP] \
  -D "[DOMAIN]\[USER]" \
  -w '[PASSWORD]' \
  -b "DC=[domain],DC=[tld]" \
  "(objectClass=user)" sAMAccountName info description memberOf
```

**全属性を取得（詳細調査）**
```bash
ldapsearch -x -H ldap://[IP] \
  -D "[DOMAIN]\[USER]" \
  -w '[PASSWORD]' \
  -b "DC=[domain],DC=[tld]" \
  "(objectClass=user)"
```

**コンピューターアカウントの列挙**
```bash
ldapsearch -x -H ldap://[IP] \
  -D "[DOMAIN]\[USER]" \
  -w '[PASSWORD]' \
  -b "DC=[domain],DC=[tld]" \
  "(objectClass=computer)" sAMAccountName dNSHostName
```

**NetExec を使った高速列挙**
```bash
netexec ldap [IP] -u [USER] -p '[PASSWORD]' --users
```

## 匿名LDAPアクセスの確認

認証情報がない状態でも試してみる価値がある：
```bash
ldapsearch -x -H ldap://[IP] -b "DC=[domain],DC=[tld]"
```

## 注意点・落とし穴

- `info` フィールドは GUI（Active Directory ユーザーとコンピューター）の「説明」欄とは別の、あまり目立たないフィールド
- 大量の出力は `tee` でファイルに保存しながら確認する
- `grep -i "info\|description\|pass\|pwd"` で認証情報候補を絞り込む

```bash
ldapsearch ... | grep -i "info\|description\|pass\|pwd"
```

### 関連技術
- ユーザー一覧が取得できた → `../04_Post_Access_Windows_AD/Kerberos_Attacks/Kerberoasting.md`
- 全体の権限マッピングが必要 → `../05_Tools_Reference/BloodHound.md`
- `info` フィールドにパスワード → `../02_Initial_Access/Credential_Discovery.md`
