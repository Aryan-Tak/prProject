'use client';

import { useEffect, useState } from 'react';

export default function ManualIrrigationPage() {
  const [espIP, setEspIP] = useState('');
  const [connected, setConnected] = useState(false);
  const [motorStatus, setMotorStatus] = useState('unknown');
  const [error, setError] = useState('');

  const ipCamURL = "https://192.168.248.254:8080/video"; // Use your IP Webcam URL here

  const connectToESP = async (ip: string) => {
    setMotorStatus('unknown');
    setConnected(true);
    setError('ESP32 might be offline, but testing mode is enabled.');
  };

  const sendCommand = async (command: string) => {
    if (!espIP || !connected) return;
    const url = `http://${espIP}/${command}`;
    console.log(`Sending command: ${command} → ${url}`);
    try {
      await fetch(url);
    } catch (err) {
      console.error(`Failed to send command '${command}':`, err);
    }
  };

  useEffect(() => {
    const storedIP = localStorage.getItem('esp_ip');
    if (storedIP) {
      setEspIP(storedIP);
      connectToESP(storedIP);
    } else {
      setError('No ESP32 IP found. Please connect from the main page.');
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      console.log('Key pressed:', key);
      if (key === 'w') sendCommand('forward');
      else if (key === 'a') sendCommand('left');
      else if (key === 's') sendCommand('backward');
      else if (key === 'd') sendCommand('right');
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [espIP, connected]);

  const handleClick = (command: string) => {
    console.log(`Button clicked: ${command}`);
    sendCommand(command);
  };

  const handleReconnect = () => {
    if (espIP) connectToESP(espIP);
  };

  return (
    <div className="min-h-screen flex flex-col items-center p-4 bg-green-100">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Manual Irrigation Control</h1>

      {espIP && (
        <p className="mb-2 text-gray-700">
          ESP32 IP: <span className="font-mono">{espIP}</span>
        </p>
      )}

      {error && (
        <div className="bg-yellow-100 text-yellow-800 p-3 rounded-xl mb-4">
          {error}
        </div>
      )}

      <button
        onClick={handleReconnect}
        className="mb-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 rounded-xl transition duration-300"
      >
        Reconnect
      </button>

      {connected && (
        <div className="flex flex-col items-center space-y-4">
          <div className="w-full max-w-md flex flex-wrap gap-3 justify-center">
            <button onClick={() => handleClick('forward')} className="px-6 py-2 hover:bg-blue-300 bg-green-400 text-white rounded-xl">Forward (W)</button>
            <button onClick={() => handleClick('left')} className="px-6 py-2 hover:bg-blue-300 bg-green-400 text-white rounded-xl">Left (A)</button>
            <button onClick={() => handleClick('backward')} className="px-6 py-2 hover:bg-blue-300 bg-green-400 text-white rounded-xl">Backward (S)</button>
            <button onClick={() => handleClick('right')} className="px-6 py-2 hover:bg-blue-300 bg-green-400 text-white rounded-xl">Right (D)</button>
          </div>

          <div className="mt-6 w-full max-w-2xl aspect-video bg-black rounded-xl overflow-hidden border-4 border-gray-700">
            <img
              src={ipCamURL}
              alt="IP Webcam Feed"
              className="w-full h-full object-cover"
              onError={(e) => (e.currentTarget.src = 'https://via.placeholder.com/640x360?text=Camera+Offline')}
            />
          </div>
        </div>
      )}
    </div>
  );
}
