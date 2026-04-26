# Linux 攻略フロー

調査開始から権限昇格までの判断フロー。各ステップの詳細は対応する .md を参照。

---

## フロー概要

```
[0. OS判定]
       ↓
[1. ポートスキャン]
       ↓
[2. 各サービスの列挙]
       ↓
[3. 足がかりの特定]
       ↓
[4. 初期アクセス]
       ↓
[5. 侵入後の列挙]
       ↓
[6. 権限昇格]
```

---

## Step 0 — OS判定

→ **`00_OS_Identification.md`** で TTL・ポート構成・HTTP ヘッダー・SMB バナー等の判定方法を確認する。
Linux と確定した上でこのファイルのStep 1以降を進める。

---

## Step 1 — ポートスキャン

まず全ポートをスキャンして開いているサービスを把握する。

→ 詳細: `../01_Reconnaissance/Network_Scanning.md`

**確認ポイント:**
- 21 (FTP), 22 (SSH), 80/443 (HTTP/S) が基本セット
- 非標準ポートに注目（開発環境・管理用途の可能性）
- `nmap -sC -sV` のスクリプトスキャンでバージョン情報を取得

---

## Step 2 — サービス別の列挙

### Webサービス（80/443）が開いている場合
1. ブラウザでトップページを確認 → 使用技術・フレームワーク・エンドポイントの把握
2. **`/robots.txt` を確認する（最初の一手）**
   - `Disallow:` エントリが「隠しパス」の地図になる
   - 管理画面・CMSインストールパスが見つかることがある
   - nmap `-sC` でもスキャン結果に自動表示される
   → 詳細: `../01_Reconnaissance/Web_Enumeration.md`（robots.txt の確認）
3. **Webアプリのバージョンを特定する**
   - ヘッダー・フッター・ログインページ・`/api/health` 等にバージョンが表示されていないか確認
   - 判明したら即 `searchsploit [アプリ名] [バージョン]` で既知脆弱性を検索
   - CVE が見つかった場合、パストラバーサル / RCE 等の深刻な脆弱性が優先
4. gobuster / ffuf でディレクトリ列挙
5. **エンドポイントのIDやパラメータに連番・予測可能な値がないか確認** → IDOR の可能性
6. vhost（仮想ホスト）のファジングを検討
7. **JS ソースに難読化コードがある場合はデコードしてAPIエンドポイントを発見する**
   - `eval(function(p,a,c,k,e,d){...})` が見えたらブラウザ Console で `eval → console.log` に置換
   - APIレスポンスのエンコーディング種別（ROT13 / Base64 等）も確認する
   → `../02_Initial_Access/Web_Vulnerabilities/JS_Obfuscation.md`
8. **APIが `username`, `host`, `ip` 等のパラメータを受け取る場合はコマンドインジェクションを試みる**
   - まず管理者APIへの権限昇格（`is_admin=1` 等のパラメータ改ざん）を確認
   - `; id` で注入テスト → リバースシェルへ
   → `../02_Initial_Access/Web_Vulnerabilities/Command_Injection.md`

→ 詳細: `../01_Reconnaissance/Web_Enumeration.md`
→ CVE 検索: `../05_Tools_Reference/Searchsploit.md`
→ パストラバーサル: `../02_Initial_Access/Web_Vulnerabilities/Path_Traversal.md`

### FTPが開いている場合
- 匿名ログインを試行 (`ftp anonymous@`)
- ファイルがあればダウンロードして内容確認
- **FTPは平文通信** → ネットワークキャプチャファイル（PCAP）があれば認証情報が含まれている可能性

→ 詳細: `../02_Initial_Access/Protocol_Exploitation.md`

---

## Step 3 — 足がかりの特定

以下のいずれかで認証情報または直接アクセスを得る：

| 状況 | 確認先 |
|------|--------|
| Webアプリでファイルダウンロード機能あり | IDOR を疑う → `../02_Initial_Access/Web_Vulnerabilities/IDOR.md` |
| PCAPファイルが取得できた | tshark で平文認証情報を確認 → `../02_Initial_Access/Credential_Discovery.md` |
| ログインフォームがある | デフォルト認証情報 / SQLi を試行 |

---

## Step 4 — 初期アクセス

認証情報が取得できたら、開いているサービスへのログインを試みる。

**パスワードの使い回しを必ず確認する:**
- SSH / FTP / Web管理画面など、同じ認証情報が複数サービスで使えることがある

---

## Step 5 — 侵入後の列挙

シェルを得たら以下を確認する（詳細は `../03_Post_Access_Linux/Enumeration_Checklist.md`）:

| 優先度 | 確認内容 | コマンド |
|--------|----------|---------|
| 高 | 現在のユーザーと権限 | `id`, `whoami` |
| 高 | **`id` のグループを精査する** | `id` 出力の `groups=` を確認 |
| 高 | Linux Capabilities | `getcap -r / 2>/dev/null` |
| 高 | SUID/SGID バイナリ | `find / -perm -4000 -type f 2>/dev/null` |
| 高 | sudo 権限 | `sudo -l` |
| 中 | 実行中プロセス | `ps aux` |
| 中 | ネットワーク接続 | `ss -tlnp`, `netstat -tlnp` |
| 中 | 環境変数 | `env` |
| 低 | crontab | `crontab -l`, `/etc/cron*` |
| 低 | 書き込み可能なディレクトリ | `find / -writable -type d 2>/dev/null` |

**`id` のグループで注目すべき組み合わせ：**

| グループ | 確認すべき手法 |
|---------|-------------|
| `staff` | `/usr/local/sbin` への書き込み + PAM PATH ハイジャック |
| `docker` | コンテナ経由のホストマウント |
| `lxd` | 特権コンテナのホストマウント |
| `disk` | `debugfs` による生デバイスアクセス |
| `shadow` | `/etc/shadow` 直読み → ハッシュクラック |

→ 詳細: `../03_Post_Access_Linux/Enumeration_Checklist.md`（`id` 出力の読み方）

---

## Step 6 — 権限昇格の判断

### Capabilities が設定されている場合（最優先確認）

```bash
getcap -r / 2>/dev/null
```

`cap_setuid` が設定されたバイナリ（python, perl, ruby等）があれば root 昇格の可能性が高い。

→ 詳細: `../03_Post_Access_Linux/Capabilities.md`

### SUID バイナリがある場合

GTFOBins で確認。標準バイナリ（find, vim, python等）に SUID が設定されていれば悪用できる場合がある。

→ 詳細: `../03_Post_Access_Linux/SUID_SGID.md`

### sudo -l で特定コマンドが許可されている場合

→ 詳細: `../03_Post_Access_Linux/Sudo_Misconfig.md`

### `staff` グループに所属している場合（PAM PATH ハイジャック）

**成立条件（Playbook 側で素早く確認する 4 点）：**
1. `id` の出力に `staff` が含まれる
2. `ls -la /usr/local/sbin/` で書き込み権限がある（`staff` が `/usr/local` に書ける慣習）
3. `/etc/update-motd.d/` 配下にスクリプトが存在し、フルパスなしで外部コマンド（`run-parts` 等）を呼んでいる
4. SSH ログインを引き金にできる（自分で再ログイン可能）

→ 詳細手順（スクリプト配置・引き金の引き方・失敗パターン）: `../03_Post_Access_Linux/PAM_Misconfig.md`
→ 原理（なぜ PAM session が root 権限で外部コマンドを呼ぶのか）: `../06_Concepts/PAM.md`

### カーネルバージョンが古い場合

**シグナル → 次アクション：**

| `uname -a` の出力 | 次に確認すること |
|----------------|--------------|
| ビルド日時が2年以上前（例：2022年以前） | `searchsploit linux kernel [バージョン]` で CVE 候補を確認 |
| `/var/mail/<username>` に脆弱性名の言及あり | そのCVEを最優先に調べる |
| `findmnt \| grep overlay` でOverlayFSが使われている | CVE-2023-0386 の適用条件が整っている可能性 |

PoC取得→ターゲットへの転送→コンパイル（gcc / make）→実行の流れが典型。

→ 詳細手順（CVE選択基準・PoC転送・コンパイル・2プロセス並行実行等）: `../03_Post_Access_Linux/Kernel_Exploits.md`

---

### `sudo -l` に `docker exec *` の NOPASSWD がある場合（重要）

**シグナル → 次アクション：**

| `sudo -l` の出力 | 次に確認すること |
|---------------|--------------|
| `NOPASSWD: /snap/bin/docker exec *` / 同等のワイルドカード | コンテナ内 root で任意コマンド実行可能 → ホストブレイクアウトを試す |
| `NOPASSWD: /usr/bin/docker` 無条件 | コンテナ作成から自由にできる。さらに容易 |
| ワイルドカードなし・固定引数 | ホスト側の挙動に踏み込めないので、別経路を探す |

コンテナ内に入った後は「ブロックデバイス（`/dev/sda*` 等）が見えるか」で分岐する。見えればマウントでホスト全体にアクセス可能。

→ 詳細手順（コンテナ内確認・マウント・root.txt の取得）: `../03_Post_Access_Linux/Sudo_Misconfig.md`（パターン4）
→ 原理（コンテナがなぜホストデバイスにアクセスできるのか）: `../06_Concepts/Docker_Isolation.md`
