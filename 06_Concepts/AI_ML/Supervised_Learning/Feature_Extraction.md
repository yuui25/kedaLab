# テキスト特徴量抽出（Feature Extraction）

> **このファイルの位置づけ：** テキストデータを数値ベクトルに変換する手順の解説。`Naive_Bayes.md` の「手順」ステップ1の前段にあたる処理。スパムフィルターや感情分析モデルへの入力準備として不可欠。

---

## 着火条件

- 生テキストデータをMLモデルに入力しようとしている（モデルは数値しか受け取れない）
- Naive Bayes / SVM / ロジスティック回帰などで文書分類を行う前段として必要
- 前処理パイプラインで `CountVectorizer` を設定したい
- unigram（単語単体）だけではパターン検出が不十分で bigram も取り込みたい

---

## 観点・着眼点

**なぜ特徴量抽出が必要か：**

機械学習モデルは生のテキスト文字列をそのまま処理できない。各文書を「語彙中の各単語の出現回数」で表したベクトルに変換することで、モデルが統計的なパターンを学習できるようになる。

**Bag-of-Words の基本概念：**

- データセット全体から一意な単語（語彙）を収集し、「語彙ベクトル空間」を構築する
- 各文書は「その文書で各単語が何回出たか」の整数ベクトルで表現される
- 単語の出現順序は保持されない（"free prize" と "prize free" は同一扱い）
- ユニグラムのみでは単語の共起情報が失われるため、bigram を追加すると局所的な語順を補える

**何を見て次の判断をするか：**

| 状況 | 次のアクション |
|------|----------------|
| 語彙サイズが巨大でメモリが逼迫している | `min_df` を上げてレアタームを除外する |
| 共通語（"the", "is"）がスコアを歪めている | `max_df` を下げて高頻度語を除外 |
| unigram だけでは判別精度が低い | `ngram_range=(1, 2)` で bigram を追加する |
| CountVectorizer の出力をモデルに渡した後、精度を見たい | F1スコア・Precision/Recall で評価 → `Overview.md` 参照 |

---

## 手順

### CountVectorizer による Bag-of-Words 変換

```python
from sklearn.feature_extraction.text import CountVectorizer

# 主要パラメータ
# min_df=1    : 少なくとも1文書に出現する単語を含める（希少語フィルタ）
# max_df=0.9  : 90%超の文書に出現する単語を除外（超高頻度語フィルタ）
# ngram_range=(1, 2) : unigram + bigram を両方含める
vectorizer = CountVectorizer(min_df=1, max_df=0.9, ngram_range=(1, 2))

# 前処理済みのテキスト列に対して fit & transform を実行
X = vectorizer.fit_transform(df["message"])

# ラベルを数値に変換（例：spam=1, ham=0）
y = df["label"].apply(lambda x: 1 if x == "spam" else 0)
```

`X` は各行が文書・各列が語彙中の単語（またはbigram）に対応するスパース行列になる。この段階で Naive Bayes 等の分類器に渡せる状態になる。

### CountVectorizer の3ステージ

1. **Tokenization（トークン化）**  
   `ngram_range` に従ってテキストをトークンに分割する。`(1, 2)` の場合、`"free prize"` → `["free", "prize", "free prize"]` のように unigram と bigram の両方を抽出する。

2. **Building the Vocabulary（語彙構築）**  
   `min_df`・`max_df` でフィルタリングし、最終的な語彙セットを確定させる。レアすぎる語・普遍的すぎる語（"the" など）は除外される。

3. **Vectorization（ベクトル化）**  
   各文書を語彙に沿った出現回数のベクトルに変換する。語彙に含まれない単語は無視される。

### unigram のみの場合の挙動確認例

以下の5文書で `ngram_range=(1,1)`, `min_df=1`, `max_df=0.9` を使うと：

```
1. win free cash now
2. free cash prize available today
3. security alert detected
4. you have won a free gift
5. the report is ready
```

`the` は全5文書に出現する（出現率100%）ため `max_df=0.9` で除外される。

結果として `win`, `free`, `cash`, `now`, `prize`, `available`, `today`, `security`, `alert`, `detected`, `you`, `have`, `won`, `gift`, `report`, `is`, `ready` 等が残り、各文書の特徴ベクトルが構築される。

### bigram 追加の効果

`ngram_range=(1, 2)` にすると `"free cash"` が bigram として語彙に加わる。これにより：

- 文書1・文書2に `free cash` フラグが立つ
- unigram の `free` だけでは捉えられなかった「金銭的誘導スパム」のパターンを識別できる

---

## 注意点・落とし穴

- **語順は保存されない：** CountVectorizer は単語の出現回数を記録するだけで、文章の意味・構造は失われる。「not good」と「good not」は同一扱い。意味的な順序が重要な場合は RNN / Transformer を検討する。
- **bigram の組み合わせ爆発：** `ngram_range=(1, 3)` など広くすると語彙サイズが指数的に増える。`max_features` パラメータで上限を設けることを検討する。
- **fit_transform は訓練データのみに使う：** テストデータには `transform` のみ適用する。テストデータの語彙を混入させると Data Leakage になる。
- **スパース行列の扱い：** 出力はスパース行列（`scipy.sparse`）。`toarray()` で密行列化できるが、語彙サイズが大きいとメモリが爆発する。

---

## 関連技術

- `Naive_Bayes.md` — CountVectorizer の後段の分類器。MultinomialNB はこの出力を直接受け取る
- `../Data_Transformation.md` — カテゴリ変数のエンコーディング・歪み補正など数値前処理
- `SVM.md` — テキスト分類でNaive Bayesと競合。CountVectorizerの出力を同様に使える
- TF-IDF（TfidfVectorizer）：単純な出現回数ではなく tf×idf 重み付きベクトルを生成する手法（CountVectorizer の上位互換として検討できる）
