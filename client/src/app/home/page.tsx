'use client';

import Link from 'next/link';
import React from 'react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-green-100 flex flex-col items-center justify-center p-6">
      {/* Page Title */}
      <h1 className="text-4xl font-bold text-green-700 mb-6">Welcome to the FarmBot Dashboard</h1>
      <p className="text-lg text-gray-700 text-center max-w-2xl mb-8">
        Choose between advanced irrigation control or field surveillance. Enhance your farming with smart technology.
      </p>

      {/* Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-5xl">
        {/* Irrigation */}
        <div className="bg-white p-6 rounded-lg shadow-md flex flex-col items-center text-center">
          <h2 className="text-2xl font-semibold text-green-600 mb-4">Irrigation System</h2>
          <p className="text-gray-600">
            Automate or manually control water flow to optimize plant growth and conserve water effectively.
          </p>
          <ul className="mt-4 text-gray-600 text-sm text-left">
            <li>💧 Smart moisture-based watering.</li>
            <li>⚙️ Automatic & manual modes.</li>
            <li>🌱 Efficient water management.</li>
          </ul>
          <Link href="/irrigation" className="mt-4 border-2 border-green-600 p-2 rounded-lg">
            <span className="text-green-600 font-medium hover:text-blue-400">Go to Irrigation</span>
          </Link>
        </div>

        {/* Surveillance */}
        <div className="bg-white p-6 rounded-lg shadow-md flex flex-col items-center text-center">
          <h2 className="text-2xl font-semibold text-green-600 mb-4">Surveillance</h2>
          <p className="text-gray-600">
            Remotely monitor your farmland with real-time video feeds using mobile or bot-integrated cameras.
          </p>
          <ul className="mt-4 text-gray-600 text-sm text-left">
            <li>📷 Live field monitoring.</li>
            <li>🔐 Secure video access.</li>
            <li>📡 Accessible from anywhere.</li>
          </ul>
          <Link href="/surveillance" className="mt-4 border-2 border-green-600 p-2 rounded-lg">
            <span className="text-green-600 font-medium hover:text-blue-400">Go to Surveillance</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
