"use client";

import { useState } from "react";
import { createGame } from "../actions";
import { useRouter } from "next/navigation";

export default function HostPage() {
  const [name, setName] = useState("");
  const router = useRouter();

  async function handleCreate() {
    if (!name) return;
    const game = await createGame(name);
    router.push(`/host/${game.code}`);
  }

  return (
    <div className="p-8">
      <h1 className="text-xl mb-4">Host a Game</h1>
      <input
        className="border p-2"
        placeholder="Your username"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <button
        className="ml-2 px-4 py-2 bg-blue-600 text-white rounded"
        onClick={handleCreate}
      >
        Create
      </button>
    </div>
  );
}
