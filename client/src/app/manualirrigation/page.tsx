"use client";

import React, { useEffect, useState } from "react";
import {
  IconArrowUp,
  IconArrowDown,
  IconArrowLeft,
  IconArrowRight,
  IconSquare,
  IconWifi,
  IconWifiOff,
} from "@tabler/icons-react";

interface MotorStatus {
  motor1: string;
  motor2: string;
  motor3: string;
  motor4: string;
}

const RobotControl: React.FC = () => {
  const [connected, setConnected] = useState<boolean>(false);
  const [currentCommand, setCurrentCommand] = useState<string>("stop");
  const [motorStatus, setMotorStatus] = useState<MotorStatus>({
    motor1: "off",
    motor2: "off",
    motor3: "off",
    motor4: "off",
  });
  const [activeKeys, setActiveKeys] = useState<Set<string>>(new Set());
  const [connecting, setConnecting] = useState<boolean>(false);
  const [espIP, setEspIP] = useState<string>("192.168.4.1");

  const sendCommand = async (command: string) => {
    if (!connected) return;

    setCurrentCommand(command);

    try {
      const response = await fetch(`http://${espIP}/${command}`);
      const data = await response.json();
      setMotorStatus(data);
    } catch (err) {
      console.error("Failed to send command:", err);
    }
  };

  const checkConnection = async () => {
    setConnecting(true);
    try {
      const response = await fetch(`http://${espIP}/status`, {
        signal: AbortSignal.timeout(3000),
      });
      const data = await response.json();
      if (data.status === "ok") {
        setConnected(true);
      }
    } catch {
      setConnected(false);
    } finally {
      setConnecting(false);
    }
  };

  useEffect(() => {
    checkConnection();

    const interval = setInterval(checkConnection, 10000);
    return () => clearInterval(interval);
  }, [espIP]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();

      if (!activeKeys.has(key) && ["w", "a", "s", "d"].includes(key)) {
        const newActiveKeys = new Set(activeKeys);
        newActiveKeys.add(key);
        setActiveKeys(newActiveKeys);

        if (key === "w") sendCommand("forward");
        else if (key === "s") sendCommand("backward");
        else if (key === "a") sendCommand("left");
        else if (key === "d") sendCommand("right");
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();

      if (activeKeys.has(key)) {
        const newActiveKeys = new Set(activeKeys);
        newActiveKeys.delete(key);
        setActiveKeys(newActiveKeys);

        if (newActiveKeys.size === 0 && ["w", "a", "s", "d"].includes(key)) {
          sendCommand("stop");
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [activeKeys, connected]);

  const getKeyClassName = (key: string) => {
    return activeKeys.has(key)
      ? "bg-green-500 text-white"
      : "bg-dbfce7 text-gray-800 hover:bg-green-100";
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white">
      <div className="w-full max-w-md p-6 bg-white rounded-xl shadow-lg">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Robot Control</h1>
          <div className="flex items-center">
            {connected ? (
              <IconWifi className="text-green-500 mr-2" size={24} />
            ) : (
              <IconWifiOff className="text-red-500 mr-2" size={24} />
            )}
            <span className={connected ? "text-green-500" : "text-red-500"}>
              {connected ? "Connected" : "Disconnected"}
            </span>
          </div>
        </div>

        <div className="mb-6">
          <div className="flex items-center mb-3">
            <input
              type="text"
              value={espIP}
              onChange={(e) => setEspIP(e.target.value)}
              className="flex-grow p-2 border border-gray-300 rounded-l-lg text-black"
              placeholder="ESP32 IP Address"
            />
            <button
              onClick={checkConnection}
              disabled={connecting}
              className="px-4 py-2 bg-dbfce7 text-gray-800 rounded-r-lg hover:bg-green-100 disabled:opacity-50"
            >
              {connecting ? "Connecting..." : "Connect"}
            </button>
          </div>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg mb-6">
          <h2 className="text-lg font-semibold mb-2 text-gray-700">Status</h2>
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2 bg-white rounded border border-gray-200">
              <p className="text-sm font-medium text-gray-500">Command</p>
              <p className="font-semibold">{currentCommand}</p>
            </div>
            {Object.entries(motorStatus).map(([motor, status]) => (
              <div key={motor} className="p-2 bg-white rounded border border-gray-200">
                <p className="text-sm font-medium text-gray-500">
                  {motor.charAt(0).toUpperCase() + motor.slice(1)}
                </p>
                <p className="font-semibold">{status}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mb-8">
          <div className="grid grid-cols-3 gap-3 max-w-xs mx-auto">
            {/* Top row - Forward button */}
            <div className="col-start-2">
              <button
                onMouseDown={() => sendCommand("forward")}
                onMouseUp={() => sendCommand("stop")}
                onMouseLeave={() => activeKeys.has("w") && sendCommand("stop")}
                onTouchStart={() => sendCommand("forward")}
                onTouchEnd={() => sendCommand("stop")}
                className={`w-full aspect-square flex items-center justify-center rounded-xl transition-colors ${getKeyClassName("w")}`}
                style={{ backgroundColor: activeKeys.has("w") ? "#4ade80" : "#dbfce7" }}
              >
                <div className="flex flex-col items-center">
                  <IconArrowUp size={28} />
                  <span className="text-sm mt-1">W</span>
                </div>
              </button>
            </div>

            {/* Middle row - Left, Stop, Right buttons */}
            <div>
              <button
                onMouseDown={() => sendCommand("left")}
                onMouseUp={() => sendCommand("stop")}
                onMouseLeave={() => activeKeys.has("a") && sendCommand("stop")}
                onTouchStart={() => sendCommand("left")}
                onTouchEnd={() => sendCommand("stop")}
                className={`w-full aspect-square flex items-center justify-center rounded-xl transition-colors ${getKeyClassName("a")}`}
                style={{ backgroundColor: activeKeys.has("a") ? "#4ade80" : "#dbfce7" }}
              >
                <div className="flex flex-col items-center">
                  <IconArrowLeft size={28} />
                  <span className="text-sm mt-1">A</span>
                </div>
              </button>
            </div>

            <div>
              <button
                onClick={() => sendCommand("stop")}
                className="w-full aspect-square flex items-center justify-center rounded-xl bg-red-100 text-red-700 hover:bg-red-200"
              >
                <div className="flex flex-col items-center">
                  <IconSquare size={28} />
                  <span className="text-sm mt-1">STOP</span>
                </div>
              </button>
            </div>

            <div>
              <button
                onMouseDown={() => sendCommand("right")}
                onMouseUp={() => sendCommand("stop")}
                onMouseLeave={() => activeKeys.has("d") && sendCommand("stop")}
                onTouchStart={() => sendCommand("right")}
                onTouchEnd={() => sendCommand("stop")}
                className={`w-full aspect-square flex items-center justify-center rounded-xl transition-colors ${getKeyClassName("d")}`}
                style={{ backgroundColor: activeKeys.has("d") ? "#4ade80" : "#dbfce7" }}
              >
                <div className="flex flex-col items-center">
                  <IconArrowRight size={28} />
                  <span className="text-sm mt-1">D</span>
                </div>
              </button>
            </div>

            {/* Bottom row - Backward button */}
            <div className="col-start-2">
              <button
                onMouseDown={() => sendCommand("backward")}
                onMouseUp={() => sendCommand("stop")}
                onMouseLeave={() => activeKeys.has("s") && sendCommand("stop")}
                onTouchStart={() => sendCommand("backward")}
                onTouchEnd={() => sendCommand("stop")}
                className={`w-full aspect-square flex items-center justify-center rounded-xl transition-colors ${getKeyClassName("s")}`}
                style={{ backgroundColor: activeKeys.has("s") ? "#4ade80" : "#dbfce7" }}
              >
                <div className="flex flex-col items-center">
                  <IconArrowDown size={28} />
                  <span className="text-sm mt-1">S</span>
                </div>
              </button>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-4">
          <p className="text-sm text-gray-600">
            Use WASD keys or buttons to control the robot.
            Press and hold for continuous movement, release to stop.
          </p>
        </div>
      </div>
    </div>
  );
};

export default RobotControl;
