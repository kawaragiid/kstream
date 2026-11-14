"use client";

import { useCallback, useEffect, useState } from "react";
import HistoryRow from "./HistoryRow";
import { useAuth } from "../hooks/useAuth";
import { getUserHistory } from "../lib/firestore";

const HISTORY_LIMIT = 20;

export default function HomeHistoryRow() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchHistory = useCallback(
    async (uid, signal) => {
      if (!uid) {
        setItems([]);
        return;
      }
      setLoading(true);
      try {
        const result = await getUserHistory(uid, HISTORY_LIMIT);
        if (!signal?.aborted) {
          setItems(result || []);
        }
      } catch {
        if (!signal?.aborted) {
          setItems([]);
        }
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    []
  );

  useEffect(() => {
    const controller = new AbortController();
    fetchHistory(user?.uid, controller.signal);

    const handleRefresh = () => {
      if (user?.uid) {
        fetchHistory(user.uid, controller.signal);
      }
    };
    const handleVisibility = () => {
      if (document.visibilityState === "visible" && user?.uid) {
        fetchHistory(user.uid, controller.signal);
      }
    };

    window.addEventListener("focus", handleRefresh);
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("kstream:history-updated", handleRefresh);

    return () => {
      controller.abort();
      window.removeEventListener("focus", handleRefresh);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("kstream:history-updated", handleRefresh);
    };
  }, [user?.uid, fetchHistory]);

  if (!user || items.length === 0) {
    return null;
  }

  return (
    <div className="mx-auto w-full max-w-[120rem] px-4">
      <HistoryRow items={items} loading={loading} />
    </div>
  );
}
