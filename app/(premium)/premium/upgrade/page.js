"use client";

import { useRouter } from 'next/navigation';
import { useAuth } from '../../../../hooks/useAuth';

const plans = [
  { id: 'basic', name: 'Basic', price: 'Rp39.000/bulan', features: ['Resolusi 720p', '1 perangkat'] },
  { id: 'standard', name: 'Standard', price: 'Rp79.000/bulan', features: ['Resolusi 1080p', '2 perangkat'] },
  { id: 'premium', name: 'Premium', price: 'Rp129.000/bulan', features: ['4K + HDR', '4 perangkat'] },
];

export default function UpgradePage() {
  const router = useRouter();
  const { user } = useAuth();

  const handleSelect = (planId) => {
    if (!user) {
      router.push('/login');
      return;
    }
    // TODO: Integrasi payment gateway / Firebase functions
    alert(`Pilih paket: ${planId}`);
  };

  return (
    <div className="container mx-auto px-4 py-10 space-y-8">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-semibold">Upgrade ke Premium</h1>
        <p className="text-gray-600">Nikmati kualitas terbaik dan akses penuh tanpa batasan.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {plans.map((plan) => (
          <div key={plan.id} className="rounded-lg border p-6 shadow-sm">
            <h2 className="text-xl font-semibold">{plan.name}</h2>
            <p className="mt-2 text-brand font-medium">{plan.price}</p>
            <ul className="mt-4 space-y-2 text-sm text-gray-600">
              {plan.features.map((feature) => (
                <li key={feature}>• {feature}</li>
              ))}
            </ul>
            <button
              onClick={() => handleSelect(plan.id)}
              className="mt-6 w-full rounded bg-brand px-4 py-2 text-white"
            >
              Pilih Paket
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

