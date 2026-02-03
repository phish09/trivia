import Link from "next/link"

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 relative">
      <div className="fixed inset-0 bg-black/70"></div>
      <h1 className="text-9xl font-bold text-gradient-brand-full mb-4 relative z-10">
        404
      </h1>
      <p className="text-2xl text-white relative z-10">
        Game not found. 😔
      </p>
      <Link href="/" className="border border-b-4 border-red-900 block w-full px-8 py-4 bg-gradient-to-r from-secondary to-tertiary text-white rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl hover:scale-105 transform transition-all duration-200 flex items-center justify-center gap-2 relative z-10 mt-8 max-w-xs">
        Start over
      </Link>
    </div>
  );
}
