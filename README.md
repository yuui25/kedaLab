# kedalab — 技術ノウハウ集

## このリポジトリの目的

セキュリティ技術の調査・検証作業を通じて得た「着眼点・手順・判断ロジック」を、特定のターゲットや環境に依存しない汎用的な知識として蓄積するリポジトリです。

特定のシステムや演習環境の情報は一切含みません。純粋に「どこで・何を・なぜ確認するか」という技術的観点のみをまとめています。

---

## AIへの指示（他チャット・他AIが参照する場合）

このリポジトリは以下の方針で運用されています。新たな技術知見を追加する際は、必ずこの方針に従ってください。

### 追加ルール

1. **汎用化して記述する**
   - 特定のマシン名・IPアドレス・ドメイン名・演習環境名は書かない
   - 「〇〇マシンでは」ではなく「このサービスが動いている場合は」という形で記述する

2. **着火条件と手順をセットで書く**
   - 「なぜその技術を試したのか（条件）」と「どう実行するか（手順）」を常にセットで記述する
   - コマンドだけ書いて終わりにしない。「〇〇が確認できた場合に有効」という文脈を必ず添える

3. **失敗した手法も記録する**
   - うまくいかなかった手法とその理由も残す
   - 「試したが条件を満たさず不成立だった」という情報も立派なノウハウ

4. **既存ファイルへの追記を優先する**
   - 新しいファイルを増やすより、既存の適切な .md に追記する
   - 同じカテゴリの手法は1つのファイルに集約する

5. **Playbookを起点にする**
   - 新しい知見を得たら、まず `00_Playbook/` の該当フローに「分岐点」として追記できないか確認する
   - 詳細手順は各セクションの .md に書き、Playbookからリンクで参照する形にする

### ファイルの書き方テンプレート

各 .md ファイルは以下の構造で記述する：

```
## [技術名]

### 着火条件
この技術を試すべき状況・前提条件

### 観点・着眼点
なぜこれに気づくべきか、どこを見るべきか

### 手順
具体的なコマンドや操作手順

### 注意点・落とし穴
失敗しやすいポイント、バージョン依存の挙動など

### 関連技術
次に試すべき手法、組み合わせて使う手法へのリンク
```

---

## フォルダ構成

```
kedalab/
├── README.md                        # このファイル（方針・ルール）
├── TECHNIQUES_INDEX.md              # 全技術の横断インデックス
│
├── 00_Playbook/                     # 判断フロー（何を・どの順で試すか）
│   ├── Linux_Attack_Flow.md
│   └── Windows_AD_Attack_Flow.md
│
├── 01_Reconnaissance/               # サービス・ホスト・Web調査
│   ├── Network_Scanning.md
│   ├── Web_Enumeration.md
│   ├── SMB_Enumeration.md
│   └── LDAP_Enumeration.md
│
├── 02_Initial_Access/               # 最初の足がかりを得る手法
│   ├── Web_Vulnerabilities/
│   │   ├── IDOR.md
│   │   ├── SQLi.md
│   │   └── SSRF.md
│   ├── Credential_Discovery.md      # 平文・暗号化認証情報の発見
│   ├── Binary_Analysis.md           # バイナリ解析・ハードコード認証情報
│   └── Protocol_Exploitation.md     # プロトコル固有の弱点
│
├── 03_Post_Access_Linux/            # Linux侵入後の動き
│   ├── Enumeration_Checklist.md
│   ├── Capabilities.md
│   ├── SUID_SGID.md
│   └── Sudo_Misconfig.md
│
├── 04_Post_Access_Windows_AD/       # Windows AD侵入後の動き（主力）
│   ├── Enumeration_Checklist.md
│   ├── ACE_Abuse/
│   │   ├── GenericAll.md
│   │   ├── GenericWrite.md
│   │   └── WriteDACL.md
│   ├── Delegation_Attacks/
│   │   ├── Unconstrained.md
│   │   └── RBCD.md
│   ├── Kerberos_Attacks/
│   │   ├── Kerberoasting.md
│   │   ├── ASREPRoasting.md
│   │   └── Pass_The_Ticket.md
│   └── Credential_Dumping.md
│
└── 05_Tools_Reference/              # ツール別クイックリファレンス
    ├── Nmap.md
    ├── BloodHound.md
    ├── Impacket_Suite.md
    └── Hashcat.md
```

### 各セクションの役割

**00_Playbook** — 「今何をすべきか」の判断フロー。技術の詳細はここに書かず、各セクションへのリンクを使う。新しい手法を覚えたら、まずここの分岐に追加できないか考える。

**01_Reconnaissance** — 調査フェーズ。ポートスキャン・Web列挙・SMB・LDAPなどサービスごとの確認観点。

**02_Initial_Access** — 最初の侵入手法。Webの脆弱性、認証情報の発見、バイナリ解析など。

**03_Post_Access_Linux** — Linuxシステムへの侵入後。権限昇格を中心に。

**04_Post_Access_Windows_AD** — Windows AD環境への侵入後。ADは手法の種類が多いためサブフォルダで整理。

**05_Tools_Reference** — ツールのよく使うオプションや組み合わせのクイックリファレンス。

---

## 更新フロー

新たな技術知見を得た場合：

1. `TECHNIQUES_INDEX.md` に技術名・カテゴリ・ファイルパスを1行追加
2. 該当する `.md` ファイルに上記テンプレートで追記
3. `00_Playbook/` の判断フローに分岐点として追加できるか確認
4. 関連する他の技術ファイルに「関連技術」としてリンクを追記

---

*このリポジトリは進行中のドキュメントです。不完全な状態のファイルがあっても問題ありません。「書きかけ」のメモでも追記していくことに価値があります。*
