# 技術インデックス

全ての技術・手法の横断検索用インデックス。新しい技術を追加したらここにも1行追記する。

**フォーマット:** `技術名 | カテゴリ | ファイルパス`

---

## 調査・列挙

| 技術名 | カテゴリ | ファイルパス |
|--------|---------|------------|
| ポートスキャン（nmap） | Reconnaissance | `01_Reconnaissance/Network_Scanning.md` |
| OS判定（TTL・ポート構成・HTTPヘッダー・SMBバナー・SSH バナー） | Reconnaissance | `00_Playbook/00_OS_Identification.md` |
| robots.txt からの隠しパス発見 | Reconnaissance | `01_Reconnaissance/Web_Enumeration.md` |
| サービスバージョン検出 | Reconnaissance | `01_Reconnaissance/Network_Scanning.md` |
| IPレンジからDockerコンテナを特定（172.17.0.x） | Reconnaissance | `01_Reconnaissance/Network_Scanning.md` |
| コンテナ環境の確認（/.dockerenv / /etc/hosts / ip addr） | Post Access Linux | `03_Post_Access_Linux/Enumeration_Checklist.md` |
| Webディレクトリ列挙（gobuster） | Reconnaissance | `01_Reconnaissance/Web_Enumeration.md` |
| vhostファジング | Reconnaissance | `01_Reconnaissance/Web_Enumeration.md` |
| Webアプリバージョン特定（/api/health 等） | Reconnaissance | `01_Reconnaissance/Web_Enumeration.md` |
| searchsploit による CVE 検索 | Reconnaissance | `05_Tools_Reference/Searchsploit.md` |
| SMB匿名アクセス | Reconnaissance | `01_Reconnaissance/SMB_Enumeration.md` |
| SYSVOL / Replication 内部ナビゲーション観点（GPO構造・フォルダ優先度） | Reconnaissance | `01_Reconnaissance/SMB_Enumeration.md` |
| SYSVOL列挙 | Reconnaissance | `01_Reconnaissance/SMB_Enumeration.md` |
| GPP 認証情報取得（Groups.xml / cpassword / gpp-decrypt） | Reconnaissance → Initial Access | `01_Reconnaissance/SMB_Enumeration.md` |
| LDAP ユーザー列挙 | Reconnaissance | `01_Reconnaissance/LDAP_Enumeration.md` |
| LDAP カスタム属性の確認（info / description） | Reconnaissance | `01_Reconnaissance/LDAP_Enumeration.md` |
| LDAP 経由の Kerberoast / AS-REP Roast 候補抽出（SPN・DONT_REQ_PREAUTH） | Reconnaissance | `01_Reconnaissance/LDAP_Enumeration.md` |
| LDAP 匿名バインド / namingcontexts 確認 | Reconnaissance | `01_Reconnaissance/LDAP_Enumeration.md` |

---

## 初期アクセス

| 技術名 | カテゴリ | ファイルパス |
|--------|---------|------------|
| 難読化JavaScript解析（eval/Packer形式・console.log置換・de4js） | Initial Access | `02_Initial_Access/Web_Vulnerabilities/JS_Obfuscation.md` |
| ROT13 / Base64 APIレスポンスのデコード | Initial Access | `02_Initial_Access/Web_Vulnerabilities/JS_Obfuscation.md` |
| OSコマンドインジェクション（セミコロン・パイプ・バッククォート） | Initial Access | `02_Initial_Access/Web_Vulnerabilities/Command_Injection.md` |
| APIパラメータ改ざんによる権限昇格（is_admin=1・Broken Function Level Authorization） | Initial Access | `02_Initial_Access/Web_Vulnerabilities/Command_Injection.md` |
| リバースシェル（bash -c 'bash -i >& /dev/tcp/...'） | Initial Access | `02_Initial_Access/Web_Vulnerabilities/Command_Injection.md` |
| curlシングルクォートエスケープ（'"'"'パターン） | Initial Access | `02_Initial_Access/Web_Vulnerabilities/Command_Injection.md` |
| クロスサイトスクリプティング（XSS）— 反射型・格納型・DOM型 | Initial Access | `02_Initial_Access/Web_Vulnerabilities/XSS.md` |
| XSS セッショントークン窃取（Cookie スティーリング）| Initial Access | `02_Initial_Access/Web_Vulnerabilities/XSS.md` |
| XSS DOM偽装・フィッシングリダイレクト | Initial Access | `02_Initial_Access/Web_Vulnerabilities/XSS.md` |
| 入力バイパス — エンコーディング・難読化によるフィルタ回避（HTML / URL / ダブルエンコーディング） | Initial Access | `02_Initial_Access/Web_Vulnerabilities/XSS.md` |
| ソーシャルエンジニアリング（フィッシング・スピアフィッシング・BEC） | Initial Access | `02_Initial_Access/Social_Engineering.md` |
| プリテキスティング（IT サポート・監査員・ベンダーを装った認証情報詐取） | Initial Access | `02_Initial_Access/Social_Engineering.md` |
| ベイティング（感染USB放置・偽ダウンロードリンク） | Initial Access | `02_Initial_Access/Social_Engineering.md` |
| パストラバーサル（ディレクトリトラバーサル） | Initial Access | `02_Initial_Access/Web_Vulnerabilities/Path_Traversal.md` |
| Grafana パストラバーサル CVE-2021-43798 | Initial Access | `02_Initial_Access/Web_Vulnerabilities/Path_Traversal.md` |
| IDOR（連番ID・オブジェクト直接参照） | Initial Access | `02_Initial_Access/Web_Vulnerabilities/IDOR.md` |
| SQLインジェクション | Initial Access | `02_Initial_Access/Web_Vulnerabilities/SQLi.md` |
| タイムベースブラインドSQLi（時間遅延オラクル） | Initial Access | `02_Initial_Access/Web_Vulnerabilities/SQLi.md` |
| CMS Made Simple SQLi（CVE-2019-9053）| Initial Access | `02_Initial_Access/Web_Vulnerabilities/SQLi.md` |
| MD5+Salt ハッシュのクラック（mode 20） | Initial Access | `05_Tools_Reference/Hashcat.md` |
| ハッシュ形式の特定（hashid / 形式文字列の読み方 / --example-hashes） | Initial Access | `05_Tools_Reference/Hashcat.md` |
| Flask / Werkzeug PBKDF2 ハッシュのクラック（mode 10000 変換） | Initial Access | `05_Tools_Reference/Hashcat.md` |
| SSRF（サーバーサイドリクエストフォージェリ） | Initial Access | `02_Initial_Access/Web_Vulnerabilities/SSRF.md` |
| PCAPからの平文認証情報抽出 | Initial Access | `02_Initial_Access/Credential_Discovery.md` |
| WebアプリDB（SQLite等）からのハッシュ取得 | Initial Access | `02_Initial_Access/Credential_Discovery.md` |
| PBKDF2-HMAC-SHA256 ハッシュのクラック（mode 10900） | Initial Access | `05_Tools_Reference/Hashcat.md` |
| スクリプトへの平文パスワード埋め込み | Initial Access | `02_Initial_Access/Credential_Discovery.md` |
| GPP cpassword の復号（gpp-decrypt） | Initial Access | `02_Initial_Access/Credential_Discovery.md` |
| Webアプリ .env ファイルからの認証情報取得（DB_PASSWORD・パスワード使い回し） | Initial Access | `02_Initial_Access/Credential_Discovery.md` |
| LDAPカスタム属性への平文パスワード | Initial Access | `02_Initial_Access/Credential_Discovery.md` |
| パスワードの使い回し確認 | Initial Access | `02_Initial_Access/Credential_Discovery.md` |
| strings コマンドによる文字列抽出 | Initial Access | `02_Initial_Access/Binary_Analysis.md` |
| .NET バイナリ逆コンパイル | Initial Access | `02_Initial_Access/Binary_Analysis.md` |
| XOR暗号化パスワードの復号 | Initial Access | `02_Initial_Access/Binary_Analysis.md` |
| FTP匿名ログイン | Initial Access | `02_Initial_Access/Protocol_Exploitation.md` |
| FTP平文通信からの認証情報取得 | Initial Access | `02_Initial_Access/Protocol_Exploitation.md` |
| SSH バージョンユーザー列挙（CVE-2018-15473） | Initial Access | `02_Initial_Access/Protocol_Exploitation.md` |
| SSH 秘密鍵パスフレーズクラック（ssh2john） | Initial Access | `02_Initial_Access/Protocol_Exploitation.md` |
| WinRM (evil-winrm) | Initial Access | `02_Initial_Access/Protocol_Exploitation.md` |
| WinRM Pass-The-Hash | Initial Access | `02_Initial_Access/Protocol_Exploitation.md` |
| RPC / rpcclient ユーザー列挙 | Initial Access | `02_Initial_Access/Protocol_Exploitation.md` |
| impacket-lookupsid による RID bruteforce | Initial Access | `02_Initial_Access/Protocol_Exploitation.md` |
| MSSQL 列挙・悪用（impacket-mssqlclient / DB列挙・ハッシュ取得） | Initial Access | `02_Initial_Access/MSSQL_Exploitation.md` |
| MSSQL ユーザーなりすまし（enum_impersonate / EXECUTE AS LOGIN） | Initial Access | `02_Initial_Access/MSSQL_Exploitation.md` |
| MSSQL xp_cmdshell による OS コマンド実行 | Initial Access | `02_Initial_Access/MSSQL_Exploitation.md` |

---

## Linux 侵入後

| 技術名 | カテゴリ | ファイルパス |
|--------|---------|------------|
| 侵入後列挙チェックリスト | Post Access Linux | `03_Post_Access_Linux/Enumeration_Checklist.md` |
| id コマンド出力のグループ解析（staff/lxd/docker/disk/shadow 等） | Post Access Linux | `03_Post_Access_Linux/Enumeration_Checklist.md` |
| PAM 設定不備による権限昇格（update-motd.d + PATH ハイジャック） | Post Access Linux | `03_Post_Access_Linux/PAM_Misconfig.md` |
| staff グループ + PATH ハイジャック → root | Post Access Linux | `03_Post_Access_Linux/PAM_Misconfig.md` |
| Linux Capabilities（cap_setuid等）による昇格 | Post Access Linux | `03_Post_Access_Linux/Capabilities.md` |
| SUID バイナリの悪用 | Post Access Linux | `03_Post_Access_Linux/SUID_SGID.md` |
| SGID バイナリの悪用 | Post Access Linux | `03_Post_Access_Linux/SUID_SGID.md` |
| sudo 設定不備による昇格 | Post Access Linux | `03_Post_Access_Linux/Sudo_Misconfig.md` |
| sudo docker exec ワイルドカード NOPASSWD | Post Access Linux | `03_Post_Access_Linux/Sudo_Misconfig.md` |
| シェル安定化（TTYアップグレード・python3 pty.spawn・stty raw -echo） | Post Access Linux | `03_Post_Access_Linux/Shell_Stabilization.md` |
| /var/mail/<username> 確認（システムメール・脆弱性ヒント） | Post Access Linux | `03_Post_Access_Linux/Enumeration_Checklist.md` |
| カーネルエクスプロイト（CVE探索・PoC転送・Cソースコンパイル・2プロセス並行実行） | Post Access Linux | `03_Post_Access_Linux/Kernel_Exploits.md` |
| CVE-2023-0386（OverlayFS + FUSE カーネル特権昇格） | Post Access Linux | `03_Post_Access_Linux/Kernel_Exploits.md` |
| python3 -m http.server によるファイル転送（攻撃側HTTP配信 + wget取得） | Post Access Linux | `03_Post_Access_Linux/Kernel_Exploits.md` |
| Docker コンテナからホストへのブレイクアウト（ブロックデバイスマウント） | Post Access Linux | `03_Post_Access_Linux/Sudo_Misconfig.md` |

---

## Windows AD 侵入後

| 技術名 | カテゴリ | ファイルパス |
|--------|---------|------------|
| AD 侵入後列挙チェックリスト | Post Access AD | `04_Post_Access_Windows_AD/Enumeration_Checklist.md` |
| 特権トークン（SeXxxPrivilege）の確認 | Post Access AD | `04_Post_Access_Windows_AD/Enumeration_Checklist.md` |
| Get-ComputerInfo による OS バージョン・ビルド番号確認 | Post Access AD | `04_Post_Access_Windows_AD/Enumeration_Checklist.md` |
| inetpub（IIS Webルート）のソースコード・設定ファイル確認 | Post Access AD | `04_Post_Access_Windows_AD/Enumeration_Checklist.md` |
| Windows PoC 取得・転送・実行（evil-winrm upload / IWR / certutil） | Post Access AD | `04_Post_Access_Windows_AD/Enumeration_Checklist.md` |
| netexec RID bruteforce によるドメインユーザー列挙 | Reconnaissance | `05_Tools_Reference/Netexec.md` |
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
| nmap（-sC 出力の読み方・AD環境向け） | `05_Tools_Reference/Nmap.md` |
| BloodHound / bloodhound-python | `05_Tools_Reference/BloodHound.md` |
| Impacket スイート全般 | `05_Tools_Reference/Impacket_Suite.md` |
| hashcat | `05_Tools_Reference/Hashcat.md` |
| searchsploit（バージョン検索・ファイル操作・Nmap XML連携） | `05_Tools_Reference/Searchsploit.md` |
| 複数CVE候補からの絞り込み基準（バージョン一致・OS一致・パッチ前確認・前提条件） | `05_Tools_Reference/Searchsploit.md` |
| Exploit-DB Web・NVD・GitHub PoC の使い分け | `05_Tools_Reference/Searchsploit.md` |
| netexec（nxc）/ CrackMapExec — パスワードスプレー・SMB/WinRM認証確認 | `05_Tools_Reference/Netexec.md` |

---

## 原理・背景（セキュリティ）

作業ファイル（01〜05）から参照される動作原理の解説ファイル群。作業中ではなく「なぜその手が効くのか」「環境が違うときどこを見るか」を確認したいときに開く。

| 原理 | 参照元の作業ファイル | ファイルパス |
|------|-----------------|------------|
| OS フィンガープリンティング（TTL 初期値の由来・FS の大文字小文字区別の仕様差） | `00_Playbook/00_OS_Identification.md` | `06_Concepts/OS_Fingerprinting_Principles.md` |
| GPP cpassword の暗号化・復号原理（固定鍵の公開・MS14-025後の挙動） | `01_Reconnaissance/SMB_Enumeration.md` / `02_Initial_Access/Credential_Discovery.md` | `06_Concepts/GPP_Credential.md` |
| PAM の動作原理（session スタック・pam_motd・PATH ハイジャックが成立する条件） | `03_Post_Access_Linux/PAM_Misconfig.md` / `03_Post_Access_Linux/Enumeration_Checklist.md` | `06_Concepts/PAM.md` |
| Docker の分離機構（namespace / cgroup / capability とブロックデバイス可視性） | `03_Post_Access_Linux/Sudo_Misconfig.md`（パターン4） | `06_Concepts/Docker_Isolation.md` |

---

## AI / 機械学習

AI/ML・機械学習関連の技術インデックスは分離ファイルを参照：`TECHNIQUES_INDEX_AI_ML.md`

---

*新しい技術を追加した際は、このファイルにも1行追記してください。*
