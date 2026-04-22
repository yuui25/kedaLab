# OS判定

スキャン開始前・スキャン中・Web確認時など、複数の段階でOSを特定する手がかりが得られる。
得られた情報を重ね合わせて確度を上げていく。

---

## 判定の優先順位

```
① TTL 値（ping が通る場合 → スキャン前に即確認）
② nmap ポート構成（最も確実・情報量が多い）
③ HTTP レスポンスヘッダー（Web が開いている場合）
④ 大文字小文字の区別（Web が開いている場合）
⑤ SMB の OS 情報（445 が開いている場合）
⑥ SSH バナー（22 が開いている場合）
```

---

## ① TTL 値（スキャン前の最速判定）

### 着火条件
ping が通る環境であれば、nmap より先に実行できる。

### 原理
OS によってデフォルトの IP パケット TTL（Time To Live）初期値が異なる。
ルーターを経由するたびに TTL が 1 ずつ減るため、受信した TTL から経由ホップ数を逆算して初期値を推定する。

```bash
ping -c 1 [IP]
# Windows: TTL=128（ルーター1台経由なら127、2台なら126 ...）
# Linux:   TTL=64 （ルーター1台経由なら63、2台なら62 ...）
```

| 受信 TTL | 推定初期値 | OS推定 |
|---------|-----------|-------|
| 128 ± 数 | 128 | Windows |
| 64 ± 数 | 64 | Linux / macOS |
| 255 ± 数 | 255 | Cisco / 一部の Unix |
| 32 ± 数 | 32 | 古い Windows（95/98） |

### 注意点
- TTL はあくまで**目安**。ルーター・VPN・プロキシを何段経由しているかで大きく変わる
- `traceroute [IP]` でホップ数を数えてから判断すると精度が上がる
- 変更可能なため、意図的に偽装されている場合もある（稀）

---

## ② nmap ポート構成（最も確実）

### 着火条件
常に実施する。ポート構成だけでほぼ OS が確定する。

```bash
nmap -sC -sV [IP]
# または OS 検出を明示的に有効化
sudo nmap -O [IP]
```

### ポートの組み合わせで判断する

| 開いているポート | OS判定 | 備考 |
|----------------|-------|------|
| 22（SSH）のみ | Linux 確定に近い | OpenSSH のバナーに `Debian` / `Ubuntu` 等が含まれる |
| 22 + 80 | Linux 寄り | |
| 135, 139, 445 | Windows | SMB / RPC が動いている |
| 88（Kerberos） | Windows AD 確定 | DC（ドメインコントローラー）がいる |
| 3389（RDP） | Windows | |
| 5985 / 5986（WinRM） | Windows | |
| 389 / 636（LDAP） | Windows AD 寄り | |
| 53（DNS）+ 88 + 389 | Windows AD 確定 | |

### nmap の `Service Info` を確認する

```
Service Info: OS: Linux; CPE: cpe:/o:linux:linux_kernel
Service Info: OS: Windows; CPE: cpe:/o:microsoft:windows
```

スキャン結果の末尾に OS が明記されることが多い。

### `-O` オプション（OS フィンガープリント）

```bash
sudo nmap -O [IP]
# → Running: Microsoft Windows 2019
# → Running: Linux 4.X|5.X
```

TCP/IP スタックの特性からOSを推定する。root 権限が必要。

### 注意点
- ファイアウォールで一部ポートが閉じられている場合は判断が難しい
- 全ポートスキャン（`-p-`）と組み合わせると見落としが減る
  ```bash
  sudo nmap -p- --min-rate 5000 [IP]
  ```

---

## ③ HTTP レスポンスヘッダー

### 着火条件
80 / 443 / 8080 等の Web ポートが開いている場合。

```bash
curl -sI http://[IP]/
curl -sI https://[IP]/ -k
```

### 見るべきヘッダー

| ヘッダー | 値の例 | OS判定 |
|---------|--------|-------|
| `Server` | `Microsoft-IIS/10.0` | Windows |
| `Server` | `Apache/2.4.41 (Ubuntu)` | Linux |
| `Server` | `Apache/2.4.25 (Debian)` | Linux |
| `Server` | `nginx/1.18.0` | Linux 寄り（WindowsのIISでも nginx は動くが稀） |
| `X-Powered-By` | `ASP.NET` | Windows |
| `X-Powered-By` | `PHP/7.4.3` | どちらも可能 |
| `X-AspNet-Version` | 何でも | Windows（ASP.NET）|

```bash
# 例
curl -sI http://[IP]/ | grep -i "server\|x-powered-by\|x-aspnet"
```

### 注意点
- `Server` ヘッダーは無効化・偽装できる（セキュリティ設定済み環境では空になる）
- Apache は Windows でも動く。`(Debian)` 等のディストリ名が含まれていれば Linux 確定

---

## ④ 大文字・小文字の区別（Web が開いている場合）

### 着火条件
Web が動いており、既存のパス（`/index.html` 等）がわかっている場合。

### 原理
- **Linux（ext4 等）**: ファイルシステムが大文字小文字を**区別する**。`/index.html` と `/INDEX.HTML` は別ファイル
- **Windows（NTFS）**: 大文字小文字を**区別しない**。`/index.html` でも `/INDEX.HTML` でも同じファイルが返る

```bash
# 存在するパスを大文字に変えてアクセス
curl -s http://[IP]/INDEX.HTML -o /dev/null -w "%{http_code}\n"
# 200 → Windows（区別しない）
# 404 → Linux（区別する）
```

### 注意点
- アプリ側でリダイレクト処理をしている場合は結果が変わることがある
- 確認できるパスが `/index.html` に限らず、画像ファイルや CSS でも同様に確認できる

---

## ⑤ SMB バナー（445 が開いている場合）

### 着火条件
445 番ポートが開いている場合。Windows である可能性が高いが念のため確認する。

```bash
# smbclient でバナー確認（認証不要）
smbclient -L //[IP] -N 2>&1 | head -20
# → OS=[Windows Server 2019 Standard 17763] ...

# nmap スクリプトで詳細取得
nmap -p 445 --script smb-os-discovery [IP]
# → OS: Windows Server 2019 Standard 17763
# → Computer name: DC01
# → Domain name: example.local
```

### 注意点
- Samba（Linux 上で動く SMB 実装）が動いている場合は Linux でも 445 が開く
- Samba の場合は `OS=[Unix]` や `OS=[Samba x.x.x]` と表示される

---

## ⑥ SSH バナー（22 が開いている場合）

### 着火条件
22 番ポートが開いている場合。

```bash
# バナーを取得
nc -w 3 [IP] 22
# → SSH-2.0-OpenSSH_9.2p1 Debian-2+deb12u1

# または nmap で確認
nmap -p 22 -sV [IP]
# → 22/tcp open ssh OpenSSH 9.2p1 Debian 2+deb12u1
```

### バナーで判断できるディストリ

| バナーの文字列 | ディストリ |
|--------------|----------|
| `Ubuntu-*` | Ubuntu |
| `Debian-*` | Debian |
| `Red Hat-*` | RHEL / CentOS |
| `FreeBSD-*` | FreeBSD（Unix系） |
| バナーなし / カスタム | 設定で変更済みの可能性 |

### 注意点
- OpenSSH は Windows にもインストールできるため、SSH が開いているからといって Linux 確定ではない（ただし稀）
- バナーが変更されている場合もあるが、ディストリ情報まで消すケースは少ない

---

## 判定結果に応じた次のステップ

| 判定 | 参照するPlaybook |
|------|----------------|
| Linux | `Linux_Attack_Flow.md` |
| Windows（88番 Kerberos あり） | `Windows_AD_Attack_Flow.md` |
| Windows（88番なし） | `Windows_AD_Attack_Flow.md`（AD なし環境として読む） |
| 判定できない | 全ポートスキャン（`nmap -p-`）を実施してから再判定 |
