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
  const [motorEspIP, setMotorEspIP] = useState<string>("");
  const [sensorEspIP, setSensorEspIP] = useState<string>("");
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

  // Camera URLs
  const ipCamURL = `http://${cameraIP}:${cameraPort}/video`;
  const mjpegURL = `http://${cameraIP}:${cameraPort}/mjpegfeed?640x480`;

  useEffect(() => {
    // Load configuration from localStorage
    const savedMotorESP = localStorage.getItem("motorEspIP");
    const savedSensorESP = localStorage.getItem("sensorEspIP");
    const savedCamera = localStorage.getItem("cameraIP");
    const savedPort = localStorage.getItem("cameraPort");

    if (savedMotorESP) setMotorEspIP(savedMotorESP);
    if (savedSensorESP) setSensorEspIP(savedSensorESP);
    if (savedCamera) setCameraIP(savedCamera);
    if (savedPort) setCameraPort(savedPort);

    // Send sensor IP to motor ESP on load
    if (savedMotorESP && savedSensorESP) {
      fetch(`http://${savedMotorESP}/set_sensor_ip?ip=${savedSensorESP}`);
    }
  }, []);

  const logCommand = (command: string, source: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] ${source}: ${command}`;
    setCommandHistory(prev => [...prev.slice(-9), logEntry]);
    setLastCommand(`${command} (${source})`);
  };

  // Send movement/auto/manual commands to motor ESP
  const sendMotorCommand = async (command: string, source: string = "button") => {
    logCommand(command, source);
    if (!motorEspIP) {
      setIsConnected(false);
      return;
    }
    try {
      const url = `http://${motorEspIP}/${command}`;
      const response = await fetch(url, { method: 'GET' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      let data = {};
      try { data = await response.json(); } catch {}
      setStatus(prev => ({ ...prev, ...data }));
      setIsConnected(true);
      if (command === "automatic") setAutoModeStatus("Active - ESP32 controlling movement and sensors");
      if (command === "manual") setAutoModeStatus("Stopped");
    } catch (error) {
      setIsConnected(false);
      if (command === "automatic") setAutoModeStatus("Simulated - No ESP32 connection");
      if (command === "manual") setAutoModeStatus("Stopped");
    }
  };

  // Send sensor/servo/pump commands to sensor ESP (manual only)
  const sendSensorCommand = async (command: string, source: string = "button") => {
    logCommand(command, source);
    if (!sensorEspIP) {
      setIsConnected(false);
      return;
    }
    try {
      const url = `http://${sensorEspIP}/${command}`;
      const response = await fetch(url, { method: 'GET' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      setSensorHistory(prev => [data, ...prev.slice(0, 4)]);
      setIsConnected(true);
    } catch (error) {
      setIsConnected(false);
    }
  };

  // Toggle automatic mode
  const toggleAutomaticMode = async () => {
    const newMode = !isAutoMode;
    setIsAutoMode(newMode);

    if (newMode) {
      logCommand("AUTOMATIC MODE ENABLED", "system");
      setAutoModeStatus("Starting automatic mode...");
      // Send sensor IP to motor ESP (if not already sent)
      if (motorEspIP && sensorEspIP) {
        await fetch(`http://${motorEspIP}/set_sensor_ip?ip=${sensorEspIP}`);
      }
      // Only send automatic command to motor ESP
      await sendMotorCommand("automatic", "system");
    } else {
      logCommand("MANUAL MODE ENABLED", "system");
      setAutoModeStatus("Stopping automatic mode...");
      await sendMotorCommand("manual", "system");
      setAutoModeStatus("Stopped");
    }
  };

  // Manual controls (only available when NOT in auto mode)
  const handleKeyDown = (e: KeyboardEvent) => {
    if (isAutoMode) return;
    if (isKeyPressed.current[e.key]) return;
    isKeyPressed.current[e.key] = true;

    switch (e.key.toLowerCase()) {
      case "w": sendMotorCommand("forward", "keyboard"); break;
      case "a": sendMotorCommand("left", "keyboard"); break;
      case "s": sendMotorCommand("backward", "keyboard"); break;
      case "d": sendMotorCommand("right", "keyboard"); break;
      case "r": sendSensorCommand("start_sensor", "keyboard"); break;
      case "t": sendSensorCommand("read_soil", "keyboard"); break;
      case "q": sendSensorCommand("servo_down", "keyboard"); break;
      case "e": sendSensorCommand("servo_up", "keyboard"); break;
    }
  };

  const handleKeyUp = (e: KeyboardEvent) => {
    if (isAutoMode) return;
    isKeyPressed.current[e.key] = false;
    if (["w", "a", "s", "d"].includes(e.key.toLowerCase())) {
      sendMotorCommand("stop", "keyboard");
    }
  };

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown as EventListener);
    window.addEventListener("keyup", handleKeyUp as EventListener);
    return () => {
      window.removeEventListener("keydown", handleKeyDown as EventListener);
      window.removeEventListener("keyup", handleKeyUp as EventListener);
    };
  }, [motorEspIP, sensorEspIP, isAutoMode]);

  // Status polling - check ESP32 status while in automatic mode
  useEffect(() => {
    if (isAutoMode && isConnected) {
      const statusInterval = setInterval(async () => {
        try {
          const res = await fetch(`http://${motorEspIP}/status`, { method: 'GET' });
          if (res.ok) {
            const data = await res.json();
            setStatus(prev => ({ ...prev, ...data }));
            if (data.mode === "automatic") {
              setAutoModeStatus(`Active - ${data.status || "Running automatic cycle"}`);
            }
          }
        } catch (error) {
          // ESP32 may be busy
        }
      }, 15000); // Check every 15 seconds

      return () => clearInterval(statusInterval);
    }
  }, [isAutoMode, isConnected, motorEspIP]);

  return (
    <div className="p-6 bg-gradient-to-br from-green-100 to-blue-100 min-h-screen flex flex-col items-center">
      <h1 className="text-4xl font-bold mb-6 text-green-800">🤖 Automatic Irrigation System</h1>

      {/* Mode Toggle */}
      <div className="mb-6 text-center">
        <button
          onClick={toggleAutomaticMode}
          className={`px-8 py-3 rounded-xl font-bold text-white transition duration-300 ${
            isAutoMode ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'
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
          isConnected ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
        }`}>
          {isConnected ? '🟢 ESP32 Connected' : '🟡 ESP32 Simulation'}
        </span>
        <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
          isAutoMode ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
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
                e.currentTarget.src = ipCamURL;
                e.currentTarget.onerror = () => {
                  e.currentTarget.src = 'https://via.placeholder.com/640x360/333333/ffffff?text=Camera+Offline';
                };
              }}
              crossOrigin="anonymous"
            />
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
                <button onClick={() => sendMotorCommand("forward")} className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg">↑ W</button>
                <button onClick={() => sendMotorCommand("left")} className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg">← A</button>
                <button onClick={() => sendMotorCommand("stop")} className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg">⏹ Stop</button>
                <button onClick={() => sendMotorCommand("right")} className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg">→ D</button>
                <button onClick={() => sendMotorCommand("backward")} className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg">↓ S</button>
              </div>
            )}
          </div>
        </div>
        {/* Sensor Data & Status */}
        <div className="bg-white rounded-xl shadow-lg p-4">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">Sensor Data & Status</h3>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <button onClick={() => sendSensorCommand("start_sensor")} className="bg-green-500 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-xl">🔍 Start Sensor (R)</button>
            <button onClick={() => sendSensorCommand("read_soil")} className="bg-orange-500 hover:bg-orange-700 text-white font-bold py-3 px-4 rounded-xl">🌱 Read Soil (T)</button>
            <button onClick={() => sendSensorCommand("servo_down")} className="bg-purple-500 hover:bg-purple-700 text-white font-bold py-3 px-4 rounded-xl">⬇️ Servo Down (Q)</button>
            <button onClick={() => sendSensorCommand("servo_up")} className="bg-indigo-500 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-xl">⬆️ Servo Up (E)</button>
          </div>
          {sensorHistory.length > 0 ? (
            <div className="space-y-4">
              {sensorHistory.map((data, index) => (
                <div key={index} className={`p-4 rounded-lg border-2 ${
                  data.soilStatus === 'DRY' ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-lg font-semibold">
                      {data.soilStatus === 'DRY' ? '🚨 Dry Soil Detected' : '✅ Soil OK'}
                    </h4>
                    <span className="text-sm text-gray-600">Reading #{index + 1}</span>
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
                  : "Press sensor buttons or keys to start"
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
              <li>• Use R/T/Q/E keys for sensor/servo</li>
              <li>• Click buttons as alternative to keys</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}