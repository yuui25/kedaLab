# kedalab — 技術ノウハウ集

**kedalabを初めて使う場合は [`START_HERE.md`](./START_HERE.md) から始める。**

---

## このリポジトリの目的

セキュリティ技術の調査・検証作業を通じて得た「着眼点・手順・判断ロジック」を、特定のターゲットや環境に依存しない汎用的な知識として蓄積するリポジトリです。

特定のシステムや演習環境の情報は一切含みません。純粋に「どこで・何を・なぜ確認するか」という技術的観点のみをまとめています。

---

## 最初に開くファイル

| 状況 | 最初に開くファイル |
|------|-----------------|
| IPのみ渡された（何も情報がない） | `00_Playbook/00_OS_Identification.md` |
| ドメインのみ渡された（IPが不明） | `01_Reconnaissance/DNS_Enumeration.md` で IP 特定 → `00_Playbook/00_OS_Identification.md` へ |
| 低権限ユーザーのID/パスが案件開始時に提供されている | `00_Playbook/00_OS_Identification.md` で OS 判定 → 対応 Playbook の冒頭「案件開始条件の確認」テーブルへ |
| OS・環境が判明している | 対応する Playbook（下の「使い方」を参照） |

**どの状況でも必ず `00_Playbook/` を経由する。** Playbook が「今何をすべきか」と「次はどこを見るか」を繋ぐ唯一のナビゲーションになっている。詳細ファイル（01〜05フォルダ）を Playbook を介さずに直接開いても、前後の文脈が分からなくなる。

---

## 使い方

### 全体像

IPだけ渡された状態からゴール（権限昇格・機密情報取得）までの大きな流れ：

```
[偵察] → [初期アクセス] → [侵入後列挙] → [権限昇格]
   ↓            ↓                ↓               ↓
 01_Recon/  02_Initial_Access/  03〜04_Post/   03〜04_Post/
```

まず `00_Playbook/` のフローを開き、現在のフェーズを確認してから詳細ファイルに進む。

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
| Webシステムが疑われる（IP/ドメインのみ渡された） | `00_Playbook/Web_Vuln_Flow.md` |
| Webアプリを触っている（調査中盤） | `02_Initial_Access/Web_Vulnerabilities/` |
| 見たことのない技術・機能に当たり、脆弱性クラスの名前もわからない | `00_Playbook/01_Unknown_Tech_Research.md` |
| バイナリ・ファイルを取得した | `02_Initial_Access/Binary_Analysis.md` |
| Linuxシェルを取った直後 | `03_Post_Access_Linux/Enumeration_Checklist.md` |
| Windows ADシェルを取った直後 | `04_Post_Access_Windows_AD/Enumeration_Checklist.md` |
| BloodHoundで権限が判明した | `04_Post_Access_Windows_AD/ACE_Abuse/` |
| コマンドのオプションを忘れた | `05_Tools_Reference/` |
| 手順は知っているが「なぜ効くか」がわからない | `06_Concepts/` の該当ファイル |
| 環境が違って手順が通用しない | `06_Concepts/` で原理を確認し、条件を読み解く |
| AI Red Teaming の攻撃手法の前提知識を確認したい | `06_Concepts/AI_ML/` の該当ファイル |
| LLM・プロンプトインジェクションの仕組みを知りたい | `06_Concepts/AI_ML/Generative_AI/LLM.md` |
| LLM アプリへの偵察を始めたい | `07_AI_Red_Teaming/01_Reconnaissance/` |
| プロンプトインジェクション・Jailbreakを試みたい | `07_AI_Red_Teaming/02_LLM_Prompt_Injection/` |
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

③ ファイルを書く際は以下を確認する：
   a. ツール名が出てきたら「どこで使えるか（Kali標準/別途インストール/インターネット要）」を書いたか
   b. コマンドが「Kali側」か「ターゲット側」か明示されているか
   c. 「刺さらなかったとき」セクションに条件不成立の場合の次の手を書いたか
   d. システムに変更を加える操作に原状回復手順を書いたか
   e. 「関連技術」に「前：」と「後：」の両方を書いたか

④ 00_Playbook/ の該当フローに「この状況ではこの手法」という
   分岐点として追加できるか確認する
   ・「刺さらなかった場合の代替分岐」も追加できないか確認する

⑤ 関連する他の .md の「関連技術」の「後：」に今回のファイルへのリンクを追記する
   （双方向リンクの維持）

⑥ 「なぜ効いたか」が自分でうまく説明できない場合は 06_Concepts/ に原理をメモする
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

> **AI（Claude）への指示は [`CLAUDE.md`](./CLAUDE.md) を参照。**

---

## フォルダ構成

個別ファイルの一覧は `TECHNIQUES_INDEX.md` を参照。ここではディレクトリの役割のみ記載する。

```
kedalab/
├── README.md                        # このファイル（方針・ルール）
├── TECHNIQUES_INDEX.md              # 全技術の横断インデックス
│
├── 00_Playbook/                     # 判断フロー（何を・どの順で試すか）
│   └── 00_OS_Identification.md      # ← 調査の起点。OS判定からここを開く
│
├── 01_Reconnaissance/               # サービス・ホスト・Web調査
│
├── 02_Initial_Access/               # 最初の足がかりを得る手法
│   └── Web_Vulnerabilities/         # Web系脆弱性はサブフォルダに集約
│
├── 03_Post_Access_Linux/            # Linux侵入後の動き
│   └── Enumeration_Checklist.md     # ← 侵入直後はここから
│
├── 04_Post_Access_Windows_AD/       # Windows AD侵入後の動き
│   ├── ACE_Abuse/                   # ACE権限濫用（GenericAll等）
│   ├── Delegation_Attacks/          # 委任攻撃（RBCD等）
│   └── Kerberos_Attacks/            # Kerberos攻撃（Kerberoasting等）
│
├── 05_Tools_Reference/              # ツール別クイックリファレンス
│
├── 06_Concepts/                     # 「なぜそうなるか」の原理・背景知識
│   └── AI_ML/                       # AI・機械学習の原理（AI Red Teaming前提知識）
│
└── 07_AI_Red_Teaming/               # AI Red Teaming 攻撃手順（LLM・ML・AIシステム）
    ├── 01_Reconnaissance/           # LLMアプリ偵察・フィンガープリンティング
    ├── 02_LLM_Prompt_Injection/     # プロンプトインジェクション・Jailbreak
    ├── 03_LLM_Output_Attacks/       # LLM出力経由のXSS・SQLi・コードインジェクション
    ├── 04_AI_Data_Attacks/          # データポイズニング・ラベルフリッピング・トロイの木馬
    ├── 05_AI_Application_System/    # MCPの脆弱性・モデルデプロイ改ざん・Rogue Actions
    └── 06_AI_Evasion/               # 敵対的サンプル・First-Order/Sparsity攻撃
```

### 各セクションの役割

**00_Playbook** — 「今何をすべきか」の判断フロー。技術の詳細はここに書かず、各セクションへのリンクを使う。新しい手法を覚えたら、まずここの分岐に追加できないか考える。

**01_Reconnaissance** — 調査フェーズ。ポートスキャン・Web列挙・SMB・LDAPなどサービスごとの確認観点。

**02_Initial_Access** — 最初の侵入手法。Webの脆弱性、認証情報の発見、バイナリ解析など。

**03_Post_Access_Linux** — Linuxシステムへの侵入後。権限昇格を中心に。

**04_Post_Access_Windows_AD** — Windows AD環境への侵入後。ADは手法の種類が多いためサブフォルダで整理。

**05_Tools_Reference** — ツールのよく使うオプションや組み合わせのクイックリファレンス。

**06_Concepts** — 「なぜそうなるか」の原理・背景知識。作業ファイル（01〜05）は「着火条件→手順」に徹し、動作原理はここに分離する。詳細は後述。

**07_AI_Red_Teaming** — AI システムを対象とした攻撃手順。LLM・MLモデル・AIアプリケーションへの攻撃フェーズ別に整理する。背景知識は `06_Concepts/AI_ML/` を参照し、このフォルダは「着火条件→手順」に徹する。ネットワーク・システム系ペネトレスト（01〜05）と対称な構造を持つ。

---

*このリポジトリは進行中のドキュメントです。不完全な状態のファイルがあっても問題ありません。「書きかけ」のメモでも追記していくことに価値があります。*