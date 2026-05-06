# kedalab — AI への指示

このファイルは Claude（AI）が kedalab に知見を追記する際の指示書です。

---

## タスク

技術的な知識を抽出し、kedalab に追記する。

**書き込み作業を開始する前に必ず `WRITING_GUIDE.md` を Read すること。**
書き方ルール・禁止事項・ファイルテンプレートはすべてそちらに集約している。

**手順：**

1. 追記内容がペネトレスト系か AI/ML系かを判断し、対応するインデックスを確認する
   - ペネトレスト・セキュリティ診断に関する技術 → `TECHNIQUES_INDEX.md`
   - AI/ML・機械学習・AI Red Teaming に関する技術 → `TECHNIQUES_INDEX_AI_ML.md`
   - 判断基準：「ネットワーク・システム系のペネトレ案件中に引く情報か」→ YES なら前者、NO なら後者
2. 記載あり → 該当ファイルに新しい観点・コマンド・注意点を追記
3. 記載なし → 適切なフォルダに新しいエントリを作成し、対応するインデックスにも追記
   - ペネトレスト系の手順 → `01_Reconnaissance/` 〜 `05_Tools_Reference/`
   - AI攻撃の手順（プローブクエリ・ツール・ペイロード） → `07_AI_Red_Teaming/`
   - AI/MLの概念・動作原理・背景知識 → `06_Concepts/AI_ML/`
4. `00_Playbook/` の該当フローに分岐として追加できるか確認する
5. 「なぜそうなるか」の原理が重要な場合は `06_Concepts/` に分離し、作業ファイルには1行リンクのみ追加する
6. 新しい「案件開始シナリオ」（ドメイン渡し・認証情報付き等、これまでなかった提供情報パターン）が発生した場合は
   README.md の「最初に開くファイル」表と「状況から直接フォルダに飛ぶ」表の**両方**に追加されているか確認する

---

## フォルダ構成

```
kedalab/
├── TECHNIQUES_INDEX.md              # ペネトレスト系技術の横断インデックス
├── TECHNIQUES_INDEX_AI_ML.md        # AI/ML系技術の横断インデックス
├── 00_Playbook/                     # 判断フロー
├── 01_Reconnaissance/               # サービス・ホスト・Web調査（ネットワーク系）
├── 02_Initial_Access/               # 最初の侵入手法
├── 03_Post_Access_Linux/            # Linux侵入後
├── 04_Post_Access_Windows_AD/       # Windows AD侵入後
├── 05_Tools_Reference/              # ツール別クイックリファレンス
├── 06_Concepts/                     # 動作原理・背景知識（「なぜそうなるか」専用）
│   └── AI_ML/                       # AI・機械学習の原理（概念・理論のみ）
└── 07_AI_Red_Teaming/               # AI Red Teaming 攻撃手順
    ├── 01_Reconnaissance/           # LLMアプリ偵察・フィンガープリンティング
    ├── 02_LLM_Prompt_Injection/     # プロンプトインジェクション・Jailbreak
    ├── 03_LLM_Output_Attacks/       # LLM出力経由のXSS・SQLi・コードインジェクション
    ├── 04_AI_Data_Attacks/          # データポイズニング・ラベルフリッピング
    ├── 05_AI_Application_System/    # MCPの脆弱性・モデルデプロイ改ざん
    └── 06_AI_Evasion/               # 敵対的サンプル・First-Order/Sparsity攻撃
```

> **AI（Claude）への書き方指示の詳細は [`WRITING_GUIDE.md`](./WRITING_GUIDE.md) を参照。**
