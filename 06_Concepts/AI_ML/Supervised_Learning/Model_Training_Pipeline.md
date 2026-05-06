# モデル学習パイプライン（Pipeline・GridSearchCV・joblib）

> **このファイルの位置づけ：** 特徴量抽出 → モデル学習 → ハイパーパラメータチューニング → モデル保存の一連のワークフロー。`Naive_Bayes.md` の手順ステップ2以降の詳細。他の分類器（SVM・決定木等）にも同じパターンが適用できる。

---

## 着火条件

- 前処理（テキストのベクトル化等）と分類器を一本化して管理したい
- ハイパーパラメータの最適値を自動で探索したい（グリッドサーチ）
- 学習済みモデルをファイルに保存して再利用したい
- 推論時に訓練時と同じ前処理が保証されているか確認したい

---

## 観点・着眼点

**Pipeline を使う理由：**

前処理（CountVectorizer等）と分類器を個別に呼び出すと、訓練・評価・推論の各フェーズで前処理ステップを別々に管理する必要が生じる。Pipeline でまとめることで「同じ変換が必ず適用される」ことが保証され、Data Leakage のリスクが下がる。

**GridSearchCV を使う理由：**

ハイパーパラメータ（例：MultinomialNB の `alpha`）を手動でチューニングすると、テストデータに対して過剰にチューニングされるリスク（リーク）がある。GridSearchCV はクロスバリデーション（データを k 分割して交互に評価）を内部で行うため、汎化性能を保ちながら最良のパラメータを選べる。

**joblib を使う理由：**

学習済みモデルは NumPy 配列を大量に含むため、通常の `pickle` より joblib の方が効率的なバイナリ形式で保存できる。保存したモデルは `load` で呼び出すだけで即座に推論可能な状態に戻る。

**何が出たら次の判断をするか：**

| 状況 | 次のアクション |
|------|----------------|
| `best_params_` で alpha が 0 に近い値になっている | 訓練データに未知語が少ない（ラプラス補正が不要に近い）。特徴量の質が高い |
| `best_params_` で alpha が大きい（0.5〜1.0） | 未知語が多い・語彙が少ない可能性。前処理を見直す |
| F1スコアが低いまま改善しない | alpha だけでは解決しない。`ngram_range` や `max_df` など CountVectorizer 側を調整する → `Feature_Extraction.md` 参照 |
| 推論結果の確率が 0.00 / 1.00 に集中している | モデルが確信を持ちすぎている（Naive Bayes の確率キャリブレーションの悪さ）。順位付けとして使い、絶対値は信用しない |

---

## 手順

### 1. Pipeline の構築

```python
from sklearn.feature_extraction.text import CountVectorizer
from sklearn.naive_bayes import MultinomialNB
from sklearn.pipeline import Pipeline

vectorizer = CountVectorizer(min_df=1, max_df=0.9, ngram_range=(1, 2))

pipeline = Pipeline([
    ("vectorizer", vectorizer),
    ("classifier", MultinomialNB())
])
```

Pipeline の各ステップには名前をつける（`"vectorizer"`, `"classifier"` 等）。この名前は後で GridSearchCV のパラメータ指定や `named_steps` でのアクセス時に使う。

### 2. GridSearchCV によるハイパーパラメータチューニング

```python
from sklearn.model_selection import GridSearchCV

# パラメータグリッド：ステップ名__パラメータ名 の形式で指定
param_grid = {
    "classifier__alpha": [0.01, 0.1, 0.15, 0.2, 0.25, 0.5, 0.75, 1.0]
}

grid_search = GridSearchCV(
    pipeline,
    param_grid,
    cv=5,           # 5-fold クロスバリデーション
    scoring="f1"    # 評価指標：F1スコア（スパム検知は Recall と Precision のバランスが重要）
)

grid_search.fit(df["message"], y)

best_model = grid_search.best_estimator_
print("Best params:", grid_search.best_params_)
```

**`alpha` パラメータとは：**

MultinomialNB のラプラス（リドスーン）スムージング係数。訓練データに出現しなかった単語の確率が 0 になることを防ぐ。`alpha=1.0` が標準的なラプラススムージング。小さくすると訓練データへの適合が強まる（過学習リスク）。

### 3. 推論時の一貫した前処理

```python
# 推論時も訓練時と同じ前処理関数を通す（必須）
processed = [preprocess_message(msg) for msg in new_messages]

# Pipeline 内の vectorizer は transform のみ実行（fit は不要・禁止）
X_new = best_model.named_steps["vectorizer"].transform(processed)

# 予測ラベルと確率を取得
predictions = best_model.named_steps["classifier"].predict(X_new)
probabilities = best_model.named_steps["classifier"].predict_proba(X_new)

# probabilities[i][1] : スパムである確率
# probabilities[i][0] : ハムである確率
```

> **重要：** 推論時に `fit_transform` を使うと訓練時と異なる語彙で変換される（Data Leakage）。`transform` のみを使う。

### 4. joblib によるモデルの保存と読み込み

```python
import joblib

# 保存：Pipeline ごと保存するため vectorizer の語彙も含まれる
joblib.dump(best_model, "model.joblib")

# 読み込み：ロード直後から predict 可能な状態
loaded_model = joblib.load("model.joblib")

# 推論（前処理は自分で行う必要がある）
new_data_processed = [preprocess_message(msg) for msg in new_messages]
predictions = loaded_model.predict(new_data_processed)
```

**保存対象に含まれるもの：**

- CountVectorizer が学習した語彙（vocabulary_）
- MultinomialNB が学習した確率テーブル
- Pipeline の構造と各ステップの設定

---

## 注意点・落とし穴

- **Pipeline 保存で語彙も保存される：** `joblib.dump` で Pipeline ごと保存すれば CountVectorizer の語彙も含まれる。語彙と分類器を別々に保存すると読み込み時に不整合が起きやすい。
- **前処理関数は Pipeline に入らない：** `preprocess_message`（小文字化・ステミング等）は Pipeline の外で手動で呼ぶ必要がある。Pipeline に組み込むには `FunctionTransformer` でラップする。
- **クロスバリデーションのスコアと最終評価は別物：** `grid_search.best_score_` はCV内部のスコア。最終的な汎化性能確認にはホールドアウトのテストセットで別途評価する。
- **scoring="f1" はデフォルトで二値分類の正例（spam=1）に対する F1：** 多クラス問題の場合は `scoring="f1_macro"` 等を指定する。

---

## 関連技術

- `Naive_Bayes.md` — MultinomialNB の動作原理・alpha スムージングの詳細
- `Feature_Extraction.md` — CountVectorizer のパラメータ（min_df・max_df・ngram_range）
- `../Overview.md` — F1スコア・Precision・Recall の定義と選択基準
- `../Data_Transformation.md` — カテゴリ特徴量・歪み補正等の他の前処理手法
