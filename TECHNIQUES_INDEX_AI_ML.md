# 技術インデックス — AI / 機械学習

AI・機械学習・AI Red Teaming に関する技術・概念ノートの横断検索用インデックス。

**フォーマット:** `技術名 | カテゴリ | ファイルパス`

---

## AI / 機械学習

### 概要・基礎

| 技術名 | カテゴリ | ファイルパス |
|--------|---------|------------|
| AIシステムへの攻撃面・アクセスレベル・攻撃目的の分類 | AI Red Teaming 基礎 | `06_Concepts/AI_ML/AI_Red_Teaming_Concepts.md` |
| セキュリティ評価手法の選択（脆弱性評価・ペネトレーションテスト・レッドチームの違い） | AI Red Teaming 基礎 | `06_Concepts/AI_ML/AI_Red_Teaming_Concepts.md` |
| MLシステムにレッドチームが適している条件（時間・相互作用点・スコープ定義の困難さ） | AI Red Teaming 基礎 | `06_Concepts/AI_ML/AI_Red_Teaming_Concepts.md` |
| 生成AIの4コンポーネント分類（Model/Data/Application/System）と各コンポーネント固有 TTPs | AI Red Teaming 基礎 | `06_Concepts/AI_ML/AI_Red_Teaming_Concepts.md` |
| オープンソースモデルのローカルホスト戦術（レート制限回避・疑惑なし大量テスト） | AI Red Teaming 戦術 | `06_Concepts/AI_ML/AI_Red_Teaming_Concepts.md` |
| 継続学習システムのデータパイプラインの高価値ターゲット性（ポイズニング経路・機密集積） | AI Red Teaming 戦術 | `06_Concepts/AI_ML/AI_Red_Teaming_Concepts.md` |
| モデルコンポーネントのブラックボックスプロービング TTP（入出力ペア収集→特性分析→攻撃設計） | AI Red Teaming 戦術 | `06_Concepts/AI_ML/AI_Red_Teaming_Concepts.md` |
| Model Extraction — 入力空間スパン戦略・Adaptive Querying・代替モデルの用途拡充 | AI Model Attacks | `06_Concepts/AI_ML/AI_Red_Teaming_Concepts.md` |
| Model Extraction — 非API経路での直接取得（不安全ストレージ・平文転送） | AI Model Attacks | `06_Concepts/AI_ML/AI_Red_Teaming_Concepts.md` |
| Google SAIF — 4エリア構造（Data/Infrastructure/Model/Application）によるパイプライン分解 | AI Security Framework | `06_Concepts/AI_ML/SAIF.md` |
| SAIF リスクの3点分析（リスク導入点・露出点・緩和点の区別） | AI Security Framework | `06_Concepts/AI_ML/SAIF.md` |
| SAIF モデル作成者 vs モデル利用者の責任分担 | AI Security Framework | `06_Concepts/AI_ML/SAIF.md` |
| Unauthorized Training Data — 無許可データ訓練による法的・倫理的リスク | AI Security Framework | `06_Concepts/AI_ML/SAIF.md` |
| Excessive Data Handling — 規制範囲を超えたデータ収集・保持 | AI Security Framework | `06_Concepts/AI_ML/SAIF.md` |
| Model Source Tampering — モデルソースコード・重みの直接改ざん | AI Model Attacks | `06_Concepts/AI_ML/SAIF.md` |
| Model Deployment Tampering — デプロイインフラ・CI/CDパイプラインへの改ざん | AI Model Attacks | `06_Concepts/AI_ML/SAIF.md` |
| Inferred Sensitive Data — 直接アクセス不要の統計的推論による機密情報漏洩 | AI Inference Attacks | `06_Concepts/AI_ML/SAIF.md` |
| 機械学習の種類と選択基準（教師あり・なし・強化学習） | AI/ML 基礎 | `06_Concepts/AI_ML/Overview.md` |
| 過学習・未学習・バイアス-バリアンストレードオフ | AI/ML 基礎 | `06_Concepts/AI_ML/Overview.md` |
| 評価指標（Accuracy・Precision・Recall・F1・ROC-AUC） | AI/ML 基礎 | `06_Concepts/AI_ML/Overview.md` |
| 補足指標（Specificity・AUC・Matthews Correlation Coefficient） | AI/ML 基礎 | `06_Concepts/AI_ML/Overview.md` |
| セキュリティ文脈での指標選択（脅威検知→Recall・誤検知削減→Precision） | AI/ML 基礎 | `06_Concepts/AI_ML/Overview.md` |
| データ漏洩（Data Leakage）の防止 | AI/ML 基礎 | `06_Concepts/AI_ML/Overview.md` |
| classification_report の読み方（precision/recall/f1/support の意味） | AI/ML 基礎 | `06_Concepts/AI_ML/Overview.md` |
| weighted avg vs macro avg の乖離によるクラス不均衡検出 | AI/ML 基礎 | `06_Concepts/AI_ML/Overview.md` |
| support が小さいクラスの指標は不安定（統計的信頼性の判断） | AI/ML 基礎 | `06_Concepts/AI_ML/Overview.md` |

### 教師あり学習

| 技術名 | カテゴリ | ファイルパス |
|--------|---------|------------|
| 線形回帰（Linear Regression）+ Ridge/Lasso | Supervised Learning | `06_Concepts/AI_ML/Supervised_Learning/Linear_Regression.md` |
| ロジスティック回帰（Logistic Regression） | Supervised Learning | `06_Concepts/AI_ML/Supervised_Learning/Linear_Regression.md` |
| 決定木（Decision Trees）・ランダムフォレスト | Supervised Learning | `06_Concepts/AI_ML/Supervised_Learning/Decision_Trees.md` |
| ランダムフォレスト構築3要素（Bootstrapping・特徴量サブセット・Voting） | Supervised Learning | `06_Concepts/AI_ML/Supervised_Learning/Decision_Trees.md` |
| RandomForestClassifier（feature_importances_・侵入検知への応用） | Supervised Learning / Security | `06_Concepts/AI_ML/Supervised_Learning/Decision_Trees.md` |
| Naive Bayes（テキスト分類・スパムフィルタリング） | Supervised Learning | `06_Concepts/AI_ML/Supervised_Learning/Naive_Bayes.md` |
| NLP テキスト前処理パイプライン（小文字化・トークン化・ストップワード除去・ステミング） | Supervised Learning | `06_Concepts/AI_ML/Supervised_Learning/Naive_Bayes.md` |
| Bag-of-Words モデル（CountVectorizer・語彙構築・unigram/bigram） | Supervised Learning / NLP | `06_Concepts/AI_ML/Supervised_Learning/Feature_Extraction.md` |
| CountVectorizer パラメータ（min_df・max_df・ngram_range） | Supervised Learning / NLP | `06_Concepts/AI_ML/Supervised_Learning/Feature_Extraction.md` |
| テキスト→数値ベクトル変換の3ステージ（Tokenization・語彙構築・Vectorization） | Supervised Learning / NLP | `06_Concepts/AI_ML/Supervised_Learning/Feature_Extraction.md` |
| sklearn Pipeline（前処理＋分類器の一本化） | Supervised Learning | `06_Concepts/AI_ML/Supervised_Learning/Model_Training_Pipeline.md` |
| GridSearchCV（ハイパーパラメータチューニング・クロスバリデーション） | Supervised Learning | `06_Concepts/AI_ML/Supervised_Learning/Model_Training_Pipeline.md` |
| MultinomialNB alpha スムージング係数のチューニング | Supervised Learning | `06_Concepts/AI_ML/Supervised_Learning/Model_Training_Pipeline.md` |
| joblib によるモデルの保存と読み込み（シリアライズ） | Supervised Learning | `06_Concepts/AI_ML/Supervised_Learning/Model_Training_Pipeline.md` |
| 推論時の一貫した前処理（transform のみ・fit 禁止） | Supervised Learning | `06_Concepts/AI_ML/Supervised_Learning/Model_Training_Pipeline.md` |
| SVM（サポートベクターマシン）・カーネルトリック | Supervised Learning | `06_Concepts/AI_ML/Supervised_Learning/SVM.md` |

### 教師なし学習

| 技術名 | カテゴリ | ファイルパス |
|--------|---------|------------|
| K-Meansクラスタリング・エルボー法 | Unsupervised Learning | `06_Concepts/AI_ML/Unsupervised_Learning/KMeans_Clustering.md` |
| PCA（主成分分析・次元削減・可視化） | Unsupervised Learning | `06_Concepts/AI_ML/Unsupervised_Learning/PCA.md` |
| 異常検知（Isolation Forest・One-Class SVM・Autoencoder） | Unsupervised Learning | `06_Concepts/AI_ML/Unsupervised_Learning/Anomaly_Detection.md` |
| 異常検知のセキュリティ応用（ネットワーク侵入検知・ログ解析） | Unsupervised Learning | `06_Concepts/AI_ML/Unsupervised_Learning/Anomaly_Detection.md` |
| Random Forestによる教師あり侵入検知（正常ラベルあり・多クラス分類） | Unsupervised Learning / Security | `06_Concepts/AI_ML/Unsupervised_Learning/Anomaly_Detection.md` |
| NSL-KDDデータセット特徴量構造（ネットワーク侵入検知ベンチマーク） | Security / Dataset | `06_Concepts/AI_ML/Unsupervised_Learning/Anomaly_Detection.md` |
| 多クラス攻撃カテゴリマッピング（DoS/Probe/Privilege/Access・map_attack関数） | Security / Dataset | `06_Concepts/AI_ML/Unsupervised_Learning/Anomaly_Detection.md` |
| Validation → Test 2段階評価ワークフロー（汎化性能の最終確認） | Supervised Learning / Security | `06_Concepts/AI_ML/Unsupervised_Learning/Anomaly_Detection.md` |
| Confusion Matrix 可視化（seaborn heatmap・多クラス誤分類パターン読み方） | AI/ML 評価 | `06_Concepts/AI_ML/Unsupervised_Learning/Anomaly_Detection.md` |
| pd.get_dummies（pandas one-hot encoding・OneHotEncoderとの使い分け） | AI/ML 前処理 | `06_Concepts/AI_ML/Data_Transformation.md` |
| encoded.join による特徴量行列の構築（カテゴリ+数値の結合） | AI/ML 前処理 | `06_Concepts/AI_ML/Data_Transformation.md` |

### 強化学習

| 技術名 | カテゴリ | ファイルパス |
|--------|---------|------------|
| 強化学習の基本概念（エージェント・状態・報酬・方策） | Reinforcement Learning | `06_Concepts/AI_ML/Reinforcement_Learning/RL_Overview.md` |
| Q-Learning（オフポリシー・Bellman方程式） | Reinforcement Learning | `06_Concepts/AI_ML/Reinforcement_Learning/Q_Learning.md` |
| SARSA（オンポリシー・安全性重視） | Reinforcement Learning | `06_Concepts/AI_ML/Reinforcement_Learning/SARSA.md` |

### 深層学習

| 技術名 | カテゴリ | ファイルパス |
|--------|---------|------------|
| パーセプトロン・ニューロン・活性化関数 | Deep Learning | `06_Concepts/AI_ML/Deep_Learning/Neural_Networks.md` |
| ニューラルネットワーク（誤差逆伝播・勾配降下法・Adam） | Deep Learning | `06_Concepts/AI_ML/Deep_Learning/Neural_Networks.md` |
| ドロップアウト・バッチ正規化 | Deep Learning | `06_Concepts/AI_ML/Deep_Learning/Neural_Networks.md` |
| オートエンコーダ（次元削減・異常検知） | Deep Learning | `06_Concepts/AI_ML/Deep_Learning/Neural_Networks.md` |
| CNN（畳み込みニューラルネットワーク・画像処理） | Deep Learning | `06_Concepts/AI_ML/Deep_Learning/CNN.md` |
| 転移学習（ResNet・VGG・Fine-tuning） | Deep Learning | `06_Concepts/AI_ML/Deep_Learning/CNN.md` |
| バイトプロット（Byteplot）によるマルウェア静的分類 | Deep Learning / Security | `06_Concepts/AI_ML/Deep_Learning/CNN.md` |
| マルウェアファミリーの概念（行動・配送・技術的特徴による分類軸） | Security / Malware | `06_Concepts/AI_ML/Deep_Learning/CNN.md` |
| マルウェア分類手法の選択基準（静的解析・動的解析・画像ベースMLの使い分け） | Security / Malware | `06_Concepts/AI_ML/Deep_Learning/CNN.md` |
| 画像ベースマルウェア分類の安全性（バイナリ不使用・感染リスクなし） | Security / Malware | `06_Concepts/AI_ML/Deep_Learning/CNN.md` |
| Malimg データセット構造（25クラス・9339枚・1ピクセル=1バイト・ロスレスエンコーディング） | Security / Dataset | `06_Concepts/AI_ML/Deep_Learning/CNN.md` |
| Malimg データセット取得（Kaggle API wget + unzip） | Security / Dataset | `06_Concepts/AI_ML/Deep_Learning/CNN.md` |
| クラス不均衡の可視化と対策（EDA → seaborn 水平バープロット → macro avg 乖離確認 → クラス重み付き損失） | AI/ML 前処理 | `06_Concepts/AI_ML/Deep_Learning/CNN.md` |
| split-folders による画像データセット分割（80/20・valフォルダ空パターン） | AI/ML 前処理 | `06_Concepts/AI_ML/Deep_Learning/CNN.md` |
| torchvision ImageFolder + DataLoader パイプライン（フォルダ名→ラベル自動認識） | Deep Learning / PyTorch | `06_Concepts/AI_ML/Deep_Learning/CNN.md` |
| tensor.permute(1,2,0)による PyTorch 画像テンソル可視化（CHW→HWC 変換） | Deep Learning / PyTorch | `06_Concepts/AI_ML/Deep_Learning/CNN.md` |
| load_datasets() 関数化パターン（前処理・DataLoader・n_classes を一元管理） | Deep Learning / PyTorch | `06_Concepts/AI_ML/Deep_Learning/CNN.md` |
| データ分割後のファイル数確認（find \| wc -l による split 比率の検証） | AI/ML 前処理 | `06_Concepts/AI_ML/Deep_Learning/CNN.md` |
| ResNet50 全層 freeze + 最終 FC 層差し替えによる転移学習 | Deep Learning / Security | `06_Concepts/AI_ML/Deep_Learning/CNN.md` |
| ResNet アーキテクチャ選択基準（18/50/101 の速度-精度トレードオフ） | Deep Learning | `06_Concepts/AI_ML/Deep_Learning/CNN.md` |
| fc.in_features 動的読み取りパターン（ResNet variants 間の互換性確保） | Deep Learning / PyTorch | `06_Concepts/AI_ML/Deep_Learning/CNN.md` |
| PyTorch 訓練ループ（CrossEntropyLoss・Adam・zero_grad→backward→step） | Deep Learning / PyTorch | `06_Concepts/AI_ML/Deep_Learning/CNN.md` |
| model.train() と model.eval() の切り替え（Dropout・BN の訓練/推論モード） | Deep Learning / PyTorch | `06_Concepts/AI_ML/Deep_Learning/CNN.md` |
| エポックごとのメトリクス記録パターン（history dict で訓練曲線を後から描く） | Deep Learning / PyTorch | `06_Concepts/AI_ML/Deep_Learning/CNN.md` |
| predict() を evaluate から分離する設計パターン | Deep Learning / PyTorch | `06_Concepts/AI_ML/Deep_Learning/CNN.md` |
| 訓練曲線の読み方（収束・横ばい・過学習・勾配消失の診断） | Deep Learning / 評価 | `06_Concepts/AI_ML/Deep_Learning/CNN.md` |
| torch.jit.script によるモデルのシリアライズ（TorchScript 保存） | Deep Learning / PyTorch | `06_Concepts/AI_ML/Deep_Learning/CNN.md` |
| 推論時の model.eval() + torch.no_grad() パターン | Deep Learning / PyTorch | `06_Concepts/AI_ML/Deep_Learning/CNN.md` |
| ハイパーパラメータ集約パターン（スクリプト冒頭の定数化で実験管理） | Deep Learning / PyTorch | `06_Concepts/AI_ML/Deep_Learning/CNN.md` |
| RNN・LSTM・GRU（系列データ・時系列） | Deep Learning | `06_Concepts/AI_ML/Deep_Learning/RNN.md` |

### 生成AI

| 技術名 | カテゴリ | ファイルパス |
|--------|---------|------------|
| LLM アプリ偵察フェーズの5カテゴリ（モデル識別・アーキテクチャ・入力処理・出力制約・セーフガード） | LLM Reconnaissance | `07_AI_Red_Teaming/01_Reconnaissance/LLM_Reconnaissance.md` |
| 直接型プロンプトインジェクション — 古典手法（Ignore all previous instructions）と耐性確認 | LLM Prompt Injection | `07_AI_Red_Teaming/02_LLM_Prompt_Injection/Direct_Prompt_Injection.md` |
| システムプロンプト漏洩 戦略1: ルール書き換え＋権威主張（The last rule is / I am an admin user） | LLM Prompt Injection | `07_AI_Red_Teaming/02_LLM_Prompt_Injection/Direct_Prompt_Injection.md` |
| システムプロンプト漏洩 戦略2: コンテキスト切り替え（詩・物語・劇への誘導） | LLM Prompt Injection | `07_AI_Red_Teaming/02_LLM_Prompt_Injection/Direct_Prompt_Injection.md` |
| システムプロンプト漏洩 戦略3: 翻訳（指示→翻訳対象への文脈シフト） | LLM Prompt Injection | `07_AI_Red_Teaming/02_LLM_Prompt_Injection/Direct_Prompt_Injection.md` |
| システムプロンプト漏洩 戦略4: スペルチェック（指示→校正対象への文脈シフト） | LLM Prompt Injection | `07_AI_Red_Teaming/02_LLM_Prompt_Injection/Direct_Prompt_Injection.md` |
| システムプロンプト漏洩 戦略5: 要約・繰り返し（TL;DR / Summarize / 構文的手がかり） | LLM Prompt Injection | `07_AI_Red_Teaming/02_LLM_Prompt_Injection/Direct_Prompt_Injection.md` |
| システムプロンプト漏洩 戦略6: エンコーディング（Base64 / ROT13 — 信頼性低）| LLM Prompt Injection | `07_AI_Red_Teaming/02_LLM_Prompt_Injection/Direct_Prompt_Injection.md` |
| システムプロンプト漏洩 戦略7: 間接的抽出（部分情報の積み重ねによるフィルタ迂回） | LLM Prompt Injection | `07_AI_Red_Teaming/02_LLM_Prompt_Injection/Direct_Prompt_Injection.md` |
| LLM ビジネスロジック操作（価格・条件のルール書き換えによる不正利益獲得） | LLM Prompt Injection | `07_AI_Red_Teaming/02_LLM_Prompt_Injection/Direct_Prompt_Injection.md` |
| LLM フィンガープリンティング（LLMmap — 8クエリの応答分析でモデル種別を推定） | LLM Reconnaissance | `07_AI_Red_Teaming/01_Reconnaissance/LLM_Reconnaissance.md` |
| LLM プローブクエリによるアーキテクチャ特定（RAG / Function Calling / プラグイン有無） | LLM Reconnaissance | `07_AI_Red_Teaming/01_Reconnaissance/LLM_Reconnaissance.md` |
| LLM ガードレール強度・目的外クエリ反応の確認手法 | LLM Reconnaissance | `07_AI_Red_Teaming/01_Reconnaissance/LLM_Reconnaissance.md` |
| Transformerアーキテクチャ・Self-Attention | Generative AI | `06_Concepts/AI_ML/Generative_AI/LLM.md` |
| LLM（大規模言語モデル）・GPT系・BERT系 | Generative AI | `06_Concepts/AI_ML/Generative_AI/LLM.md` |
| RAG（Retrieval-Augmented Generation） | Generative AI | `06_Concepts/AI_ML/Generative_AI/LLM.md` |
| Fine-tuning・LoRA | Generative AI | `06_Concepts/AI_ML/Generative_AI/LLM.md` |
| プロンプトインジェクション攻撃（直接型・間接型） | Generative AI / Security | `06_Concepts/AI_ML/Generative_AI/LLM_Attacks.md` |
| プロンプトインジェクションの構造的根拠（システム/ユーザープロンプト単一テキスト結合・LLMに境界識別能力なし） | LLM Security | `06_Concepts/AI_ML/Generative_AI/LLM_Attacks.md` |
| マルチターン会話コンテキストを利用した段階的プロンプト操作 | LLM Security | `06_Concepts/AI_ML/Generative_AI/LLM_Attacks.md` |
| マルチモーダルプロンプトインジェクション（画像・音声・動画経由のテキストフィルター回避） | LLM Security | `06_Concepts/AI_ML/Generative_AI/LLM_Attacks.md` |
| Jailbreak — LLM ガードレール迂回（耐性による難易度変化・多層防御との連鎖） | LLM Security | `06_Concepts/AI_ML/Generative_AI/LLM_Attacks.md` |
| LLM OWASP Top 10 分類フレームワーク（LLM01〜LLM10・着火条件・連鎖パターン） | LLM Security | `06_Concepts/AI_ML/Generative_AI/LLM_Attacks.md` |
| Sensitive Information Disclosure — Fine-tuning 済みモデルの学習データ漏洩 | LLM Security | `06_Concepts/AI_ML/Generative_AI/LLM_Attacks.md` |
| Improper Output Handling — LLM出力経由の XSS・SQLi・Command Injection | LLM Security | `06_Concepts/AI_ML/Generative_AI/LLM_Attacks.md` |
| Excessive Agency — LLMへの最小権限原則適用・ホワイトリスト設計 | LLM Security | `06_Concepts/AI_ML/Generative_AI/LLM_Attacks.md` |
| System Prompt Leakage — LLM攻撃の第一ステップとしてのシステムプロンプト漏洩 | LLM Security | `06_Concepts/AI_ML/Generative_AI/LLM_Attacks.md` |
| Vector and Embedding Weaknesses — RAG埋め込みのポイズニング・不正取得 | LLM Security / RAG | `06_Concepts/AI_ML/Generative_AI/LLM_Attacks.md` |
| Misinformation / Hallucination — LLM生成コードの脆弱性・Overreliance | LLM Security | `06_Concepts/AI_ML/Generative_AI/LLM_Attacks.md` |
| Unbounded Consumption — LLM DoS・コスト攻撃・サロゲートモデル学習への連鎖 | LLM Security | `06_Concepts/AI_ML/Generative_AI/LLM_Attacks.md` |
| 拡散モデル（Diffusion Models）・Stable Diffusion | Generative AI | `06_Concepts/AI_ML/Generative_AI/Diffusion_Models.md` |
| Latent Diffusion・DDIM・LCM | Generative AI | `06_Concepts/AI_ML/Generative_AI/Diffusion_Models.md` |

### データ変換・前処理

| 技術名 | カテゴリ | ファイルパス |
|--------|---------|------------|
| カテゴリ特徴量エンコーディング（OneHotEncoder・LabelEncoder・HashingEncoder） | AI/ML 前処理 | `06_Concepts/AI_ML/Data_Transformation.md` |
| 歪み補正（log1p 変換・Skewed Data 処理） | AI/ML 前処理 | `06_Concepts/AI_ML/Data_Transformation.md` |
| データ分割（Train/Validation/Test・Data Leakage 防止） | AI/ML 前処理 | `06_Concepts/AI_ML/Data_Transformation.md` |

### システムコンポーネント攻撃

| 技術名 | カテゴリ | ファイルパス |
|--------|---------|------------|
| インセキュアな ML モデルデプロイ（認証・暗号化・入力バリデーション欠如）の攻撃面 | AI System Attacks | `06_Concepts/AI_ML/System_Attacks.md` |
| ML 固有のリソース枯渇 DoS（複雑入力による推論処理圧迫）| AI System Attacks | `06_Concepts/AI_ML/System_Attacks.md` |
| オートスケーリングコスト増大攻撃（少数の高コスト入力でクラウド課金を急増させる） | AI System Attacks | `06_Concepts/AI_ML/System_Attacks.md` |
| DoS を隠れ蓑にした複合攻撃（セキュリティチームを DoS に集中させ別コンポーネントを侵害） | AI System Attacks | `06_Concepts/AI_ML/System_Attacks.md` |
| ML インフラ設定不備（推論 API ポート露出・ML 管理 UI 認証なし・デフォルト認証情報） | AI System Attacks | `06_Concepts/AI_ML/System_Attacks.md` |

---

### データ攻撃・敵対的攻撃

| 技術名 | カテゴリ | ファイルパス |
|--------|---------|------------|
| ML OWASP Top 10 分類フレームワーク（ML01〜ML10 の攻撃段階・着火条件・参照先） | AI Red Teaming 基礎 | `06_Concepts/AI_ML/AI_Red_Teaming_Concepts.md` |
| データ品質属性と攻撃ベクタの対応（ノイズインジェクション・ラベルフリッピング・バイアスインジェクション） | AI Data Attacks | `06_Concepts/AI_ML/Data_Attacks.md` |
| クラス不均衡攻撃（少数クラスの意図的欠落） | AI Data Attacks | `06_Concepts/AI_ML/Data_Attacks.md` |
| Model Skewing — 攻撃者目的に沿ったバイアス誘導型データ汚染 | AI Data Attacks | `06_Concepts/AI_ML/Data_Attacks.md` |
| 標的特化型ポイズニング（特定入力の予測変更・全体精度への影響最小・重複排除対応） | AI Data Attacks | `06_Concepts/AI_ML/Data_Attacks.md` |
| Federated Learning 攻撃（勾配汚染・バックドア注入・分散学習への毒入れ） | AI Data Attacks | `06_Concepts/AI_ML/Data_Attacks.md` |
| 学習データ盗取（Training Data Theft）— クラウド設定不備・暗号化不足・データパイプライン・脆弱API 経由 | AI Data Attacks | `06_Concepts/AI_ML/Data_Attacks.md` |
| インサイダー脅威（Insider Threat）— 正規アクセスを利用したデータ漏洩・悪意ある内部者・侵害された内部者 | AI Data Attacks | `06_Concepts/AI_ML/Data_Attacks.md` |
| データサプライチェーン攻撃（ベンダー侵害による学習データの事前取得） | AI Supply Chain | `06_Concepts/AI_ML/Data_Attacks.md` |
| モデル逆転攻撃（Model Inversion Attack）— 出力からの入力再構成 | AI Inference Attacks | `06_Concepts/AI_ML/AI_Red_Teaming_Concepts.md` |
| AI サプライチェーン攻撃（データソース・ライブラリ・事前学習済みモデルの悪用） | AI Supply Chain | `06_Concepts/AI_ML/AI_Red_Teaming_Concepts.md` |
| 転移学習攻撃（Transfer Learning Attack）— 事前学習済みモデルへのバックドア埋め込み | AI Supply Chain | `06_Concepts/AI_ML/AI_Red_Teaming_Concepts.md` |
| 出力完全性攻撃（Output Integrity Attack）— ML出力の中間者改ざん | AI Integrity Attacks | `06_Concepts/AI_ML/AI_Red_Teaming_Concepts.md` |
| モデルポイズニング（Model Poisoning）— パラメータ直接操作とデータポイズニングとの区別 | AI Model Attacks | `06_Concepts/AI_ML/AI_Red_Teaming_Concepts.md` |
| テキスト分類器への入力操作（Rephrasing・Overpowering・HTML コメント隠蔽） | AI Evasion / NLP | `06_Concepts/AI_ML/Adversarial_Examples.md` |
| プロービング（語・フレーズ単位の分類シグナル強度測定） | AI Evasion / NLP | `06_Concepts/AI_ML/Adversarial_Examples.md` |
| 敵対的サンプル攻撃の原理（ノルム制約・決定境界の不安定性） | AI Evasion 基礎 | `06_Concepts/AI_ML/Adversarial_Examples.md` |
| FGSM（Fast Gradient Sign Method）— 一階勾配ベース攻撃 | AI Evasion | `06_Concepts/AI_ML/Adversarial_Examples.md` |
| PGD（Projected Gradient Descent）— 反復型敵対的攻撃 | AI Evasion | `06_Concepts/AI_ML/Adversarial_Examples.md` |
| ホワイトボックス／ブラックボックス脅威モデルの分類 | AI Evasion | `06_Concepts/AI_ML/Adversarial_Examples.md` |
| 転移可能性（Transferability）— ブラックボックス攻撃への応用 | AI Evasion | `06_Concepts/AI_ML/Adversarial_Examples.md` |
| Sparsity Attack — L0ノルム制約による最小変更攻撃 | AI Evasion | `06_Concepts/AI_ML/Adversarial_Examples.md` |

---

*新しい技術を追加した際は、このファイルにも1行追記してください。*
