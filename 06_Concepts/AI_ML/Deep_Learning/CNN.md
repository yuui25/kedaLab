# 畳み込みニューラルネットワーク（CNN: Convolutional Neural Network）

> **このファイルの位置づけ：** CNN の動作原理。画像認識システムへの敵対的サンプル攻撃（人間には見えない微小な摂動で誤分類を引き起こす）を理解するための前提。AI Evasion 系モジュール全般で参照する。


### 適用条件・選択基準
- 画像・動画データの分類・検出・セグメンテーション
- 入力データに局所的なパターンがある（空間的または時間的な局所構造）
- テキスト分類（1D CNN）、音声認識
- 転移学習の出発点（ImageNetで事前学習済みモデルの活用）

### 観点・着眼点

**全結合層との違い：**
- 全結合層（MLP）：全ての入力ニューロンと全ての出力ニューロンが接続。画像の空間構造を無視。
- CNNは「局所的な受容野（Receptive Field）」で処理：画像の空間的な近傍のみを見る

**CNNの3つの核心的操作：**

**1. 畳み込み層（Convolutional Layer）：**
- 小さなフィルター（カーネル）を画像全体にスライドさせて特徴マップを生成
- フィルターは「エッジ検出」「テクスチャ」「形状」などの特徴を自動学習
- `num_filters`個のフィルターで`num_filters`個の特徴マップを出力
- パラメータ：`kernel_size`（フィルターのサイズ）、`stride`（スライド幅）、`padding`（境界処理）

**2. プーリング層（Pooling Layer）：**
- 特徴マップを縮小（空間サイズを小さく）する
- **Max Pooling**：領域内の最大値を残す（位置のわずかなズレに頑健）
- 計算量削減と位置不変性の向上

**3. 全結合層（Fully Connected Layer）：**
- 畳み込み・プーリングで抽出した特徴を使って最終的な分類を行う
- 通常、最後の1〜2層に配置

**層が深くなるにつれて学習される特徴の変化：**
- 浅い層：低レベルの特徴（エッジ、色のグラデーション）
- 中間の層：中レベルの特徴（テクスチャ、形状の一部）
- 深い層：高レベルの特徴（目、顔、物体の一部）

**主要なCNNアーキテクチャ：**
| モデル | 特徴 | 用途 |
|--------|------|------|
| LeNet | CNNの先駆け。小規模 | 手書き数字認識（MNIST） |
| AlexNet | 深層CNNの普及に貢献 | ImageNet分類 |
| VGGNet | シンプルな3×3フィルターの積み重ね | 転移学習のベースモデル |
| ResNet | 残差接続で超深層ネットワークを実現 | 最も広く使われる |
| EfficientNet | 深さ・幅・解像度のバランスを最適化 | 高精度・効率的 |

**転移学習（Transfer Learning）：**
- ImageNetで事前学習した重みを流用し、自分のタスク用に微調整（Fine-tuning）
- データが少ない場合に特に有効

### 手順

```python
import torch.nn as nn

class SimpleCNN(nn.Module):
    def __init__(self, num_classes):
        super().__init__()
        self.features = nn.Sequential(
            nn.Conv2d(3, 32, kernel_size=3, padding=1),  # 3ch→32ch
            nn.ReLU(),
            nn.MaxPool2d(2, 2),                           # 空間サイズを1/2
            nn.Conv2d(32, 64, kernel_size=3, padding=1),
            nn.ReLU(),
            nn.MaxPool2d(2, 2)
        )
        self.classifier = nn.Sequential(
            nn.Flatten(),
            nn.Linear(64 * 8 * 8, 512),
            nn.ReLU(),
            nn.Dropout(0.5),
            nn.Linear(512, num_classes)
        )
    
    def forward(self, x):
        return self.classifier(self.features(x))
```

**転移学習の例（ResNet）：**
```python
import torchvision.models as models
model = models.resnet50(pretrained=True)
# 最終層のみを自タスクに合わせて変更
model.fc = nn.Linear(2048, num_classes)
```

### 注意点・落とし穴

- **大量の学習データが必要**：CNNはパラメータ数が多く、データが少ないと過学習する。転移学習を活用する。
- **計算コスト**：深いCNNの学習にはGPUが実質的に必須。
- **データ拡張（Data Augmentation）が重要**：ランダムなフリップ・回転・クロップで訓練データを水増しして汎化性能を上げる。
- **カーネルサイズの選択**：3×3フィルターを積み重ねる方が、大きなフィルターより効率的で表現力も高い（VGGNetの教訓）。
- **バッチ正規化（BN）を使う**：BNなしでは深いネットワークの学習が不安定になりやすい。

### 関連技術

- ニューラルネットワーク基礎 → `Neural_Networks.md`
- RNN（系列データ処理との組み合わせ：ビデオ認識等） → `RNN.md`
- 物体検出（YOLO、Faster R-CNN等）：CNNを骨格に使う
- セグメンテーション（U-Net等）

> 原理（畳み込み演算・受容野・パラメータ共有の数学的意味） → `../../06_Concepts/CNN_Theory.md`
