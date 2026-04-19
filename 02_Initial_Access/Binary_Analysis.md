# バイナリ解析・ハードコード認証情報の抽出

## 概要

実行ファイルや DLL にハードコードされた認証情報・接続先・暗号化ロジックを調査する手法。特に .NET バイナリは逆コンパイルが容易で、認証情報が見つかりやすい。

---

## パターン1: strings コマンドによる文字列抽出

### 着火条件
バイナリファイル（.exe, .dll, ELF等）が取得できた場合。まず最初に試す。

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
簡易なXOR暗号はよく使われる。逆コンパイルしたコードから：
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
