'use client';

import { useEffect, useRef, useState } from "react";

type StatusType = {
  leftMotor: string;
  rightMotor: string;
};

type PredictionResult = {
  plant: string;
  disease: string;
  full_class: string;
  confidence: number;
  is_healthy: boolean;
};

export default function SurveillancePage() {
  const [espIP, setEspIP] = useState<string>("192.168.1.100");
  const [cameraIP, setCameraIP] = useState<string>("192.168.50.130");
  const [cameraPort, setCameraPort] = useState<string>("8080");
  const [mlApiURL, setMlApiURL] = useState<string>("http://localhost:5000");
  const [status, setStatus] = useState<StatusType>({ leftMotor: "", rightMotor: "" });
  const [isConnected, setIsConnected] = useState(false);
  const [isMlConnected, setIsMlConnected] = useState(false);
  const [lastCommand, setLastCommand] = useState("");
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [predictionResult, setPredictionResult] = useState<PredictionResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisHistory, setAnalysisHistory] = useState<PredictionResult[]>([]);
  const isKeyPressed = useRef<{ [key: string]: boolean }>({});
  const imgRef = useRef<HTMLImageElement>(null);

  // Dynamic IP webcam URL
  const ipCamURL = `http://${cameraIP}:${cameraPort}/video`;
  const mjpegURL = `http://${cameraIP}:${cameraPort}/mjpegfeed?640x480`;

  useEffect(() => {
    const savedESP = localStorage.getItem("espIP");
    const savedCamera = localStorage.getItem("cameraIP");
    const savedPort = localStorage.getItem("cameraPort");
    const savedMlAPI = localStorage.getItem("mlApiURL");
    
    if (savedESP) setEspIP(savedESP);
    if (savedCamera) setCameraIP(savedCamera);
    if (savedPort) setCameraPort(savedPort);
    if (savedMlAPI) setMlApiURL(savedMlAPI);

    // Test ML API connection on load
    testMLConnection();
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
        console.warn("No ESP IP configured");
        return;
      }

      const url = `http://${espIP}/${command}`;
      console.log(`Sending request to: ${url}`);
      
      const simulatedResponse = {
        command: command,
        status: "success",
        leftMotor: command === "left" || command === "forward" ? "active" : "inactive",
        rightMotor: command === "right" || command === "forward" ? "active" : "inactive",
        timestamp: new Date().toISOString()
      };

      try {
        const res = await fetch(url, { 
          method: 'GET',
          
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

  function isImageBlankOrBlack(img: HTMLImageElement): boolean {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return false;

  canvas.width = img.naturalWidth || 640;
  canvas.height = img.naturalHeight || 480;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  let blackPixels = 0;
  for (let i = 0; i < imageData.length; i += 4) {
    // If R,G,B all < 10, count as black pixel
    if (imageData[i] < 10 && imageData[i + 1] < 10 && imageData[i + 2] < 10) {
      blackPixels++;
    }
  }
  const percentBlack = blackPixels / (canvas.width * canvas.height);
  // If more than 95% pixels are black, treat as blank/black image
  return percentBlack > 0.95;
}

  const testMLConnection = async () => {
    try {
      const response = await fetch(`${mlApiURL}/health`);
      if (response.ok) {
        const data = await response.json();
        setIsMlConnected(data.model_loaded);
        console.log("ML API Response:", data);
      } else {
        setIsMlConnected(false);
      }
    } catch (error) {
      console.error("ML API connection failed:", error);
      setIsMlConnected(false);
    }
  };

  const analyzeImage = async () => {
    if (!imgRef.current || !isMlConnected) {
      console.error("Camera image not found or ML API not connected");
      return;
    }

    if (isImageBlankOrBlack(imgRef.current)) {
    alert("Camera image is blank or black. Please check your camera feed.");
    return;
    }

  const src = imgRef.current.src;
  if (
    !src ||
    src.includes('placeholder.com') ||
    src.includes('Camera+Offline')
  ) {
    alert("Camera feed is not available. Please check your camera connection.");
    return;
  }

    setIsAnalyzing(true);
    
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
      
      // Convert canvas to base64
      const imageData = canvas.toDataURL('image/jpeg', 0.8);
      
      // Send to ML API
      const response = await fetch(`${mlApiURL}/predict`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ image: imageData })
      });

      if (response.ok) {
        const result = await response.json();
        console.log("ML Prediction:", result);
        
        if (result.status === 'success') {
          setPredictionResult(result.prediction);
          setAnalysisHistory(prev => [result.prediction, ...prev.slice(0, 4)]); // Keep last 5 results
        }
      } else {
        console.error("ML API error:", response.statusText);
      }

    } catch (error) {
      console.error("Analysis failed:", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const takeScreenshotAndAnalyze = () => {
    console.log("Taking screenshot and analyzing...");
    analyzeImage();
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
        takeScreenshotAndAnalyze();
        break;
    }
  };

  const handleKeyUp = (e: KeyboardEvent) => {
    if (e.key.toLowerCase() === " ") return;
    
    isKeyPressed.current[e.key] = false;
    sendCommand("stop", "keyboard");
  };

  const saveSettings = () => {
    localStorage.setItem("espIP", espIP);
    localStorage.setItem("cameraIP", cameraIP);
    localStorage.setItem("cameraPort", cameraPort);
    localStorage.setItem("mlApiURL", mlApiURL);
    console.log("Settings saved:", { espIP, cameraIP, cameraPort, mlApiURL });
  };

  const testESPConnection = async () => {
    console.log("Testing ESP connection...");
    await sendCommand("ping", "connection test");
  };

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [espIP, mlApiURL]);

  return (
    <div className="p-6 bg-gradient-to-br from-green-50 to-blue-50 min-h-screen flex flex-col items-center">
      <h1 className="text-4xl font-bold mb-6 text-green-800">🌱 Plant Disease Surveillance</h1>

      {/* Configuration Panel */}
      <div className="w-full max-w-4xl bg-white p-6 rounded-xl shadow-lg mb-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-800">Configuration</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Motor ESP IP</label>
            <input
              type="text"
              placeholder="192.168.1.100"
              value={espIP}
              onChange={(e) => setEspIP(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-black"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Camera IP</label>
            <input
              type="text"
              placeholder="192.168.50.130"
              value={cameraIP}
              onChange={(e) => setCameraIP(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-black"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Camera Port</label>
            <input
              type="text"
              placeholder="8080"
              value={cameraPort}
              onChange={(e) => setCameraPort(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-black"
            />
          </div>

          <div className="space-y-2 lg:col-span-3">
            <label className="block text-sm font-medium text-gray-700">ML API URL</label>
            <input
              type="text"
              placeholder="http://localhost:5000"
              value={mlApiURL}
              onChange={(e) => setMlApiURL(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-black"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={saveSettings}
              className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition duration-300"
            >
              Save Settings
            </button>
          </div>

          <div className="flex gap-2">
            <button
              onClick={testESPConnection}
              className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition duration-300"
            >
              Test ESP
            </button>
          </div>

          <div className="flex gap-2">
            <button
              onClick={testMLConnection}
              className="flex-1 bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700 transition duration-300"
            >
              Test ML API
            </button>
          </div>
        </div>

        {/* Connection Status */}
        <div className="mt-4 flex gap-4 justify-center flex-wrap">
          <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
            isConnected 
              ? 'bg-green-100 text-green-800' 
              : 'bg-yellow-100 text-yellow-800'
          }`}>
            {isConnected ? '🟢 ESP Connected' : '🟡 ESP Simulation'}
          </span>
          <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
            isMlConnected 
              ? 'bg-green-100 text-green-800' 
              : 'bg-red-100 text-red-800'
          }`}>
            {isMlConnected ? '🟢 ML API Connected' : '🔴 ML API Offline'}
          </span>
        </div>
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
              onClick={takeScreenshotAndAnalyze}
              disabled={isAnalyzing || !isMlConnected}
              className={`absolute bottom-4 right-4 px-4 py-2 rounded-lg transition duration-300 ${
                isAnalyzing || !isMlConnected
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-green-600 hover:bg-green-700'
              } text-white`}
            >
              {isAnalyzing ? '🔄 Analyzing...' : '🔬 Analyze Plant'}
            </button>
          </div>

          {/* Movement Controls */}
          <div className="mt-6">
            <h4 className="text-md font-semibold mb-3 text-gray-800 text-center">Movement Controls</h4>
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
          </div>
        </div>

        {/* Analysis Results */}
        <div className="bg-white rounded-xl shadow-lg p-4">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">Disease Analysis Results</h3>
          
          {predictionResult ? (
            <div className="space-y-4">
              <div className={`p-4 rounded-lg border-2 ${
                predictionResult.is_healthy 
                  ? 'bg-green-50 border-green-200' 
                  : 'bg-red-50 border-red-200'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-lg font-semibold">
                    {predictionResult.is_healthy ? '✅ Healthy Plant' : '⚠️ Disease Detected'}
                  </h4>
                  {/* <span className="text-sm text-gray-600">
                    {(predictionResult.confidence * 100).toFixed(1)}% confidence
                  </span> */}
                </div>
                <div className="space-y-2">
                  <p><strong>Plant:</strong> {predictionResult.plant.replace(/_/g, ' ')}</p>
                  <p><strong>Condition:</strong> {predictionResult.disease.replace(/_/g, ' ')}</p>
                  {!predictionResult.is_healthy && (
                    <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
                      <p className="text-sm text-yellow-800">
                        <strong>⚠️ Action Required:</strong> This plant shows signs of disease. 
                        Consider appropriate treatment or isolation from healthy plants.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Analysis History */}
              <div>
                <h4 className="text-md font-semibold mb-2 text-gray-800">Recent Analysis</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {analysisHistory.map((result, index) => (
                    <div key={index} className={`p-2 rounded border ${
                      result.is_healthy ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                    }`}>
                      <div className="flex justify-between items-center text-sm">
                        <span>{result.plant.replace(/_/g, ' ')}</span>
                        <span className={result.is_healthy ? 'text-green-600' : 'text-red-600'}>
                          {result.is_healthy ? '✅' : '⚠️'} {(result.confidence * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="text-xs text-gray-600">
                        {result.disease.replace(/_/g, ' ')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <div className="text-4xl mb-2">🌱</div>
              <p>No analysis results yet</p>
              <p className="text-sm">Press SPACEBAR or click "Analyze Plant" to start</p>
            </div>
          )}

          {/* Status Panel */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-50 p-3 rounded-lg">
              <h4 className="text-sm font-semibold mb-2 text-gray-800">Robot Status</h4>
              <p className="text-xs">Left Motor: <span className="font-mono">{status.leftMotor || "unknown"}</span></p>
              <p className="text-xs">Right Motor: <span className="font-mono">{status.rightMotor || "unknown"}</span></p>
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

      {/* Instructions */}
      <div className="mt-6 w-full max-w-4xl bg-white p-4 rounded-xl shadow-lg">
        <h3 className="text-lg font-semibold mb-2 text-gray-800">Instructions:</h3>
        <ul className="text-sm text-gray-600 space-y-1 grid grid-cols-1 md:grid-cols-2 gap-2">
          <li>• Use WASD keys or buttons to control robot movement</li>
          <li>• Press SPACEBAR or "Analyze Plant" to capture and analyze</li>
          <li>• Configure all IP addresses and ML API URL above</li>
          <li>• Make sure ML API server is running (python ml_api.py)</li>
          <li>• Check console (F12) for detailed logs</li>
          <li>• Green status = healthy plant, Red status = disease detected</li>
        </ul>
      </div>
    </div>
  );
}