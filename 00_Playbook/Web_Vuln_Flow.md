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
nmap -sC -sV -oN nmap_initial.txt [TARGET_IP]   # [Attacker]
```

- 80/443以外のポートが開いていれば必ず確認する（管理ポート・APIポート等）
- 参照 → `../01_Reconnaissance/Network_Scanning.md`

### ディレクトリ列挙

```bash
# gobuster（ペネトレ用Linuxディストリ標準）
gobuster dir -u http://[TARGET] -w /usr/share/wordlists/dirbuster/directory-list-2.3-medium.txt -x php,html,js,txt   # [Attacker]

# wfuzz（ペネトレ用Linuxディストリ標準。レスポンスコードや文字数でフィルタリングしやすい）
wfuzz -c -w /usr/share/wordlists/dirbuster/directory-list-2.3-medium.txt \
  --hc 404 \
  http://[TARGET]/FUZZ   # [Attacker]

# wfuzz でファイル拡張子も含めて列挙する場合
wfuzz -c -w /usr/share/wordlists/dirbuster/directory-list-2.3-medium.txt \
  --hc 404 \
  -z list,php-html-js-txt \
  "http://[TARGET]/FUZZ.FUZ2Z"   # [Attacker]

# wfuzz の主なフィルタオプション
#   --hc [code]   : 指定コードのレスポンスを非表示（--hc 404,403 のようにカンマ区切り）
#   --sc [code]   : 指定コードのレスポンスのみ表示
#   --hl [lines]  : 指定行数のレスポンスを非表示（同じ行数 = 同じエラーページを除外）
#   --hw [words]  : 指定ワード数のレスポンスを非表示
#   -t [threads]  : スレッド数（デフォルト 10）
```

- robots.txt・sitemap.xml も手動確認する
- 参照 → `../01_Reconnaissance/Web_Enumeration.md`

### vhostファジング

```bash
gobuster vhost -u http://[TARGET] -w /usr/share/seclists/Discovery/DNS/subdomains-top1million-5000.txt --append-domain   # [Attacker]
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
| **フォーム入力に `<script>` を入れたら「不正検知」エラーページが返り、エラーページに自分のリクエストヘッダー（User-Agent / Referer / IP）が反射されている** | ヘッダー注入経由の XSS（フィルタが本文にしかかかっていない設計） + 「管理者にレポート送信」文言があれば Blind XSS の発火条件 | `../02_Initial_Access/Web_Vulnerabilities/XSS.md`（ヘッダー注入経路 + Blind XSS シグナル） |
| 問い合わせ・サポート・苦情フォームなど、入力内容がその場では反射されないが「管理者がレビューします」旨の表示がある | Blind XSS（運用者ブラウザでロード時に発火） | `../02_Initial_Access/Web_Vulnerabilities/XSS.md`（Blind XSS） |
| **stolen cookie で管理画面に入れた → そこに新しい入力フォーム（日付・ホスト名・URL等）がある** | 管理者専用APIにコマンドインジェクションがある典型パターン | `../02_Initial_Access/Web_Vulnerabilities/Command_Injection.md` |
| 外部URLを受け付けるパラメータ | SSRF | `../02_Initial_Access/Web_Vulnerabilities/SSRF.md` |
| **URLを入力するフォームがある（PDF生成・プレビュー・スクリーンショット等）** | コマンドインジェクション（バックティック注入）または SSRF。レスポンスヘッダーで言語・ライブラリを確認し searchsploit でCVE検索 | `../02_Initial_Access/Web_Vulnerabilities/Command_Injection.md`（PDFKit セクション） |
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

searchsploit [ソフトウェア名] [バージョン]   # [Attacker]
```

- 参照 → `../05_Tools_Reference/Searchsploit.md`

---

## 関連技術

- 前：`00_OS_Identification.md`（OS・スコープの初期確認）
- 後：`../02_Initial_Access/Web_Vulnerabilities/`（各脆弱性の詳細手順）
