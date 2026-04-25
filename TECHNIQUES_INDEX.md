# 技術インデックス

全ての技術・手法の横断検索用インデックス。新しい技術を追加したらここにも1行追記する。

**フォーマット:** `技術名 | カテゴリ | ファイルパス`

---

## 調査・列挙

| 技術名 | カテゴリ | ファイルパス |
|--------|---------|------------|
| ポートスキャン（nmap） | Reconnaissance | `01_Reconnaissance/Network_Scanning.md` |
| OS判定（TTL・ポート構成・HTTPヘッダー・SMBバナー・SSH バナー） | Reconnaissance | `00_Playbook/00_OS_Identification.md` |
| robots.txt からの隠しパス発見 | Reconnaissance | `01_Reconnaissance/Web_Enumeration.md` |
| サービスバージョン検出 | Reconnaissance | `01_Reconnaissance/Network_Scanning.md` |
| IPレンジからDockerコンテナを特定（172.17.0.x） | Reconnaissance | `01_Reconnaissance/Network_Scanning.md` |
| コンテナ環境の確認（/.dockerenv / /etc/hosts / ip addr） | Post Access Linux | `03_Post_Access_Linux/Enumeration_Checklist.md` |
| Webディレクトリ列挙（gobuster） | Reconnaissance | `01_Reconnaissance/Web_Enumeration.md` |
| vhostファジング | Reconnaissance | `01_Reconnaissance/Web_Enumeration.md` |
| Webアプリバージョン特定（/api/health 等） | Reconnaissance | `01_Reconnaissance/Web_Enumeration.md` |
| searchsploit による CVE 検索 | Reconnaissance | `05_Tools_Reference/Searchsploit.md` |
| SMB匿名アクセス | Reconnaissance | `01_Reconnaissance/SMB_Enumeration.md` |
| SYSVOL / Replication 内部ナビゲーション観点（GPO構造・フォルダ優先度） | Reconnaissance | `01_Reconnaissance/SMB_Enumeration.md` |
| SYSVOL列挙 | Reconnaissance | `01_Reconnaissance/SMB_Enumeration.md` |
| GPP 認証情報取得（Groups.xml / cpassword / gpp-decrypt） | Reconnaissance → Initial Access | `01_Reconnaissance/SMB_Enumeration.md` |
| LDAP ユーザー列挙 | Reconnaissance | `01_Reconnaissance/LDAP_Enumeration.md` |
| LDAP カスタム属性の確認（info / description） | Reconnaissance | `01_Reconnaissance/LDAP_Enumeration.md` |
| LDAP 経由の Kerberoast / AS-REP Roast 候補抽出（SPN・DONT_REQ_PREAUTH） | Reconnaissance | `01_Reconnaissance/LDAP_Enumeration.md` |
| LDAP 匿名バインド / namingcontexts 確認 | Reconnaissance | `01_Reconnaissance/LDAP_Enumeration.md` |

---

## 初期アクセス

| 技術名 | カテゴリ | ファイルパス |
|--------|---------|------------|
| パストラバーサル（ディレクトリトラバーサル） | Initial Access | `02_Initial_Access/Web_Vulnerabilities/Path_Traversal.md` |
| Grafana パストラバーサル CVE-2021-43798 | Initial Access | `02_Initial_Access/Web_Vulnerabilities/Path_Traversal.md` |
| IDOR（連番ID・オブジェクト直接参照） | Initial Access | `02_Initial_Access/Web_Vulnerabilities/IDOR.md` |
| SQLインジェクション | Initial Access | `02_Initial_Access/Web_Vulnerabilities/SQLi.md` |
| タイムベースブラインドSQLi（時間遅延オラクル） | Initial Access | `02_Initial_Access/Web_Vulnerabilities/SQLi.md` |
| CMS Made Simple SQLi（CVE-2019-9053）| Initial Access | `02_Initial_Access/Web_Vulnerabilities/SQLi.md` |
| MD5+Salt ハッシュのクラック（mode 20） | Initial Access | `05_Tools_Reference/Hashcat.md` |
| SSRF（サーバーサイドリクエストフォージェリ） | Initial Access | `02_Initial_Access/Web_Vulnerabilities/SSRF.md` |
| PCAPからの平文認証情報抽出 | Initial Access | `02_Initial_Access/Credential_Discovery.md` |
| WebアプリDB（SQLite等）からのハッシュ取得 | Initial Access | `02_Initial_Access/Credential_Discovery.md` |
| PBKDF2-HMAC-SHA256 ハッシュのクラック（mode 10900） | Initial Access | `05_Tools_Reference/Hashcat.md` |
| スクリプトへの平文パスワード埋め込み | Initial Access | `02_Initial_Access/Credential_Discovery.md` |
| GPP cpassword の復号（gpp-decrypt） | Initial Access | `02_Initial_Access/Credential_Discovery.md` |
| LDAPカスタム属性への平文パスワード | Initial Access | `02_Initial_Access/Credential_Discovery.md` |
| パスワードの使い回し確認 | Initial Access | `02_Initial_Access/Credential_Discovery.md` |
| strings コマンドによる文字列抽出 | Initial Access | `02_Initial_Access/Binary_Analysis.md` |
| .NET バイナリ逆コンパイル | Initial Access | `02_Initial_Access/Binary_Analysis.md` |
| XOR暗号化パスワードの復号 | Initial Access | `02_Initial_Access/Binary_Analysis.md` |
| FTP匿名ログイン | Initial Access | `02_Initial_Access/Protocol_Exploitation.md` |
| FTP平文通信からの認証情報取得 | Initial Access | `02_Initial_Access/Protocol_Exploitation.md` |
| SSH バージョンユーザー列挙（CVE-2018-15473） | Initial Access | `02_Initial_Access/Protocol_Exploitation.md` |
| SSH 秘密鍵パスフレーズクラック（ssh2john） | Initial Access | `02_Initial_Access/Protocol_Exploitation.md` |
| WinRM (evil-winrm) | Initial Access | `02_Initial_Access/Protocol_Exploitation.md` |
| WinRM Pass-The-Hash | Initial Access | `02_Initial_Access/Protocol_Exploitation.md` |
| RPC / rpcclient ユーザー列挙 | Initial Access | `02_Initial_Access/Protocol_Exploitation.md` |
| impacket-lookupsid による RID bruteforce | Initial Access | `02_Initial_Access/Protocol_Exploitation.md` |

---

## Linux 侵入後

| 技術名 | カテゴリ | ファイルパス |
|--------|---------|------------|
| 侵入後列挙チェックリスト | Post Access Linux | `03_Post_Access_Linux/Enumeration_Checklist.md` |
| id コマンド出力のグループ解析（staff/lxd/docker/disk/shadow 等） | Post Access Linux | `03_Post_Access_Linux/Enumeration_Checklist.md` |
| PAM 設定不備による権限昇格（update-motd.d + PATH ハイジャック） | Post Access Linux | `03_Post_Access_Linux/PAM_Misconfig.md` |
| staff グループ + PATH ハイジャック → root | Post Access Linux | `03_Post_Access_Linux/PAM_Misconfig.md` |
| Linux Capabilities（cap_setuid等）による昇格 | Post Access Linux | `03_Post_Access_Linux/Capabilities.md` |
| SUID バイナリの悪用 | Post Access Linux | `03_Post_Access_Linux/SUID_SGID.md` |
| SGID バイナリの悪用 | Post Access Linux | `03_Post_Access_Linux/SUID_SGID.md` |
| sudo 設定不備による昇格 | Post Access Linux | `03_Post_Access_Linux/Sudo_Misconfig.md` |
| sudo docker exec ワイルドカード NOPASSWD | Post Access Linux | `03_Post_Access_Linux/Sudo_Misconfig.md` |
| Docker コンテナからホストへのブレイクアウト（ブロックデバイスマウント） | Post Access Linux | `03_Post_Access_Linux/Sudo_Misconfig.md` |

---

## Windows AD 侵入後

| 技術名 | カテゴリ | ファイルパス |
|--------|---------|------------|
| AD 侵入後列挙チェックリスト | Post Access AD | `04_Post_Access_Windows_AD/Enumeration_Checklist.md` |
| 特権トークン（SeXxxPrivilege）の確認 | Post Access AD | `04_Post_Access_Windows_AD/Enumeration_Checklist.md` |
| BloodHound による権限チェーン可視化 | Post Access AD | `04_Post_Access_Windows_AD/Enumeration_Checklist.md` |
| GenericAll によるパスワードリセット | Post Access AD | `04_Post_Access_Windows_AD/ACE_Abuse/GenericAll.md` |
| GenericAll による Shadow Credentials | Post Access AD | `04_Post_Access_Windows_AD/ACE_Abuse/GenericAll.md` |
| GenericAll によるグループメンバー追加 | Post Access AD | `04_Post_Access_Windows_AD/ACE_Abuse/GenericAll.md` |
| GenericAll によるRBCD設定 | Post Access AD | `04_Post_Access_Windows_AD/ACE_Abuse/GenericAll.md` |
| GenericWrite による Targeted Kerberoasting | Post Access AD | `04_Post_Access_Windows_AD/ACE_Abuse/GenericWrite.md` |
| GenericWrite による logon script 設定 | Post Access AD | `04_Post_Access_Windows_AD/ACE_Abuse/GenericWrite.md` |
| WriteDACL による GenericAll 付与 | Post Access AD | `04_Post_Access_Windows_AD/ACE_Abuse/WriteDACL.md` |
| WriteDACL による DCSync 権限付与 | Post Access AD | `04_Post_Access_Windows_AD/ACE_Abuse/WriteDACL.md` |
| RBCD（Resource-Based Constrained Delegation） | Post Access AD | `04_Post_Access_Windows_AD/Delegation_Attacks/RBCD.md` |
| Unconstrained Delegation + Printer Bug | Post Access AD | `04_Post_Access_Windows_AD/Delegation_Attacks/Unconstrained.md` |
| Kerberoasting | Post Access AD | `04_Post_Access_Windows_AD/Kerberos_Attacks/Kerberoasting.md` |
| Targeted Kerberoasting（SPN付与→ハッシュ取得） | Post Access AD | `04_Post_Access_Windows_AD/Kerberos_Attacks/Kerberoasting.md` |
| ASREPRoasting | Post Access AD | `04_Post_Access_Windows_AD/Kerberos_Attacks/ASREPRoasting.md` |
| Pass-The-Ticket（PTT） | Post Access AD | `04_Post_Access_Windows_AD/Kerberos_Attacks/Pass_The_Ticket.md` |
| Golden Ticket | Post Access AD | `04_Post_Access_Windows_AD/Kerberos_Attacks/Pass_The_Ticket.md` |
| Silver Ticket | Post Access AD | `04_Post_Access_Windows_AD/Kerberos_Attacks/Pass_The_Ticket.md` |
| DCSync（全NTLMハッシュ取得） | Post Access AD | `04_Post_Access_Windows_AD/Credential_Dumping.md` |
| Pass-The-Hash（PTH） | Post Access AD | `04_Post_Access_Windows_AD/Credential_Dumping.md` |
| SAM / SYSTEM ローカルダンプ | Post Access AD | `04_Post_Access_Windows_AD/Credential_Dumping.md` |

---

## ツールリファレンス

| ツール | ファイルパス |
|--------|------------|
| nmap（-sC 出力の読み方・AD環境向け） | `05_Tools_Reference/Nmap.md` |
| BloodHound / bloodhound-python | `05_Tools_Reference/BloodHound.md` |
| Impacket スイート全般 | `05_Tools_Reference/Impacket_Suite.md` |
| hashcat | `05_Tools_Reference/Hashcat.md` |
| searchsploit | `05_Tools_Reference/Searchsploit.md` |

---

## 原理・背景（セキュリティ）

作業ファイル（01〜05）から参照される動作原理の解説ファイル群。作業中ではなく「なぜその手が効くのか」「環境が違うときどこを見るか」を確認したいときに開く。

| 原理 | 参照元の作業ファイル | ファイルパス |
|------|-----------------|------------|
| OS フィンガープリンティング（TTL 初期値の由来・FS の大文字小文字区別の仕様差） | `00_Playbook/00_OS_Identification.md` | `06_Concepts/OS_Fingerprinting_Principles.md` |
| GPP cpassword の暗号化・復号原理（固定鍵の公開・MS14-025後の挙動） | `01_Reconnaissance/SMB_Enumeration.md` / `02_Initial_Access/Credential_Discovery.md` | `06_Concepts/GPP_Credential.md` |
| PAM の動作原理（session スタック・pam_motd・PATH ハイジャックが成立する条件） | `03_Post_Access_Linux/PAM_Misconfig.md` / `03_Post_Access_Linux/Enumeration_Checklist.md` | `06_Concepts/PAM.md` |
| Docker の分離機構（namespace / cgroup / capability とブロックデバイス可視性） | `03_Post_Access_Linux/Sudo_Misconfig.md`（パターン4） | `06_Concepts/Docker_Isolation.md` |

---

## AI / 機械学習

### 概要・基礎

| 技術名 | カテゴリ | ファイルパス |
|--------|---------|------------|
| AIシステムへの攻撃面・アクセスレベル・攻撃目的の分類 | AI Red Teaming 基礎 | `06_Concepts/AI_ML/AI_Red_Teaming_Concepts.md` |
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
| torch.jit.script によるモデルのシリアライズ（TorchScript 保存） | Deep Learning / PyTorch | `06_Concepts/AI_ML/Deep_Learning/CNN.md` |
| 推論時の model.eval() + torch.no_grad() パターン | Deep Learning / PyTorch | `06_Concepts/AI_ML/Deep_Learning/CNN.md` |
| RNN・LSTM・GRU（系列データ・時系列） | Deep Learning | `06_Concepts/AI_ML/Deep_Learning/RNN.md` |

### 生成AI

| 技術名 | カテゴリ | ファイルパス |
|--------|---------|------------|
| Transformerアーキテクチャ・Self-Attention | Generative AI | `06_Concepts/AI_ML/Generative_AI/LLM.md` |
| LLM（大規模言語モデル）・GPT系・BERT系 | Generative AI | `06_Concepts/AI_ML/Generative_AI/LLM.md` |
| RAG（Retrieval-Augmented Generation） | Generative AI | `06_Concepts/AI_ML/Generative_AI/LLM.md` |
| Fine-tuning・LoRA | Generative AI | `06_Concepts/AI_ML/Generative_AI/LLM.md` |
| プロンプトインジェクション攻撃 | Generative AI / Security | `06_Concepts/AI_ML/Generative_AI/LLM.md` |
| 拡散モデル（Diffusion Models）・Stable Diffusion | Generative AI | `06_Concepts/AI_ML/Generative_AI/Diffusion_Models.md` |
| Latent Diffusion・DDIM・LCM | Generative AI | `06_Concepts/AI_ML/Generative_AI/Diffusion_Models.md` |

### データ変換・前処理

| 技術名 | カテゴリ | ファイルパス |
|--------|---------|------------|
| カテゴリ特徴量エンコーディング（OneHotEncoder・LabelEncoder・HashingEncoder） | AI/ML 前処理 | `06_Concepts/AI_ML/Data_Transformation.md` |
| 歪み補正（log1p 変換・Skewed Data 処理） | AI/ML 前処理 | `06_Concepts/AI_ML/Data_Transformation.md` |
| データ分割（Train/Validation/Test・Data Leakage 防止） | AI/ML 前処理 | `06_Concepts/AI_ML/Data_Transformation.md` |

### データ攻撃・敵対的攻撃

| 技術名 | カテゴリ | ファイルパス |
|--------|---------|------------|
| データ品質属性と攻撃ベクタの対応（ノイズインジェクション・ラベルフリッピング・バイアスインジェクション） | AI Data Attacks | `06_Concepts/AI_ML/Data_Attacks.md` |
| クラス不均衡攻撃（少数クラスの意図的欠落） | AI Data Attacks | `06_Concepts/AI_ML/Data_Attacks.md` |
| 敵対的サンプル攻撃の原理（ノルム制約・決定境界の不安定性） | AI Evasion 基礎 | `06_Concepts/AI_ML/Adversarial_Examples.md` |
| FGSM（Fast Gradient Sign Method）— 一階勾配ベース攻撃 | AI Evasion | `06_Concepts/AI_ML/Adversarial_Examples.md` |
| PGD（Projected Gradient Descent）— 反復型敵対的攻撃 | AI Evasion | `06_Concepts/AI_ML/Adversarial_Examples.md` |
| ホワイトボックス／ブラックボックス脅威モデルの分類 | AI Evasion | `06_Concepts/AI_ML/Adversarial_Examples.md` |
| 転移可能性（Transferability）— ブラックボックス攻撃への応用 | AI Evasion | `06_Concepts/AI_ML/Adversarial_Examples.md` |
| Sparsity Attack — L0ノルム制約による最小変更攻撃 | AI Evasion | `06_Concepts/AI_ML/Adversarial_Examples.md` |

---

*新しい技術を追加した際は、このファイルにも1行追記してください。*
