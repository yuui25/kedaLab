## 難読化JavaScript解析

### 着火条件
- Webアプリのページソースに `eval(function(p,a,c,k,e,d){...})` 等の難読化JSが含まれる
- `/js/*.min.js` にAPIエンドポイントや隠し機能のヒントが埋め込まれている可能性がある
- 招待コード・隠しAPIパス・認証フローがJS内にハードコードされていることがある

### 観点・着眼点

難読化JSはソースを読めなくするためのものだが、**ブラウザ上で動作するため必ずデコード可能**。
`eval()` の引数を `console.log()` に置き換えるだけで内容が見える。

**確認すべきシグナル：**

| パターン | 難読化形式 | 対処 |
|---------|----------|------|
| `eval(function(p,a,c,k,e,d){...})` | Dean Edward's Packer | evalをconsole.logに置換 or de4js |
| `atob('...')` 内の長い文字列 | Base64埋め込みコード | `atob(...)` をConsoleで実行 |
| 意味不明な変数名（`_0x1a2b` 等） | 変数名難読化 | beautifier.io + 目視 |

**デコード後に確認すべきこと：**
- APIエンドポイントのURLパス
- HTTPメソッド（GET / POST / PUT 等）とパラメータ名
- エンコーディング種別（Base64 / ROT13 等）
- 別のAPIを呼び出す関数の存在

### 手順

#### 方法1: ブラウザのDevTools（最も手早い）

1. F12 でDevToolsを開く
2. **Sources** タブ → 対象のJSファイルを選択
3. 左下の **`{}`（Pretty Print）** ボタンをクリック → コードが整形される
4. 関数名・URLを目視で確認する

#### 方法2: ブラウザConsoleで eval を console.log に置き換える

```javascript
// 元の難読化コード（例）
eval(function(p,a,c,k,e,d){...}('...', 24, 24, '...'.split('|'), 0, {}))

// Console で eval を console.log に置き換えて実行
console.log(function(p,a,c,k,e,d){...}('...', 24, 24, '...'.split('|'), 0, {}))
// → デコードされたJSがConsoleに出力される
```

#### 方法3: オンラインツール

- [de4js](https://de4js.kshift.me/) — Dean Edward's Packer 専用、そのまま貼り付けるだけ
- [beautifier.io](https://beautifier.io/) — 汎用コード整形

#### APIレスポンスのエンコーディング確認

JSを解析してAPIエンドポイントを特定したあと、そのAPIのレスポンスがさらにエンコードされている場合がある。

```
レスポンス例:
{
    "data": "Va beqre gb trarengr gur vaivgr pbqr...",
    "enctype": "ROT13"
}
```

**`enctype` / `encryptionType` / `encoding` フィールドを必ず確認する：**

| enctype値 | デコード方法 |
|----------|-----------|
| `ROT13` | `echo "..." \| tr 'A-Za-z' 'N-ZA-Mn-za-m'` |
| `BASE64` | `echo "..." \| base64 -d` |
| `BASE32` | `echo "..." \| base32 -d` |

```bash
# ROT13（Linuxコマンド）
echo "Va beqre gb trarengr..." | tr 'A-Za-z' 'N-ZA-Mn-za-m'

# ROT13（Python）
python3 -c "import codecs; print(codecs.decode('Va beqre...', 'rot_13'))"

# Base64
echo "NkZQQjAtTFc4SkYtR0VZMlAtTzE5WEQ=" | base64 -d
```

### 注意点・落とし穴
- `eval` を `console.log` に置き換えるだけで読める場合がほとんどだが、多段階難読化の場合は段階ごとにデコードが必要
- デコードされたJSに新たなAPIエンドポイント（`/api/v1/...`）が含まれる場合、そのエンドポイントを直接叩くのが次の手
- レスポンスの `enctype` が `ROT13` の場合、デコードするとさらに「次のAPIエンドポイントに POST せよ」という指示が出ることがある。指示に従って POST リクエストを送る
- ブラウザのConsoleはページのドメインに紐付いているため、難読化JSをConsoleに直接貼り付けて実行しても安全に動作する（外部サイトへのリクエストはCORSで制限される）

### 関連技術
- 発見したAPIエンドポイントへのコマンドインジェクション → `Command_Injection.md`
- Webディレクトリ・エンドポイント列挙 → `../../01_Reconnaissance/Web_Enumeration.md`
