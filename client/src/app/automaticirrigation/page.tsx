"use client";

import { useEffect, useRef, useState } from "react";

type StatusType = {
  leftMotor: string;
  rightMotor: string;
};

export default function ManualIrrigationPage() {
  const [espIP, setEspIP] = useState<string>("");
  const [status, setStatus] = useState<StatusType>({ leftMotor: "", rightMotor: "" });
  const isKeyPressed = useRef<{ [key: string]: boolean }>({});

  const ipCamURL = "http://100.127.1.227:8080"; // Set static IP in IP Webcam app

  useEffect(() => {
    const savedIP = localStorage.getItem("espIP");
    if (savedIP) setEspIP(savedIP);
  }, []);

  const sendCommand = async (command: string) => {
    try {
      if (!espIP) return;
      const res = await fetch(`http://${espIP}/${command}`);
      const data = await res.json();
      setStatus(data);
    } catch (error) {
      console.warn("ESP8266 not reachable");
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (isKeyPressed.current[e.key]) return;
    isKeyPressed.current[e.key] = true;

    switch (e.key.toLowerCase()) {
      case "w":
        sendCommand("forward");
        break;
      case "a":
        sendCommand("left");
        break;
      case "s":
        sendCommand("backward");
        break;
      case "d":
        sendCommand("right");
        break;
    }
  };

  const handleKeyUp = (e: KeyboardEvent) => {
    isKeyPressed.current[e.key] = false;
    sendCommand("stop");
  };

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [espIP]);

  return (
    <div className="p-6 bg-[#ffc564] min-h-screen flex flex-col items-center">
      <h1 className="text-3xl font-bold mb-6">🚜 Manual Irrigation Control</h1>

      {/* ESP IP Setup */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Enter ESP IP (e.g. 192.168.50.100)"
          value={espIP}
          onChange={(e) => setEspIP(e.target.value)}
          className="px-4 py-2 rounded-xl border-2 border-gray-500"
        />
        <button
          onClick={() => localStorage.setItem("espIP", espIP)}
          className="ml-3 px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700"
        >
          Save
        </button>
      </div>

      {/* Video Stream */}
      <div className="mt-6 w-full max-w-2xl aspect-video bg-black rounded-xl overflow-hidden border-4 border-gray-700 flex flex-col items-center justify-center">
        <video
          id="ipcam"
          src={ipCamURL}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />
        <button
          onClick={() => {
            const video = document.getElementById("ipcam") as HTMLVideoElement;
            if (!video) return;

            const canvas = document.createElement("canvas");
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;

            const ctx = canvas.getContext("2d");
            if (ctx) {
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              const link = document.createElement("a");
              link.download = `snapshot-${Date.now()}.png`;
              link.href = canvas.toDataURL("image/png");
              link.click();
            }
          }}
          className="mt-4 px-6 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700"
        >
          📸 Take Screenshot
        </button>
      </div>

      {/* Control Buttons */}
      <div className="mt-8 grid grid-cols-3 gap-4">
        <div />
        <button
          onClick={() => sendCommand("forward")}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-xl"
        >
          ↑
        </button>
        <div />

        <button
          onClick={() => sendCommand("left")}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-xl"
        >
          ←
        </button>
        <button
          onClick={() => sendCommand("stop")}
          className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-6 rounded-xl"
        >
          ⏹ Stop
        </button>
        <button
          onClick={() => sendCommand("right")}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-xl"
        >
          →
        </button>

        <div />
        <button
          onClick={() => sendCommand("backward")}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-xl"
        >
          ↓
        </button>
        <div />
      </div>

      {/* Status Display */}
      <div className="mt-6 text-center text-lg font-mono">
        <p>Left Motor: {status.leftMotor || "..."}</p>
        <p>Right Motor: {status.rightMotor || "..."}</p>
      </div>
    </div>
  );
}
