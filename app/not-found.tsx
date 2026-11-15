import Link from "next/link";

export default function NotFound() {
  return (
    <div className="grid min-h-[60vh] place-items-center text-center">
      <div>
        <p className="text-[13px] font-bold uppercase tracking-[0.2em] text-white/30">404</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">That title isn’t here</h1>
        <p className="mx-auto mt-2 max-w-sm text-[13.5px] leading-relaxed text-white/45">
          The provider may have removed it, or the link is stale.
        </p>
        <Link href="/" className="btn btn-primary mt-5">
          Back home
        </Link>
      </div>
    </div>
  );
}
