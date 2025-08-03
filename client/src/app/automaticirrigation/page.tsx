"use client";

import { useEffect, useRef, useState } from "react";

type StatusType = {
  leftMotor: string;
  rightMotor: string;
  soilMoisture?: number;
  soilStatus?: string;
  servoPosition?: string;
  mode?: string;
};

export default function AutomaticIrrigationPage() {
  const [espIP, setEspIP] = useState<string>("");
  const [cameraIP, setCameraIP] = useState<string>("");
  const [cameraPort, setCameraPort] = useState<string>("8080");
  const [status, setStatus] = useState<StatusType>({ leftMotor: "", rightMotor: "" });
  const [isConnected, setIsConnected] = useState(false);
  const [isAutoMode, setIsAutoMode] = useState(false);
  const [lastCommand, setLastCommand] = useState("");
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [sensorHistory, setSensorHistory] = useState<any[]>([]);
  const [autoModeStatus, setAutoModeStatus] = useState<string>("Stopped");
  const isKeyPressed = useRef<{ [key: string]: boolean }>({});

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

  const logCommand = (command: string, source: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] ${source}: ${command}`;
    console.log(logEntry);
    setCommandHistory(prev => [...prev.slice(-9), logEntry]);
    setLastCommand(`${command} (${source})`);
  };

  const sendCommand = async (command: string, source: string = "button") => {
    logCommand(command, source);
    
    try {
      if (!espIP) {
        console.warn("No ESP32 IP configured");
        return;
      }

      const url = `http://${espIP}/${command}`;
      console.log(`Sending request to: ${url}`);
      
      const simulatedResponse = {
        command: command,
        status: "success",
        leftMotor: command === "left" || command === "forward" ? "active" : "inactive",
        rightMotor: command === "right" || command === "forward" ? "active" : "inactive",
        mode: command === "automatic" ? "automatic" : (command === "manual" ? "manual" : status.mode),
        timestamp: new Date().toISOString()
      };

      try {
        const res = await fetch(url, { method: 'GET', });
        
        if (res.ok) {
          const data = await res.json();
          console.log("ESP32 Response:", data);
          setStatus(prev => ({ ...prev, ...data }));
          setIsConnected(true);
          
          // Update auto mode status based on ESP response
          if (command === "automatic") {
            setAutoModeStatus("Active - ESP32 controlling movement and sensors");
          } else if (command === "manual") {
            setAutoModeStatus("Stopped");
          }
        } else {
          throw new Error(`HTTP ${res.status}`);
        }
      } catch (fetchError) {
        console.warn("ESP32 not reachable, using simulated response");
        setStatus(prev => ({ ...prev, ...simulatedResponse }));
        setIsConnected(false);
        
        // Simulate auto mode status
        if (command === "automatic") {
          setAutoModeStatus("Simulated - No ESP32 connection");
        } else if (command === "manual") {
          setAutoModeStatus("Stopped");
        }
      }

    } catch (error) {
      console.error("Command failed:", error);
      setIsConnected(false);
    }
  };

  const toggleAutomaticMode = async () => {
    const newMode = !isAutoMode;
    setIsAutoMode(newMode);
    
    if (newMode) {
      logCommand("AUTOMATIC MODE ENABLED", "system");
      setAutoModeStatus("Starting automatic mode...");
      await sendCommand("automatic", "system");
      
      console.log("🤖 Automatic mode enabled - ESP32 will handle everything independently");
      console.log("ESP32 Logic: Check sensors → Move forward 3s → Stop → Wait → Repeat");
      
    } else {
      logCommand("MANUAL MODE ENABLED", "system");
      setAutoModeStatus("Stopping automatic mode...");
      await sendCommand("manual", "system");
      setAutoModeStatus("Stopped");
      
      console.log("👤 Manual mode enabled - WASD controls available");
    }
  };

  const checkSensors = async () => {
    try {
      const url = `http://${espIP}/start_sensor`; // Use the new sensor endpoint
      
      console.log(`Checking sensors: ${url}`);
      
      const simulatedSensorData = {
        status: "success",
        soilMoisture: Math.floor(Math.random() * 1000) + 2000,
        soilStatus: Math.random() > 0.5 ? "DRY" : "MOIST",
        servoMoved: true,
        needsIrrigation: Math.random() > 0.7,
        message: "Sensor check completed",
        timestamp: new Date().toLocaleTimeString(),
      };

      try {
        const res = await fetch(url, { method: 'GET', });
        
        if (res.ok) {
          const data = await res.json();
          console.log("Sensor Response:", data);
          setSensorHistory(prev => [data, ...prev.slice(0, 4)]);
          setIsConnected(true);
        } else {
          throw new Error(`HTTP ${res.status}`);
        }
      } catch (fetchError) {
        console.warn("ESP32 not reachable, using simulated sensor data");
        setSensorHistory(prev => [simulatedSensorData, ...prev.slice(0, 4)]);
        setIsConnected(false);
      }

    } catch (error) {
      console.error("Sensor check failed:", error);
    }
  };

  // Manual controls (only available when NOT in auto mode)
  const handleKeyDown = (e: KeyboardEvent) => {
    if (isAutoMode) {
      console.log("⚠️ Manual controls disabled - ESP32 is in automatic mode");
      return;
    }
    
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
        checkSensors();
        break;
    }
  };

  const handleKeyUp = (e: KeyboardEvent) => {
    if (isAutoMode) return;
    if (e.key.toLowerCase() === " ") return;
    
    isKeyPressed.current[e.key] = false;
    sendCommand("stop", "keyboard");
  };

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [espIP, isAutoMode]);

  // Auto status polling - check ESP32 status while in automatic mode
  useEffect(() => {
    if (isAutoMode && isConnected) {
      const statusInterval = setInterval(async () => {
        try {
          const res = await fetch(`http://${espIP}/status`, { method: 'GET',  });
          if (res.ok) {
            const data = await res.json();
            console.log("ESP32 Status:", data);
            
            if (data.mode === "automatic") {
              setAutoModeStatus(`Active - ${data.status || "Running automatic cycle"}`);
            }
            
            // Update sensor data if available
            if (data.soilMoisture !== undefined) {
              setSensorHistory(prev => [{
                soilMoisture: data.soilMoisture,
                soilStatus: data.soilStatus,
                servoPosition: data.servoPosition,
                message: "Automatic sensor reading",
                timestamp: new Date().toLocaleTimeString()
              }, ...prev.slice(0, 4)]);
            }
          }
        } catch (error) {
          console.log("Status check failed - ESP32 may be busy with automatic operations");
        }
      }, 15000); // Check every 15 seconds

      return () => clearInterval(statusInterval);
    }
  }, [isAutoMode, isConnected, espIP]);

  return (
    <div className="p-6 bg-gradient-to-br from-green-100 to-blue-100 min-h-screen flex flex-col items-center">
      <h1 className="text-4xl font-bold mb-6 text-green-800">🤖 Automatic Irrigation System</h1>

      {/* Mode Toggle */}
      <div className="mb-6 text-center">
        <button
          onClick={toggleAutomaticMode}
          className={`px-8 py-3 rounded-xl font-bold text-white transition duration-300 ${
            isAutoMode 
              ? 'bg-red-500 hover:bg-red-600' 
              : 'bg-green-500 hover:bg-green-600'
          }`}
        >
          {isAutoMode ? '🛑 Stop Automatic Mode' : '🤖 Start Automatic Mode'}
        </button>
        
        {/* Auto Mode Status */}
        {isAutoMode && (
          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Status:</strong> {autoModeStatus}
            </p>
            <p className="text-xs text-blue-600 mt-1">
              ESP32 is handling: Sensor Check → Movement → Stop → Repeat (30s intervals)
            </p>
          </div>
        )}
      </div>

      {/* Status Indicators */}
      <div className="mb-6 flex gap-4 justify-center flex-wrap">
        <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
          isConnected 
            ? 'bg-green-100 text-green-800' 
            : 'bg-yellow-100 text-yellow-800'
        }`}>
          {isConnected ? '🟢 ESP32 Connected' : '🟡 ESP32 Simulation'}
        </span>
        <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
          isAutoMode 
            ? 'bg-blue-100 text-blue-800' 
            : 'bg-gray-100 text-gray-800'
        }`}>
          {isAutoMode ? '🤖 ESP32 Auto Control' : '👤 Manual Mode'}
        </span>
      </div>

      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Camera Feed */}
        <div className="bg-white rounded-xl shadow-lg p-4">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">Live Camera Feed</h3>
          <div className="aspect-video bg-black rounded-xl overflow-hidden border-4 border-gray-700 relative">
            <img
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
              onClick={checkSensors}
              className="absolute bottom-4 right-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition duration-300"
            >
              🔍 Check Sensors
            </button>
          </div>

          {/* Manual Controls - Only shown when NOT in auto mode */}
          <div className="mt-6">
            <h4 className="text-md font-semibold mb-3 text-gray-800 text-center">
              {isAutoMode ? "Manual Controls (ESP32 Auto Mode Active)" : "Manual Controls"}
            </h4>
            
            {isAutoMode ? (
              <div className="text-center p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="text-2xl mb-2">🤖</div>
                <p className="text-sm text-blue-800 font-medium">ESP32 Automatic Control Active</p>
                <p className="text-xs text-blue-600 mt-1">
                  Robot is managing sensors and movement independently.<br/>
                  Manual controls are disabled.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2 max-w-xs mx-auto">
                <div />
                <button
                  onClick={() => sendCommand("forward", "button")}
                  className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition duration-300 text-sm"
                >
                  ↑ W
                </button>
                <div />

                <button
                  onClick={() => sendCommand("left", "button")}
                  className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition duration-300 text-sm"
                >
                  ← A
                </button>
                <button
                  onClick={() => sendCommand("stop", "button")}
                  className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition duration-300 text-sm"
                >
                  ⏹ Stop
                </button>
                <button
                  onClick={() => sendCommand("right", "button")}
                  className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition duration-300 text-sm"
                >
                  → D
                </button>

                <div />
                <button
                  onClick={() => sendCommand("backward", "button")}
                  className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition duration-300 text-sm"
                >
                  ↓ S
                </button>
                <div />
              </div>
            )}
          </div>
        </div>

        {/* Sensor Data & Status */}
        <div className="bg-white rounded-xl shadow-lg p-4">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">Sensor Data & Status</h3>
          
          {sensorHistory.length > 0 ? (
            <div className="space-y-4">
              {sensorHistory.map((data, index) => (
                <div key={index} className={`p-4 rounded-lg border-2 ${
                  data.needsIrrigation || data.soilStatus === 'DRY'
                    ? 'bg-red-50 border-red-200' 
                    : 'bg-green-50 border-green-200'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-lg font-semibold">
                      {data.needsIrrigation || data.soilStatus === 'DRY' ? '🚨 Dry Soil Detected' : '✅ Soil OK'}
                    </h4>
                    <span className="text-sm text-gray-600">
                      Reading #{index + 1}
                    </span>
                  </div>
                  
                  <div className="space-y-2">
                    <p><strong>Soil Moisture:</strong> 
                      <span className={`ml-2 px-2 py-1 rounded text-xs font-mono ${
                        data.soilStatus === 'DRY' ? 'bg-red-200 text-red-800' :
                        data.soilStatus === 'MOIST' ? 'bg-yellow-200 text-yellow-800' :
                        'bg-green-200 text-green-800'
                      }`}>
                        {data.soilMoisture} ({data.soilStatus})
                      </span>
                    </p>
                    <p><strong>Servo Position:</strong> 
                      <span className="ml-2 px-2 py-1 rounded text-xs font-mono bg-blue-200 text-blue-800">
                        {data.servoPosition || 'up'}
                      </span>
                    </p>
                    <p><strong>Message:</strong> {data.message}</p>
                    <p className="text-xs text-gray-500">{data.timestamp}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <div className="text-4xl mb-2">🌱</div>
              <p>No sensor data yet</p>
              <p className="text-sm">
                {isAutoMode 
                  ? "ESP32 will check sensors automatically every 30 seconds" 
                  : "Press SPACEBAR or 'Check Sensors' to start"
                }
              </p>
            </div>
          )}

          {/* Status Panel */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-50 p-3 rounded-lg">
              <h4 className="text-sm font-semibold mb-2 text-gray-800">System Status</h4>
              <p className="text-xs">Left Motor: <span className="font-mono">{status.leftMotor || "unknown"}</span></p>
              <p className="text-xs">Right Motor: <span className="font-mono">{status.rightMotor || "unknown"}</span></p>
              <p className="text-xs">Servo: <span className="font-mono">{status.servoPosition || "up"}</span></p>
              <p className="text-xs">Mode: <span className="font-mono">{isAutoMode ? "ESP32 Automatic" : "Manual"}</span></p>
              <p className="text-xs">Last Command: <span className="font-mono">{lastCommand || "none"}</span></p>
            </div>

            <div className="bg-gray-50 p-3 rounded-lg">
              <h4 className="text-sm font-semibold mb-2 text-gray-800">Command History</h4>
              <div className="text-xs space-y-1 max-h-16 overflow-y-auto">
                {commandHistory.length === 0 ? (
                  <p className="text-gray-500">No commands sent yet</p>
                ) : (
                  commandHistory.slice(-3).map((entry, index) => (
                    <div key={index} className="text-gray-700">{entry}</div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Updated Instructions */}
      <div className="mt-6 w-full max-w-6xl bg-white p-4 rounded-xl shadow-lg">
        <h3 className="text-lg font-semibold mb-2 text-gray-800">How Automatic Mode Works:</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="font-semibold text-green-700 mb-2">🤖 ESP32 Automatic Logic:</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>1. Lower servo and check soil moisture</li>
              <li>2. Raise servo back up</li>
              <li>3. Move forward for 3 seconds</li>
              <li>4. Stop and wait 30 seconds</li>
              <li>5. Repeat cycle</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-blue-700 mb-2">👤 Manual Controls:</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Available only when automatic mode is OFF</li>
              <li>• Use WASD keys for movement</li>
              <li>• Press SPACEBAR to check sensors manually</li>
              <li>• Click buttons as alternative to keys</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}