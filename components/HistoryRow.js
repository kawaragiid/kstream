"use client";

import SliderRow from "./SliderRow";

export default function HistoryRow({ items = [], loading = false }) {
  return <SliderRow title="Lanjut Tonton" items={items} loading={loading} actionHref="/profile/history" />;
}
