import Link from "next/link";

export default function Home() {
  return (
    <main className="p-8 text-center space-y-4">
      <h1 className="text-3xl font-bold">Trivia App</h1>

      <div className="space-x-4">
        <Link href="/host" className="px-4 py-2 bg-blue-600 text-white rounded">
          Host a Game
        </Link>
        <Link href="/join" className="px-4 py-2 bg-green-600 text-white rounded">
          Join a Game
        </Link>
      </div>
    </main>
  );
}
