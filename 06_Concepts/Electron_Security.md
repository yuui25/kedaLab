# Electron セキュリティ原理

## このファイルの位置づけ

**参照元作業ファイル**: `../02_Initial_Access/Web_Vulnerabilities/Electron_XSS_RCE.md`

「Electron で XSS が RCE に到達するのはなぜか」「`nodeIntegration` と `contextIsolation` とは何か」「なぜ昔のアプリはこの設定になりがちなのか」を理解するための原理ファイル。

---

## Electron の構造

Electron は **Chromium（ブラウザ）** と **Node.js（サーバーサイドランタイム）** を1つのプロセスグループにまとめたフレームワーク。デスクトップアプリを Web 技術（HTML / CSS / JavaScript）で書けるようにしている。

```
Electron アプリ
├── メインプロセス（Node.js フルアクセス）
│     ファイルシステム・OS・ウィンドウ管理
│
└── レンダラープロセス（Chromium ＝ ブラウザ相当）
      HTML / CSS / JavaScript で UI を描画
      ← ここでどこまで Node.js を使えるかを webPreferences が制御する
```

---

## nodeIntegration — Node.js をレンダラーで使えるか

| 値 | 動作 |
|----|------|
| `nodeIntegration: true` | Electron がレンダラーのグローバルスコープに `require`・`process`・`Buffer` を inject する。レンダラー内の JavaScript から直接 `require('child_process')` などを呼べる。 |
| `nodeIntegration: false`（現在のデフォルト） | レンダラーは通常のブラウザ JavaScript として動作する。`require` は存在しない。 |

**重要**: `require` はアプリのコードが書いていなくても、`nodeIntegration: true` のとき Electron が自動で inject する。XSS ペイロードはこの inject された `require` を使う。

---

## contextIsolation — preload と renderer の分離

Electron の preload スクリプトはメインプロセスとレンダラーの橋渡しをする。`contextIsolation` はこの preload のコンテキストをレンダラーから分離するかどうかを制御する。

| 値 | 動作 |
|----|------|
| `contextIsolation: false` | preload のオブジェクト（例: `window.myAPI`）にレンダラーから直接アクセスできる。preload で用意した Node.js 機能をレンダラー JS が呼べる。 |
| `contextIsolation: true`（現在のデフォルト） | preload とレンダラーのコンテキストが分離される。preload で明示的に `contextBridge.exposeInMainWorld()` で公開したものだけがレンダラーから見える。 |

---

## XSS → RCE のエスカレーション原理

```
攻撃者がユーザー制御データをサーバーに書き込む
            ↓
被害者の Electron アプリがそのデータを取得し
jQuery .html(data) / innerHTML = data として DOM に挿入
            ↓
ブラウザとして動作するレンダラーが HTML を解釈し
<img onerror="..."> などのイベントハンドラが発火
            ↓
nodeIntegration: true のとき Electron が inject した
require がグローバルスコープに存在する
            ↓
require('child_process').execSync('calc') などの
Node.js API 呼び出しが成功する = RCE
```

通常のブラウザでは `require` は存在しないため XSS は XSS 止まり。
Electron の `nodeIntegration: true` 環境だと XSS が OS コマンド実行に到達する。

---

## デフォルト値の歴史

| Electron バージョン | nodeIntegration デフォルト | contextIsolation デフォルト |
|------------------|-----------------------|--------------------------|
| Electron 1〜4 | `true` | `false` |
| Electron 5（2019-05）以降 | **`false`** | `false`（のち `true` に） |
| Electron 12 以降 | `false` | **`true`** |

古くから開発されているアプリは Electron 5 以前のコードがそのまま残っており、`nodeIntegration: true` を**明示的に**設定しているケースがある。「昔は true がデフォルトだったから省略していた」のではなく、「古いコードが true を明示して書いていて、そのまま使われている」状況が多い。

---

## 安全な設定（修正指針）

```typescript
// 安全な webPreferences
new BrowserWindow({
    webPreferences: {
        nodeIntegration: false,    // Node.js をレンダラーに inject しない
        contextIsolation: true,    // preload とレンダラーのコンテキストを分離
        sandbox: true,             // Chromium サンドボックスを有効化
        preload: path.join(__dirname, 'preload.js'),
    }
});
```

```typescript
// preload.js — 必要な機能だけ安全に公開する
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('myAPI', {
    openFile: () => ipcRenderer.invoke('dialog:openFile')
    // Node.js の raw API は公開しない
});
```

---

## 環境が変わったときに確認するポイント

- **Electron バージョンを確認する**: `package.json` の `electron` のバージョン。v5 以前なら `nodeIntegration` のデフォルトが `true` だった可能性を考慮する。
- **webPreferences の設定を直接確認する**: デフォルト値に頼らず、`BrowserWindow` の生成コードを grep する。
- **preload スクリプトの有無**: preload がある場合、`contextBridge.exposeInMainWorld` で何を公開しているかを確認する。不必要に Node.js の生 API を渡していないか。
- **fork・派生プロジェクト**: 元のプロジェクトが修正しても、fork 先がそのまま古い設定を引き継いでいることがある。

---

## 関連技術

- 関連：`../02_Initial_Access/Web_Vulnerabilities/Electron_XSS_RCE.md`（XSS → RCE 到達の手順）

