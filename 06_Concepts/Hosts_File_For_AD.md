# /etc/hosts へのドメイン名登録（AD攻撃の前提）

## このファイルの位置づけ

AD 環境への攻撃で「最初に `/etc/hosts` にドメイン名と IP を登録する」という手順がほぼ全てのフローに登場するが、**なぜ必要なのか**は手順書に書かれていないことが多い。

参照元（手順だけ書いてあり、原理を読みたい場合はこのファイルへ）：

- [`../00_Playbook/Windows_AD_Attack_Flow.md`](../00_Playbook/Windows_AD_Attack_Flow.md) Step 1（ドメイン情報の特定 → `/etc/hosts` 登録）
- [`../01_Reconnaissance/Web_Enumeration.md`](../01_Reconnaissance/Web_Enumeration.md)（vhost ファジング発見時の登録）

---

## なぜ /etc/hosts 登録が必要か

AD 環境を攻撃する Kali 等の Linux マシンは、**ターゲットの DNS サーバーを使っていない**ことが多い（VPN 越しに IP だけ渡されているため）。  
このとき以下の3つの理由で「IP のみ」では攻撃が失敗する。

### 理由1：Kerberos は SPN（Service Principal Name）で認証する

Kerberos の TGS（Ticket Granting Service）リクエストでは「**サービスのホスト名**」が必要になる。  
SPN は `CIFS/dc01.corp.local` のようなホスト名ベースの形式で、IP アドレスでは要求できない。

```
# IPで Kerberos を試みると失敗する
KRB_AP_ERR_BAD_INTEGRITY / KDC_ERR_S_PRINCIPAL_UNKNOWN
```

`/etc/hosts` に `10.10.10.10  dc01.corp.local  dc01` を登録しておくと、
Kerberos クライアント（impacket・evil-winrm 等）がホスト名解決できるようになる。

### 理由2：LDAP の Bind DN・Search Base はドメイン名から構築される

LDAP の検索ベース（`-b "DC=corp,DC=local"`）は **ドメイン名そのもの**。  
ドメイン名が分からないと bind すらできない。さらに `ldap://dc01.corp.local` のような URI で接続するツールも多い。

### 理由3：SSL/TLS 証明書のホスト名検証

LDAPS（636）・WinRM HTTPS（5986）・MSSQL の TLS 接続等は、**証明書の Subject / SAN とホスト名が一致しないと拒否される**。  
IP で接続すると `certificate verify failed: hostname mismatch` で接続できない。

---

## どのドメイン名を登録するか

最低限以下の3つを登録する：

```
[IP]  [hostname]                # 例: dc01
[IP]  [domain.tld]              # 例: corp.local
[IP]  [hostname].[domain.tld]   # 例: dc01.corp.local
```

ドメイン情報の取得元：

| 取得元 | 確認できる情報 |
|--------|--------------|
| `nmap -sC -sV [IP]` の結果 | LDAP の `Domain` 行・SMB の `OS=` 行 |
| `smbclient -L //[IP] -N` のサーバー情報 | NetBIOS ホスト名・ドメイン名 |
| `nxc smb [IP]` の出力 | `(name:DC01) (domain:corp.local)` |
| `ldapsearch -x -H ldap://[IP] -s base namingcontexts` | Naming Contexts 経由で `DC=corp,DC=local` |

---

## 環境が変わったときどこを確認するか

- **複数 DC がある環境**：全 DC のホスト名と IP を全て登録する。Kerberos は最初に応答した KDC を使うため、片方しか登録しないとフェイルオーバー時に動かない
- **VPN/プロキシ経由**：VPN クライアントが `/etc/resolv.conf` を書き換えてターゲットドメインを解決できる場合もある。`dig @[DC_IP] [domain.tld] SOA` で先に試す
- **ホスト名が頻繁に変わる検証環境**：`/etc/hosts` を変更し忘れると古い名前で Kerberos が失敗する。チケットを作り直す前に hosts を必ず確認
- **Wildcard DNS でドメイン解決できる環境**：登録不要だが、稀

---

## 原状回復

`/etc/hosts` への追記は次の案件に持ち越さない。**案件ごとにコメントマーカーで囲んでおき、終了時に削除する**のが安全。

```
# === [案件識別子] start ===
10.10.10.10  dc01 dc01.corp.local corp.local
# === [案件識別子] end ===
```

別の案件で同じ IP・別ドメイン名を扱うと Kerberos の SPN 解決が壊れて原因不明のエラーに数時間溶かすことがある。
