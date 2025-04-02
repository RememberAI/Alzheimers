"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Script from "next/script";

/**
 * This page has a 4-step flow:
 *  0) Show Start button
 *  1) Fade out button, fade in SiriWave
 *  2) Slide SiriWave up, fade in black box
 *  3) Fade out black box, slide SiriWave back down
 *
 * Steps automatically advance after some timeouts for demo purposes.
 */

export default function Home() {
  // Step of the flow [0..3]. 0 = initial button, 3 = final animation.
  const [step, setStep] = useState(0);

  // Reference to the SiriWave container
  const waveRef = useRef(null);
  const [siriWave, setSiriWave] = useState(null);

  // For microphone error display
  const [micError, setMicError] = useState("");

  // For debugging or preventing repeated transitions
  const [transitionHasStarted, setTransitionHasStarted] = useState(false);

  // 1) Load SiriWave from unpkg; it attaches to window.SiriWave
  //    We do "beforeInteractive" so it exists before React code runs.
  //    (See <Script> near the bottom.)

  // 2) Once the script is loaded and component is mounted, create SiriWave instance
  useEffect(() => {
    if (!window.SiriWave) {
      console.warn("SiriWave script not loaded yet.");
      return;
    }
    if (siriWave) return; // Only create once

    // Create SiriWave
    const wave = new window.SiriWave({
      container: waveRef.current,
      style: "ios9",
      autostart: true,
      amplitude: 0,
      speed: 0.2,
    });
    setSiriWave(wave);

    // Also auto-start the microphone – or you can wait for a user gesture
    // For most browsers, a user-gesture is needed, so we try to resume if suspended
    startMic(wave).catch((err) => console.error("Mic start error:", err));
  }, [siriWave]);

  // Microphone => update SiriWave amplitude
  async function startMic(waveInstance) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === "suspended") {
        await audioCtx.resume();
      }
      const analyser = audioCtx.createAnalyser();
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      analyser.fftSize = 512;
      const bufferLength = analyser.fftSize;
      const dataArray = new Uint8Array(bufferLength);

      function update() {
        analyser.getByteTimeDomainData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += (dataArray[i] - 128) * (dataArray[i] - 128);
        }
        const average = Math.sqrt(sum / bufferLength);

        // Scale up amplitude for clarity
        const scaledVolume = Math.min(average / 5, 30);
        waveInstance.setAmplitude(scaledVolume);

        requestAnimationFrame(update);
      }
      update();
    } catch (err) {
      console.error("Mic access error:", err);
      setMicError("Microphone access denied or not supported. " + err.message);
    }
  }

  // Handle “Start Alzheimer’s Test” button click
  const onStartTest = () => {
    if (transitionHasStarted) return; // Prevent repeated clicks
    setTransitionHasStarted(true);

    // Move from step=0 to step=1 => fade out button, fade in wave
    setStep(1);

    // After a short delay, go to step=2 => wave slides up, black box appears
    setTimeout(() => {
      setStep(2);
    }, 2000); // e.g. 2s after wave fades in

    // Another delay to go to step=3 => black box fade out, wave slides down
    setTimeout(() => {
      setStep(3);
    }, 4000); // 2 more seconds => total 4s from button click
  };

  // We use Tailwind classes (and/or inline styles) for transitions.
  // We'll define conditional class strings for each element:

  // Button classes
  const buttonClasses = `
    transition-all
    duration-700
    text-white
    font-semibold
    rounded-full
    px-6
    py-3
    bg-[rgb(200,80,80)]   /* "darker red pastel" */
    text-lg
    ${step >= 1 ? "opacity-0 pointer-events-none" : "opacity-100"}
  `;

  // SiriWave container transitions:
  // step=0 => invisible
  // step=1 => fade in
  // step=2 => also translate up
  // step=3 => stays visible, but eventually slides down
  // (We add in a .translate-y-[-100px] for sliding up, for example.)
  const waveClasses = `
    transition-all
    duration-1000
    w-[600px]
    h-[300px]
    bg-black
    border
    border-dashed
    border-gray-600
    ${step > 0 ? "opacity-100" : "opacity-0"}
    ${step === 2 ? "-translate-y-24" : step === 3 ? "translate-y-0" : ""}
    mx-auto
  `;

  // For demonstration, we’ll place the black box below wave.
  // step=2 => it fades in
  // step=3 => it fades out
  const blackBoxClasses = `
    transition-all
    duration-1000
    w-[200px]
    h-[200px]
    bg-black
    mx-auto
    ${step === 2 ? "opacity-100 mt-4" : "opacity-0 h-0 mt-0 pointer-events-none"}
  `;

  return (
    <>
      <Script
        src="https://unpkg.com/siriwave/dist/siriwave.umd.min.js"
        strategy="beforeInteractive"
      />

      <div
        className="min-h-screen flex flex-col items-center justify-center"
        style={{
          backgroundColor: "#FFF8DC", // cream background
          transition: "background-color 0.5s",
        }}
      >
        {/* Step 0: Button is visible; then fades out at Step 1 */}
        <button onClick={onStartTest} className={buttonClasses}>
          Start Alzheimer&apos;s Test
        </button>

        {/* Step 1..3: SiriWave container */}
        <div ref={waveRef} className={waveClasses} style={{ marginTop: 40 }} />

        {/* Step 2..3: black box below wave */}
        <div className={blackBoxClasses} />

        {/* Display microphone error if any */}
        {micError && (
          <p className="text-red-600 font-bold mt-4">
            {micError}
          </p>
        )}
      </div>
    </>
  );
}

