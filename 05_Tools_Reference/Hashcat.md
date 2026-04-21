# Hashcat クイックリファレンス

## よく使うハッシュモード

| モード番号 | ハッシュタイプ | 取得方法 |
|-----------|-------------|---------|
| `13100` | Kerberos TGS-REP etype 23（RC4）| Kerberoasting |
| `19700` | Kerberos TGS-REP etype 17（AES128）| Kerberoasting |
| `19800` | Kerberos TGS-REP etype 18（AES256）| Kerberoasting |
| `18200` | Kerberos AS-REP etype 23 | ASREPRoasting |
| `1000` | NTLM | secretsdump / Pass-The-Hash |
| `5600` | NetNTLMv2 | Responder / NTLM リレー |
| `10900` | PBKDF2-HMAC-SHA256 | Grafana DB / 各種Webアプリ |
| `20` | md5($salt.$pass) | CMS Made Simple 等 |
| `0` | MD5（ソルトなし） | 各種 |
| `100` | SHA1 | 各種 |

---

## 基本的なクラックコマンド

```bash
# Kerberoasting ハッシュ
hashcat -m 13100 hashes.txt /usr/share/wordlists/rockyou.txt

# ASREPRoasting ハッシュ
hashcat -m 18200 hashes.txt /usr/share/wordlists/rockyou.txt

# NTLM ハッシュ
hashcat -m 1000 hashes.txt /usr/share/wordlists/rockyou.txt
```

---

## ルールを使った強化

```bash
# best64 ルール（基本的な変形）
hashcat -m 13100 hashes.txt /usr/share/wordlists/rockyou.txt \
  -r /usr/share/hashcat/rules/best64.rule

# OneRuleToRuleThemAll（強力）
hashcat -m 13100 hashes.txt /usr/share/wordlists/rockyou.txt \
  -r /usr/share/hashcat/rules/OneRuleToRuleThemAll.rule
```

---

## マスクアタック（パスワードパターンがわかっている場合）

```bash
# ?u=大文字, ?l=小文字, ?d=数字, ?s=記号, ?a=全文字
# 例: 大文字1文字 + 小文字7文字 + 数字2文字
hashcat -m 13100 hashes.txt -a 3 ?u?l?l?l?l?l?l?l?d?d

# 既知のプレフィックス + 数字4桁
hashcat -m 13100 hashes.txt -a 3 Password?d?d?d?d
```

---

## よく使うオプション

| オプション | 説明 |
|-----------|------|
| `-m [MODE]` | ハッシュモード |
| `-a 0` | 辞書攻撃（デフォルト） |
| `-a 3` | マスク攻撃 |
| `-a 6` | 辞書 + マスクのハイブリッド |
| `-r [FILE]` | ルールファイルを適用 |
| `--show` | クラック済みハッシュを表示 |
| `-o [FILE]` | クラック結果をファイルに保存 |
| `--force` | 警告を無視して強制実行 |
| `-w 3` | ワークロードプロファイル（高） |

---

## GPU の使用確認と高速化

```bash
# GPU デバイスの確認
hashcat -I

# GPU を使ったクラック（自動で GPU を使用）
hashcat -m 13100 hashes.txt rockyou.txt -w 4 -O
```

---

## クラック済みハッシュの確認

```bash
# クラック済みを表示
hashcat -m 13100 hashes.txt --show

# ポットファイルの確認（クラック済みハッシュのキャッシュ）
cat ~/.hashcat/hashcat.potfile
```

---

## MD5+Salt（mode 20）— CMS 等のWebアプリ

### 着火条件
- タイムベースブラインドSQLiなどでWebアプリのDBから **MD5ハッシュ** と **ソルト文字列** を別々に取得した
- ハッシュ形式が `md5(salt + password)` であることが判明している（例: CMS Made Simple）

### 観点・着眼点

**mode 0（MD5）と mode 20（md5($salt.$pass)）の違いを間違えると全くヒットしない。**
ソルトが存在する場合は必ず mode 20 を使う。ソルトの位置（前付き/後付き）もアプリによって異なる。

| モード | 計算式 |
|--------|--------|
| `0` | `md5(pass)` |
| `20` | `md5($salt.$pass)` ← ソルトが前 |
| `10` | `md5($pass.$salt)` ← ソルトが後 |

### Hashcat コマンド

```bash
# フォーマット: hash:salt
hashcat -m 20 "[HASH]:[SALT]" /usr/share/wordlists/rockyou.txt

# 例（CMS Made Simple から取得した場合）
hashcat -m 20 "62def4866937f08cc13bab43bb14e6f7:5a599ef579066807" /usr/share/wordlists/rockyou.txt
```

### Python での手動クラック（hashcat が使えない環境）

```python
import hashlib

salt  = "取得したソルト"
hash_ = "取得したMD5ハッシュ"

with open("/usr/share/wordlists/rockyou.txt", errors="ignore") as f:
    for line in f:
        word = line.strip()
        candidate = hashlib.md5((salt + word).encode()).hexdigest()
        if candidate == hash_:
            print(f"[+] クラック成功: {word}")
            break
```

### 注意点
- ハッシュとソルトを hashcat に渡す形式は `[HASH]:[SALT]`（コロン区切り）
- `md5($pass.$salt)` の場合は mode `10` を使う（ソルトとパスワードの順序が逆）
- Python で実装する場合も `.encode()` を忘れるとバイト/文字列エラーになる

---

## PBKDF2-HMAC-SHA256（mode 10900）— Grafana 等のWebアプリ

### 着火条件
- Grafana の SQLite DB（`grafana.db`）からユーザーハッシュを取得した
- ハッシュが HEX 文字列、salt が別カラムに格納されている

### Hashcat 形式への変換

Grafana はパスワードを PBKDF2-HMAC-SHA256（10000 反復、44バイト出力）でハッシュ化する。
Hashcat の mode 10900 に渡すためには HEX → base64 変換が必要。

```python
import base64, binascii

# sqlite3 grafana.db "SELECT login,password,salt FROM user;" で取得した値
salt_str = '[SALT]'          # 例: LCBhdtJWjl
hash_hex = '[HEX_HASH]'      # 例: dc6beccc...

salt_b64  = base64.b64encode(salt_str.encode()).decode()
hash_b64  = base64.b64encode(binascii.unhexlify(hash_hex)).decode()

print(f'sha256:10000:{salt_b64}:{hash_b64}')
# → sha256:10000:TENCaGR0SldqbA==:3GvszLtX002vSk45...
```

### クラックコマンド

```bash
hashcat -m 10900 "sha256:10000:[SALT_B64]:[HASH_B64]" \
  /usr/share/wordlists/rockyou.txt --force
```

### 複数ハッシュをファイルで指定

```bash
# hashes.txt に変換済みハッシュを1行ずつ書いておく
hashcat -m 10900 hashes.txt /usr/share/wordlists/rockyou.txt --force
```

### 注意点
- `--force` が必要な場合が多い（GPU 最適化の問題）
- 反復回数（10000）が多いため、GPU でも遅い。辞書を絞るか、ルールを使う
- admin ハッシュが強固でもユーザー（一般）ハッシュがクラックできることがある

---

## 注意点・落とし穴

- `rockyou.txt` が見つからない場合: `/usr/share/wordlists/rockyou.txt` または `gunzip /usr/share/wordlists/rockyou.txt.gz`
- GPU がない環境（VM等）では大幅に速度が低下する。CPU 専用の場合は `--force` が必要な場合がある
- ハッシュが AES 暗号化（etype 17/18）の場合は RC4（etype 23）より解析が困難。取得時に RC4 ダウングレードを試みる

---

## 関連技術
- Kerberoasting ハッシュの取得 → `../04_Post_Access_Windows_AD/Kerberos_Attacks/Kerberoasting.md`
- ASREPRoasting ハッシュの取得 → `../04_Post_Access_Windows_AD/Kerberos_Attacks/ASREPRoasting.md`
- Grafana DB からのハッシュ取得 → `../02_Initial_Access/Credential_Discovery.md`（パターン5）
- Grafana パストラバーサルでの DB 取得 → `../02_Initial_Access/Web_Vulnerabilities/Path_Traversal.md`
- CMS Made Simple SQLi からのハッシュ取得 → `../02_Initial_Access/Web_Vulnerabilities/SQLi.md`（タイムベースブラインドSQLi）
