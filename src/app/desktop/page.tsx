'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Desktop from '@/components/desktop/Desktop';

export default function DesktopPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        if (data.code === 200) {
          setAuthorized(true);
        } else {
          router.push('/login');
        }
      })
      .catch(() => router.push('/login'))
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#070A14]">
        <div className="text-white/60 text-sm animate-pulse">加载桌面...</div>
      </div>
    );
  }

  if (!authorized) return null;

  return <Desktop />;
}
