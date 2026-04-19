# Nmap クイックリファレンス

## 基本スキャンセット（毎回使う）

```bash
# 初期スキャン（サービス検出）
nmap -sC -sV -oA nmap_initial [IP]

# 全ポートスキャン
nmap -p- --min-rate 5000 -oA nmap_allports [IP]

# 特定ポートへの詳細スキャン
nmap -sC -sV -p [PORT1],[PORT2] -oA nmap_targeted [IP]
```

## よく使うオプション

| オプション | 説明 |
|-----------|------|
| `-sC` | デフォルトスクリプトを実行 |
| `-sV` | バージョン検出 |
| `-sU` | UDPスキャン（低速） |
| `-p-` | 全65535ポートをスキャン |
| `--min-rate 5000` | 毎秒最低5000パケット送信（高速化） |
| `-T4` | タイミングテンプレート（高速） |
| `-oA [basename]` | .nmap / .gnmap / .xml の3形式で保存 |
| `-oN [file]` | テキスト形式で保存 |
| `--open` | 開いているポートのみ表示 |
| `-Pn` | ホスト発見をスキップ（ICMPブロックされている場合） |

## 便利なスクリプト

```bash
# SMB の詳細情報
nmap --script smb-enum-shares,smb-enum-users [IP] -p 445

# FTP匿名ログインの確認
nmap --script ftp-anon [IP] -p 21

# HTTP のヘッダー・タイトル確認
nmap --script http-title,http-headers [IP] -p 80,443,8080

# LDAP の基本情報
nmap --script ldap-rootdse [IP] -p 389

# 脆弱性スキャン（重い）
nmap --script vuln [IP]
```

## 出力ファイルの整理

```bash
# .nmap ファイルを確認
cat nmap_initial.nmap

# 開いているポートだけ抽出
grep "open" nmap_allports.nmap | grep -v "Not shown"

# XML から xmllint で整形（インストール済みの場合）
xmllint --format nmap_initial.xml
```

## 注意点

- `--min-rate` を高くしすぎると一部のポートが `filtered` と誤判定されることがある
- AD 環境では `-Pn` が必要な場合がある（ICMP をブロックしている場合）
- 出力ファイルは調査フォルダに必ず保存して後から参照できるようにする
