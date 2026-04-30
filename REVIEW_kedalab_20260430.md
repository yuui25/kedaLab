# kedalab ユーザビリティレビュー

作成日: 2026-04-30

---

## 問題の本質：疑問13

> 「これまでの内容は kedalab にもう記載があるのか。  
>  ある場合は Playbook との接続がうまくいっていない気がする」

これが根本問題。疑問1〜12・14の答えはほぼすべて kedalab に書いてある。

| 疑問 | kedalab に記載があるファイル |
|------|---------------------------|
| impacket-mssqlclient の出力の意味 | `02_Initial_Access/MSSQL_Exploitation.md` ✓ |
| システムにログイン後のコマンド | `04_Post_Access_Windows_AD/Enumeration_Checklist.md` ✓ |
| hashcat のモード選択・調べ方 | `05_Tools_Reference/Hashcat.md` ✓ |
| hashcat が遅いときの対処 | `05_Tools_Reference/Hashcat.md` ✓ |
| netexec とは何か | `05_Tools_Reference/Netexec.md` ✓ |
| netexec winrm コマンドの意味 | `05_Tools_Reference/Netexec.md` ✓ |
| evil-winrm とは | `02_Initial_Access/Protocol_Exploitation.md` ✓ |
| Get-ComputerInfo とは | `04_Post_Access_Windows_AD/Enumeration_Checklist.md` ✓ |
| inetpub は何か | `04_Post_Access_Windows_AD/Enumeration_Checklist.md` ✓ |
| Windows 侵入後の調査コマンド | `04_Post_Access_Windows_AD/Enumeration_Checklist.md` ✓ |
| PoC の定石（転送・実行） | `04_Post_Access_Windows_AD/Enumeration_Checklist.md` Step 7 ✓ |
| 新しい CVE の調べ方 | 一部のみ（本当に薄い唯一のコンテンツ不足） △ |

**書いてあるのに使えなかった = Playbook の導線が切れていた。**

診断員は `README → Playbook → 各ファイル` の順で参照する。  
この経路のどこかが切れていると、どれだけコンテンツが充実していても届かない。

---

## 今回の案件での実際の攻略経路

前提補足：

- **低権限SQLユーザー（ID/パスワード）は案件開始時にクライアントから提供されていた**。システム内から取得したものではない。
- **パスワードスプレーで使ったパスワードは担当者に確認して入手した**。hashcat で解析可能だが推定完了まで2日以上かかるため現実的でないと判断したため。

経路：

```
[案件開始]
  低権限SQLユーザー（ID/パス）が提供済み
       ↓
[nmap] ポートスキャン → 1433(MSSQL)・5985(WinRM)・88(Kerberos) 確認
       ↓
[Windows_AD_Attack_Flow.md]
  Step 0: OS判定 → Windows AD 確定
  Step 3: 「1433 が開いている → MSSQL_Exploitation.md へ」
       ↓
[MSSQL_Exploitation.md]
  impacket-mssqlclient で接続
  → enum_impersonate → EXECUTE AS LOGIN でなりすまし
  → financial_planner DB → users テーブル → adminハッシュ取得
       ↓
[Hashcat.md]
  mode 10900 → Separator unmatched（フォーマット違い）
  mode 10000 に変換して試行 → 推定2日以上 → 断念
  担当者に確認してパスワード取得
       ↓
[Netexec.md]  ← MSSQL_Exploitation.md 内フロー図から辿る
  --rid-brute でドメインユーザーリスト取得
  → winrm でパスワードスプレー → adam.scott で Pwn3d!
       ↓
[Protocol_Exploitation.md]  ← Netexec.md から辿る
  evil-winrm で接続 → シェル取得
       ↓
[Enumeration_Checklist.md]  ← ???（ここへの導線がない）
  whoami /all・Get-ComputerInfo・inetpub 確認
  BloodHound → BadSuccessor（CVE-2025-53779）特定
       ↓
[未完了] 権限昇格
```

---

## Playbook の導線が切れていた箇所（6か所）

### 切れ①：README が Playbook への入口を明示していない

診断員は kedalab を渡されたとき、まず README を読む。  
README には「OSがまだ不明な場合は `00_Playbook/00_OS_Identification.md` から始める」と書いてあるが、**「使い方」セクションの中に埋もれており、最初の1行にない。**

診断員が README を流し読みして Playbook を開かないまま手を動かし始めた可能性がある。  
Playbook を開かなければ、その先の詳細ファイルへの導線は全部機能しない。

**修正：** README の冒頭（「このリポジトリの目的」の直下）に「最初に開くファイル」の表を1ブロック置く。

---

### 切れ②：Windows_AD_Attack_Flow.md に「案件開始条件」がない

`Windows_AD_Attack_Flow.md` を開くと Step 0 から始まる。  
しかし**「案件開始時に低権限ユーザーが既に提供されている」という状況への記述がない。**

診断員は「Step 1（ポートスキャン）から始めるのか？　でも認証情報は手元にある…」という混乱が生まれる。  
Step 3「初期認証情報の取得」の表にも「認証情報が既に提供済み」の行がなく、MSSQL に辿り着く道筋が見えない。

今回のように「低権限SQLユーザー提供済み → MSSQL接続」というケースは、実際の案件では典型的なスタートパターンの一つ。

**修正：** `Windows_AD_Attack_Flow.md` の Step 0 の直前に「案件開始条件の確認」セクションを追加する。

```markdown
## 案件開始条件の確認

開始前に「何が提供されているか」を確認する。スタート位置が変わる。

| 提供されている情報 | 開始位置 |
|------------------|---------|
| IPのみ | Step 1（ポートスキャンから） |
| 低権限SQLユーザー（ID/パス）が提供済み | Step 2 を確認しつつ Step 3「MSSQL経由」へ |
| ドメインユーザー（ID/パス）が提供済み | Step 4（BloodHound）から直接始める |
```

---

### 切れ③：Step 3 の Web参照先が Linux_Attack_Flow.md（誤誘導）

`Windows_AD_Attack_Flow.md` Step 3 に：

> Webアプリがある → Webの脆弱性から認証情報取得  
> → Web脆弱性の探索手順は `Linux_Attack_Flow.md` の Step 2〜3 を参照

と書いてある。**Windows の攻略フローを読んでいるのに Linux フローに飛ばされる。**  
Web脆弱性はOS非依存なのに、誘導先のフォルダ名が「Linux」なので離脱する。

**修正：**

```markdown
# Before
→ Web脆弱性の探索手順は Linux_Attack_Flow.md の Step 2〜3 を参照

# After
→ Web脆弱性はOSに依存しない。`../02_Initial_Access/Web_Vulnerabilities/` を参照
  Windows Server 上で動く Webアプリでも手法は同じ。
```

---

### 切れ④：「MSSQL → RID brute → スプレー → WinRM」の連鎖が Playbook に可視化されていない

`MSSQL_Exploitation.md` の中には「ハッシュ取得後の判断フロー」図があり、  
`Netexec.md` へのリンクも書いてある。つまり **詳細ファイル間のリンクは繋がっている。**

しかし `Windows_AD_Attack_Flow.md` の Step 3 は「初期認証情報の取得」で終わっており、  
その後「ハッシュクラック → 断念 → RID brute → スプレー → WinRM接続」という  
**Step 3 から Step 4 の間にある重要な一連の動きが Playbook 上に存在しない。**

診断員が Playbook を見て「今どこにいるか」を確認しようとしても、自分の位置が分からなくなる。

**修正：** `Windows_AD_Attack_Flow.md` の Step 3 と Step 4 の間に以下を追加する。

```markdown
## Step 3.5 — パスワードスプレー → 初期シェル取得

認証情報（ハッシュまたは平文パスワード）が取得できたら、
ドメインユーザーに対してスプレーをかけてシェル取得を目指す。

**ユーザーリストの入手（RID bruteforce）：**
→ 詳細: `../05_Tools_Reference/Netexec.md`（RID bruteforceセクション）

**WinRM / SMB へのパスワードスプレー：**
```bash
nxc winrm [IP] -u users -p '[PASSWORD]' --continue-on-success
# (Pwn3d!) が出たユーザーが evil-winrm で接続可能
```
→ 詳細: `../05_Tools_Reference/Netexec.md`（パスワードスプレーセクション）

**WinRM 接続（シェル取得）：**
→ 詳細: `../02_Initial_Access/Protocol_Exploitation.md`（WinRMセクション）

シェルを取得したら Step 4（BloodHound）と並行して **Enumeration_Checklist.md** に進む。
→ `../04_Post_Access_Windows_AD/Enumeration_Checklist.md`
```

---

### 切れ⑤：WinRM 接続後 → Enumeration_Checklist.md への導線が Playbook にない

evil-winrm でシェルを取った後、次に何をするかが `Windows_AD_Attack_Flow.md` に書いていない。  
Playbook のフロー概要には Step 4「LDAP / BloodHound でAD全体を把握」があるが、  
**「シェルを取ったら Enumeration_Checklist.md を開け」という明示がない。**

`README.md` の「状況から直接フォルダに飛ぶ」表には  
「Windows ADシェルを取った直後 → `04_Post_Access_Windows_AD/Enumeration_Checklist.md`」と書いてあるが、  
Playbook を読んでいる診断員が README に戻って確認するとは考えにくい。

**修正：** 切れ④の修正の中でリンクを明示する（上記「シェルを取得したら〜」の行）ことで解消する。  
加えて `Protocol_Exploitation.md` の WinRM セクションの末尾にも追記する：

```markdown
### 接続後の次のステップ
→ `../../04_Post_Access_Windows_AD/Enumeration_Checklist.md` に進む
   whoami /all・Get-ComputerInfo・BloodHound の順で実行する
```

---

### 切れ⑥：Protocol_Exploitation.md に目次がなく evil-winrm に辿り着けない

`Netexec.md` から「後：WinRM シェル取得 → `Protocol_Exploitation.md`（WinRMセクション）」とリンクがある。  
しかし `Protocol_Exploitation.md` は FTP → SSH → RPC → WinRM と並ぶ長いファイルで**目次がない。**

「WinRMセクション」というヒントがあっても、スクロールして探すしかない。  
リンクで飛んだ先のファイルの中で止まる。

**修正：** `Protocol_Exploitation.md` の冒頭に目次を追加する。

```markdown
## 目次
- [FTP（ポート21）](#ftp)
- [SSH（ポート22）](#ssh)
- [WinRM / evil-winrm（ポート5985/5986）](#winrm)
- [RPC / rpcclient（ポート135）](#rpc)
- [impacket-lookupsid（RID bruteforce）](#lookupsid)
```

---

## 修正の全体像

6か所の「切れ」を直すことで、診断員の動線が繋がる。

```
README
  └─ 「最初に開くファイル」を冒頭に明示（切れ①修正）
       ↓
00_OS_Identification.md
  └─ Windows AD 確定 → Windows_AD_Attack_Flow.md へ
       ↓
Windows_AD_Attack_Flow.md
  ├─ 「案件開始条件の確認」追加（切れ②修正）
  │    → 低権限SQLユーザー提供済み → Step 3「MSSQL経由」へ
  ├─ Step 3 の Web参照先を修正（切れ③修正）
  │    → Linux_Attack_Flow.md ではなく Web_Vulnerabilities/ へ
  └─ Step 3.5「スプレー → シェル取得」追加（切れ④⑤修正）
       → Netexec.md・Protocol_Exploitation.md へのリンク明示
       → Enumeration_Checklist.md へのリンク明示
            ↓
  [詳細ファイルへの分岐]
  ├─ MSSQL_Exploitation.md（impacket-mssqlclient の使い方）
  ├─ Hashcat.md（モード選択・速度問題）
  ├─ Netexec.md（RID brute・スプレー）
  ├─ Protocol_Exploitation.md（evil-winrm）← 目次追加（切れ⑥修正）
  └─ Enumeration_Checklist.md（Windows侵入後の列挙）
```

---

## コンテンツ追加（二次的：本当に書かれていなかった内容）

上記6か所の導線修正と同時に、以下は追記が必要（量は少ない）。

### A. Hashcat.md — よくあるエラーと対処を冒頭に追加

エラーメッセージ起点でファイルを引けるようにする。

```markdown
## よくあるエラーと対処（先に確認）

| エラー | 原因 | 見るべきセクション |
|--------|------|-----------------|
| `Separator unmatched` | ハッシュ形式がモードと合っていない | → ハッシュ形式の特定方法 |
| `No hashes loaded` | フォーマットが完全に違う | → ハッシュ形式の特定方法 |
| 速度が極端に遅い（< 100 H/s） | 反復回数が多い / GPU未使用 | → 反復回数が多い場合の対処 |
```

### B. Hashcat.md — 「担当者確認」を「クラックが進まないときの判断フロー」に追加

```markdown
| 推定完了まで1日以上かかる | 担当者・クライアントに平文パスワードの提供を確認する
                           （グレーボックス案件では正当な選択肢） |
```

### C. Netexec.md — `--local-auth` の意味を追加

```markdown
# --local-auth とは
ドメイン認証ではなくローカルアカウントとして認証を行うオプション。
SQL認証ユーザー（ドメインに属さないMSSQLのローカルユーザー）で接続した場合に必要。
付けないとドメイン認証として試みるため、SQL認証ユーザーでは失敗する。
```

### D. Netexec.md — スプレーに使うパスワードの選び方を明示

```markdown
スプレーに使うパスワードの候補（優先順位順）：
1. 案件中に取得済みの平文パスワード（別ユーザーへの使い回し確認）
2. hashcat で短時間でクラックできたパスワード
3. よくある初期パスワード（Welcome1・Password1・組織名+数字 等）
4. hashcat の推定完了時間が現実的でない場合 → 担当者・クライアントに確認する
```

### E. Enumeration_Checklist.md — 冒頭に「最初の3コマンド」を追加

Step 0 より前に置く。

```powershell
## 接続直後に打つコマンド（最初の3手）

# 1. 自分が誰か・どの権限か（特権トークンの確認）
whoami /all

# 2. OSバージョン・ビルド番号（CVE選択に直結）
Get-ComputerInfo | Select-Object WindowsProductName, OSDisplayVersion, WindowsBuildLabEx

# 3. ネットワーク構成（他ホストへの経路）
ipconfig /all
```

### F. Enumeration_Checklist.md — Step 6.5 を移動・番号整理

inetpub の確認は「BloodHound 待ちの間に並行して行う」タイミング。Step 6（SYSVOL確認）の後ろではなく、Step 3（グループ確認）付近に移動する。

### G. Searchsploit.md または Enumeration_Checklist.md — 新しいCVEの調べ方

唯一のコンテンツ不足。searchsploit で見つからなかった場合のフローを追加する。

```
searchsploit → 0件
      ↓
1. NVD（nvd.nist.gov）で技術名・CVE番号を検索
2. GitHub で "CVE-202X-XXXXX PoC" を検索（Star数・コミット日時を確認）
3. 主要ブログを確認（Akamai / SpecterOps / Microsoft MSRC）
4. X（Twitter）でCVE番号を検索（PoC公開情報は最速）
```

---

## README / CLAUDE.md への修正提案

### README.md

「このリポジトリの目的」と「使い方」の間に以下を挿入する：

```markdown
## 最初に開くファイル

| 状況 | 最初に開くファイル |
|------|-----------------|
| IPのみ渡された | `00_Playbook/00_OS_Identification.md` |
| OS が判明している | 対応する Playbook（下の表を参照） |
| 低権限ユーザーが案件開始時に提供されている | `00_Playbook/00_OS_Identification.md` で OS 判定後、Playbook の「案件開始条件の確認」へ |
```

フォルダ構成のコメント修正：

```
# Before
│   └── 00_OS_Identification.md  # ← 調査の起点。OS判定からここを開く

# After
│   └── 00_OS_Identification.md  # ← IPだけ渡されたら最初にここ
```

### CLAUDE.md（AI への指示）

**変更1：手順④「Playbook への追加確認」を具体化**

```markdown
# Before
④ 00_Playbook/ の該当フローに分岐として追加できるか確認する

# After
④ 00_Playbook/ の該当フローに追加できるか確認する
   - 「案件開始時に認証情報が提供される」等の開始条件のパターンを Playbook に追記する
   - Web脆弱性など OS に依存しない技術を参照する場合、OS 固有のフローから直接
     `02_Initial_Access/Web_Vulnerabilities/` に誘導する（Linux_Attack_Flow.md 経由にしない）
   - 詳細ファイル間のリンクだけでなく、Playbook のフロー概要にもステップとして書く
     （MSSQL → RID brute → スプレー → WinRM のような連鎖は Playbook に可視化する）
   - シェル取得後に開くべきファイル（Enumeration_Checklist.md）へのリンクを
     Playbook と詳細ファイル（Protocol_Exploitation.md 等）の両方に張る
```

**変更2：手順に「ナビゲーション健全性チェック」を追加**

```markdown
⑦ 追記後にナビゲーションを確認する
   - 新しく作成または編集したファイルへの入口が Playbook から存在するか確認する
   - 50行を超えるファイルには冒頭にセクション一覧（目次）があるか確認する
   - 詳細ファイル内の「関連技術 → 後：」が次の詳細ファイルを指しているだけでなく、
     Playbook のステップとしても可視化されているか確認する
```

**変更3：案件開始条件の書き方を「書き方」セクションに追記**

```markdown
- 案件開始時に認証情報が提供されるシナリオがある技術には、
  着火条件に「案件開始時に〜が提供されている場合」と明記する。
  特定のユーザー名は書かず、役割ベース（「低権限SQLユーザー」等）で書く。
- hashcat 等の解析が現実的な時間内に終わらない場合の判断基準と代替手段を記録する。
  「担当者・クライアントへの確認」は実際の案件で有効な選択肢であり「刺さらなかったとき」
  に含める。
```

---

## 修正の優先順位

問題の本質が「Playbook の導線」である以上、修正の優先度はシンプルになる。

| 優先度 | 対象 | 修正内容 |
|--------|------|---------|
| 🔴 最高 | README.md | 冒頭に「最初に開くファイル」を追加（切れ① 解消） |
| 🔴 最高 | Windows_AD_Attack_Flow.md | 「案件開始条件の確認」追加（切れ② 解消） |
| 🔴 最高 | Windows_AD_Attack_Flow.md | Step 3 の Web参照先修正（切れ③ 解消） |
| 🔴 最高 | Windows_AD_Attack_Flow.md | Step 3.5 を追加（切れ④⑤ 解消） |
| 🟡 次 | Protocol_Exploitation.md | 目次追加 + 接続後の次ステップ追記（切れ⑥ 解消） |
| 🟡 次 | Hashcat.md | エラー対処表を冒頭に追加（A） |
| 🟡 次 | Hashcat.md | 担当者確認の選択肢を追加（B） |
| 🟡 次 | Netexec.md | `--local-auth` の説明追加（C） |
| 🟡 次 | Netexec.md | スプレーパスワードの選び方追加（D） |
| 🟡 次 | Enumeration_Checklist.md | 冒頭に「最初の3コマンド」追加（E） |
| 🟢 あとで | Enumeration_Checklist.md | Step 6.5 を移動・番号整理（F） |
| 🟢 あとで | Searchsploit.md | 新しい CVE の調べ方追加（G） |
| 🟢 あとで | CLAUDE.md | 手順④⑦の強化 |

🔴 の4つはすべて `Windows_AD_Attack_Flow.md` と `README.md` への修正。  
Playbook が直れば、その先の詳細ファイルはすでに書いてあるので機能し始める。

---

*各修正を実際のファイルに反映したら ✅ を付ける。*
