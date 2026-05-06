# BloodHound クイックリファレンス

## 概要

Active Directory の権限関係（ACE）をグラフで可視化するツール。「現在のユーザーから Domain Admin までの最短ルート」を視覚的に把握できる。AD 環境での調査では**最初に必ず実行する**。

---

## データ収集（bloodhound-python）

```bash
# 全データを収集（最も確実）
bloodhound-python \
  -u [USER] \
  -p '[PASSWORD]' \
  -ns [DC_IP] \
  -d [DOMAIN] \
  -c All \
  --zip

# 収集項目を指定する場合
bloodhound-python -u [USER] -p '[PASSWORD]' -ns [DC_IP] -d [DOMAIN] \
  -c Users,Groups,Computers,ACL,Trusts
```

**出力:** JSON ファイル群（または --zip でzip圧縮）が生成される。

---

## BloodHound GUI の使い方

### 起動

```bash
# neo4j を起動
sudo neo4j start

# BloodHound GUI を起動
bloodhound &
```

### データのインポート

GUI で「Upload Data」ボタンから JSON または zip ファイルをインポート。

---

## 調査で最初に確認するクエリ

| クエリ名 | 用途 |
|---------|------|
| **Shortest Paths to Domain Admins** | 現環境から DA への最短ルートを確認 |
| **Find All Domain Admins** | DA メンバーの把握 |
| **Find Principals with DCSync Rights** | DCSync 可能なアカウントを探す |
| **Find All Paths from Domain Users to High Value Targets** | 一般ユーザーからの昇格ルート |
| **Shortest Paths to Unconstrained Delegation Systems** | Unconstrained Delegation が設定されたシステム |

---

## 特定ノードの ACE を確認する手順

1. 検索バーで対象ユーザーまたはグループを検索
2. ノードをクリック → 右パネルで詳細を確認
3. 「Outbound Object Control」→ このユーザーが制御できるオブジェクト
4. 「Inbound Object Control」→ このオブジェクトを制御できるプリンシパル

---

## Custom Cypher クエリ（検索バーに貼り付けて使用）

**現在のユーザーからDAへの全パスを検索：**
```cypher
MATCH p=shortestPath((u:User {name:"[USER@DOMAIN.COM]"})-[*1..]->(g:Group {name:"DOMAIN ADMINS@[DOMAIN.COM]"}))
RETURN p
```

**GenericAll を持つ全プリンシパルを検索：**
```cypher
MATCH p=(n)-[:GenericAll]->(m) RETURN p LIMIT 25
```

**SPN 付きユーザーを検索（Kerberoastable）：**
```cypher
MATCH (u:User) WHERE u.hasspn=true RETURN u.name, u.serviceprincipalnames
```

**事前認証不要ユーザーを検索（ASREPRoastable）：**
```cypher
MATCH (u:User) WHERE u.dontreqpreauth=true RETURN u.name
```

---

## 注意点・落とし穴

- `bloodhound-python` は DC への接続が必要なため、名前解決の設定（`/etc/hosts` や `-ns` オプション）が重要
- 大規模なドメインでは収集に時間がかかるため、`-c DCOnly` で DC 情報のみ先に取得する方法もある
- BloodHound の情報は収集時点のスナップショットのため、ACE の変更後は再収集が必要

---

## 関連技術
- ACE 別の攻撃手法 → `../04_Post_Access_Windows_AD/ACE_Abuse/`
- Kerberoastable アカウント → `../04_Post_Access_Windows_AD/Kerberos_Attacks/Kerberoasting.md`
