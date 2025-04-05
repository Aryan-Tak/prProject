"use client"; // ✅ Ensure this is at the top

import Link from "next/link";

export default function IrrigationPage() {
  return (
    <div className="min-h-screen bg-green-100 flex flex-col items-center justify-center p-6">
      {/* Page Title */}
      <h1 className="text-4xl font-bold text-green-700 mb-6"> Irrigation System</h1>
      <p className="text-lg text-gray-700 text-center max-w-2xl mb-8">
        Efficient water management is key to sustainable farming. Choose between Automatic and Manual Irrigation to best suit your needs.
      </p>

      {/* Irrigation Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-5xl">
        
        {/* Automatic Irrigation Card */}
        <div className="bg-white p-6 rounded-lg shadow-md flex flex-col items-center text-center">
          <h2 className="text-2xl font-semibold text-green-600 mb-4">Automatic Irrigation</h2>
          <p className="text-gray-600">
            Let technology handle watering with Smart sensors that monitor soil moisture and weather conditions, ensuring optimal hydration.
          </p>
          <ul className="mt-4 text-gray-600 text-sm text-left">
            <li>  Saves water and prevents overwatering.</li>
            <li>  Reduces labor and manual effort.</li>
            <li>  Ensures consistent & optimized watering.</li>
          </ul>
          <Link href="/automaticirrigation" className="mt-4 border-2 border-green-600 p-2 rounded-lg">
            <span className="text-green-600 font-medium hover:text-blue-400">Activate Automatic Irrigation</span>
          </Link>
        </div>

        {/* Manual Irrigation Card */}
        <div className="bg-white p-6 rounded-lg shadow-md flex flex-col items-center text-center">
          <h2 className="text-2xl font-semibold text-green-600 mb-4"> Manual Irrigation</h2>
          <p className="text-gray-600">
            Prefer hands-on control? With manual irrigation, you decide when and how much water your crops receive.
          </p>
          <ul className="mt-4 text-gray-600 text-sm text-left">
            <li>  Simple and cost-effective.</li>
            <li>  Gives complete control over water usage.</li>
            <li>  Best for small farms & specialized crops.</li>
          </ul>
          <Link href="/manualirrigation" className="mt-4 border-2 border-green-600 p-2 rounded-lg">
            <span className="text-green-600 font-medium hover:text-blue-400">Activate Manual Irrigation</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
