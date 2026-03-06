# Hakobi — 面接調整、もっとスムーズに

面接日程調整をスムーズにする社内ツールです。

## ローカルで動かす

```bash
# 1. 依存パッケージをインストール
npm install

# 2. 開発サーバーを起動
npm run dev
```

ブラウザで http://localhost:3000 を開いてください。

## Vercelにデプロイする

1. [Vercel](https://vercel.com) にGitHubアカウントでログイン
2. 「Add New Project」→ このリポジトリを選択
3. 設定はそのままで「Deploy」をクリック

以上で公開URLが発行されます。

## 今後の予定

- [ ] Supabaseでデータ永続化
- [ ] Googleログイン（社内メンバー限定）
- [ ] Google Calendar連携（空き枠自動取得）
- [ ] Slack連携（リマインダー自動送信）
