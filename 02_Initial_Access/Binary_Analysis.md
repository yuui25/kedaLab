# バイナリ解析・ハードコード認証情報の抽出

## 概要

実行ファイルや DLL にハードコードされた認証情報・接続先・暗号化ロジックを調査する手法。特に .NET バイナリは逆コンパイルが容易で、認証情報が見つかりやすい。

---

## パターン1: strings コマンドによる文字列抽出

### 着火条件
バイナリファイル（.exe, .dll, ELF等）が取得できた場合。まず最初に試す。

### 観点・着眼点

**何が出たら次に何をするか：**

| 観測される出力 | 示唆 | 次のアクション |
|------------|-----|------------|
| `ldap://...` / `smb://...` 等の URL | 接続先サーバーの特定 | その接続先に対してアクセス経路を検討 |
| `password=`, `pwd:`, `apikey=` のような代入形式 | ハードコード認証情報 | そのまま認証情報として試す |
| Base64 っぽい長い文字列（末尾 `=`） | 暗号化 / エンコード済みデータ | `base64 -d` で復号 → バイナリか・文字列か判定 |
| `mscoree.dll` / `.NETFramework` / `mscorlib` | .NET バイナリ確定 | パターン2（逆コンパイル）に進む |
| `UPX!` / `packed` / 高エントロピー | パックされている | `upx -d` で解凍 → 再度 strings |
| ASCII は出ないが UTF-16LE では出る | Windows バイナリ典型 | `strings -e l` で再試行 |
| XOR キーらしき短い文字列 + Base64 データ | 簡易暗号化の痕跡 | パターン3（XOR 復号）に進む |

**なぜ strings を最初にやるのか：** 逆コンパイル・デバッガ不要で数秒で終わる。ハードコード認証情報の 7 割はこの段階で見つかる。

### 手順

```bash
# ASCII文字列の抽出
strings [binary_file] | grep -i "pass\|user\|key\|secret\|token\|ldap\|http"

# Unicode（UTF-16LE）文字列の抽出（Windowsバイナリに有効）
strings -e l [binary_file] | grep -i "pass\|user\|key"

# Python で UTF-16LE を確実に抽出
python3 -c "
with open('[binary_file]', 'rb') as f:
    data = f.read()
import re
utf16_strings = re.findall(b'(?:[\x20-\x7e]\x00){4,}', data)
for s in utf16_strings:
    decoded = s.decode('utf-16-le', errors='ignore')
    if any(kw in decoded.lower() for kw in ['pass', 'user', 'ldap', 'key', 'secret']):
        print(repr(decoded))
"
```

---

## パターン2: .NET バイナリの逆コンパイル

### 着火条件
`.exe` が .NET アプリケーションの場合（`strings` で `mscoree.dll` や `.NETFramework` が見える）。

### 観点・着眼点
- .NET バイナリは IL（中間言語）にコンパイルされており、**ほぼ完全にソースコードを復元できる**
- 暗号化された認証情報でも、**暗号化ロジック自体がコード内にある**ため復号できる
- 接続先URL（LDAP, SMB, HTTP）、ユーザー名、暗号化されたパスワードを探す

### 手順

**Linux環境での逆コンパイル（ilspycmd）：**
```bash
# ilspycmd のインストール
dotnet tool install ilspycmd -g

# 逆コンパイル
ilspycmd [binary.exe] -o ./decompiled/

# 出力されたC#コードを確認
grep -r "password\|ldap\|encrypt\|decrypt\|xor" ./decompiled/ -i
```

**Windows環境での逆コンパイル（dnSpy / ILSpy）：**
GUI ツールで `.exe` を開き、クラス一覧から認証関連のクラスを探す。

---

## パターン3: XOR暗号化されたパスワードの復号

### 着火条件
バイナリ中に Base64 エンコードされた文字列と、短いキー文字列が見つかった場合。

### 観点・着眼点

**何が出たら次に何をするか：**

| 観測される出力 | 示唆 | 次のアクション |
|------------|-----|------------|
| 逆コンパイルコードに `Convert.FromBase64String` + `^` 演算子 | Base64 → XOR の典型構造 | 下の復号スクリプトにパラメータを差し替えて実行 |
| XOR キーがソースコードに平文で書かれている | 復号に必要な情報が揃った | そのまま復号して平文パスワード取得 |
| XOR キーが別関数で動的生成（`Environment.MachineName` 等） | 実行環境依存 | 実機と同じ値を与えるか、デバッガで実行時キーを取得 |
| キーらしき文字列が複数候補 | どれが XOR キーか不明 | 全候補で総当たり → 印字可能文字列になるものを採用 |
| 復号結果が一部だけ印字可能（先頭が崩れる） | 追加の magic byte が入っている | magic byte を 0x00〜0xFF で総当たり |
| 復号結果にヌルバイトが混ざる | UTF-16LE の可能性 | `.decode('utf-16-le')` で再解釈 |

**なぜ簡易 XOR が残り続けるか：** 開発者が「難読化すれば十分」と判断しているケースが多い。コード内にキーがあるので数学的には必ず解ける。

**簡易 XOR を特定する手順：**
1. 暗号化されたデータ（Base64文字列）
2. XORキー（短い文字列）
3. 追加のXORマジックバイト（`0xdf` など定数）

の3つを特定して復号する。

### 手順

**典型的なXOR復号パターン：**
```python
import base64

enc_password = '[BASE64_ENCODED_STRING]'
key = '[XOR_KEY]'
magic_byte = 0xdf  # バイナリから特定した定数（ない場合もある）

decoded = base64.b64decode(enc_password)
key_bytes = key.encode('ascii')
result = []
for i, b in enumerate(decoded):
    decrypted = b ^ key_bytes[i % len(key_bytes)] ^ magic_byte
    result.append(decrypted)

print('復号結果:', bytes(result).decode('utf-8'))
```

**magic_byte がわからない場合：**
```python
# 0x00 〜 0xff を総当たり
for magic in range(256):
    try:
        result = bytes([b ^ key_bytes[i % len(key_bytes)] ^ magic for i, b in enumerate(decoded)])
        decoded_str = result.decode('utf-8')
        if decoded_str.isprintable():
            print(f'magic=0x{magic:02x}: {decoded_str}')
    except:
        pass
```

---

## 注意点・落とし穴

- `strings` だけでは UTF-16LE エンコードの文字列を見逃すことが多い（Windowsバイナリは UTF-16LE を多用）
- `.NET` バイナリかどうかは `file` コマンドや PE ヘッダーの確認（`strings` 結果に `.NETFramework` が含まれるか）で判断
- 暗号化ロジックが複数層になっている場合もある（Base64 → XOR → Base64 など）

---

## 関連技術
- 復号した認証情報 → `../Credential_Discovery.md`（使い回し確認）
- LDAP接続先が判明した → `../../01_Reconnaissance/LDAP_Enumeration.md`
