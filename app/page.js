"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Script from "next/script";

export default function Home() {
  const siriContainerRef = useRef(null);
  const [siriWave, setSiriWave] = useState(null);
  const [micError, setMicError] = useState("");

  // Loads SiriWave from unpkg as a global, so that `window.SiriWave` is defined
  // before our React code tries to use it.
  // In practice, you can also npm-install "siriwave" and import it directly,
  // but here's the unpkg approach:
  //
  // <Script src="https://unpkg.com/siriwave/dist/siriwave.umd.min.js"
  //         strategy="beforeInteractive" />

  useEffect(() => {
    // If the script hasn't loaded, window.SiriWave is undefined
    if (!window.SiriWave) {
      console.warn("SiriWave script not yet loaded!");
      return;
    }
    // Create wave instance one time only
    if (!siriWave) {
      const wave = new window.SiriWave({
        container: siriContainerRef.current,
        style: "ios9",
        autostart: true,
        amplitude: 0,  // we'll feed amplitude from mic
        speed: 0.2,
      });
      setSiriWave(wave);
    }
  }, [siriWave]);

  // We'll call this after a click, so that the AudioContext can auto-play
  async function startMic() {
    if (!siriWave) {
      console.error("SiriWave not initialized yet.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      // Required in Chrome if not in a user gesture
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

        // boost amplitude
        const scaledVolume = Math.min(average / 5, 30);
        siriWave.setAmplitude(scaledVolume);

        requestAnimationFrame(update);
      }
      update();
    } catch (err) {
      console.error("Mic error", err);
      setMicError(err.message || "Mic access denied.");
    }
  }

  return (
    <>
      <Script
        src="https://unpkg.com/siriwave/dist/siriwave.umd.min.js"
        strategy="beforeInteractive"
      />

      <div className="min-h-screen p-8 pb-20 flex flex-col items-center">
        <Image
          className="dark:invert"
          src="/next.svg"
          alt="Next.js logo"
          width={180}
          height={38}
          priority
        />

        <div
          ref={siriContainerRef}
          style={{
            width: 600,
            height: 300,
            border: "1px dashed #555",
            background: "#000",
            marginTop: 30,
          }}
        />

        {micError && (
          <p style={{ color: "red", marginTop: 10 }}>
            Microphone Error: {micError}
          </p>
        )}

        <button
          onClick={startMic}
          style={{
            marginTop: 20,
            padding: "8px 16px",
            background: "#333",
            color: "#fff",
            border: "none",
            cursor: "pointer",
          }}
        >
          Start Microphone
        </button>
      </div>
    </>
  );
}

