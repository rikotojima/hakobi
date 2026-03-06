export const metadata = {
  title: "Hakobi — 面接調整、もっとスムーズに",
  description: "面接日程調整をスムーズにする社内ツール",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ja">
      <body style={{ margin: 0, padding: 0 }}>{children}</body>
    </html>
  );
}
