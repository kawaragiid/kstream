"use client";

import { useEffect, useState } from 'react';
import HistoryRow from '../../../../components/HistoryRow';
import { getUserHistory } from '../../../../lib/firestore';
import { useAuth } from '../../../../hooks/useAuth';

export default function HistoryPage() {
  const { user, loading } = useAuth();
  const [items, setItems] = useState([]);
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    let active = true;
    if (!user) {
      setItems([]);
      return;
    }

    setFetching(true);
    getUserHistory(user.uid)
      .then((data) => {
        if (active) setItems(data);
      })
      .finally(() => {
        if (active) setFetching(false);
      });

    return () => {
      active = false;
    };
  }, [user]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-10">
        <p className="text-gray-500">Memuat riwayat...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-10">
        <p className="text-gray-600">Masuk untuk melihat riwayat tontonan kamu.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-10 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Riwayat Tonton</h1>
        <p className="text-gray-600">Lanjutkan tontonan terakhirmu.</p>
      </div>
      {fetching ? (
        <p className="text-sm text-gray-500">Mengambil riwayat...</p>
      ) : items.length ? (
        <HistoryRow items={items} />
      ) : (
        <p className="text-sm text-gray-500">Belum ada riwayat tontonan.</p>
      )}
    </div>
  );
}

