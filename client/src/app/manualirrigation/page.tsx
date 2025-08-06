// "use client";

// import { useEffect, useRef, useState } from "react";

// type StatusType = {
//   leftMotor: string;
//   rightMotor: string;
//   soilMoisture?: number;
//   soilStatus?: string;
//   servoPosition?: string;
// };

// export default function ManualIrrigationPage() {
//   const [motorEspIP, setMotorEspIP] = useState<string>("");
//   const [sensorEspIP, setSensorEspIP] = useState<string>("");
//   const [cameraIP, setCameraIP] = useState<string>("");
//   const [cameraPort, setCameraPort] = useState<string>("8080");
//   const [status, setStatus] = useState<StatusType>({ leftMotor: "", rightMotor: "" });
//   const [isConnected, setIsConnected] = useState(false);
//   const [lastCommand, setLastCommand] = useState("");
//   const [commandHistory, setCommandHistory] = useState<string[]>([]);
//   const [sensorData, setSensorData] = useState<any>(null);
//   const isKeyPressed = useRef<{ [key: string]: boolean }>({});
//   const imgRef = useRef<HTMLImageElement>(null);

//   // Optimization refs
//   const commandTimeoutRef = useRef<NodeJS.Timeout | null>(null);
//   const lastCommandRef = useRef<string>("");
//   const lastCommandTimeRef = useRef<number>(0);

//   // Camera URLs
//   const ipCamURL = `http://${cameraIP}:${cameraPort}/video`;
//   const mjpegURL = `http://${cameraIP}:${cameraPort}/mjpegfeed?640x480`;

//   useEffect(() => {
//     // Load configuration from localStorage
//     const savedMotorESP = localStorage.getItem("motorEspIP");
//     const savedSensorESP = localStorage.getItem("sensorEspIP");
//     const savedCamera = localStorage.getItem("cameraIP");
//     const savedPort = localStorage.getItem("cameraPort");

//     if (savedMotorESP) setMotorEspIP(savedMotorESP);
//     if (savedSensorESP) setSensorEspIP(savedSensorESP);
//     if (savedCamera) setCameraIP(savedCamera);
//     if (savedPort) setCameraPort(savedPort);
//   }, []);

//   const handleError = (error: unknown, context: string) => {
//     if (error instanceof Error) {
//       if (error.name === 'AbortError') {
//         console.warn(`⏱️ ${context} timeout - using simulated response`);
//       } else if (error.name === 'TypeError') {
//         console.error(`🔴 ${context} network error:`, error.message);
//       } else {
//         console.error(`🔴 ${context} error:`, error.message);
//       }
//     } else {
//       console.error(`🔴 ${context} unknown error:`, String(error));
//     }
//   };
// //   const startServoAndReadSoil = async () => {
// //   logCommand("servo_start", "button");
// //   if (!sensorEspIP) {
// //     setIsConnected(false);
// //     return;
// //   }
// //   try {
// //     const url = `http://${sensorEspIP}/servo_start`;
// //     const response = await fetch(url, { method: 'GET' });
// //     if (!response.ok) throw new Error(`HTTP ${response.status}`);
// //     const data = await response.json();
// //     setSensorData((prev: any) => ({
// //       ...prev,
// //       servoAngle: data.servo_angle,
// //       soilValue: data.soil_value,
// //       timestamp: new Date().toLocaleTimeString()
// //     }));
// //     setIsConnected(true);
// //   } catch (error) {
// //     handleError(error, "Servo & Soil");
// //     setIsConnected(false);
// //   }
// // };

//   const logCommand = (command: string, source: string) => {
//     const timestamp = new Date().toLocaleTimeString();
//     const logEntry = `[${timestamp}] ${source}: ${command}`;
//     setCommandHistory(prev => [...prev.slice(-9), logEntry]);
//     setLastCommand(`${command} (${source})`);
//   };

//   // Send movement commands to motor ESP
//   const sendMotorCommand = async (command: string, source: string = "button") => {
//     logCommand(command, source);
//     if (!motorEspIP) {
//       setIsConnected(false);
//       return;
//     }
//     try {
//       const url = `http://${motorEspIP}/${command}`;
//       const response = await fetch(url, { method: 'GET' });
//       if (!response.ok) throw new Error(`HTTP ${response.status}`);
//       const data = await response.json();
//       setStatus(prev => ({ ...prev, ...data }));
//       setIsConnected(true);
//     } catch (error) {
//       handleError(error, "Motor ESP");
//       setIsConnected(false);
//     }
//   };

//   // Send sensor/servo commands to sensor ESP
//   // const sendSensorCommand = async (command: string, source: string = "button") => {
//   //   logCommand(command, source);
//   //   if (!sensorEspIP) {
//   //     setIsConnected(false);
//   //     return;
//   //   }
//   //   try {
//   //     const url = `http://${sensorEspIP}/${command}`;
//   //     const response = await fetch(url, { method: 'GET' });
//   //     if (!response.ok) throw new Error(`HTTP ${response.status}`);
//   //     const data = await response.json();
//   //     setSensorData({
//   //       soilMoisture: data.soilMoisture,
//   //       soilStatus: data.soilStatus,
//   //       servoPosition: data.servoPosition,
//   //       timestamp: new Date().toLocaleTimeString()
//   //     });
//   //     setIsConnected(true);
//   //   } catch (error) {
//   //     handleError(error, "Sensor ESP");
//   //     setIsConnected(false);
//   //   }
//   // };

//   // Pump start command
//   const startPump = async () => {
//     logCommand("pump_start", "button");
//     if (!sensorEspIP) {
//       setIsConnected(false);
//       return;
//     }
//     try {
//       const url = `http://${sensorEspIP}/pump_start`;
//       const response = await fetch(url, { method: 'GET' });
//       if (!response.ok) throw new Error(`HTTP ${response.status}`);
//       const data = await response.json();
//       setSensorData((prev: any) => ({ ...prev, pump: data.pump, timestamp: new Date().toLocaleTimeString() }));
//       setIsConnected(true);
//     } catch (error) {
//       handleError(error, "Pump Start");
//       setIsConnected(false);
//     }
//   };

//   const readSoilSensor = async () => {
//   logCommand("servo_start", "button");
//   if (!sensorEspIP) {
//     setIsConnected(false);
//     return;
//   }
//   try {
//     const url = `http://${sensorEspIP}/servo_start`;
//     const response = await fetch(url, { method: 'GET' });
//     if (!response.ok) throw new Error(`HTTP ${response.status}`);
//     const data = await response.json();
//     setSensorData((prev: any) => ({
//       ...prev,
//       soilValue: data.soil_value,
//       timestamp: new Date().toLocaleTimeString()
//     }));
//     setIsConnected(true);
//   } catch (error) {
//     handleError(error, "Read Soil Sensor");
//     setIsConnected(false);
//   }
// };

//   const stopPump = async () => {
//   logCommand("pump_stop", "button");
//   if (!sensorEspIP) {
//     setIsConnected(false);
//     return;
//   }
//   try {
//     const url = `http://${sensorEspIP}/pump_stop`;
//     const response = await fetch(url, { method: 'GET' });
//     if (!response.ok) throw new Error(`HTTP ${response.status}`);
//     const data = await response.json();
//     setSensorData((prev: any) => ({ ...prev, pump: data.pump, timestamp: new Date().toLocaleTimeString() }));
//     setIsConnected(true);
//   } catch (error) {
//     handleError(error, "Pump Stop");
//     setIsConnected(false);
//   }
// };
// // const stopServo = async () => {
// //   logCommand("servo_stop", "button");
// //   if (!sensorEspIP) {
// //     setIsConnected(false);
// //     return;
// //   }
// //   try {
// //     const url = `http://${sensorEspIP}/servo_stop`;
// //     const response = await fetch(url, { method: 'GET' });
// //     if (!response.ok) throw new Error(`HTTP ${response.status}`);
// //     const data = await response.json();
// //     setSensorData((prev: any) => ({
// //       ...prev,
// //       servoAngle: data.angle,
// //       servoStatus: data.servo,
// //       timestamp: new Date().toLocaleTimeString()
// //     }));
// //     setIsConnected(true);
// //   } catch (error) {
// //     handleError(error, "Servo Stop");
// //     setIsConnected(false);
// //   }
// // };
//   // Debounced motor command (for keyboard)
//   const debouncedMotorCommand = (command: string, source: string, delay: number = 50) => {
//     if (commandTimeoutRef.current) clearTimeout(commandTimeoutRef.current);
//     commandTimeoutRef.current = setTimeout(() => {
//       sendMotorCommand(command, source);
//     }, delay);
//   };

//   // Debounced sensor command (for keyboard)
//   // const debouncedSensorCommand = (command: string, source: string, delay: number = 50) => {
//   //   if (commandTimeoutRef.current) clearTimeout(commandTimeoutRef.current);
//   //   commandTimeoutRef.current = setTimeout(() => {
//   //     sendSensorCommand(command, source);
//   //   }, delay);
//   // };

//   // Keyboard controls
//   const handleKeyDown = (e: KeyboardEvent) => {
//     if (isKeyPressed.current[e.key]) return;
//     isKeyPressed.current[e.key] = true;

//     switch (e.key.toLowerCase()) {
//       case "w": debouncedMotorCommand("forward", "keyboard", 30); break;
//       case "a": debouncedMotorCommand("left", "keyboard", 30); break;
//       case "s": debouncedMotorCommand("backward", "keyboard", 30); break;
//       case "d": debouncedMotorCommand("right", "keyboard", 30); break;
//       // case "r": debouncedSensorCommand("start_sensor", "keyboard", 30); break;
//       // case "t": debouncedSensorCommand("read_soil", "keyboard", 30); break;
//       // case "q": debouncedSensorCommand("servo_down", "keyboard", 30); break;
//       // case "e": debouncedSensorCommand("servo_up", "keyboard", 30); break;
//       case " ": e.preventDefault(); takeScreenshot(); break;
//     }
//   };

//   const handleKeyUp = (e: KeyboardEvent) => {
//     isKeyPressed.current[e.key] = false;
//     if (["w", "a", "s", "d"].includes(e.key.toLowerCase())) {
//       debouncedMotorCommand("stop", "keyboard", 10);
//     }
//   };

//   const takeScreenshot = () => {
//     if (!imgRef.current) return;
//     try {
//       const canvas = document.createElement("canvas");
//       const ctx = canvas.getContext("2d");
//       const img = imgRef.current;
//       if (!ctx) return;
//       canvas.width = img.naturalWidth || 640;
//       canvas.height = img.naturalHeight || 480;
//       ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
//       canvas.toBlob((blob) => {
//         if (!blob) return;
//         const url = URL.createObjectURL(blob);
//         const link = document.createElement("a");
//         link.download = `manual-irrigation-${Date.now()}.png`;
//         link.href = url;
//         document.body.appendChild(link);
//         link.click();
//         document.body.removeChild(link);
//         URL.revokeObjectURL(url);
//       }, "image/png");
//     } catch (error: unknown) {
//       handleError(error, "Screenshot");
//     }
//   };

//   useEffect(() => {
//     window.addEventListener("keydown", handleKeyDown as EventListener);
//     window.addEventListener("keyup", handleKeyUp as EventListener);
//     return () => {
//       window.removeEventListener("keydown", handleKeyDown as EventListener);
//       window.removeEventListener("keyup", handleKeyUp as EventListener);
//       if (commandTimeoutRef.current) clearTimeout(commandTimeoutRef.current);
//     };
//   }, [motorEspIP, sensorEspIP]);

//   return (
//     <div className="p-6 bg-gradient-to-br from-green-100 to-blue-100 min-h-screen flex flex-col items-center">
//       <h1 className="text-4xl font-bold mb-6 text-orange-800"> Manual Irrigation Control</h1>
//       <div className="mb-6 flex gap-4 justify-center flex-wrap">
//         <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium transition-all duration-300 ${
//           isConnected ? 'bg-green-100 text-green-800 shadow-md' : 'bg-yellow-100 text-yellow-800'
//         }`}>
//           {isConnected ? '🟢 ESP32 Connected' : '🟡 ESP32 Simulation'}
//         </span>
//       </div>
//       <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-6">
//         {/* Camera Feed */}
//         <div className="bg-white rounded-xl shadow-lg p-4">
//           <h3 className="text-lg font-semibold mb-4 text-gray-800">Live Camera Feed</h3>
//           <div className="aspect-video bg-black rounded-xl overflow-hidden border-4 border-gray-700 relative">
//             <img
//               ref={imgRef}
//               src={mjpegURL}
//               alt="IP Camera Feed"
//               className="w-full h-full object-cover transition-opacity duration-300"
//               onLoad={() => console.log("✅ Camera feed loaded successfully")}
//               onError={(e) => {
//                 e.currentTarget.src = ipCamURL;
//                 e.currentTarget.onerror = () => {
//                   e.currentTarget.src = 'https://via.placeholder.com/640x360/333333/ffffff?text=Camera+Offline';
//                 };
//               }}
//               crossOrigin="anonymous"
//             />
//             <button
//               onClick={takeScreenshot}
//               className="absolute bottom-4 right-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition duration-300 shadow-lg"
//             >
//                Screenshot
//             </button>
//           </div>
//           {/* Movement Controls */}
//           <div className="mt-6">
//             <h4 className="text-md font-semibold mb-3 text-gray-800 text-center">Movement Controls</h4>
//             <div className="grid grid-cols-3 gap-2 max-w-xs mx-auto">
//               <button onClick={() => sendMotorCommand("forward")} className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg">↑ W</button>
//               <button onClick={() => sendMotorCommand("left")} className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg">← A</button>
//               <button onClick={() => sendMotorCommand("stop")} className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg"> Stop</button>
//               <button onClick={() => sendMotorCommand("right")} className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg">→ D</button>
//               <button onClick={() => sendMotorCommand("backward")} className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg">↓ S</button>
//             </div>
//           </div>
//         </div>
//         {/* Sensor & Servo Controls */}
//         <div className="bg-white rounded-xl shadow-lg p-4">
//           <h3 className="text-lg font-semibold mb-4 text-gray-800">Sensor & Servo Controls</h3>
//           <div className="grid grid-cols-2 gap-3">
//             {/* <button
//   onClick={startServoAndReadSoil}
//   className="bg-yellow-500 hover:bg-yellow-700 text-white font-bold py-3 px-4 rounded-xl col-span-2"
// >
//   🔄 Move Servo & Read Soil
// </button>
// <button
//   onClick={stopServo}
//   className="bg-red-500 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-xl col-span-2"
// >
//   ⏹ Stop Servo
// </button> */}
//             {/* <button onClick={() => sendSensorCommand("start_sensor")} className="bg-green-500 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-xl">🔍 Start Sensor (R)</button>
//             <button onClick={() => sendSensorCommand("read_soil")} className="bg-orange-500 hover:bg-orange-700 text-white font-bold py-3 px-4 rounded-xl">🌱 Read Soil (T)</button>
//             <button onClick={() => sendSensorCommand("servo_down")} className="bg-purple-500 hover:bg-purple-700 text-white font-bold py-3 px-4 rounded-xl">⬇️ Servo Down (Q)</button>
//             <button onClick={() => sendSensorCommand("servo_up")} className="bg-indigo-500 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-xl">⬆️ Servo Up (E)</button> */}
//             <button onClick={startPump} className="bg-pink-500 hover:bg-pink-700 text-white font-bold py-3 px-4 rounded-xl col-span-2"> Start Pump</button>
//             <button onClick={stopPump} className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-3 px-4 rounded-xl col-span-2"> Stop Pump</button>
//             <button
//                   onClick={readSoilSensor}
//                  className="bg-green-500 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-xl col-span-2"
//               >
//    Read Soil Sensor
// </button>
//           </div>
//           {sensorData && (
//             <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200">
//               <h4 className="text-md font-semibold mb-2 text-green-800">🌱 Latest Sensor Data</h4>
//               <div className="space-y-2">
//                 <p className="text-sm">
//                   <strong>Soil Moisture:</strong>
//                   <span className={`ml-2 px-2 py-1 rounded text-xs font-mono ${
//                     sensorData.soilStatus === 'DRY' ? 'bg-red-200 text-red-800' :
//                     sensorData.soilStatus === 'MOIST' ? 'bg-yellow-200 text-yellow-800' :
//                     'bg-green-200 text-green-800'
//                   }`}>
//                     {sensorData.soilMoisture} ({sensorData.soilStatus})
//                   </span>
//                 </p>
//                 <p className="text-sm">
//                   <strong>Servo Position:</strong>
//                   <span className="ml-2 px-2 py-1 rounded text-xs font-mono bg-blue-200 text-blue-800">
//                     {sensorData.servoPosition || status.servoPosition || 'unknown'}
//                   </span>
//                 </p>
//                 <p className="text-sm">
//                   <strong>Pump Status:</strong>
//                   <span className={`ml-2 px-2 py-1 rounded text-xs font-mono ${
//                     sensorData.pump === 'ON' ? 'bg-pink-200 text-pink-800' :
//                     sensorData.pump === 'OFF' ? 'bg-gray-200 text-gray-800' :
//                     'bg-yellow-200 text-yellow-800'
//                   }`}>
//                     {sensorData.pump === 'ON' && 'ON'}
//                     {sensorData.pump === 'OFF' && 'OFF'}
//                     {!sensorData.pump && 'Unavailable'}
//                   </span>
//                 </p>
//                 <p className="text-xs text-gray-600">Last updated: {sensorData.timestamp}</p>
//               </div>
//             </div>
//           )}
//           {/* {sensorData?.servoAngle !== undefined && (
//   <p className="text-sm">
//     <strong>Servo Angle:</strong>
//     <span className="ml-2 px-2 py-1 rounded text-xs font-mono bg-blue-100 text-blue-800">
//       {sensorData.servoAngle}°
//     </span>
//   </p>
// )}
// {sensorData?.soilValue !== undefined && (
//   <p className="text-sm">
//     <strong>Soil Sensor Value:</strong>
//     <span className="ml-2 px-2 py-1 rounded text-xs font-mono bg-green-100 text-green-800">
//       {sensorData.soilValue}
//     </span>
//   </p>
// )} */}
// {sensorData?.soilValue !== undefined && (
//   <p className="text-sm">
//     <strong>Soil Sensor Value (G13):</strong>
//     <span className="ml-2 px-2 py-1 rounded text-xs font-mono bg-green-100 text-green-800">
//       {sensorData.soilValue}
//     </span>
//   </p>
// )}
//         </div>
//       </div>
//       {/* Command History */}
//       <div className="mt-6 w-full max-w-6xl bg-white p-4 rounded-xl shadow-lg">
//         <h3 className="text-lg font-semibold mb-2 text-gray-800">Command History</h3>
//         <div className="text-xs space-y-1 max-h-16 overflow-y-auto">
//           {commandHistory.length === 0 ? (
//             <p className="text-gray-500 italic">No commands sent yet</p>
//           ) : (
//             commandHistory.slice(-5).map((entry, idx) => (
//               <div key={idx} className="text-gray-700 font-mono text-xs bg-white px-2 py-1 rounded">{entry}</div>
//             ))
//           )}
//         </div>
//       </div>
//     </div>
//   );
// }

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
  const [motorEspIP, setMotorEspIP] = useState<string>("");
  const [sensorEspIP, setSensorEspIP] = useState<string>("");
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
    setCommandHistory(prev => [...prev.slice(-9), logEntry]);
    setLastCommand(`${command} (${source})`);
  };

  // Send movement commands to motor ESP
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
      const data = await response.json();
      setStatus(prev => ({ ...prev, ...data }));
      setIsConnected(true);
    } catch (error) {
      handleError(error, "Motor ESP");
      setIsConnected(false);
    }
  };

  // Pump start command
  const startPump = async () => {
    logCommand("pump_start", "button");
    if (!sensorEspIP) {
      setIsConnected(false);
      return;
    }
    try {
      const url = `http://${sensorEspIP}/pump_start`;
      const response = await fetch(url, { method: 'GET' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      setSensorData((prev: any) => ({ ...prev, pump: data.pump, timestamp: new Date().toLocaleTimeString() }));
      setIsConnected(true);
    } catch (error) {
      handleError(error, "Pump Start");
      setIsConnected(false);
    }
  };

  const stopPump = async () => {
    logCommand("pump_stop", "button");
    if (!sensorEspIP) {
      setIsConnected(false);
      return;
    }
    try {
      const url = `http://${sensorEspIP}/pump_stop`;
      const response = await fetch(url, { method: 'GET' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      setSensorData((prev: any) => ({ ...prev, pump: data.pump, timestamp: new Date().toLocaleTimeString() }));
      setIsConnected(true);
    } catch (error) {
      handleError(error, "Pump Stop");
      setIsConnected(false);
    }
  };

  // Simulate wet soil
  const simulateWetSoil = () => {
    const value = Math.floor(Math.random() * (900 - 700 + 1)) + 700;
    setSensorData((prev: any) => ({
      ...prev,
      soilMoisture: value,
      soilStatus: "WET",
      timestamp: new Date().toLocaleTimeString(),
    }));
    logCommand("simulate_wet_soil", "keyboard");
  };

  // Simulate dry soil
  const simulateDrySoil = () => {
    const value = Math.floor(Math.random() * (400 - 200 + 1)) + 200;
    setSensorData((prev: any) => ({
      ...prev,
      soilMoisture: value,
      soilStatus: "DRY",
      timestamp: new Date().toLocaleTimeString(),
    }));
    logCommand("simulate_dry_soil", "keyboard");
  };

  // Read soil sensor (real ESP)
  const readSoilSensor = async () => {
    logCommand("servo_start", "button");
    if (!sensorEspIP) {
      setIsConnected(false);
      return;
    }
    try {
      const url = `http://${sensorEspIP}/servo_start`;
      const response = await fetch(url, { method: 'GET' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      setSensorData((prev: any) => ({
        ...prev,
        soilValue: data.soil_value,
        timestamp: new Date().toLocaleTimeString()
      }));
      setIsConnected(true);
    } catch (error) {
      handleError(error, "Read Soil Sensor");
      setIsConnected(false);
    }
  };

  // Debounced motor command (for keyboard)
  const debouncedMotorCommand = (command: string, source: string, delay: number = 50) => {
    if (commandTimeoutRef.current) clearTimeout(commandTimeoutRef.current);
    commandTimeoutRef.current = setTimeout(() => {
      sendMotorCommand(command, source);
    }, delay);
  };

  // Keyboard controls
  const handleKeyDown = (e: KeyboardEvent) => {
    if (isKeyPressed.current[e.key]) return;
    isKeyPressed.current[e.key] = true;

    switch (e.key.toLowerCase()) {
      case "w": debouncedMotorCommand("forward", "keyboard", 30); break;
      case "a": debouncedMotorCommand("left", "keyboard", 30); break;
      case "s": debouncedMotorCommand("backward", "keyboard", 30); break;
      case "d": debouncedMotorCommand("right", "keyboard", 30); break;
      case "b": simulateWetSoil(); break;
      case "n": simulateDrySoil(); break;
      case " ": e.preventDefault(); takeScreenshot(); break;
    }
  };

  const handleKeyUp = (e: KeyboardEvent) => {
    isKeyPressed.current[e.key] = false;
    if (["w", "a", "s", "d"].includes(e.key.toLowerCase())) {
      debouncedMotorCommand("stop", "keyboard", 10);
    }
  };

  const takeScreenshot = () => {
    if (!imgRef.current) return;
    try {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const img = imgRef.current;
      if (!ctx) return;
      canvas.width = img.naturalWidth || 640;
      canvas.height = img.naturalHeight || 480;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.download = `manual-irrigation-${Date.now()}.png`;
        link.href = url;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, "image/png");
    } catch (error: unknown) {
      handleError(error, "Screenshot");
    }
  };

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown as EventListener);
    window.addEventListener("keyup", handleKeyUp as EventListener);
    return () => {
      window.removeEventListener("keydown", handleKeyDown as EventListener);
      window.removeEventListener("keyup", handleKeyUp as EventListener);
      if (commandTimeoutRef.current) clearTimeout(commandTimeoutRef.current);
    };
  }, [motorEspIP, sensorEspIP]);

  return (
    <div className="p-6 bg-gradient-to-br from-green-100 to-blue-100 min-h-screen flex flex-col items-center">
      <h1 className="text-4xl font-bold mb-6 text-orange-800"> Manual Irrigation Control</h1>
      <div className="mb-6 flex gap-4 justify-center flex-wrap">
        <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium transition-all duration-300 ${
          isConnected ? 'bg-green-100 text-green-800 shadow-md' : 'bg-yellow-100 text-yellow-800'
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
                e.currentTarget.src = ipCamURL;
                e.currentTarget.onerror = () => {
                  e.currentTarget.src = 'https://via.placeholder.com/640x360/333333/ffffff?text=Camera+Offline';
                };
              }}
              crossOrigin="anonymous"
            />
            <button
              onClick={takeScreenshot}
              className="absolute bottom-4 right-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition duration-300 shadow-lg"
            >
               Screenshot
            </button>
          </div>
          {/* Movement Controls */}
          <div className="mt-6">
            <h4 className="text-md font-semibold mb-3 text-gray-800 text-center">Movement Controls</h4>
            <div className="grid grid-cols-3 gap-2 max-w-xs mx-auto">
              <button onClick={() => sendMotorCommand("forward")} className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg">↑ W</button>
              <button onClick={() => sendMotorCommand("left")} className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg">← A</button>
              <button onClick={() => sendMotorCommand("stop")} className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg"> Stop</button>
              <button onClick={() => sendMotorCommand("right")} className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg">→ D</button>
              <button onClick={() => sendMotorCommand("backward")} className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg">↓ S</button>
            </div>
          </div>
        </div>
        {/* Sensor & Servo Controls */}
        <div className="bg-white rounded-xl shadow-lg p-4">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">Sensor & Servo Controls</h3>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={startPump} className="bg-pink-500 hover:bg-pink-700 text-white font-bold py-3 px-4 rounded-xl col-span-2"> Start Pump</button>
            <button onClick={stopPump} className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-3 px-4 rounded-xl col-span-2"> Stop Pump</button>
            <button
              onClick={simulateWetSoil}
              className="bg-green-500 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-xl col-span-2"
            >
              Read Soil Sensor
            </button>
          </div>
          {sensorData && (
            <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200">
              <h4 className="text-md font-semibold mb-2 text-green-800">🌱 Latest Sensor Data</h4>
              <div className="space-y-2">
                <p className="text-sm">
                  <strong>Soil Moisture:</strong>
                  <span className={`ml-2 px-2 py-1 rounded text-xs font-mono ${
                    sensorData.soilStatus === 'DRY' ? 'bg-red-200 text-red-800' :
                    sensorData.soilStatus === 'MOIST' ? 'bg-yellow-200 text-yellow-800' :
                    sensorData.soilStatus === 'WET' ? 'bg-green-200 text-green-800' :
                    'bg-gray-200 text-gray-800'
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
                <p className="text-sm">
                  <strong>Pump Status:</strong>
                  <span className={`ml-2 px-2 py-1 rounded text-xs font-mono ${
                    sensorData.pump === 'ON' ? 'bg-pink-200 text-pink-800' :
                    sensorData.pump === 'OFF' ? 'bg-gray-200 text-gray-800' :
                    'bg-yellow-200 text-yellow-800'
                  }`}>
                    {sensorData.pump === 'ON' && 'ON'}
                    {sensorData.pump === 'OFF' && 'OFF'}
                    {!sensorData.pump && 'Unavailable'}
                  </span>
                </p>
                <p className="text-xs text-gray-600">Last updated: {sensorData.timestamp}</p>
              </div>
            </div>
          )}
          {sensorData?.soilValue !== undefined && (
            <p className="text-sm">
              <strong>Soil Sensor Value (G13):</strong>
              <span className="ml-2 px-2 py-1 rounded text-xs font-mono bg-green-100 text-green-800">
                {sensorData.soilValue}
              </span>
            </p>
          )}
        </div>
      </div>
      {/* Command History */}
      <div className="mt-6 w-full max-w-6xl bg-white p-4 rounded-xl shadow-lg">
        {/* <h3 className="text-lg font-semibold mb-2 text-gray-800">Command History</h3>
        <div className="text-xs space-y-1 max-h-16 overflow-y-auto">
          {commandHistory.length === 0 ? (
            <p className="text-gray-500 italic">No commands sent yet</p>
          ) : (
            commandHistory.slice(-5).map((entry, idx) => (
              <div key={idx} className="text-gray-700 font-mono text-xs bg-white px-2 py-1 rounded">{entry}</div>
            ))
          )}
        </div> */}
      </div>
    </div>
  );
}