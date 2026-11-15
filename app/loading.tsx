export default function Loading() {
  return (
    <div className="space-y-9">
      <div className="skeleton h-56 w-full rounded-[28px] sm:h-72" />
      {[0, 1].map((r) => (
        <div key={r} className="space-y-3">
          <div className="skeleton h-5 w-40 rounded-lg" />
          <div className="flex gap-3 overflow-hidden">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="skeleton h-[222px] w-[148px] shrink-0 rounded-[18px]" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
