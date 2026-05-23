import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'CloudOps - 小团队一体化云运维平台',
  description: '云盘存储 · 服务器管理 · 存储节点，一站式解决运维需求',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
