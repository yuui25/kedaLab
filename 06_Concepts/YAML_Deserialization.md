# YAML.load 任意デシリアライゼーションの原理

## このファイルの位置づけ

`03_Post_Access_Linux/Sudo_Misconfig.md`（パターン5: Ruby YAML.load Gadget Chain）の動作原理を説明するファイル。

「なぜ YAML ファイルを置き換えるだけで root でコードが実行されるのか」「なぜあのガジェットチェーンが動くのか」を理解したい場合に開く。

---

## YAML.load が任意コードを実行できる理由

### Psych の `!ruby/object:` タグ

Ruby の標準 YAML ライブラリ `Psych` は、`!ruby/object:ClassName` というタグを使ってオブジェクトを復元（デシリアライズ）できる。

```yaml
!ruby/object:SomeClass
field1: value1
field2: value2
```

これを `YAML.load` で読み込むと、Ruby は `SomeClass.allocate`（コンストラクタを呼ばずにメモリ確保）してからフィールドを設定する。**クラスの初期化ロジック（`initialize`）を素通りしてインスタンスが生成できる。**

### なぜ「安全でない」のか

- `YAML.load` は読み込んだクラス名を `const_get` で解決する。**事前にロードされているすべての Ruby クラスを使える。**
- フィールドへの代入は `instance_variable_set` 相当で行われる。通常は setter に防御コードがあっても、デシリアライズ時はそれを経由しない。
- 複数のオブジェクトを `&1` YAML アンカーで相互参照させられる（後述）。

`YAML.safe_load` はタグを無視して安全な型（String / Integer / Array / Hash 等）のみ復元する。`YAML.load` はタグを解釈する。この2つの違いが脆弱性の有無を決める。

---

## Psych Gadget Chain の動作原理（Net::WriteAdapter + Gem::RequestSet）

今回使ったガジェットチェーンの動作を段階的に説明する。

### ガジェットとは

**ガジェット（Gadget）** とは「通常の目的とは異なる方法でコードを実行させられる既存のクラス・メソッドの組み合わせ」を指す。攻撃者が新しいコードを書くのではなく、Ruby 標準ライブラリ内の既存のクラスを組み合わせて悪意ある動作を引き出す。

### チェーンの出発点：`Net::BufferedIO`

`Net::BufferedIO` は Ruby 標準ライブラリの HTTP/FTP 通信用クラス。デシリアライズ時に `@io` フィールドへのアクセスが発生し、内部の `@debug_output` に対して `write(str)` が呼ばれることが知られている。

```
Net::BufferedIO がデシリアライズされる
  → @debug_output.write("reading N bytes...")
```

### 中継：`Net::WriteAdapter`

`Net::WriteAdapter` は `write(str)` が呼ばれると、コンストラクタで渡されたオブジェクトの指定メソッドを呼ぶアダプター。

```ruby
# 通常の使い方（Net::WriteAdapterの実装イメージ）
class Net::WriteAdapter
  def write(str)
    @socket.__send__(@method_id, str)
  end
end
```

YAML で設定できるフィールド：
- `socket` → 任意のオブジェクト
- `method_id` → 呼ぶメソッド名（シンボル）

### `Gem::RequestSet#resolve`

`Gem::RequestSet#resolve` は `@sets` に対して `<<` 演算子（append）を呼ぶ処理を内部で行う。YAML で `@sets` に別の `Net::WriteAdapter` を設定しておくと、`<<` 演算子 → `write` → 再び任意のメソッドを呼ぶという連鎖が発生する。

### 最終実行：`Gem::Installer#system`

`Gem::Installer` は `Kernel#system`（OSコマンド実行）を private メソッドとして持つ。`__send__(:system, "コマンド")` のようにリフレクションで呼び出せる。

### チェーン全体のフロー

```
① YAML.load でオブジェクトグラフを復元
      ↓
② Net::BufferedIO のデシリアライズ時に
   @debug_output.write("reading N bytes...") が実行される
      ↓
③ @debug_output = Net::WriteAdapter(socket=Gem::RequestSet, method_id=:resolve)
   → Gem::RequestSet#resolve("reading N bytes...") が呼ばれる
      ↓
④ Gem::RequestSet#resolve の内部で
   @sets << "reading N bytes..." が呼ばれる
      ↓
⑤ @sets = Net::WriteAdapter(socket=Gem::Installer, method_id=:system)
   → Gem::Installer.__send__(:system, "reading N bytes...") ではなく
   → git_set の値が渡されて Gem::Installer.__send__(:system, "chmod +s /bin/bash") が実行
      ↓
⑥ root 権限で "chmod +s /bin/bash" が実行される
```

**注意：** ④→⑤の `<<` に渡される文字列（`"reading N bytes..."`）はコマンドとして実行されるわけではない。`git_set` フィールドに設定された文字列がコマンドとして使われる。

### `&1` YAML アンカーの役割

```yaml
io: &1 !ruby/object:Net::BufferedIO
  io: &1 !ruby/object:Gem::Package::TarReader::Entry
```

`&1` はこのノードに `1` という名前のアンカーを付ける。`*1` で参照できる（Alias）。
ガジェットチェーンではオブジェクトを相互に参照させるために使う。同一オブジェクトへの複数参照を YAML で表現できる。

---

## Ruby バージョンによる違い

| Ruby バージョン | YAML.load の挙動 | このガジェットチェーンの有効性 |
|---------------|----------------|--------------------------|
| 2.x (〜2.7) | タグを解釈（デフォルト） | 有効 |
| 3.0 | 警告が出るが動作する | 有効（警告あり） |
| 3.1 以降 | Psych 4.0 に更新。`YAML.load` がデフォルトで safe_load 相当に変更 | **無効**（`YAML.unsafe_load` に変更しない限り動作しない） |

実際のターゲットの Ruby バージョンを `ruby --version` で確認してから試すこと。

---

## 環境が変わったときに確認すること

1. **`ruby --version` で 3.1 以降か確認** → 3.1 以降なら `YAML.load` は safe_load 相当のため別の手法を探す
2. **スクリプトで `require 'psych'` / `require 'yaml'` のどちらを使っているか** → `psych` を直接使っている場合は `Psych.load` のバージョン確認が必要
3. **使えるクラスが変わっていないか確認** → `Net::WriteAdapter` / `Gem::RequestSet` / `Gem::Installer` は Rubygems に含まれるため、`require 'rubygems'` がスクリプト内で実行されているか確認する

---

## 参考

- [elttam blog: Ruby Gem Deserialization Gadget Chains](https://www.elttam.com/blog/ruby-gems-deserialization/)
- [CVE-2022-25765 (PDFKit) + YAML.load chain の組み合わせ](https://security.snyk.io/vuln/SNYK-RUBY-PDFKIT-2940462)
