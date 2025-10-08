"use client";

import { useEffect, useState } from "react";
import HistoryRow from "./HistoryRow";
import { useAuth } from "../hooks/useAuth";
import { getUserHistory } from "../lib/firestore";

const HISTORY_LIMIT = 20;

export default function HomeHistoryRow() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user?.uid) {
      setItems([]);
      return;
    }
    let active = true;
    setLoading(true);
    getUserHistory(user.uid, HISTORY_LIMIT)
      .then((result) => {
        if (active) setItems(result || []);
      })
      .catch(() => {
        if (active) setItems([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [user?.uid]);

  if (!user || (!loading && items.length === 0)) {
    return null;
  }

  return (
    <div className="mx-auto w-full max-w-[120rem] px-4">
      <HistoryRow items={items} />
    </div>
  );
}
