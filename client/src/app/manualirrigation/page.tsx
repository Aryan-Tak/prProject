"use client";

import { useEffect, useRef, useState } from "react";

type StatusType = {
  leftMotor: string;
  rightMotor: string;
  soilMoisture?: number;
  soilStatus?: string;
  servoPosition?: string;
};

export default function ManualIrrigationPage() {
  const [espIP, setEspIP] = useState<string>("");
  const [cameraIP, setCameraIP] = useState<string>("");
  const [cameraPort, setCameraPort] = useState<string>("8080");
  const [status, setStatus] = useState<StatusType>({ leftMotor: "", rightMotor: "" });
  const [isConnected, setIsConnected] = useState(false);
  const [lastCommand, setLastCommand] = useState("");
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [sensorData, setSensorData] = useState<any>(null);
  const isKeyPressed = useRef<{ [key: string]: boolean }>({});
  const imgRef = useRef<HTMLImageElement>(null);
  
  // Optimization refs
  const commandTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastCommandRef = useRef<string>("");
  const lastCommandTimeRef = useRef<number>(0);

  // Dynamic IP webcam URL
  const ipCamURL = `http://${cameraIP}:${cameraPort}/video`;
  const mjpegURL = `http://${cameraIP}:${cameraPort}/mjpegfeed?640x480`;

  useEffect(() => {
    // Load configuration from localStorage
    const savedMotorESP = localStorage.getItem("motorEspIP");
    const savedCamera = localStorage.getItem("cameraIP");
    const savedPort = localStorage.getItem("cameraPort");
    
    if (savedMotorESP) setEspIP(savedMotorESP);
    if (savedCamera) setCameraIP(savedCamera);
    if (savedPort) setCameraPort(savedPort);
  }, []);

  const handleError = (error: unknown, context: string) => {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        console.warn(`⏱️ ${context} timeout - using simulated response`);
      } else if (error.name === 'TypeError') {
        console.error(`🔴 ${context} network error:`, error.message);
      } else {
        console.error(`🔴 ${context} error:`, error.message);
      }
    } else {
      console.error(`🔴 ${context} unknown error:`, String(error));
    }
  };

  const logCommand = (command: string, source: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] ${source}: ${command}`;
    console.log(logEntry);
    setCommandHistory(prev => [...prev.slice(-9), logEntry]);
    setLastCommand(`${command} (${source})`);
  };

  const sendCommand = async (command: string, source: string = "button") => {
    try {
      logCommand(command, source);

      if (!espIP) {
        console.warn("No ESP32 IP configured");
        setIsConnected(false);
        return;
      }

      // Prevent duplicate rapid commands
      const now = Date.now();
      if (lastCommandRef.current === command && now - lastCommandTimeRef.current < 100) {
        return;
      }
      lastCommandRef.current = command;
      lastCommandTimeRef.current = now;

      const url = `http://${espIP}/${command}`;
      console.log(`Sending request to: ${url}`);

      // Immediate simulated response for UI feedback
      const simulatedResponse = {
        command: command,
        status: "success",
        leftMotor: command === "left" || command === "forward" ? "active" : "inactive",
        rightMotor: command === "right" || command === "forward" ? "active" : "inactive",
        timestamp: new Date().toISOString(),
      };

      // Update UI immediately
      setStatus(prev => ({ ...prev, ...simulatedResponse }));

      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      try {
        const response = await fetch(url, { 
          method: 'GET',
          signal: controller.signal,
          headers: {
            'Connection': 'close',
            'Cache-Control': 'no-cache',
            'Accept': 'application/json'
          }
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        console.log("✅ ESP32 Response:", data);
        setStatus(prev => ({ ...prev, ...data }));
        setIsConnected(true);

        // Update sensor data if included in response
        if (data.soilMoisture !== undefined) {
          setSensorData({
            soilMoisture: data.soilMoisture,
            soilStatus: data.soilStatus,
            servoPosition: data.servoPosition,
            timestamp: new Date().toLocaleTimeString()
          });
        }

      } catch (networkError: unknown) {
        clearTimeout(timeoutId);
        handleError(networkError, "ESP32");
        setIsConnected(false);
      }

    } catch (error: unknown) {
      handleError(error, "sendCommand");
      setIsConnected(false);
    }
  };

  // NEW: Sensor control functions
  const startSensorCheck = async () => {
    logCommand("sensor check", "button");
    await sendCommand("start_sensor", "sensor");
  };

  const readSoilOnly = async () => {
    logCommand("read soil", "button");
    await sendCommand("read_soil", "sensor");
  };

  const controlServo = async (direction: 'down' | 'up') => {
    logCommand(`servo ${direction}`, "button");
    await sendCommand(`servo_${direction}`, "servo");
  };

  const debouncedSendCommand = (command: string, source: string, delay: number = 50) => {
    if (commandTimeoutRef.current) {
      clearTimeout(commandTimeoutRef.current);
    }
    
    commandTimeoutRef.current = setTimeout(() => {
      sendCommand(command, source);
    }, delay);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (isKeyPressed.current[e.key]) return;
    isKeyPressed.current[e.key] = true;

    switch (e.key.toLowerCase()) {
      case "w":
        debouncedSendCommand("forward", "keyboard", 30);
        break;
      case "a":
        debouncedSendCommand("left", "keyboard", 30);
        break;
      case "s":
        debouncedSendCommand("backward", "keyboard", 30);
        break;
      case "d":
        debouncedSendCommand("right", "keyboard", 30);
        break;
      case " ":
        e.preventDefault();
        takeScreenshot();
        break;
      case "r": // NEW: R key for sensor check
        startSensorCheck();
        break;
      case "t": // NEW: T key for soil reading
        readSoilOnly();
        break;
      case "q": // NEW: Q key for servo down
        controlServo('down');
        break;
      case "e": // NEW: E key for servo up
        controlServo('up');
        break;
    }
  };

  const handleKeyUp = (e: KeyboardEvent) => {
    if (["r", "t", "q", "e", " "].includes(e.key.toLowerCase())) return;
    
    isKeyPressed.current[e.key] = false;
    debouncedSendCommand("stop", "keyboard", 10);
  };

  const takeScreenshot = () => {
    console.log("📸 Taking screenshot...");
    
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
        link.download = `manual-irrigation-${Date.now()}.png`;
        link.href = url;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        console.log("✅ Screenshot saved successfully");
      }, "image/png");

    } catch (error: unknown) {
      handleError(error, "Screenshot");
    }
  };

  useEffect(() => {
    const handleKeyDownWrapper = (e: KeyboardEvent) => handleKeyDown(e);
    const handleKeyUpWrapper = (e: KeyboardEvent) => handleKeyUp(e);

    window.addEventListener("keydown", handleKeyDownWrapper);
    window.addEventListener("keyup", handleKeyUpWrapper);
    
    return () => {
      window.removeEventListener("keydown", handleKeyDownWrapper);
      window.removeEventListener("keyup", handleKeyUpWrapper);
      
      if (commandTimeoutRef.current) {
        clearTimeout(commandTimeoutRef.current);
      }
    };
  }, [espIP]);

  return (
    <div className="p-6 bg-gradient-to-br from-orange-100 to-yellow-100 min-h-screen flex flex-col items-center">
      <h1 className="text-4xl font-bold mb-6 text-orange-800">🚜 Manual Irrigation Control</h1>

      {/* Connection Status */}
      <div className="mb-6 flex gap-4 justify-center flex-wrap">
        <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium transition-all duration-300 ${
          isConnected 
            ? 'bg-green-100 text-green-800 shadow-md' 
            : 'bg-yellow-100 text-yellow-800'
        }`}>
          {isConnected ? '🟢 ESP32 Connected' : '🟡 ESP32 Simulation'}
        </span>
      </div>

      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Camera Feed */}
        <div className="bg-white rounded-xl shadow-lg p-4">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">Live Camera Feed</h3>
          <div className="aspect-video bg-black rounded-xl overflow-hidden border-4 border-gray-700 relative">
            <img
              ref={imgRef}
              src={mjpegURL}
              alt="IP Camera Feed"
              className="w-full h-full object-cover transition-opacity duration-300"
              onLoad={() => console.log("✅ Camera feed loaded successfully")}
              onError={(e) => {
                console.error("🔴 Camera feed error, trying alternative URL");
                e.currentTarget.src = ipCamURL;
                e.currentTarget.onerror = () => {
                  console.error("🔴 Both camera URLs failed");
                  e.currentTarget.src = 'https://via.placeholder.com/640x360/333333/ffffff?text=Camera+Offline';
                };
              }}
              crossOrigin="anonymous"
            />
            
            <button
              onClick={takeScreenshot}
              className="absolute bottom-4 right-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition duration-300 shadow-lg"
            >
              📸 Screenshot
            </button>
          </div>

          {/* Movement Controls */}
          <div className="mt-6">
            <h4 className="text-md font-semibold mb-3 text-gray-800 text-center">Movement Controls</h4>
            <div className="grid grid-cols-3 gap-2 max-w-xs mx-auto">
              <div />
              <button
                onClick={() => sendCommand("forward", "button")}
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition duration-200 text-sm active:scale-95 shadow-md"
              >
                ↑ W
              </button>
              <div />

              <button
                onClick={() => sendCommand("left", "button")}
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition duration-200 text-sm active:scale-95 shadow-md"
              >
                ← A
              </button>
              <button
                onClick={() => sendCommand("stop", "button")}
                className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition duration-200 text-sm active:scale-95 shadow-md"
              >
                ⏹ Stop
              </button>
              <button
                onClick={() => sendCommand("right", "button")}
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition duration-200 text-sm active:scale-95 shadow-md"
              >
                → D
              </button>

              <div />
              <button
                onClick={() => sendCommand("backward", "button")}
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition duration-200 text-sm active:scale-95 shadow-md"
              >
                ↓ S
              </button>
              <div />
            </div>
          </div>
        </div>

        {/* Control Panel */}
        <div className="bg-white rounded-xl shadow-lg p-4">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">Sensor & Control Panel</h3>
          
          {/* NEW: Sensor Controls */}
          <div className="space-y-4 mb-6">
            <h4 className="text-md font-semibold text-green-700">🌱 Sensor Controls</h4>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={startSensorCheck}
                className="bg-green-500 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-xl transition duration-300 active:scale-95 shadow-md text-sm"
              >
                🔍 Start Sensor (R)
              </button>
              <button
                onClick={readSoilOnly}
                className="bg-orange-500 hover:bg-orange-700 text-white font-bold py-3 px-4 rounded-xl transition duration-300 active:scale-95 shadow-md text-sm"
              >
                🌱 Read Soil (T)
              </button>
              <button
                onClick={() => controlServo('down')}
                className="bg-purple-500 hover:bg-purple-700 text-white font-bold py-3 px-4 rounded-xl transition duration-300 active:scale-95 shadow-md text-sm"
              >
                ⬇️ Servo Down (Q)
              </button>
              <button
                onClick={() => controlServo('up')}
                className="bg-indigo-500 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-xl transition duration-300 active:scale-95 shadow-md text-sm"
              >
                ⬆️ Servo Up (E)
              </button>
            </div>
          </div>

          {/* NEW: Sensor Data Display */}
          {sensorData && (
            <div className="mb-6 p-4 bg-green-50 rounded-lg border border-green-200">
              <h4 className="text-md font-semibold mb-2 text-green-800">🌱 Latest Sensor Data</h4>
              <div className="space-y-2">
                <p className="text-sm">
                  <strong>Soil Moisture:</strong> 
                  <span className={`ml-2 px-2 py-1 rounded text-xs font-mono ${
                    sensorData.soilStatus === 'DRY' ? 'bg-red-200 text-red-800' :
                    sensorData.soilStatus === 'MOIST' ? 'bg-yellow-200 text-yellow-800' :
                    'bg-green-200 text-green-800'
                  }`}>
                    {sensorData.soilMoisture} ({sensorData.soilStatus})
                  </span>
                </p>
                <p className="text-sm">
                  <strong>Servo Position:</strong> 
                  <span className="ml-2 px-2 py-1 rounded text-xs font-mono bg-blue-200 text-blue-800">
                    {sensorData.servoPosition || status.servoPosition || 'unknown'}
                  </span>
                </p>
                <p className="text-xs text-gray-600">Last updated: {sensorData.timestamp}</p>
              </div>
            </div>
          )}

          {/* Robot Status Panel */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-gray-50 p-3 rounded-lg border-l-4 border-blue-500">
              <h4 className="text-sm font-semibold mb-2 text-gray-800">🤖 Robot Status</h4>
              <p className="text-xs">Left Motor: <span className={`font-mono px-2 py-1 rounded ${
                status.leftMotor === "active" ? "bg-green-200 text-green-800" : "bg-gray-200 text-gray-600"
              }`}>{status.leftMotor || "unknown"}</span></p>
              <p className="text-xs mt-1">Right Motor: <span className={`font-mono px-2 py-1 rounded ${
                status.rightMotor === "active" ? "bg-green-200 text-green-800" : "bg-gray-200 text-gray-600"
              }`}>{status.rightMotor || "unknown"}</span></p>
              <p className="text-xs mt-1">Servo: <span className={`font-mono px-2 py-1 rounded ${
                status.servoPosition === "down" ? "bg-purple-200 text-purple-800" : "bg-gray-200 text-gray-600"
              }`}>{status.servoPosition || "up"}</span></p>
              <p className="text-xs mt-1">Last Command: <span className="font-mono text-purple-700">{lastCommand || "none"}</span></p>
            </div>

            <div className="bg-gray-50 p-3 rounded-lg border-l-4 border-green-500">
              <h4 className="text-sm font-semibold mb-2 text-gray-800">📝 Command History</h4>
              <div className="text-xs space-y-1 max-h-16 overflow-y-auto">
                {commandHistory.length === 0 ? (
                  <p className="text-gray-500 italic">No commands sent yet</p>
                ) : (
                  commandHistory.slice(-3).map((entry, index) => (
                    <div key={index} className="text-gray-700 font-mono text-xs bg-white px-2 py-1 rounded">
                      {entry}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Configuration Display */}
          <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
            <h4 className="text-sm font-semibold mb-2 text-gray-800">⚙️ Current Configuration</h4>
            <p className="text-xs">ESP32: <span className="font-mono bg-white px-2 py-1 rounded">{espIP || "Not configured"}</span></p>
            <p className="text-xs mt-1">Camera: <span className="font-mono bg-white px-2 py-1 rounded">{cameraIP ? `${cameraIP}:${cameraPort}` : "Not configured"}</span></p>
          </div>
        </div>
      </div>

      {/* Updated Instructions */}
      <div className="mt-6 w-full max-w-6xl bg-white p-4 rounded-xl shadow-lg">
        <h3 className="text-lg font-semibold mb-2 text-gray-800">Instructions:</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="font-semibold text-blue-700 mb-2">🎮 Movement Controls:</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• <kbd className="px-2 py-1 bg-gray-200 rounded">W A S D</kbd> keys or buttons to control robot</li>
              <li>• <kbd className="px-2 py-1 bg-gray-200 rounded">SPACE</kbd> bar or 📸 button to take screenshots</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-green-700 mb-2">🌱 Sensor Controls:</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• <kbd className="px-2 py-1 bg-gray-200 rounded">R</kbd> key - Start full sensor check (servo + soil)</li>
              <li>• <kbd className="px-2 py-1 bg-gray-200 rounded">T</kbd> key - Read soil moisture only</li>
              <li>• <kbd className="px-2 py-1 bg-gray-200 rounded">Q</kbd> key - Lower servo for sensing</li>
              <li>• <kbd className="px-2 py-1 bg-gray-200 rounded">E</kbd> key - Raise servo to idle position</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}