"use client";

import Image from "next/image";
import { ActivityCard } from "./components/ActivityCard";

export default function Home() {
  return (
    <div className="relative h-screen w-full">
      <Image
        src="/HERO-Crop-Production1.jpg"

        alt="Background Image"
        layout="fill"
        objectFit="cover"
        className="z-0"
      />
      <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
        <h1 className="text-white text-4xl font-bold">Welcome to Crop Production</h1>
        <div className="flex flex-wrap md:flex-nowrap gap-5 p-5 w-full max-w-4xl">
          <ActivityCard/>
          <ActivityCard/>
          <ActivityCard/>
        </div>
      </div>
    </div>
  );
}
