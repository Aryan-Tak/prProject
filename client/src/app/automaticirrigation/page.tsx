"use client";

import { useState, useEffect } from 'react';

export default function AutomaticIrrigation() {
  const [sensorData, setSensorData] = useState({
    temperature: 0,
    humidity: 0,
    soilMoisture: 0,
    waterLevel: 0,
    soilMoistureStatus: 'Unknown',
    waterLevelStatus: 'Unknown',
    irrigationActive: false
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [espIP, setEspIP] = useState('');
  const [isConnected, setIsConnected] = useState(false);

  // Replace with your ESP's IP address
  const ESP_IP = espIP || "192.168.242.76"; // Default IP (you should change this)

  // Function to fetch sensor data
  const fetchSensorData = async () => {
    if (!isConnected) return;
    
    try {
      const response = await fetch(`http://${ESP_IP}/data`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      const data = await response.json();
      setSensorData(data);
    } catch (error) {
      console.error("Error fetching sensor data:", error);
      setError("Failed to fetch sensor data. Check ESP connection.");
      setIsConnected(false);
    }
  };

  // Connect to ESP8266
  const connectToESP = async () => {
    setLoading(true);
    setError(null);
    
    const url = `http://${ESP_IP}`;
    console.log(`Attempting to connect to: ${url}`);
    
    try {
      // First, try a simple test connection
      console.log("Testing basic connectivity...");
      const testResponse = await fetch(`${url}`, { 
        mode: 'cors',
        headers: {
          'Accept': 'text/plain'
        },
        timeout: 5000 // 5 second timeout
      }).catch(e => {
        console.error("Test connection failed:", e);
        throw new Error(`Cannot reach ESP8266. Check if: 
        1. ESP8266 is powered on
        2. Connected to the same network as your computer
        3. IP address is correct
        4. No firewall is blocking the connection`);
      });
      
      console.log("Basic connection successful, now fetching data...");
      
      // Now try to get the data
      const response = await fetch(`${url}/data`, { 
        mode: 'cors',
        headers: {
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log("Data received:", data);
      setSensorData(data);
      setIsConnected(true);
    } catch (error) {
      console.error("Connection error:", error);
      setError(error.message);
      setIsConnected(false);
    } finally {
      setLoading(false);
    }
  };

  // Start irrigation
  const startIrrigation = async () => {
    if (!isConnected) {
      setError("Connect to ESP8266 first");
      return;
    }
    
    setLoading(true);
    try {
      const response = await fetch(`http://${ESP_IP}/start`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      // Update local state immediately for responsive UI
      setSensorData(prev => ({ ...prev, irrigationActive: true }));
      
      // Then fetch the latest data from the ESP
      fetchSensorData();
    } catch (error) {
      console.error("Error starting irrigation:", error);
      setError("Failed to start irrigation");
    } finally {
      setLoading(false);
    }
  };

  // Stop irrigation
  const stopIrrigation = async () => {
    if (!isConnected) {
      setError("Connect to ESP8266 first");
      return;
    }
    
    setLoading(true);
    try {
      const response = await fetch(`http://${ESP_IP}/stop`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      // Update local state immediately for responsive UI
      setSensorData(prev => ({ ...prev, irrigationActive: false }));
      
      // Then fetch the latest data from the ESP
      fetchSensorData();
    } catch (error) {
      console.error("Error stopping irrigation:", error);
      setError("Failed to stop irrigation");
    } finally {
      setLoading(false);
    }
  };

  // Fetch sensor data periodically
  useEffect(() => {
    if (!isConnected) return;
    
    // Initial fetch
    fetchSensorData();
    
    // Set up interval for periodic fetching
    const interval = setInterval(fetchSensorData, 5000); // Every 5 seconds
    
    // Clean up interval on component unmount
    return () => clearInterval(interval);
  }, [isConnected, ESP_IP]);

  // Determine status colors
  const getMoistureColor = () => {
    if (sensorData.soilMoistureStatus === 'High') return 'text-green-600';
    return 'text-red-600';
  };
  
  const getWaterLevelColor = () => {
    if (sensorData.waterLevelStatus === 'High') return 'text-blue-600';
    return 'text-red-600';
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-green-50 p-6">
      <h1 className="text-3xl font-bold text-green-700 mb-6">Smart Irrigation System</h1>
      
      {/* ESP Connection */}
      <div className="w-full max-w-md mb-8 bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Device Connection</h2>
        <div className="flex items-center mb-4">
          <input
            type="text"
            value={espIP}
            onChange={(e) => setEspIP(e.target.value)}
            placeholder="ESP8266 IP Address (e.g. 192.168.1.100)"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none  text-black focus:ring-2 focus:ring-green-500"
          />
        </div>
        <button
          onClick={connectToESP}
          disabled={loading}
          className={`w-full py-2 rounded-lg text-white font-medium ${isConnected ? 'bg-green-600' : 'bg-blue-600 hover:bg-blue-700'}`}
        >
          {loading ? 'Connecting...' : isConnected ? 'Connected' : 'Connect to ESP8266'}
        </button>
        {error && <p className="mt-2 text-red-600 text-sm">{error}</p>}
      </div>
      
      {/* Sensor Data Display */}
      {isConnected && (
        <div className="w-full max-w-md mb-8 bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Sensor Readings</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 p-3 rounded-md">
              <p className="text-sm text-gray-500">Temperature</p>
              <p className="text-lg font-medium">{sensorData.temperature.toFixed(1)} °C</p>
            </div>
            <div className="bg-gray-50 p-3 rounded-md">
              <p className="text-sm text-gray-500">Humidity</p>
              <p className="text-lg font-medium">{sensorData.humidity.toFixed(1)} %</p>
            </div>
            <div className="bg-gray-50 p-3 rounded-md">
              <p className="text-sm text-gray-500">Soil Moisture</p>
              <p className={`text-lg font-medium ${getMoistureColor()}`}>
                {sensorData.soilMoistureStatus} ({sensorData.soilMoisture})
              </p>
            </div>
            <div className="bg-gray-50 p-3 rounded-md">
              <p className="text-sm text-gray-500">Water Level</p>
              <p className={`text-lg font-medium ${getWaterLevelColor()}`}>
                {sensorData.waterLevelStatus} ({sensorData.waterLevel})
              </p>
            </div>
          </div>
          
          <div className="mt-4 p-3 bg-gray-50 rounded-md">
            <p className="text-sm text-gray-500">Irrigation Status</p>
            <p className={`text-lg font-medium ${sensorData.irrigationActive ? 'text-green-600' : 'text-gray-600'}`}>
              {sensorData.irrigationActive ? 'Active' : 'Inactive'}
            </p>
          </div>
        </div>
      )}
      
      {/* Control Buttons */}
      <div className="w-full max-w-md bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Irrigation Control</h2>
        <div className="flex gap-4">
          <button
            onClick={startIrrigation}
            disabled={loading || !isConnected || sensorData.irrigationActive}
            className={`flex-1 py-3 rounded-lg text-white font-medium ${
              loading || !isConnected || sensorData.irrigationActive
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-700'
            }`}
          >
            Start Irrigation
          </button>
          <button
            onClick={stopIrrigation}
            disabled={loading || !isConnected || !sensorData.irrigationActive}
            className={`flex-1 py-3 rounded-lg text-white font-medium ${
              loading || !isConnected || !sensorData.irrigationActive
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-red-600 hover:bg-red-700'
            }`}
          >
            Stop Irrigation
          </button>
        </div>
        
        {!isConnected && (
          <p className="mt-4 text-center text-sm text-gray-500">
            Connect to ESP8266 to control irrigation
          </p>
        )}
      </div>
    </div>
  );
}