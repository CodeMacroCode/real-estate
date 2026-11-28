import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="min-h-screen bg-paper text-ink flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-card-white border border-line p-8 sm:p-10 text-center shadow-hard-green">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brass mb-3">
          Error 404
        </p>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-ink-green mb-3">
          Page Not Found
        </h1>
        <p className="text-sm sm:text-base text-body-muted mb-8 leading-relaxed">
          The page you are looking for does not exist or may have been moved.
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center px-6 py-3 bg-ink-green text-white text-sm font-semibold tracking-wide hover:bg-mid-green transition-colors border border-ink-green shadow-hard-brass-sm"
        >
          Back to Home
        </Link>
      </div>
    </main>
  );
}
