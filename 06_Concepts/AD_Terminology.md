# AD 用語クイックリファレンス

## このファイルの位置づけ

`Windows_AD_Attack_Flow.md` を初めて読む際に「この用語は何を指しているのか」が分からなくなった時点で開く。
用語の意味だけを確認し、作業ファイルに戻ることを目的としているため、仕組みの深掘りはここには書かない。
「なぜその仕組みで攻撃が成立するのか」が知りたい場合は各用語の「原理」リンク先を参照すること。

---

## 用語一覧

| 用語 | 一言定義 | kedalab 内の詳細 |
|------|---------|----------------|
| **Active Directory（AD）** | Windows ドメイン環境でユーザー・PC・権限を一元管理する仕組み。「ドメイン」と呼ばれることが多い | — |
| **DC（ドメインコントローラー）** | AD を動かしているサーバー。認証・権限管理の中枢。88番（Kerberos）が開いていれば DC | `../00_Playbook/00_OS_Identification.md`（ポート判定表） |
| **Kerberos** | Windows AD 環境の認証プロトコル。チケット（TGT/TGS）を使って認証する。88番ポートで動く | `../06_Concepts/` に原理ファイルがあれば参照 |
| **NTLM ハッシュ** | Windows のパスワードを MD4 で変換した固定長文字列。クラック or Pass-The-Hash で使う | `../04_Post_Access_Windows_AD/Credential_Dumping.md` |
| **TGT（Ticket Granting Ticket）** | Kerberos の「認証済み証明書」。これを持っているとサービスへのアクセスを要求できる | — |
| **SMB** | ファイル共有・認証に使われる Windows のプロトコル。445番ポート。 | `../01_Reconnaissance/SMB_Enumeration.md` |
| **WinRM** | Windows のリモート管理プロトコル。5985番ポート。認証が通ればリモートシェルを取れる | — |
| **SYSVOL** | DC 上のファイル共有。ドメインポリシー・ログオンスクリプトが置かれる。匿名でアクセスできる設定ミスがある | `../01_Reconnaissance/SMB_Enumeration.md` |
| **GPP（Group Policy Preferences）** | グループポリシーの設定を XML で配布する仕組み。古い環境では暗号化パスワード（cpassword）が SYSVOL に残っていることがある | `../01_Reconnaissance/SMB_Enumeration.md` |
| **BloodHound** | AD の権限関係をグラフで可視化するツール。「誰が誰に何の権限を持っているか」を図示する | `../05_Tools_Reference/BloodHound.md` |
| **ACE（Access Control Entry）** | AD オブジェクト（ユーザー・PC 等）に対する個別の権限設定。「AユーザーはBに対してGenericAllを持つ」のような形で定義される | `../04_Post_Access_Windows_AD/ACE_Abuse/` |
| **GenericAll** | 対象オブジェクトに対する完全制御権限。パスワードリセット・Shadow Credentials 等に繋がる | `../04_Post_Access_Windows_AD/ACE_Abuse/` |
| **GenericWrite** | 対象オブジェクトの属性を書き換える権限。SPN 設定 → Kerberoasting 等に繋がる | `../04_Post_Access_Windows_AD/ACE_Abuse/` |
| **DCSync** | DC の複製機能を悪用してパスワードハッシュを引き出す攻撃。複製権限（Replication 権限）が必要 | `../04_Post_Access_Windows_AD/Credential_Dumping.md` |
| **Kerberoasting** | SPN（サービス主体名）付きのユーザーアカウントに対し、サービスチケットを要求してオフラインでクラックする手法 | `../04_Post_Access_Windows_AD/Kerberos_Attacks/Kerberoasting.md` |
| **ASREPRoasting** | 事前認証が不要なアカウントに対し、認証情報なしでハッシュを取得してクラックする手法 | `../04_Post_Access_Windows_AD/Kerberos_Attacks/ASREPRoasting.md` |
| **Pass-The-Hash（PTH）** | クラックせずに NTLM ハッシュをそのまま認証に使う手法。平文パスワードが不要 | — |
| **Pass-The-Ticket（PTT）** | Kerberos チケット（TGT/TGS）をそのまま認証に使う手法 | — |
| **RBCD（Resource-Based Constrained Delegation）** | 特定の条件下でサービスへの委任を設定し、任意のユーザーに成りすましてアクセスする攻撃手法 | `../04_Post_Access_Windows_AD/Delegation_Attacks/RBCD.md` |
| **evil-winrm** | WinRM 経由でリモートシェルを取るツール。Kali標準搭載。`evil-winrm -i [IP] -u [USER] -p [PASS]` | — |
| **nxc（NetExec）** | SMB・WinRM・MSSQL 等への認証テストを一括で行うツール（旧 CrackMapExec）。Kali標準搭載 | `../05_Tools_Reference/Netexec.md` |
| **RID（Relative Identifier）** | ドメイン内のオブジェクトに付く一意の番号。RID bruteforce でユーザーリストを作成できる | `../05_Tools_Reference/Netexec.md` |
| **SPN（Service Principal Name）** | Kerberos でサービスを識別するための識別子。SPN 付きアカウントは Kerberoasting の対象になる | `../04_Post_Access_Windows_AD/Kerberos_Attacks/Kerberoasting.md` |

---

## よく詰まる略語の対応表

| 略語 | 正式名称 |
|-----|---------|
| AD | Active Directory |
| DC | Domain Controller |
| GPP | Group Policy Preferences |
| ACE | Access Control Entry |
| ACL / DACL | Access Control List / Discretionary ACL |
| PTH | Pass-The-Hash |
| PTT | Pass-The-Ticket |
| TGT | Ticket Granting Ticket |
| TGS | Ticket Granting Service（ticket） |
| RBCD | Resource-Based Constrained Delegation |
| SPN | Service Principal Name |
| RID | Relative Identifier |
