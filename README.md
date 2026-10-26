# 溶液仕込みプランナー

研究室での溶液調製を支援するWebアプリです。物質・目的溶液を入力すると、マスター液の秤量・分注量・溶媒補完量を計算します。

公開URL: https://tamada24h.github.io/Solution-Calculator/

## 機能

- 汎用モード：物質ごとに最終濃度を指定
- 太陽電池溶液モード：全濃度＋重量比＋溶媒組成（DIO後添加対応）
- 実秤量値に応じた再計算
- マスター濃度の自動提案ON/OFF
- プリセット保存・共有URL・QRコード
- 入力内容の自動保存・「前の条件に戻す」

## デプロイ方法

`deploy.py` が `index.html` `app.js` `styles.css` `robots.txt` `.nojekyll` `qrcode.min.js` `README.md` をGitHubへアップロードします。

### 1. GitHubトークンの発行（はじめての場合）

1. GitHubにログイン
2. 右上のプロフィールアイコン → **Settings**
3. 左メニュー一番下の **Developer settings**
4. **Personal access tokens → Tokens (classic)**
5. **Generate new token → Generate new token (classic)**
6. Noteに名前（例：`solution-deploy`）を入力、有効期限を選択
7. スコープで **repo** にチェック
8. 一番下の **Generate token**
9. 表示された `ghp_` で始まる文字列をコピー（一度しか表示されません）

Fine-grainedトークンを使う場合は、対象リポジトリに **Contents: Read and write** 権限が必要です。

トークンを忘れた・失効した場合は同じ手順で再発行してください。

### 2. デプロイ実行

PowerShellで：

```powershell
cd "C:\Users\STD2025-09\CascadeProjects\solution-prep-calculator"
$env:GITHUB_TOKEN="ghp_発行したトークン"
py deploy.py
```

すべて `OK:` と表示されれば成功です。GitHub Pagesへの反映は数十秒〜数分かかることがあります。

### 3. 確認

https://tamada24h.github.io/Solution-Calculator/ を開き、`Ctrl + F5` で強制再読み込みします。

## トラブルシューティング

- `HTTP 401 Bad credentials`：トークンが違う、または失効しています。再発行してください。
- `HTTP 403 Resource not accessible`：トークンの権限不足です。classicなら `repo`、fine-grainedなら `Contents: Read and write` が必要です。
- 変更が見えない：ブラウザのキャッシュです。`Ctrl + F5` で強制再読み込みするか、`index.html` 内の `?v=数字` を上げて再デプロイしてください。
