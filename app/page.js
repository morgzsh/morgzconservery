'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/data';

export default function Home() {
  const r = useRouter();
  useEffect(() => {
    (async () => {
      const s = await api.session();
      if (!s) return r.replace('/login');
      const me = await api.me();
      r.replace(me?.role === 'admin' ? '/admin' : '/espace');
    })();
  }, [r]);
  return null;
}
