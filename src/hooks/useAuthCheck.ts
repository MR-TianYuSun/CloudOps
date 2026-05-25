'use client';

import { useState, useEffect } from 'react';

interface UserInfo {
  id: number;
  username: string;
  displayName: string;
  role: string;
}

export function useAuthCheck() {
  const [checked, setChecked] = useState(false);
  const [user, setUser] = useState<UserInfo | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      window.location.href = '/login';
      return;
    }
    fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        if (data.code === 200) {
          setUser(data.data);
          setChecked(true);
        } else {
          localStorage.removeItem('token');
          window.location.href = '/login';
        }
      })
      .catch(() => {
        localStorage.removeItem('token');
        window.location.href = '/login';
      });
  }, []);

  return checked;
}

export function useDesktopUser() {
  const [user, setUser] = useState<UserInfo | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        if (data.code === 200) setUser(data.data);
      })
      .catch(() => {});
  }, []);

  return user;
}
