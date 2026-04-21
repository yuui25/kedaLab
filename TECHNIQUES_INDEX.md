# 技術インデックス

全ての技術・手法の横断検索用インデックス。新しい技術を追加したらここにも1行追記する。

**フォーマット:** `技術名 | カテゴリ | ファイルパス`

---

## 調査・列挙

| 技術名 | カテゴリ | ファイルパス |
|--------|---------|------------|
| ポートスキャン（nmap） | Reconnaissance | `01_Reconnaissance/Network_Scanning.md` |
| サービスバージョン検出 | Reconnaissance | `01_Reconnaissance/Network_Scanning.md` |
| IPレンジからDockerコンテナを特定（172.17.0.x） | Reconnaissance | `01_Reconnaissance/Network_Scanning.md` |
| コンテナ環境の確認（/.dockerenv / /etc/hosts / ip addr） | Post Access Linux | `03_Post_Access_Linux/Enumeration_Checklist.md` |
| Webディレクトリ列挙（gobuster） | Reconnaissance | `01_Reconnaissance/Web_Enumeration.md` |
| vhostファジング | Reconnaissance | `01_Reconnaissance/Web_Enumeration.md` |
| Webアプリバージョン特定（/api/health 等） | Reconnaissance | `01_Reconnaissance/Web_Enumeration.md` |
| searchsploit による CVE 検索 | Reconnaissance | `05_Tools_Reference/Searchsploit.md` |
| SMB匿名アクセス | Reconnaissance | `01_Reconnaissance/SMB_Enumeration.md` |
| SYSVOL列挙 | Reconnaissance | `01_Reconnaissance/SMB_Enumeration.md` |
| LDAP ユーザー列挙 | Reconnaissance | `01_Reconnaissance/LDAP_Enumeration.md` |
| LDAP カスタム属性の確認（info / description） | Reconnaissance | `01_Reconnaissance/LDAP_Enumeration.md` |

---

## 初期アクセス

| 技術名 | カテゴリ | ファイルパス |
|--------|---------|------------|
| パストラバーサル（ディレクトリトラバーサル） | Initial Access | `02_Initial_Access/Web_Vulnerabilities/Path_Traversal.md` |
| Grafana パストラバーサル CVE-2021-43798 | Initial Access | `02_Initial_Access/Web_Vulnerabilities/Path_Traversal.md` |
| IDOR（連番ID・オブジェクト直接参照） | Initial Access | `02_Initial_Access/Web_Vulnerabilities/IDOR.md` |
| SQLインジェクション | Initial Access | `02_Initial_Access/Web_Vulnerabilities/SQLi.md` |
| SSRF（サーバーサイドリクエストフォージェリ） | Initial Access | `02_Initial_Access/Web_Vulnerabilities/SSRF.md` |
| PCAPからの平文認証情報抽出 | Initial Access | `02_Initial_Access/Credential_Discovery.md` |
| WebアプリDB（SQLite等）からのハッシュ取得 | Initial Access | `02_Initial_Access/Credential_Discovery.md` |
| PBKDF2-HMAC-SHA256 ハッシュのクラック（mode 10900） | Initial Access | `05_Tools_Reference/Hashcat.md` |
| スクリプトへの平文パスワード埋め込み | Initial Access | `02_Initial_Access/Credential_Discovery.md` |
| LDAPカスタム属性への平文パスワード | Initial Access | `02_Initial_Access/Credential_Discovery.md` |
| パスワードの使い回し確認 | Initial Access | `02_Initial_Access/Credential_Discovery.md` |
| strings コマンドによる文字列抽出 | Initial Access | `02_Initial_Access/Binary_Analysis.md` |
| .NET バイナリ逆コンパイル | Initial Access | `02_Initial_Access/Binary_Analysis.md` |
| XOR暗号化パスワードの復号 | Initial Access | `02_Initial_Access/Binary_Analysis.md` |
| FTP匿名ログイン | Initial Access | `02_Initial_Access/Protocol_Exploitation.md` |
| FTP平文通信からの認証情報取得 | Initial Access | `02_Initial_Access/Protocol_Exploitation.md` |
| WinRM (evil-winrm) | Initial Access | `02_Initial_Access/Protocol_Exploitation.md` |
| RPC / rpcclient ユーザー列挙 | Initial Access | `02_Initial_Access/Protocol_Exploitation.md` |

---

## Linux 侵入後

| 技術名 | カテゴリ | ファイルパス |
|--------|---------|------------|
| 侵入後列挙チェックリスト | Post Access Linux | `03_Post_Access_Linux/Enumeration_Checklist.md` |
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
| nmap | `05_Tools_Reference/Nmap.md` |
| BloodHound / bloodhound-python | `05_Tools_Reference/BloodHound.md` |
| Impacket スイート全般 | `05_Tools_Reference/Impacket_Suite.md` |
| hashcat | `05_Tools_Reference/Hashcat.md` |
| searchsploit | `05_Tools_Reference/Searchsploit.md` |

---

---

## AI / 機械学習

### 概要・基礎

| 技術名 | カテゴリ | ファイルパス |
|--------|---------|------------|
| 機械学習の種類と選択基準（教師あり・なし・強化学習） | AI/ML 基礎 | `06_Concepts/AI_ML/Overview.md` |
| 過学習・未学習・バイアス-バリアンストレードオフ | AI/ML 基礎 | `06_Concepts/AI_ML/Overview.md` |
| 評価指標（Accuracy・Precision・Recall・F1・ROC-AUC） | AI/ML 基礎 | `06_Concepts/AI_ML/Overview.md` |
| 補足指標（Specificity・AUC・Matthews Correlation Coefficient） | AI/ML 基礎 | `06_Concepts/AI_ML/Overview.md` |
| セキュリティ文脈での指標選択（脅威検知→Recall・誤検知削減→Precision） | AI/ML 基礎 | `06_Concepts/AI_ML/Overview.md` |
| データ漏洩（Data Leakage）の防止 | AI/ML 基礎 | `06_Concepts/AI_ML/Overview.md` |

### 教師あり学習

| 技術名 | カテゴリ | ファイルパス |
|--------|---------|------------|
| 線形回帰（Linear Regression）+ Ridge/Lasso | Supervised Learning | `06_Concepts/AI_ML/Supervised_Learning/Linear_Regression.md` |
| ロジスティック回帰（Logistic Regression） | Supervised Learning | `06_Concepts/AI_ML/Supervised_Learning/Linear_Regression.md` |
| 決定木（Decision Trees）・ランダムフォレスト | Supervised Learning | `06_Concepts/AI_ML/Supervised_Learning/Decision_Trees.md` |
| Naive Bayes（テキスト分類・スパムフィルタリング） | Supervised Learning | `06_Concepts/AI_ML/Supervised_Learning/Naive_Bayes.md` |
| SVM（サポートベクターマシン）・カーネルトリック | Supervised Learning | `06_Concepts/AI_ML/Supervised_Learning/SVM.md` |

### 教師なし学習

| 技術名 | カテゴリ | ファイルパス |
|--------|---------|------------|
| K-Meansクラスタリング・エルボー法 | Unsupervised Learning | `06_Concepts/AI_ML/Unsupervised_Learning/KMeans_Clustering.md` |
| PCA（主成分分析・次元削減・可視化） | Unsupervised Learning | `06_Concepts/AI_ML/Unsupervised_Learning/PCA.md` |
| 異常検知（Isolation Forest・One-Class SVM・Autoencoder） | Unsupervised Learning | `06_Concepts/AI_ML/Unsupervised_Learning/Anomaly_Detection.md` |
| 異常検知のセキュリティ応用（ネットワーク侵入検知・ログ解析） | Unsupervised Learning | `06_Concepts/AI_ML/Unsupervised_Learning/Anomaly_Detection.md` |

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

### データ攻撃

| 技術名 | カテゴリ | ファイルパス |
|--------|---------|------------|
| データ品質属性と攻撃ベクタの対応（ノイズインジェクション・ラベルフリッピング・バイアスインジェクション） | AI Data Attacks | `06_Concepts/AI_ML/Data_Attacks.md` |
| クラス不均衡攻撃（少数クラスの意図的欠落） | AI Data Attacks | `06_Concepts/AI_ML/Data_Attacks.md` |

---

*新しい技術を追加した際は、このファイルにも1行追記してください。*
