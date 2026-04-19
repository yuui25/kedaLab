# Hashcat クイックリファレンス

## よく使うハッシュモード

| モード番号 | ハッシュタイプ | 取得方法 |
|-----------|-------------|---------|
| `13100` | Kerberos TGS-REP etype 23（RC4）| Kerberoasting |
| `19700` | Kerberos TGS-REP etype 17（AES128）| Kerberoasting |
| `19800` | Kerberos TGS-REP etype 18（AES256）| Kerberoasting |
| `18200` | Kerberos AS-REP etype 23 | ASREPRoasting |
| `1000` | NTLM | secretsdump / Pass-The-Hash |
| `5600` | NetNTLMv2 | Responder / NTLM リレー |
| `0` | MD5 | 各種 |
| `100` | SHA1 | 各種 |

---

## 基本的なクラックコマンド

```bash
# Kerberoasting ハッシュ
hashcat -m 13100 hashes.txt /usr/share/wordlists/rockyou.txt

# ASREPRoasting ハッシュ
hashcat -m 18200 hashes.txt /usr/share/wordlists/rockyou.txt

# NTLM ハッシュ
hashcat -m 1000 hashes.txt /usr/share/wordlists/rockyou.txt
```

---

## ルールを使った強化

```bash
# best64 ルール（基本的な変形）
hashcat -m 13100 hashes.txt /usr/share/wordlists/rockyou.txt \
  -r /usr/share/hashcat/rules/best64.rule

# OneRuleToRuleThemAll（強力）
hashcat -m 13100 hashes.txt /usr/share/wordlists/rockyou.txt \
  -r /usr/share/hashcat/rules/OneRuleToRuleThemAll.rule
```

---

## マスクアタック（パスワードパターンがわかっている場合）

```bash
# ?u=大文字, ?l=小文字, ?d=数字, ?s=記号, ?a=全文字
# 例: 大文字1文字 + 小文字7文字 + 数字2文字
hashcat -m 13100 hashes.txt -a 3 ?u?l?l?l?l?l?l?l?d?d

# 既知のプレフィックス + 数字4桁
hashcat -m 13100 hashes.txt -a 3 Password?d?d?d?d
```

---

## よく使うオプション

| オプション | 説明 |
|-----------|------|
| `-m [MODE]` | ハッシュモード |
| `-a 0` | 辞書攻撃（デフォルト） |
| `-a 3` | マスク攻撃 |
| `-a 6` | 辞書 + マスクのハイブリッド |
| `-r [FILE]` | ルールファイルを適用 |
| `--show` | クラック済みハッシュを表示 |
| `-o [FILE]` | クラック結果をファイルに保存 |
| `--force` | 警告を無視して強制実行 |
| `-w 3` | ワークロードプロファイル（高） |

---

## GPU の使用確認と高速化

```bash
# GPU デバイスの確認
hashcat -I

# GPU を使ったクラック（自動で GPU を使用）
hashcat -m 13100 hashes.txt rockyou.txt -w 4 -O
```

---

## クラック済みハッシュの確認

```bash
# クラック済みを表示
hashcat -m 13100 hashes.txt --show

# ポットファイルの確認（クラック済みハッシュのキャッシュ）
cat ~/.hashcat/hashcat.potfile
```

---

## 注意点・落とし穴

- `rockyou.txt` が見つからない場合: `/usr/share/wordlists/rockyou.txt` または `gunzip /usr/share/wordlists/rockyou.txt.gz`
- GPU がない環境（VM等）では大幅に速度が低下する。CPU 専用の場合は `--force` が必要な場合がある
- ハッシュが AES 暗号化（etype 17/18）の場合は RC4（etype 23）より解析が困難。取得時に RC4 ダウングレードを試みる

---

## 関連技術
- Kerberoasting ハッシュの取得 → `../04_Post_Access_Windows_AD/Kerberos_Attacks/Kerberoasting.md`
- ASREPRoasting ハッシュの取得 → `../04_Post_Access_Windows_AD/Kerberos_Attacks/ASREPRoasting.md`
