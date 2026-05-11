# Java デシリアライズ — allowlist バイパスの動作原理

**このファイルの位置づけ:**
`02_Initial_Access/Web_Vulnerabilities/Java_Deserialization_Bypass.md` の原理説明ファイル。
Java デシリアライズライブラリに allowlist（許可リスト）が実装されている場合でも、
なぜバイパスが成立するかを理解するための背景知識。

> **既知のアンチパターンについて**
> `resolveClass()` を override して allowlist を実装しながら `resolveProxyClass()` を見落とす実装ミスは、
> Java セキュリティの公開文献で繰り返し指摘されている **既知のアンチパターン** である。
> 主な参照先:
> - [OWASP Deserialization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Deserialization_Cheat_Sheet.html)
>   — "Java's `ObjectInputStream` provides two hook points for class resolution: `resolveClass` and `resolveProxyClass`."
>   両方を実装しない allowlist は不完全であると明記されている。
> - Code White GmbH / Moritz Bechler 著 "Java Unmarshaller Security" (2017)
>   — Java デシリアライズ経路の複数の hook point を包括的にまとめた公開レポート。
> - CVE-2017-7525 (Jackson-databind)、CVE-2019-17267 (XStream)、CVE-2020-8840 (FasterXML) など
>   — allowlist / denylist の実装が一部経路を見落とした結果として公開された CVE 群。
>
> 本ファイルで扱う内容はこれらの公開知識の整理であり、特定製品の未公開バリアントの記述ではない。

---

## シリアライズとデシリアライズ

**シリアライズ**: メモリ上のオブジェクトをネットワーク送信・ファイル保存できるバイト列に変換すること。

**デシリアライズ**: 受け取ったバイト列を元のオブジェクトに復元すること。

```
送信側: オブジェクト → バイト列
受信側: バイト列 → オブジェクト（ここが攻撃対象）
```

デシリアライズは「相手が送ってきたバイト列を信頼してオブジェクトを復元する」処理であるため、
攻撃者が細工したバイト列を受け入れると、意図しないクラスのオブジェクトが復元される。

---

## allowlist（許可リスト）とは

デシリアライズ時に「このクラス名だけ復元を許可する」という防御機構。

```
受け取ったバイト列 → 「このクラス名は許可リストにあるか？」
                        YES → 復元する
                        NO  → 例外を投げて拒否
```

Java では `ObjectInputStream` をサブクラス化し、`resolveClass()` をオーバーライドすることで実装する。

```java
// allowlist 実装の典型パターン
@Override
protected Class<?> resolveClass(ObjectStreamClass desc) throws IOException, ClassNotFoundException {
    if (!allowlist.contains(desc.getName())) {
        throw new ClassNotFoundException("Class not allowed: " + desc.getName());
    }
    return super.resolveClass(desc);
}
```

---

## クラス解決の2経路 — ここが見落とされやすい

Java の `ObjectInputStream` にはクラスを解決する経路が **2つ**存在する。

```
readObject() でバイト列を処理
  ├── 通常クラス  → resolveClass()       が呼ばれる
  └── Proxy クラス → resolveProxyClass()  が呼ばれる
```

**通常クラス**: `class Foo implements Serializable {}` のように開発者が定義したクラス。

**Proxy クラス**: `java.lang.reflect.Proxy` を使って実行時に動的生成されるクラス。
Java が内部で自動生成するため、コード上にクラス定義は存在しない。
インターフェースを実装した「代理オブジェクト」として機能する。

---

## allowlist 実装が片方だけの場合に何が起きるか

`resolveClass()` のみをオーバーライドして allowlist チェックを実装した場合：

```
通常クラスのバイト列  → resolveClass()      → allowlist チェックあり ✅
Proxy クラスのバイト列 → resolveProxyClass() → allowlist チェックなし ❌
```

`resolveProxyClass()` はオーバーライドされていなければ JDK デフォルト実装が動く。
デフォルト実装は各インターフェース名を allowlist を経由せず直接ロードする。

**攻撃者がすること**: 本来拒否されるべきクラスを Proxy の「インターフェース」として指定したバイト列を送る。

```
攻撃ペイロードの構造:
  「これは Proxy オブジェクトです」
  「インターフェースは [攻撃者が指定した任意のクラス] です」
  ↓
resolveProxyClass() が呼ばれる
  ↓
allowlist チェックを経由せず [任意のクラス] がロードされる
```

---

## バイパスが成立する前提条件

以下が全て揃ったときにバイパスが成立する：

1. Java の `ObjectInputStream`（または派生ライブラリ）でデシリアライズを行っている
2. `resolveClass()` に allowlist が実装されている（防御しているつもり）
3. `resolveProxyClass()` がオーバーライドされていない（見落とし）
4. 攻撃者がデシリアライズエンドポイントにバイト列を送信できる

---

## ガジェットチェーンとは

デシリアライズで任意クラスをロードできても、そのクラス自体が無害なら直接の被害はない。
**ガジェットチェーン**は、JVM のクラスパス上に存在する既存クラスを組み合わせて
「デシリアライズされた瞬間に任意コマンドを実行させる」という攻撃手法。

```
攻撃者が送るバイト列
  ↓
ガジェットクラス A がロードされる（Apache Commons Collections 等）
  ↓ A が B を呼ぶ
  ↓ B が C を呼ぶ（チェーン）
  ↓ C が Runtime.exec() を呼ぶ
任意 OS コマンドが実行される（RCE）
```

ガジェットの前提条件: ターゲットの JVM クラスパス上に既知のガジェットライブラリが存在すること。
代表的なガジェットライブラリ: Apache Commons Collections、Spring Framework、Groovy など。

**allowlist バイパスとの関係**:
allowlist バイパスで「任意クラスをロードできる状態」になったとき、
クラスパス上にガジェットが存在すれば RCE に繋がる。
存在しない場合は情報漏洩・DoS 等の限定的な影響にとどまる。

---

## 診断時の着眼点

> 原理 → 本ファイル（`06_Concepts/Java_Deserialization.md`）
> 手順 → `02_Initial_Access/Web_Vulnerabilities/Java_Deserialization_Bypass.md`

| シグナル | 意味 |
|---|---|
| HTTP ヘッダーに `Content-Type: application/x-java-serialized-object` | Java デシリアライズエンドポイントの可能性 |
| バイト列の先頭が `AC ED 00 05`（16進） | Java シリアライズデータのマジックバイト |
| ライブラリに `ObjectInputStream` を使用 | デシリアライズ経路あり |
| `resolveClass()` override あり・`resolveProxyClass()` override なし | Proxy 経由バイパスが有効な可能性 |
| クラスパスに Commons Collections / Spring / Groovy | 既知ガジェットが使える可能性 |

---

## override 欠落が生じる他のパターン

`resolveProxyClass()` は最も見落とされやすい hook だが、同様の「対称実装漏れ」は他にも存在する。
いずれも「`resolveClass()` だけ守っても抜け道が残る」という同じ構造を持つ。

### パターン 1 — `resolveObject()` の未 override

`resolveObject()` はデシリアライズされたオブジェクトが確定した **後** に呼ばれる hook。
allowlist を `resolveClass()` だけに実装した場合、
ガジェットオブジェクトが復元された後に `readResolve()` で別オブジェクトに差し替えられるケースで
allowlist チェックが機能しないことがある。

```java
// 見落とし例: resolveObject をオーバーライドしていない
// → readResolve() で差し替えられた最終オブジェクトが allowlist 外でも通過する
```

### パターン 2 — `readUnshared()` 経由の迂回

`ObjectInputStream.readObject()` に allowlist を仕込んでも、
`readUnshared()` は内部的に別コードパスを通る実装がある。
allowlist フィルターが `readObject()` の override 経路にしか刺さっていない場合、
`readUnshared()` で送られたデータがフィルターを回避できる。

```
readObject()    → カスタム resolveClass() → allowlist チェックあり ✅
readUnshared()  → JDK デフォルトの resolveClass() 相当 → allowlist チェックなし ❌
```

### パターン 3 — カスタム `ClassLoader` 経由の迂回

ライブラリが独自の `ClassLoader` を差し込んでいる場合、
`resolveClass()` で `Class.forName()` を直接呼ぶ実装では
allowlist チェックより先にクラスロードが走ることがある（**preload-before-filter** パターン）。

```
resolveClass() 内部:
  1. allowlist チェック → 未通過
  2. しかし Class.forName() がチェック前に評価されるコードパスが存在する
  → クラスが静的初期化ブロック込みでロードされてしまう
```

この形は過去に複数の ORM / RPC フレームワークで発見されており、
「allowlist で弾いた後もクラスの static ブロックが実行される」という副作用として顕在化する。

---

## allowlist が正しく実装された状態

両経路をカバーする実装：

```java
// 正しい実装: resolveProxyClass() にも同じチェックを入れる
@Override
protected Class<?> resolveProxyClass(String[] interfaces)
        throws IOException, ClassNotFoundException {
    for (String iface : interfaces) {
        if (!allowlist.contains(iface)) {
            throw new ClassNotFoundException("Proxy interface not allowed: " + iface);
        }
    }
    return super.resolveProxyClass(interfaces);
}
```

**確認すべきこと**: allowlist を実装しているライブラリが `resolveProxyClass()` もオーバーライドしているか。
片方だけの実装は「鍵のかかっていない窓が残っている」状態。

---

## 「部分修正が新バリアントを生んだ」歴史的事例

allowlist の修正が不完全だった結果、別バリアントが公開 CVE として登録された事例は複数ある。
ペネトレ実務での視点として「修正済みバージョンも別経路が残っていないか」を確認する習慣のベースになる。

### 事例 1 — XStream の denylist/allowlist 繰り返しバイパス

| 項目 | 内容 |
|---|---|
| 初期 CVE | CVE-2013-7285（XStream RCE）|
| 修正方針 | 悪用クラスを denylist に追加 |
| 再発 CVE | CVE-2019-10173、CVE-2020-26217、CVE-2021-21344/21345/21346 等、毎年新規バイパス |
| 構造 | denylist はガジェットを個別に追加する後追い対応 → 未知のガジェットが次々発見されてイタチごっこになった |
| 教訓 | denylist より allowlist の方が原理的に安全だが、allowlist の hook 網羅漏れ（本ファイル本題）は allowlist でも同じ構造を持つ |

参照: [NVD - CVE-2021-21344](https://nvd.nist.gov/vuln/detail/CVE-2021-21344)

### 事例 2 — Jackson-databind の `@type` allowlist バイパス繰り返し

| 項目 | 内容 |
|---|---|
| 初期 CVE | CVE-2017-7525（Jackson polymorphic deserialization RCE）|
| 修正方針 | 危険クラスを denylist → 後に allowlist ベースへ移行 |
| 再発 CVE | CVE-2019-14379、CVE-2019-14439、CVE-2019-17267、CVE-2020-8840 など多数 |
| 構造 | `@type` フィールドを使った多態デシリアライズで、denylist に登録されていない別クラスのガジェットが次々見つかった |
| 教訓 | 修正リリースを確認する際は「CVE 番号が違う別の報告者による類似バイパス」が同時期に出ていないかも確認する |

参照: [NVD - CVE-2019-14379](https://nvd.nist.gov/vuln/detail/CVE-2019-14379)

> **診断での応用**: 対象ライブラリが「CVE-XXXX を修正済み」と説明された場合でも、
> その修正が hook の一部しかカバーしていない可能性がある。
> パッチノートで「何を追加したか」だけでなく「何を変更しなかったか」を確認する。

---

## 関連技術

- 前：Web アプリケーションのエンドポイント列挙 → `01_Reconnaissance/Web_Enumeration.md`
- 後：デシリアライズバイパス手順 → `02_Initial_Access/Web_Vulnerabilities/Java_Deserialization_Bypass.md`（未作成）
- 後：RCE 取得後の次の手 → `03_Post_Access_Linux/Enumeration_Checklist.md`
