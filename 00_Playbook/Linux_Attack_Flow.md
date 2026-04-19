# Linux 攻略フロー

調査開始から権限昇格までの判断フロー。各ステップの詳細は対応する .md を参照。

---

## フロー概要

```
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
2. gobuster / ffuf でディレクトリ列挙
3. **エンドポイントのIDやパラメータに連番・予測可能な値がないか確認** → IDOR の可能性
4. vhost（仮想ホスト）のファジングを検討

→ 詳細: `../01_Reconnaissance/Web_Enumeration.md`

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
| 高 | Linux Capabilities | `getcap -r / 2>/dev/null` |
| 高 | SUID/SGID バイナリ | `find / -perm -4000 -type f 2>/dev/null` |
| 高 | sudo 権限 | `sudo -l` |
| 中 | 実行中プロセス | `ps aux` |
| 中 | ネットワーク接続 | `ss -tlnp`, `netstat -tlnp` |
| 中 | 環境変数 | `env` |
| 低 | crontab | `crontab -l`, `/etc/cron*` |
| 低 | 書き込み可能なディレクトリ | `find / -writable -type d 2>/dev/null` |

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
