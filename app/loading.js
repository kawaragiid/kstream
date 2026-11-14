export default function Loading() {
  return (
    <div className="min-h-screen bg-[#141414] pb-16">
      {/* Hero Skeleton */}
      <div className="relative h-[58vh] sm:h-[68vh] w-full animate-pulse bg-white/[0.06]">
        <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-transparent to-black/40" />
        <div className="mx-auto flex h-full max-w-[120rem] flex-col justify-end gap-4 px-4 pb-12 sm:px-8 lg:px-12">
          <div className="h-10 w-64 sm:w-96 rounded bg-white/10" />
          <div className="h-4 w-80 sm:w-[32rem] rounded bg-white/10" />
          <div className="flex gap-3 pt-2">
            <div className="h-11 w-32 rounded-[4px] bg-white/15" />
            <div className="h-11 w-36 rounded-[4px] bg-white/10" />
          </div>
        </div>
      </div>

      {/* Rows Skeleton */}
      <div className="mx-auto mt-8 max-w-[120rem] space-y-10 px-4 sm:px-8">
        {[1, 2].map((row) => (
          <div key={row} className="space-y-4">
            <div className="h-6 w-48 animate-pulse rounded bg-white/10" />
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {[1, 2, 3, 4, 5].map((card) => (
                <div key={card} className="aspect-video animate-pulse rounded bg-white/[0.07]" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
