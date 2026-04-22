# kedalab — 技術ノウハウ集

## このリポジトリの目的

セキュリティ技術の調査・検証作業を通じて得た「着眼点・手順・判断ロジック」を、特定のターゲットや環境に依存しない汎用的な知識として蓄積するリポジトリです。

特定のシステムや演習環境の情報は一切含みません。純粋に「どこで・何を・なぜ確認するか」という技術的観点のみをまとめています。

---

## 使い方

### 1. 調査中に参照する

**まず Playbook から入る：**

環境が判明したら、まず `00_Playbook/` の該当フローを開く。
**OSがまだ不明な場合は `00_Playbook/00_OS_Identification.md` から始める。**

| 状況 | 参照するファイル |
|------|----------------|
| OSが不明（最初の一手） | `00_Playbook/00_OS_Identification.md` |
| Linux と判明している | `00_Playbook/Linux_Attack_Flow.md` |
| Windows（ドメインコントローラーあり） | `00_Playbook/Windows_AD_Attack_Flow.md` |

Playbook は「今何を試すべきか」の判断フローになっており、各ステップから詳細ファイルへのリンクが張ってある。詳細が必要になったらリンク先の `.md` を開く、という2段階の使い方が基本。

---

**技術名がわかっている場合は TECHNIQUES_INDEX から引く：**

`TECHNIQUES_INDEX.md` は全手法の索引。技術名・カテゴリ・ファイルパスが1行で確認できる。

例：「RBCDってどこに書いてあったっけ」→ TECHNIQUES_INDEX で `RBCD` を検索 → `04_Post_Access_Windows_AD/Delegation_Attacks/RBCD.md` とわかる。

---

**状況から直接フォルダに飛ぶ：**

| 状況 | 参照先 |
|------|--------|
| スキャン結果を見ている | `01_Reconnaissance/` |
| Webアプリを触っている | `02_Initial_Access/Web_Vulnerabilities/` |
| バイナリ・ファイルを取得した | `02_Initial_Access/Binary_Analysis.md` |
| Linuxシェルを取った直後 | `03_Post_Access_Linux/Enumeration_Checklist.md` |
| Windows ADシェルを取った直後 | `04_Post_Access_Windows_AD/Enumeration_Checklist.md` |
| BloodHoundで権限が判明した | `04_Post_Access_Windows_AD/ACE_Abuse/` |
| コマンドのオプションを忘れた | `05_Tools_Reference/` |
| 手順は知っているが「なぜ効くか」がわからない | `06_Concepts/` の該当ファイル |
| 環境が違って手順が通用しない | `06_Concepts/` で原理を確認し、条件を読み解く |
| AI Red Teaming の攻撃手法の前提知識を確認したい | `06_Concepts/AI_ML/` の該当ファイル |
| LLM・プロンプトインジェクションの仕組みを知りたい | `06_Concepts/AI_ML/Generative_AI/LLM.md` |
| 敵対的サンプル攻撃の原理を知りたい | `06_Concepts/AI_ML/Deep_Learning/Neural_Networks.md` |
| 異常検知システムへの回避の原理を知りたい | `06_Concepts/AI_ML/Unsupervised_Learning/Anomaly_Detection.md` |

---

### 2. 知見を追加するタイミング

**攻略が完了したタイミング（または作業中断時）に追記する。**

以下の順番で進める：

```
① 今回使った・学んだ技術を洗い出す

② TECHNIQUES_INDEX.md を開き、既に記載されているか確認
   ・記載あり → 該当 .md に新しい観点・コマンド・注意点を追記
   ・記載なし → 新しいエントリを追加し、.md に内容を書く

③ 00_Playbook/ の該当フローに「この状況ではこの手法」という
   分岐点として追加できるか確認

④ 関連する他の .md に「関連技術」リンクを追記

⑤ 「なぜ効いたか」が自分でうまく説明できない場合は 06_Concepts/ に原理をメモする
   （作業ファイルには書かず、作業ファイルから1行リンクだけ張る）
```

**「書きかけ」「メモ程度」で構わない。** 後から肉付けできるので、とにかく痕跡を残すことを優先する。

---

### 3. 技術の探し方

| やりたいこと | 方法 |
|------------|------|
| 手法名で探す | `TECHNIQUES_INDEX.md` をキーワード検索 |
| 状況（フェーズ）で探す | 対応するフォルダを直接開く |
| 攻撃の流れ全体を確認 | `00_Playbook/` のフローを読む |
| ツールのコマンドを確認 | `05_Tools_Reference/` の該当ツール |
| 「あの手法」をざっくり思い出す | TECHNIQUES_INDEX の一覧を流し読み |

---

### 4. 各ファイルの読み方

各 `.md` ファイルは以下の構成で書かれている：

- **着火条件** — この技術を試すべき状況。「この出力が見えたら使う」という判断基準。
- **観点・着眼点** — なぜそれに気づくべきか、どこを見るべきかの思考プロセス。
- **手順** — 実際のコマンド・操作。
- **注意点・落とし穴** — 失敗しやすいポイント。失敗した手法の記録もここにある。
- **関連技術** — 次に試すべき手法へのリンク。

**「着火条件」を最初に確認する習慣をつける。** 手順より先に「今の状況がこの条件に合っているか」を確認することで、無駄な試行を減らせる。

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

6. **原理・背景知識は 06_Concepts/ に分離する**
   - 「なぜその手順が効くのか」という動作原理の説明は、作業ファイル（01〜05）には書かない
   - 作業ファイルには `> 原理 → ../06_Concepts/[ファイル名].md` の1行リンクのみ追加する
   - 06_Concepts/ にファイルを作るのは以下の条件を満たす場合のみ：
     - 手順は書けるが、環境が変わると同じ手が使えなくなるリスクがある
     - 「なぜ」を知らないまま進むと、応用が利かない・詰まったときに原因を特定できない
     - Linux の根本機能・プロトコルの仕様・セキュリティ機構の動作原理など、特定の攻略環境に依存しない普遍的な知識

   **06_Concepts/ ファイルの書き方：**
   - 冒頭に「このファイルの位置づけ」として、どの作業ファイルの原理を説明しているかを明記する
   - 「なぜそうなるか」「どういう条件が揃うと効くか」「環境が変わったときどこを確認するか」を中心に書く
   - 作業中に参照するものではないため、多少長くなっても構わない

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
│   ├── 00_OS_Identification.md      # OS判定（TTL・ポート・ヘッダー・バナー）← 最初に参照
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
├── 05_Tools_Reference/              # ツール別クイックリファレンス
│   ├── Nmap.md
│   ├── BloodHound.md
│   ├── Impacket_Suite.md
│   ├── Hashcat.md
│   └── Searchsploit.md
│
└── 06_Concepts/                     # 「なぜそうなるか」の原理・背景知識
    ├── Docker_Isolation.md
    └── AI_ML/                       # AI・機械学習の原理（AI Red Teaming 攻撃技術の前提知識）
        ├── Overview.md              # ML種類・評価指標・過学習
        ├── Supervised_Learning/
        │   ├── Linear_Regression.md    # 線形回帰・ロジスティック回帰
        │   ├── Decision_Trees.md       # 決定木・ランダムフォレスト
        │   ├── Naive_Bayes.md          # ナイーブベイズ（テキスト分類）
        │   └── SVM.md                  # SVM・カーネルトリック（敵対的サンプルの前提）
        ├── Unsupervised_Learning/
        │   ├── KMeans_Clustering.md    # K-Meansクラスタリング
        │   ├── PCA.md                  # 主成分分析（Sparsity Attacks の前提）
        │   └── Anomaly_Detection.md    # 異常検知（AI Evasion の直接的前提）
        ├── Reinforcement_Learning/
        │   ├── RL_Overview.md          # 強化学習の基本概念
        │   ├── Q_Learning.md           # Q-Learning
        │   └── SARSA.md                # SARSA
        ├── Deep_Learning/
        │   ├── Neural_Networks.md      # NN・誤差逆伝播（First-Order Attacks の中核前提）
        │   ├── CNN.md                  # CNN・転移学習（画像系敵対的攻撃の前提）
        │   └── RNN.md                  # RNN・LSTM・GRU
        └── Generative_AI/
            ├── LLM.md                  # Transformer・LLM（プロンプトインジェクションの前提）
            └── Diffusion_Models.md     # 拡散モデル（生成AI悪用の前提）
```

### 各セクションの役割

**00_Playbook** — 「今何をすべきか」の判断フロー。技術の詳細はここに書かず、各セクションへのリンクを使う。新しい手法を覚えたら、まずここの分岐に追加できないか考える。

**01_Reconnaissance** — 調査フェーズ。ポートスキャン・Web列挙・SMB・LDAPなどサービスごとの確認観点。

**02_Initial_Access** — 最初の侵入手法。Webの脆弱性、認証情報の発見、バイナリ解析など。

**03_Post_Access_Linux** — Linuxシステムへの侵入後。権限昇格を中心に。

**04_Post_Access_Windows_AD** — Windows AD環境への侵入後。ADは手法の種類が多いためサブフォルダで整理。

**05_Tools_Reference** — ツールのよく使うオプションや組み合わせのクイックリファレンス。

**06_Concepts** — 「なぜそうなるか」の原理・背景知識。作業ファイル（01〜05）は「着火条件→手順」に徹し、動作原理はここに分離する。詳細は後述。

---

## 更新フロー

新たな技術知見を得た場合：

1. `TECHNIQUES_INDEX.md` に技術名・カテゴリ・ファイルパスを1行追加
2. 該当する `.md` ファイルに上記テンプレートで追記
3. `00_Playbook/` の判断フローに分岐点として追加できるか確認
4. 関連する他の技術ファイルに「関連技術」としてリンクを追記

---

*このリポジトリは進行中のドキュメントです。不完全な状態のファイルがあっても問題ありません。「書きかけ」のメモでも追記していくことに価値があります。*
