"use client";

import { useEffect, useRef, useState } from "react";

type StatusType = {
  leftMotor: string;
  rightMotor: string;
  pumpStatus?: string;
};

export default function ManualIrrigationPage() {
  const [espIP, setEspIP] = useState<string>("192.168.1.100");
  const [pumpIP, setPumpIP] = useState<string>("192.168.248.100"); // ESP32 for pump control
  const [cameraIP, setCameraIP] = useState<string>("192.168.50.130");
  const [cameraPort, setCameraPort] = useState<string>("8080");
  const [status, setStatus] = useState<StatusType>({ leftMotor: "", rightMotor: "", pumpStatus: "" });
  const [isConnected, setIsConnected] = useState(false);
  const [isPumpConnected, setIsPumpConnected] = useState(false);
  const [lastCommand, setLastCommand] = useState("");
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const isKeyPressed = useRef<{ [key: string]: boolean }>({});
  const imgRef = useRef<HTMLImageElement>(null);

  // Dynamic IP webcam URL
  const ipCamURL = `http://${cameraIP}:${cameraPort}/video`;
  const mjpegURL = `http://${cameraIP}:${cameraPort}/mjpegfeed?640x480`;

  useEffect(() => {
    const savedESP = localStorage.getItem("espIP");
    const savedPump = localStorage.getItem("pumpIP");
    const savedCamera = localStorage.getItem("cameraIP");
    const savedPort = localStorage.getItem("cameraPort");
    
    if (savedESP) setEspIP(savedESP);
    if (savedPump) setPumpIP(savedPump);
    if (savedCamera) setCameraIP(savedCamera);
    if (savedPort) setCameraPort(savedPort);
  }, []);

  const logCommand = (command: string, source: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] ${source}: ${command}`;
    console.log(logEntry);
    setCommandHistory(prev => [...prev.slice(-9), logEntry]); // Keep last 10 commands
    setLastCommand(`${command} (${source})`);
  };

  const sendCommand = async (command: string, source: string = "button") => {
    logCommand(command, source);
    
    try {
      if (!espIP) {
        console.warn("No ESP IP configured");
        return;
      }

      const url = `http://${espIP}/${command}`;
      console.log(`Sending request to: ${url}`);
      
      // Simulate ESP response for testing
      const simulatedResponse = {
        command: command,
        status: "success",
        leftMotor: command === "left" || command === "forward" ? "active" : "inactive",
        rightMotor: command === "right" || command === "forward" ? "active" : "inactive",
        timestamp: new Date().toISOString()
      };

      // Try real ESP request first
      try {
        const res = await fetch(url, { 
          method: 'GET',
          timeout: 2000 // 2 second timeout
        });
        
        if (res.ok) {
          const data = await res.json();
          console.log("ESP Response:", data);
          setStatus(data);
          setIsConnected(true);
        } else {
          throw new Error(`HTTP ${res.status}`);
        }
      } catch (fetchError) {
        console.warn("ESP not reachable, using simulated response:", fetchError);
        console.log("Simulated ESP Response:", simulatedResponse);
        setStatus(simulatedResponse);
        setIsConnected(false);
      }

    } catch (error) {
      console.error("Command failed:", error);
      setIsConnected(false);
    }
  };

  const sendPumpCommand = async (command: 'start' | 'stop', source: string = "button") => {
    logCommand(`pump ${command}`, source);
    
    try {
      if (!pumpIP) {
        console.warn("No Pump ESP IP configured");
        return;
      }

      const url = `http://${pumpIP}/${command}`;
      console.log(`Sending pump request to: ${url}`);
      
      // Simulate pump response for testing
      const simulatedPumpResponse = {
        command: `pump ${command}`,
        status: "success",
        pumpStatus: command === "start" ? "running" : "stopped",
        timestamp: new Date().toISOString()
      };

      // Try real pump request first
      try {
        const res = await fetch(url, { 
          method: 'GET',
          timeout: 2000
        });
        
        if (res.ok) {
          const data = await res.json();
          console.log("Pump ESP Response:", data);
          setStatus(prev => ({ ...prev, pumpStatus: command === "start" ? "running" : "stopped" }));
          setIsPumpConnected(true);
        } else {
          throw new Error(`HTTP ${res.status}`);
        }
      } catch (fetchError) {
        console.warn("Pump ESP not reachable, using simulated response:", fetchError);
        console.log("Simulated Pump Response:", simulatedPumpResponse);
        setStatus(prev => ({ ...prev, pumpStatus: command === "start" ? "running" : "stopped" }));
        setIsPumpConnected(false);
      }

    } catch (error) {
      console.error("Pump command failed:", error);
      setIsPumpConnected(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (isKeyPressed.current[e.key]) return;
    isKeyPressed.current[e.key] = true;

    switch (e.key.toLowerCase()) {
      case "w":
        sendCommand("forward", "keyboard");
        break;
      case "a":
        sendCommand("left", "keyboard");
        break;
      case "s":
        sendCommand("backward", "keyboard");
        break;
      case "d":
        sendCommand("right", "keyboard");
        break;
      case " ":
        e.preventDefault();
        takeScreenshot();
        break;
      case "i":
        sendPumpCommand("start", "keyboard");
        break;
      case "o":
        sendPumpCommand("stop", "keyboard");
        break;
    }
  };

  const handleKeyUp = (e: KeyboardEvent) => {
    if (e.key.toLowerCase() === " " || e.key.toLowerCase() === "i" || e.key.toLowerCase() === "o") return; // Don't stop on spacebar or pump keys
    
    isKeyPressed.current[e.key] = false;
    sendCommand("stop", "keyboard");
  };

  const takeScreenshot = () => {
    console.log("Taking screenshot...");
    
    if (!imgRef.current) {
      console.error("Camera image not found");
      return;
    }

    try {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const img = imgRef.current;

      if (!ctx) {
        console.error("Canvas context not available");
        return;
      }

      canvas.width = img.naturalWidth || 640;
      canvas.height = img.naturalHeight || 480;

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      
      canvas.toBlob((blob) => {
        if (!blob) {
          console.error("Failed to create image blob");
          return;
        }
        
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.download = `irrigation-bot-${Date.now()}.png`;
        link.href = url;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        console.log("Screenshot saved successfully");
      }, "image/png");

    } catch (error) {
      console.error("Screenshot failed:", error);
    }
  };

  const testESPConnection = async () => {
    console.log("Testing ESP connection...");
    await sendCommand("ping", "connection test");
  };

  const testPumpConnection = async () => {
    console.log("Testing Pump ESP connection...");
    await sendPumpCommand("stop", "connection test");
  };

  const saveSettings = () => {
    localStorage.setItem("espIP", espIP);
    localStorage.setItem("pumpIP", pumpIP);
    localStorage.setItem("cameraIP", cameraIP);
    localStorage.setItem("cameraPort", cameraPort);
    console.log("Settings saved:", { espIP, pumpIP, cameraIP, cameraPort });
  };

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [espIP, pumpIP]);

  return (
    <div className="p-6 bg-[#ffc564] min-h-screen flex flex-col items-center">
      <h1 className="text-3xl font-bold mb-6">🚜 Manual Irrigation Control</h1>

      {/* Configuration Panel */}
      <div className="w-full max-w-2xl bg-white p-4 rounded-xl shadow-md mb-6">
        <h2 className="text-lg font-semibold mb-4 text-gray-800">Configuration</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* ESP Configuration */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Motor ESP IP</label>
            <input
              type="text"
              placeholder="192.168.1.100"
              value={espIP}
              onChange={(e) => setEspIP(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
            />
          </div>

          {/* Pump ESP Configuration */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Pump ESP IP</label>
            <input
              type="text"
              placeholder="192.168.248.100"
              value={pumpIP}
              onChange={(e) => setPumpIP(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
            />
          </div>

          {/* Camera Configuration */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Camera IP</label>
            <input
              type="text"
              placeholder="192.168.50.130"
              value={cameraIP}
              onChange={(e) => setCameraIP(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Camera Port</label>
            <input
              type="text"
              placeholder="8080"
              value={cameraPort}
              onChange={(e) => setCameraPort(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={saveSettings}
              className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition duration-300"
            >
              Save Settings
            </button>
            <button
              onClick={testESPConnection}
              className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition duration-300"
            >
              Test Motor
            </button>
          </div>

          <div className="flex gap-2 md:col-span-2">
            <button
              onClick={testPumpConnection}
              className="flex-1 bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700 transition duration-300"
            >
              Test Pump ESP
            </button>
          </div>
        </div>

        {/* Connection Status */}
        <div className="mt-4 flex gap-4 justify-center">
          <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
            isConnected 
              ? 'bg-green-100 text-green-800' 
              : 'bg-yellow-100 text-yellow-800'
          }`}>
            {isConnected ? '🟢 Motor ESP Connected' : '🟡 Motor Simulation'}
          </span>
          <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
            isPumpConnected 
              ? 'bg-green-100 text-green-800' 
              : 'bg-yellow-100 text-yellow-800'
          }`}>
            {isPumpConnected ? '🟢 Pump ESP Connected' : '🟡 Pump Simulation'}
          </span>
        </div>
      </div>

      {/* Video Stream */}
      <div className="w-full max-w-2xl mb-6">
        <h3 className="text-lg font-semibold mb-2 text-gray-800">Camera Feed</h3>
        <div className="aspect-video bg-black rounded-xl overflow-hidden border-4 border-gray-700 relative">
          <img
            ref={imgRef}
            src={mjpegURL}
            alt="IP Camera Feed"
            className="w-full h-full object-cover"
            onLoad={() => console.log("Camera feed loaded successfully")}
            onError={(e) => {
              console.error("Camera feed error, trying alternative URL");
              e.currentTarget.src = ipCamURL;
              e.currentTarget.onerror = () => {
                console.error("Both camera URLs failed");
                e.currentTarget.src = 'https://via.placeholder.com/640x360/333333/ffffff?text=Camera+Offline';
              };
            }}
            crossOrigin="anonymous"
          />
          
          <button
            onClick={takeScreenshot}
            className="absolute bottom-4 right-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition duration-300"
          >
            📸 Screenshot
          </button>
        </div>
      </div>

      {/* Control Buttons */}
      <div className="w-full max-w-lg mb-6">
        <h3 className="text-lg font-semibold mb-4 text-gray-800 text-center">Movement Controls</h3>
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div />
          <button
            onClick={() => sendCommand("forward", "button")}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl transition duration-300"
          >
            ↑ W
          </button>
          <div />

          <button
            onClick={() => sendCommand("left", "button")}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl transition duration-300"
          >
            ← A
          </button>
          <button
            onClick={() => sendCommand("stop", "button")}
            className="bg-red-500 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-xl transition duration-300"
          >
            ⏹ Stop
          </button>
          <button
            onClick={() => sendCommand("right", "button")}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl transition duration-300"
          >
            → D
          </button>

          <div />
          <button
            onClick={() => sendCommand("backward", "button")}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl transition duration-300"
          >
            ↓ S
          </button>
          <div />
        </div>

        {/* Irrigation Controls */}
        <h3 className="text-lg font-semibold mb-4 text-gray-800 text-center">Irrigation Controls</h3>
        <div className="flex gap-6 justify-center">
          <button
            onClick={() => sendPumpCommand("start", "button")}
            className="bg-green-500 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-xl transition duration-300"
          >
            💧 Start Pump (I)
          </button>
          <button
            onClick={() => sendPumpCommand("stop", "button")}
            className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-3 px-8 rounded-xl transition duration-300"
          >
            🛑 Stop Pump (O)
          </button>
        </div>
      </div>

      {/* Status & Command History */}
      <div className="w-full max-w-2xl grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Motor Status */}
        <div className="bg-white p-4 rounded-xl shadow-md">
          <h3 className="text-lg font-semibold mb-2 text-gray-800">Status</h3>
          <p className="text-sm font-mono">Left Motor: <span className="font-bold">{status.leftMotor || "unknown"}</span></p>
          <p className="text-sm font-mono">Right Motor: <span className="font-bold">{status.rightMotor || "unknown"}</span></p>
          <p className="text-sm font-mono">Pump: <span className="font-bold">{status.pumpStatus || "unknown"}</span></p>
          <p className="text-sm font-mono">Last Command: <span className="font-bold">{lastCommand || "none"}</span></p>
        </div>

        {/* Command History */}
        <div className="bg-white p-4 rounded-xl shadow-md">
          <h3 className="text-lg font-semibold mb-2 text-gray-800">Command History</h3>
          <div className="text-xs font-mono space-y-1 max-h-24 overflow-y-auto">
            {commandHistory.length === 0 ? (
              <p className="text-gray-500">No commands sent yet</p>
            ) : (
              commandHistory.map((entry, index) => (
                <div key={index} className="text-gray-700">{entry}</div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="mt-6 w-full max-w-2xl bg-white p-4 rounded-xl shadow-md">
        <h3 className="text-lg font-semibold mb-2 text-gray-800">Instructions:</h3>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• Use WASD keys or buttons to control robot movement</li>
          <li>• Use I key or Start Pump button to begin irrigation</li>
          <li>• Use O key or Stop Pump button to stop irrigation</li>
          <li>• Press SPACEBAR or 📸 button to take screenshots</li>
          <li>• Configure Motor ESP and Pump ESP IPs above</li>
          <li>• Check console (F12) for detailed logs and responses</li>
          <li>• If ESPs are offline, simulation mode will be used</li>
        </ul>
      </div>
    </div>
  );
}