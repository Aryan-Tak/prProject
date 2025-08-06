'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function MainPage() {
  const [motorEspIP, setMotorEspIP] = useState("");
  const [sensorEspIP, setSensorEspIP] = useState("");
  const [cameraIP, setCameraIP] = useState("");
  const [cameraPort, setCameraPort] = useState("8080");
  const [mlApiURL, setMlApiURL] = useState("http://localhost:5000");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!motorEspIP.trim() || !cameraIP.trim()) {
      setError("Please enter Motor ESP IP and Camera IP for basic functionality.");
      return;
    }

    localStorage.setItem("motorEspIP", motorEspIP);
    localStorage.setItem("sensorEspIP", sensorEspIP);
    localStorage.setItem("cameraIP", cameraIP);
    localStorage.setItem("cameraPort", cameraPort);
    localStorage.setItem("mlApiURL", mlApiURL);

    router.push("/home");
  }; 

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-blue-100 relative">
      <Image
        src="/HERO-Crop-Production1.jpg"
        alt="Background Image"
        fill
        className="object-cover z-[-1] opacity-40"
      />
      <h1 className="text-3xl font-bold mb-6 text-center text-gray-800">
        Smart Farm System Configuration
      </h1>

      <form onSubmit={handleSubmit} className="w-full max-w-lg bg-white p-6 rounded-xl shadow-lg space-y-4 z-10">
        {/* Motor ESP32 IP */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Motor ESP32 IP Address *
          </label>
          <input
            type="text"
            value={motorEspIP}
            onChange={(e) => setMotorEspIP(e.target.value)}
            placeholder="e.g. 192.168.1.100"
            className="w-full p-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-400 text-black"
            required
          />
        </div>

        {/* Sensor ESP32 IP */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Sensor ESP32 IP Address (Optional)
          </label>
          <input
            type="text"
            value={sensorEspIP}
            onChange={(e) => setSensorEspIP(e.target.value)}
            placeholder="e.g. 192.168.50.76"
            className="w-full p-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-400 text-black"
          />
        </div>

        {/* Camera Configuration */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Camera IP Address *
            </label>
            <input
              type="text"
              value={cameraIP}
              onChange={(e) => setCameraIP(e.target.value)}
              placeholder="e.g. 192.168.50.130"
              className="w-full p-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-400 text-black"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Camera Port
            </label>
            <input
              type="text"
              value={cameraPort}
              onChange={(e) => setCameraPort(e.target.value)}
              placeholder="8080"
              className="w-full p-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-400 text-black"
            />
          </div>
        </div>

        {/* ML API URL */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            ML API URL (For Disease Detection)
          </label>
          <input
            type="text"
            value={mlApiURL}
            onChange={(e) => setMlApiURL(e.target.value)}
            placeholder="http://localhost:5000"
            className="w-full p-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-400 text-black"
          />
        </div>

        {error && (
          <p className="text-red-500 text-sm">{error}</p>
        )}

        <button
          type="submit"
          className="w-full bg-green-600 text-white p-3 rounded-xl hover:bg-green-700 transition duration-300 font-semibold"
        >
           Initialize Farm System
        </button>

        <div className="text-xs text-gray-600 mt-4">
          <p>Motor ESP32: Controls robot movement</p>
          <p>Sensor ESP32: Handles irrigation sensors (optional)</p>
          <p>Camera: For live monitoring and ML analysis</p>
          <p>ML API: For plant disease detection</p>
        </div>
      </form>
    </div>
  );
}