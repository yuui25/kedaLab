# Web列挙

## ディレクトリ・エンドポイントの列挙

### 着火条件
80 / 443 / 8080 等のWebポートが開いている場合。

### 観点・着眼点

ブラウザで確認した後、以下を意識する：
- URLの構造に連番や予測可能なIDが含まれていないか（→ IDORの可能性）
- どのフレームワーク・言語を使っているか（エラーページ・ヘッダーから）
- ファイルのダウンロード機能があるか
- 管理者パネルへのリンクが存在しないか

### 手順

**ディレクトリ列挙（gobuster）**
```bash
gobuster dir -u http://[IP] -w /usr/share/wordlists/dirbuster/directory-list-2.3-medium.txt \
  -o gobuster_root.txt
```

**拡張子を指定したファイル探索**
```bash
gobuster dir -u http://[IP] -w [WORDLIST] -x php,txt,html,bak -o gobuster_ext.txt
```

**vhost（仮想ホスト）のファジング**
```bash
gobuster vhost -u http://[DOMAIN] -w /usr/share/seclists/Discovery/DNS/subdomains-top1million-5000.txt \
  --append-domain -o vhost_fuzz.txt
```
→ 発見したvhostは `/etc/hosts` に追加して再調査する

### エンドポイントの連番・IDを確認する（IDOR）

URLが `/data/3` や `/download/5` のような形式の場合：
- ID を `0` や `1` から順に変えてアクセスを試みる
- 認可チェックなしで他ユーザーのデータが取得できる可能性がある

→ 詳細: `../02_Initial_Access/Web_Vulnerabilities/IDOR.md`

### 注意点・落とし穴

- gobuster は `--timeout` と `-t`（スレッド数）の調整でスキャンが安定する
- レスポンスサイズが同じものが大量にある場合はフィルタリングが必要（`--exclude-length`）
- vhost のファジングでは必ずベースドメインを `/etc/hosts` に登録してから実施する
- HTTPS の場合は `-k` オプションで証明書チェックをスキップ

### 関連技術
- 連番IDを発見 → `../02_Initial_Access/Web_Vulnerabilities/IDOR.md`
- ログインフォームを発見 → `../02_Initial_Access/Web_Vulnerabilities/SQLi.md`
