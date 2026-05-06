# Web脆弱性調査フロー（Webのみスコープ向け）

## このファイルの用途

**シェル取得を目的としない、Webアプリの脆弱性を網羅的に洗い出すスコープ向けのPlaybook。**

SaaS・クラウドWebアプリ・APIのみを対象とした診断案件で使う。
シェル取得を目指す案件は `Linux_Attack_Flow.md` または `Windows_AD_Attack_Flow.md` を参照。

---

## Step 0：スコープの確認

作業開始前に以下を明確にする：

- **対象ドメイン・IPレンジ** — どこまで触ってよいか
- **除外エンドポイント** — 管理画面・決済フロー・本番データに触れる操作の要承認範囲
- **認証情報の有無** — 「認証後の機能」もスコープに含まれるか

---

## Step 1：偵察

### ポートスキャン

```bash
nmap -sC -sV -oN nmap_initial.txt TARGET_IP   # [Kali]
```

- 80/443以外のポートが開いていれば必ず確認する（管理ポート・APIポート等）
- 参照 → `../01_Reconnaissance/Network_Scanning.md`

### ディレクトリ列挙

```bash
gobuster dir -u http://TARGET -w /usr/share/wordlists/dirbuster/directory-list-2.3-medium.txt -x php,html,js,txt   # [Kali]
```

- robots.txt・sitemap.xml も手動確認する
- 参照 → `../01_Reconnaissance/Web_Enumeration.md`

### vhostファジング

```bash
gobuster vhost -u http://TARGET -w /usr/share/seclists/Discovery/DNS/subdomains-top1million-5000.txt --append-domain   # [Kali]
# 注意：--append-domain は gobuster v3.2以降。古いバージョンでは ffuf を使う。
```

- 発見したvhostは `/etc/hosts` に追加してから再調査する
- 参照 → `../01_Reconnaissance/Web_Enumeration.md`

---

## Step 2：機能別の脆弱性確認

発見した機能・要素ごとに以下の表で確認すべき脆弱性を特定する：

| 発見した機能・要素 | 確認すべき脆弱性 | 参照先 |
|-----------------|----------------|--------|
| ログインフォーム | SQLi・デフォルト認証情報 | `../02_Initial_Access/Web_Vulnerabilities/SQLi.md` |
| URLに連番IDがある | IDOR | `../02_Initial_Access/Web_Vulnerabilities/IDOR.md` |
| ファイルダウンロード機能 | パストラバーサル・IDOR | `../02_Initial_Access/Web_Vulnerabilities/Path_Traversal.md` |
| ユーザー入力がページに反映される | XSS（反射型・格納型） | `../02_Initial_Access/Web_Vulnerabilities/XSS.md` |
| 外部URLを受け付けるパラメータ | SSRF | `../02_Initial_Access/Web_Vulnerabilities/SSRF.md` |
| APIが `host`/`ip`/`cmd` 等を受け取る | OSコマンドインジェクション | `../02_Initial_Access/Web_Vulnerabilities/Command_Injection.md` |
| JSソースが難読化されている | JS解析 → 隠しAPIの発見 | `../02_Initial_Access/Web_Vulnerabilities/JS_Obfuscation.md` |
| XMLファイルのアップロード機能がある | XXE（ファイル読み込み・SSRF転用・Blind OOB） | `../02_Initial_Access/Web_Vulnerabilities/XXE.md` |
| XSLTファイルのアップロード・選択機能がある / XML+XSLTを組み合わせた変換機能がある | XSLTインジェクション（フィンガープリント → XXE-via-XSLT / PHP拡張 / Java拡張） | `../02_Initial_Access/Web_Vulnerabilities/XSLT_Injection.md` |
| **上のどれにも当てはまらない機能に当たった** | 機能を観察 → 英語で言語化 → 脆弱性クラスを特定するフロー | `01_Unknown_Tech_Research.md` |

**確認の進め方：**
- Burp Suiteで全リクエストをキャプチャしながら操作する
- パラメータが変わるたびに上の表を参照して「この機能は何を確認すべきか」を意識する
- 1つの機能に複数の脆弱性が重なる場合がある（例：ファイルアップロード → IDOR + パストラバーサル）

---

## Step 3：認証・認可の横断確認

認証・認可の確認は3層で行う。上から順に確認すること。

**1層目：認証なしアクセス（最も重大）**

未ログイン状態で認証後のエンドポイントを直接叩く。

- `/dashboard`・`/admin`・`/api/v1/users` 等を未ログイン状態でアクセスする
- 200 が返る・コンテンツが表示される → Broken Access Control（認証バイパス）
- 401 / 302（ログインページへリダイレクト）→ 認証は機能している。2層目へ進む

**2層目：低権限→高権限**

一般ユーザーでログインし、管理者専用エンドポイントを直接叩く。

1. 低権限アカウント（一般ユーザー）でログインし、高権限エンドポイントのURLを直接叩く
2. APIエンドポイントに対して `is_admin=1` `role=admin` 等のパラメータ改ざんを試す

**3層目：横断アクセス（IDOR）**

別ユーザーのリソースにアクセスできるか確認する。

1. 別ユーザーのオブジェクトID（ファイルID・注文IDなど）に連番を変えてアクセスできるか確認する

- 参照 → `../02_Initial_Access/Web_Vulnerabilities/IDOR.md`

---

## Step 4：バージョン確認 → CVE検索

Webアプリのバージョン情報が判明した場合：

```bash
# バージョン確認方法（例）
# - /api/health / /api/version などのエンドポイント
# - HTTPレスポンスヘッダー（X-Powered-By・Server）
# - ページフッター・About画面

searchsploit [ソフトウェア名] [バージョン]   # [Kali]
```

- 参照 → `../05_Tools_Reference/Searchsploit.md`

---

## 関連技術

- 前：`00_OS_Identification.md`（OS・スコープの初期確認）
- 後：`../02_Initial_Access/Web_Vulnerabilities/`（各脆弱性の詳細手順）
