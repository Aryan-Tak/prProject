// app/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";


export default function MainPage() {
  const [ip, setIp] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`http://${ip}/ping`, { method: "GET" }); // Optional ping route
      if (res.ok) {
        localStorage.setItem("esp_ip", ip);
        router.push("/home");
      } else {
        setError("Could not connect to ESP32. Check IP and try again.");
      }
    } catch (err) {
      setError("Connection failed. Make sure ESP is online and reachable.");
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <Image
    src="/HERO-Crop-Production1.jpg"
    alt="Background Image"
    fill
    className="object-cover z-[-1]"
  />

      <h1 className="text-3xl font-bold mb-6 text-center text-gray-800">
        Enter ESP32 Motor IP Address
      </h1>
      <form onSubmit={handleSubmit} className="w-full max-w-sm">
        <input
          type="text"
          value={ip}
          onChange={(e) => setIp(e.target.value)}
          placeholder="e.g. 192.168.1.150"
          className="w-full p-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400 mb-4"
          required
        />
        {error && <p className="text-red-600 text-sm mb-2">{error}</p>}
        <button
          type="submit"
          className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 rounded-xl transition duration-300"
        >
          Connect
        </button>
      </form>
    </div>
  );
}
