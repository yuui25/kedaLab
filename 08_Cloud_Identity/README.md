# 08_Cloud_Identity — クラウド ID 基盤（現在スコープ外）

> **このフォルダは現在 kedalab の対象範囲外です。**
>
> Entra ID（旧 Azure AD）・ハイブリッド AD 構成・クラウド ID 基盤に関する攻撃手順は
> 現時点では kedalab に収録していません。将来的な拡張に備え、扱う想定の領域と
> フォルダ構造の予約のみを記載しています。
>
> オンプレミス AD 範囲の技術は `04_Post_Access_Windows_AD/` を参照してください。

---

## 将来的に扱う想定の領域（見出し予約）

### Entra ID 列挙
Entra ID（旧 Azure AD）上のユーザー・グループ・アプリケーション・サービスプリンシパルの
列挙手法。Graph API・Azure CLI・PowerShell（Az / AzureAD / Microsoft.Graph モジュール）を用いた
情報収集。

### ハイブリッド AD 攻撃（Entra Connect / AD FS）
オンプレミス AD と Entra ID を同期する Entra Connect サーバーの悪用。
同期アカウント（MSOL_* / AADConnect アカウント）からのクレデンシャル取得と、
Azure AD Seamless SSO の Silver Ticket 相当攻撃（DesktopSSO / AZUREADSSOACC$）。

### Conditional Access バイパス
条件付きアクセスポリシーの抜け穴（対象外アプリ・レガシー認証プロトコル利用・
デバイスコンプライアンス回避・名前付き場所の悪用）。

### トークン窃取・セッションハイジャック
OAuth 2.0 / OIDC のアクセストークン・リフレッシュトークン・PRT（Primary Refresh Token）の
取得と再利用。AzureHound / ROADtools による Graph API ベースの情報収集。

### Illicit Consent Grant
OAuth 同意フィッシングによるアプリケーション権限付与の悪用。
悪意のある OAuth アプリへの管理者同意を誘導し、ユーザーデータや Graph API へのアクセスを取得する。

### マネージド ID・サービスプリンシパル悪用
Azure VM / ACI / App Service のマネージド ID を利用した、
メタデータエンドポイント（IMDS）からのアクセストークン取得と権限昇格。

---

## 追加予定のタイミング

ロードマップでは、以下の Phase 以降でこのフォルダに内容を追加予定：

| Phase | 対応内容 |
|-------|---------|
| ロードマップ外（未定） | Entra ID 列挙・ハイブリッド AD 攻撃 |

現時点での優先フェーズ（AD CS / NTLM Relay 系 / 特権トークン / DPAPI）が完了した後に
着手範囲を検討します。
