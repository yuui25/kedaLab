# Docker の分離機構とコンテナ内からのホストアクセス原理

> **このファイルの位置づけ**
> 作業手順は `../03_Post_Access_Linux/Sudo_Misconfig.md`（パターン4）に書いてある。
> このファイルは「なぜその手順が効くのか」を理解するための背景知識。
> 手順が通用しない場面で詰まったとき、または環境が違うときに参照する。

---

## Docker の分離は「全か無か」ではない

Docker コンテナは「完全に隔離されたVM」ではなく、**Linux のカーネル機能（namespace / cgroup）を使った隔離**である。隔離されているリソースと、されていないリソースが明確に分かれている。

| リソース | 隔離されるか | 仕組み |
|---------|------------|-------|
| プロセス一覧（`ps`） | ○ 隔離される | PID namespace |
| ネットワーク（IP, ポート） | ○ 隔離される | Network namespace |
| ファイルシステムのルート | ○ 隔離される | Mount namespace + overlay fs |
| ホスト名 | ○ 隔離される | UTS namespace |
| ユーザーID | △ 設定次第 | User namespace（デフォルト無効） |
| **ブロックデバイス（`/dev/sda`等）** | **△ 設定次第** | cgroup devices / デバイスホワイトリスト |
| カーネル自体 | ✕ 共有 | コンテナはホストのカーネルを使う |

**重要な結論：ブロックデバイスの可視性は設定で決まる。**
デフォルト設定の非 privileged コンテナでも、Dockerホストの `/dev/` にあるデバイスが `/dev/` 以下に見えることがある。見えた場合、コンテナ内で root 権限があればマウントできる。

---

## Linux のブロックデバイス命名規則

`/dev/sda1` のような名前は慣れていないと意味不明に見えるが、規則は単純。

```
/dev/[種別][ディスク番号][パーティション番号]

例:
  /dev/sda    → 1台目のSATA/SCSIディスク全体
  /dev/sda1   → 1台目のディスクの第1パーティション
  /dev/sda2   → 1台目のディスクの第2パーティション
  /dev/sdb    → 2台目のディスク全体
  /dev/vda    → 仮想ディスク（KVM/QEMU環境）1台目
  /dev/vda1   → 仮想ディスクの第1パーティション
  /dev/nvme0n1   → NVMe SSDの1台目
  /dev/nvme0n1p1 → NVMe SSDの第1パーティション
```

**「ホストのルートパーティション」をどう特定するか：**

コンテナ内で見えているブロックデバイスがどれかを調べ、マウントしてみて `/etc/os-release` や `/root/` があるかを確認する。

```bash
# コンテナ内で実行

# 1. ブロックデバイスの一覧を確認
ls /dev/sd* /dev/vd* /dev/nvme* 2>/dev/null

# 2. パーティションテーブルを確認（root 権限が必要）
fdisk -l 2>/dev/null
# または
lsblk 2>/dev/null

# 3. 現在のマウント状況を確認（コンテナ自身のルートがどこか）
cat /proc/mounts
# コンテナのルートfs が overlay や tmpfs にマウントされていることが確認できる

# 4. ホストのパーティションをマウントして確認
mkdir -p /mnt/test
mount /dev/sda1 /mnt/test 2>/dev/null && ls /mnt/test
# /bin /boot /etc /home /root ... が見えればホストのルートfs
```

**`sda1` が一般的に「ルート」な理由：**
Linux のインストール慣習として、最初のディスク（`sda`）の第1パーティション（`sda1`）がルート `/` にマウントされることが多い。ただし環境によって異なる（`sda2` がスワップで `sda3` がルート、等）ので、必ず確認する。

---

## privileged コンテナと非 privileged コンテナの違い

**通常のコンテナ（non-privileged）：**
- デバイスアクセスは cgroup の devices コントローラで制限される
- デフォルトでは特定のデバイス（tty, null, zero 等）のみアクセス可
- ブロックデバイスへのアクセスは通常ブロックされる

**privileged コンテナ（`--privileged` フラグ付き）：**
- cgroup の devices 制限が解除される
- ホストのほぼ全デバイスにアクセス可能
- `CAP_SYS_ADMIN` を含む全 capability が付与される
- コンテナ内の root = ホストの root と同等に近い

**今回のパターン（sudo docker exec での悪用）が効く理由：**
`docker exec --user root` でコンテナ内の root になった場合、そのコンテナが起動時に持っていた権限（privileged フラグや capability）をそのまま引き継ぐ。
Grafana コンテナがホストのブロックデバイスにアクセスできる状態で起動されていれば、`exec` で入った後も同様にアクセスできる。

---

## capability（ケーパビリティ）との関係

Linux の root 権限は「capability」という単位に分解されている。mount 操作には `CAP_SYS_ADMIN` が必要。

```bash
# コンテナ内で自分の capability を確認
cat /proc/self/status | grep -i cap

# CapEff（有効な capability）を16進数で表示
# 0000003fffffffff → ほぼ全capability（privileged に近い）
# 00000000a80425fb → 標準的な非 privileged コンテナ

# capsh コマンドで人間が読める形式に変換（入っていれば）
capsh --decode=0000003fffffffff
```

`CAP_SYS_ADMIN` が有効であれば mount 操作が可能。ブロックデバイスが見えていて `CAP_SYS_ADMIN` があれば、ホストへのファイルシステムアクセスが成立する。

---

## 環境が変わったときの対応

| 状況 | 確認すること |
|-----|------------|
| `/dev/sda1` が見つからない | `lsblk` でデバイス名を確認。`vda1`、`xvda1`、`nvme0n1p1` 等の可能性 |
| マウントしても空 or エラー | 対象パーティションが間違っている可能性。`fdisk -l` で全パーティションを確認 |
| mount コマンドが permission denied | `CAP_SYS_ADMIN` がない可能性。`cat /proc/self/status | grep CapEff` で確認 |
| `/dev/sd*` が何も見えない | コンテナが devices cgroup で制限されている。privileged でないと突破困難 |

---

## 参考：このパターンが成立した理由の整理

```
① Grafana コンテナが /dev/sda1 にアクセスできる状態で起動されていた
   （Docker ホストの設定不備、または意図的な設定）

② sudo docker exec * の NOPASSWD により、コンテナ内で任意のコマンドを
   root として実行できた

③ コンテナ内の root が CAP_SYS_ADMIN を持っていたため mount が可能だった

④ 3条件が揃ったことで /dev/sda1 → /mnt/host へのマウントが成立
```

条件①と③は環境に依存する。条件②（sudo の設定不備）は攻撃の入り口。

---

## 関連
- 手順 → `../03_Post_Access_Linux/Sudo_Misconfig.md`（パターン4）
- コンテナ内にいるかの確認方法 → `../03_Post_Access_Linux/Enumeration_Checklist.md`
- Docker に関連する CVE・エクスプロイト検索 → `../05_Tools_Reference/Searchsploit.md`
