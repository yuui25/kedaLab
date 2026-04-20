# Searchsploit クイックリファレンス

## 概要

`searchsploit` は Exploit-DB のオフラインミラーを検索するコマンドラインツール。インターネット接続なしで既知のエクスプロイト・PoC を検索できる。Kali Linux / Parrot OS に標準搭載。

---

## 着火条件

- サービスのバージョンが特定できた
- そのバージョンに既知の脆弱性があるか確認したい
- エクスプロイトコードをすぐに入手したい

---

## 基本的な使い方

### キーワード検索

```bash
# サービス名とバージョンで検索
searchsploit grafana 8.0

# アプリ名のみで検索（バージョン未特定の場合）
searchsploit wordpress

# OS の脆弱性を検索
searchsploit "ubuntu 18.04"
```

### 検索のコツ

```bash
# バージョン番号は「メジャー.マイナー」で絞り込む（パッチバージョンまで指定すると漏れが出ることがある）
searchsploit grafana 8

# CVE番号で検索
searchsploit CVE-2021-43798

# 複数キーワードをスペース区切りで指定（AND 検索）
searchsploit apache tomcat 9.0

# タイトル検索のみ（デフォルト）
searchsploit -t grafana
```

---

## 出力の読み方

```
---------------------------------------------------------------------
 Exploit Title                     |  Path
---------------------------------------------------------------------
 Grafana 8.x - Path Traversal      | multiple/webapps/50581.py
 Grafana - Stored XSS              | php/webapps/44324.py
---------------------------------------------------------------------
```

| カラム | 説明 |
|-------|------|
| Exploit Title | 脆弱性の概要 |
| Path | ローカルのエクスプロイトファイルパス（`/usr/share/exploitdb/exploits/` 以下） |

---

## エクスプロイトファイルの操作

### ファイルを確認する

```bash
# エクスプロイトの内容を直接表示
searchsploit -x multiple/webapps/50581.py

# ファイルパスを取得（コピーしてから編集したい場合）
searchsploit -p multiple/webapps/50581.py
```

### 現在のディレクトリにコピーする

```bash
searchsploit -m multiple/webapps/50581.py

# ファイルが作業ディレクトリにコピーされる
# ls → 50581.py
```

---

## よく使うオプション一覧

| オプション | 説明 |
|-----------|------|
| `-t` | タイトルのみを検索（デフォルト動作と同じ） |
| `-x [PATH]` | エクスプロイトの内容をターミナルに表示 |
| `-m [PATH]` | 現在のディレクトリにエクスプロイトをコピー |
| `-p [PATH]` | エクスプロイトのフルパスを表示 |
| `--id` | CVE ID や EDB ID を表示 |
| `--nmap [FILE]` | Nmap の XML ファイルを読み込んで脆弱なサービスを自動検索 |
| `--exclude="[KEYWORD]"` | 特定キーワードを含む結果を除外 |
| `-w` | Exploit-DB の Web ページ URL を表示 |
| `-u` | データベースを最新に更新（`sudo` が必要な場合がある） |

---

## Nmap XML との連携（自動スキャン）

```bash
# Nmap の XML 出力ファイルを読み込んで自動検索
searchsploit --nmap nmap_allports.xml

# 発見されたサービスに対する既知エクスプロイトを一括表示
```

---

## 実際の使用例

### Grafana 8.0.0 のパストラバーサル（CVE-2021-43798）を探す

```bash
searchsploit grafana 8.0
# → Grafana 8.x - Plugin Page Path Traversal などが表示される

# エクスプロイトを確認
searchsploit -x multiple/webapps/50581.py

# 作業ディレクトリにコピー
searchsploit -m multiple/webapps/50581.py
```

### OpenSSH の脆弱性を探す

```bash
searchsploit openssh 7.6
# → 該当バージョンに影響するエクスプロイトが表示される
```

### Apache / Nginx のバージョン検索

```bash
searchsploit apache 2.4.49
# → CVE-2021-41773 (Path Traversal / RCE) などが表示される
```

---

## データベースの場所とオフライン利用

```bash
# エクスプロイトDBのローカルパス
ls /usr/share/exploitdb/exploits/

# カテゴリ一覧（windows, linux, multiple, webapps, php 等）
ls /usr/share/exploitdb/exploits/

# データベースを更新
sudo searchsploit -u
```

---

## 注意点・落とし穴

- **バージョンの絞り込みが甘すぎると大量にヒットする。** まずメジャー.マイナーで検索し、絞れない場合は CVE 番号を使う
- **PoC が古い場合がある。** 特にスクリプトの依存ライブラリが古いと動作しないことがある。使用前にコードを読んでパラメータを確認する
- **PoC がそのまま使えないケースが多い。** ターゲットの IP/URL 等のパラメータを書き換えてから使用する
- **searchsploit で見つからなくても諦めない。** GitHub や NVD (https://nvd.nist.gov/) も確認する
- **試したが動作しなかった手法も記録する。** 「searchsploit で 50581.py を試したが対象バージョンに合わず不成立」等

---

## 関連ツール・リソース

- Exploit-DB Web: https://www.exploit-db.com/
- NVD (CVE詳細): https://nvd.nist.gov/vuln/search
- GitHub PoC 検索: `site:github.com CVE-[YEAR]-[NUMBER]`
- Webバージョン確認からCVE特定 → `../01_Reconnaissance/Web_Enumeration.md`
- パストラバーサルの実施 → `../02_Initial_Access/Web_Vulnerabilities/Path_Traversal.md`
