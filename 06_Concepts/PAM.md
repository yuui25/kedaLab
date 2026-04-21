# PAM（Pluggable Authentication Modules）の動作原理

## このファイルの位置づけ

`03_Post_Access_Linux/PAM_Misconfig.md` の「なぜ SSH ログイン時に root で任意スクリプトが実行されるのか」を説明するファイル。
PAM の仕組みを知らないと、PATH ハイジャックが「なぜそのタイミングで」「なぜ root として」動くのかが説明できない。環境が変わった際に「どこの設定を確認すればよいか」を判断するための原理知識として活用する。

---

## PAM とは何か

Linux の認証・アクセス制御を「モジュールのスタック」として構成するフレームワーク。アプリケーション（SSH デーモン、login、su 等）は PAM API を呼ぶだけでよく、認証ロジックは設定ファイルで差し替えられる。

**PAM を使うアプリケーション:**
- `sshd`（SSH ログイン）
- `login`（コンソールログイン）
- `su`、`sudo`
- `passwd`（パスワード変更）

---

## PAM の4つのモジュールタイプ

| タイプ | 呼ばれるタイミング | 代表的な役割 |
|--------|-----------------|------------|
| `auth` | 認証フェーズ | パスワード確認・MFA |
| `account` | アカウント有効性確認 | ロック・有効期限チェック |
| `password` | パスワード変更時 | 強度チェック・ハッシュ変更 |
| `session` | **ログイン/ログアウト時** | **ホームディレクトリマウント・MOTD 表示** |

権限昇格で重要なのは **`session`** タイプ。ログイン成功後に **root 権限で** 実行されるモジュール群がここに含まれる。

---

## PAM 設定ファイルの場所と構造

```
/etc/pam.d/
├── sshd          # SSH ログイン時の PAM 設定
├── login         # コンソールログイン
├── su            # su コマンド
├── sudo          # sudo コマンド
└── common-session  # session タイプの共通設定（多くのファイルから include される）
```

**設定ファイルの書式：**
```
[モジュールタイプ]  [コントロールフラグ]  [モジュール名]  [オプション]
session             optional             pam_exec.so    /path/to/script
session             required             pam_unix.so
```

**コントロールフラグの意味：**

| フラグ | 説明 |
|--------|------|
| `required` | 失敗してもスタック全体を実行し、最終的に失敗 |
| `requisite` | 失敗した時点でスタック中断 |
| `sufficient` | 成功したらそれ以降をスキップ |
| `optional` | 結果に影響しない（失敗しても続行） |

---

## `pam_exec.so` — 外部スクリプトの実行

`pam_exec.so` は PAM から外部スクリプト・コマンドを実行するモジュール。

```
# /etc/pam.d/sshd の例
session optional pam_exec.so /usr/local/bin/myscript.sh
```

このスクリプトは **sshd が root で動いているため、root 権限で実行される。**

---

## `update-motd.d` と PAM の関係

Debian/Ubuntu 系では MOTD（ログイン時のメッセージ）を動的に生成するために `pam_motd.so` が `/etc/update-motd.d/` のスクリプトを実行する。

```
# /etc/pam.d/sshd または /etc/pam.d/login に含まれる設定
session optional pam_motd.so motd=/run/motd.dynamic
```

`/run/motd.dynamic` の生成には `run-parts /etc/update-motd.d/` が使われる。この `run-parts` が **フルパスなしで呼ばれている場合**、PATH の先頭にある偽物の `run-parts` が root として実行される。

**`/etc/update-motd.d/` の典型的なスクリプト例：**
```bash
#!/bin/sh
# 10-uname
uname -rnsom

# このスクリプトは root で実行される
```

---

## PATH とコマンド解決の仕組み

Linux のシェルやプロセスが外部コマンドを実行する際、`PATH` 環境変数に列挙されたディレクトリを**先頭から順に**検索して最初に見つかったバイナリを実行する。

```
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
```

この順序では `/usr/local/sbin` が `/usr/sbin` より先に検索される。

```
run-parts を探す順序:
/usr/local/sbin/run-parts  ← staff グループが書き込める
/usr/local/bin/run-parts
/usr/sbin/run-parts        ← 本物はここ
/usr/bin/run-parts
/sbin/run-parts
```

`staff` グループが `/usr/local/sbin/` に書き込める場合、ここに同名のファイルを置くと**本物より先に実行される。**

---

## なぜ SSH ログインが「引き金」になるのか

```
[SSH クライアント] ──接続──> [sshd (root で動作)]
                                    ↓ 認証成功
                               PAM session open
                                    ↓
                          pam_motd.so が実行される
                                    ↓
                    run-parts /etc/update-motd.d/ を呼ぶ
                                    ↓
              PATH の先頭 /usr/local/sbin/run-parts を探す
                                    ↓ 見つかった（偽物）
                    偽の run-parts が **root として** 実行される
```

**ポイント：** sshd 自体が root で動いており、PAM の session モジュールも root 権限で実行される。認証はユーザーとして通過しても、session スタックの処理は引き続き root 権限のまま動く。

---

## 環境が変わったときに確認すべき場所

| 確認事項 | コマンド |
|---------|---------|
| SSH の PAM 設定 | `cat /etc/pam.d/sshd` |
| session モジュールの一覧 | `grep "session" /etc/pam.d/sshd /etc/pam.d/common-session` |
| pam_motd の有無 | `grep motd /etc/pam.d/*` |
| update-motd.d の内容 | `ls -la /etc/update-motd.d/ && cat /etc/update-motd.d/*` |
| run-parts の場所 | `which run-parts` |
| PATH の確認 | `echo $PATH` |
| /usr/local 以下の書き込み権限 | `ls -la /usr/local/` |

---

## まとめ：権限昇格が成立する条件

1. **PAM の session スタックが root で外部コマンドを呼ぶ**（`pam_motd.so` → `run-parts` 等）
2. **そのコマンドがフルパスで指定されていない**
3. **PATH の先頭ディレクトリにユーザーが書き込める**（`staff` グループ等）
4. **引き金となるイベントが発生する**（SSH ログイン、su 等）

この4条件のうちどれかが欠ければ成立しない。環境が変わって手が使えない場合は上記のチェックリストで条件を一つずつ確認する。
