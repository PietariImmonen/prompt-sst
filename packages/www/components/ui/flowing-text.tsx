"use client";

import React from "react";

import { cn } from "@/lib/utils";

interface FlowingTextProps {
  text?: string;
  className?: string;
}

// Recorder component with animated waveform bars
const Recorder = ({ className }: { className?: string }) => {
  const bars = [2, 5, 8, 12, 8, 5, 2];
  const delays = [0, 0.1, 0.2, 0.3, 0.2, 0.1, 0];

  return (
    <>
      <style>{`
        @keyframes waveform-pulse {
          0%, 100% {
            transform: scaleY(0.3);
          }
          50% {
            transform: scaleY(1);
          }
        }
      `}</style>
      <div
        className={cn(
          "relative z-20 flex h-10 items-center justify-center rounded-full border-2 border-black bg-white px-6",
          className,
        )}
      >
        {/* Animated waveform bars */}
        <div className="flex items-center gap-1">
          {bars.map((height, index) => (
            <div
              key={index}
              className="origin-bottom bg-black"
              style={{
                width: "2px",
                height: `${height}px`,
                animation: `waveform-pulse 1.2s ease-in-out infinite`,
                animationDelay: `${delays[index]}s`,
              }}
            />
          ))}
        </div>
      </div>
    </>
  );
};

export const FlowingText = ({
  text = "Speak, Don't Type",
  className,
}: FlowingTextProps) => {
  // Create a long repeating string for continuous flow
  const repeatedText = Array(20).fill(text).join(" • ");

  return (
    <>
      <style>{`
        @keyframes scroll-right {
          0% {
            transform: translateX(-50%);
          }
          100% {
            transform: translateX(0);
          }
        }

        .curved-text {
          position: relative;
          transform-style: preserve-3d;
        }

        .curved-text::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          transform: perspective(400px) rotateX(-2deg);
          transform-origin: center bottom;
        }
      `}</style>
      <div
        className={cn(
          "relative flex h-20 items-center overflow-hidden",
          className,
        )}
      >
        {/* Left side - gray text with curve */}
        <div className="absolute left-0 top-0 z-0 flex h-full w-1/2 items-center overflow-hidden">
          <div
            className="curved-text flex whitespace-nowrap"
            style={{
              animation: "scroll-right 800s linear infinite",
              transform: "perspective(600px) rotateX(-3deg)",
              transformOrigin: "center bottom",
            }}
          >
            <span className="text-lg font-medium text-gray-500">
              {repeatedText}
            </span>
            <span className="text-lg font-medium text-gray-500">
              {repeatedText}
            </span>
          </div>
        </div>

        {/* Right side - white text with curve */}
        <div className="absolute right-0 top-0 z-0 flex h-full w-1/2 items-center overflow-hidden">
          <div
            className="curved-text flex whitespace-nowrap"
            style={{
              animation: "scroll-right 800s linear infinite",
              transform: "perspective(600px) rotateX(-3deg)",
              transformOrigin: "center bottom",
            }}
          >
            <span className="text-lg font-medium text-white">
              {repeatedText}
            </span>
            <span className="text-lg font-medium text-white">
              {repeatedText}
            </span>
          </div>
        </div>

        {/* Recorder button - centered and on top */}
        <div className="relative z-10 mx-auto">
          <Recorder />
        </div>
      </div>
    </>
  );
};
