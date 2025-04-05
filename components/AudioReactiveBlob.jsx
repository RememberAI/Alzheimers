import React, { useRef, useEffect, useState } from 'react';
import { Box } from '@mui/material';
import { grey } from '@mui/material/colors'; // Keep for color references

// --- p5.js Sketch Definition ---
const sketch = (p) => {
  // --- State Management (within p5) ---
  let isVisuallyActive = false; // Controlled by 'isActive' prop
  let targetVisualActivity = 0;
  let currentVisualActivity = 0;
  const visualActivityLerpFactor = 0.08;

  let smoothedVolumeLevel = 0; // Controlled by 'averageVolume' prop
  const volumeLerpFactor = 0.15;

  let isConnectingVisually = false; // Controlled by 'isConnecting' prop
  let connectionPulseTime = 0;
  const connectionPulseSpeed = 0.05;

  // --- Blob Geometry & Core Properties ---
  let baseRadius = 100;
  const numVertices = 140;
  let vertices = [];

  // --- Core "Breathing" & Idle Effects ---
  let idleNoiseTime = Math.random() * 1000;
  const idleNoiseSpeed = 0.0006;
  const idleNoiseScale = 0.6;
  const idleDeformationAmount = 0.03;

  // --- Active Animation Properties ---
  let activeNoiseTime = Math.random() * 2000;
  const activeNoiseSpeed = 0.0012;
  const activeNoiseScale = 1.5;
  const activeDeformationBase = 0.05;
  const volumeDeformationFactor = 0.15;

  let activeWavinessTime = Math.random() * 3000;
  const activeWavinessSpeed = 0.0018;
  const activeWavinessScale = 4.0;
  const activeWavinessBaseAmount = 0.02;
  const volumeWavinessFactor = 0.08;

  // --- Color Properties ---
  const activeHue = 210;
  const activeSaturation = 65;
  const activeBrightness = 96;
  const inactiveHue = 220;
  const inactiveSaturation = 15;
  const inactiveBrightness = 90;
  const connectingHue = 40;
  const connectingSaturation = 70;
  const connectingBrightness = 95;

  let currentHue = inactiveHue;
  let currentSaturation = inactiveSaturation;
  let currentBrightness = inactiveBrightness;
  const colorLerpFactor = 0.04;

  // --- p5.js Setup ---
  p.setup = () => {
    const container = document.getElementById('blob-canvas-container'); // Use specific ID
    if (!container) {
      console.error("Blob canvas container (#blob-canvas-container) not found");
      return;
    }

    const canvasWidth = Math.floor(container.offsetWidth);
    const canvasHeight = Math.floor(container.offsetHeight);
    const canvas = p.createCanvas(canvasWidth, canvasHeight);
    canvas.parent('blob-canvas-container'); // Attach to specific container

    const canvasElement = canvas.elt;
    if (canvasElement) {
      canvasElement.style.position = 'absolute';
      canvasElement.style.top = '0';
      canvasElement.style.left = '0';
      canvasElement.style.width = '100%';
      canvasElement.style.height = '100%';
      canvasElement.style.zIndex = '1';
      canvasElement.style.pointerEvents = 'none'; // Make canvas non-interactive
    }

    p.colorMode(p.HSB, 360, 100, 100, 100);
    p.angleMode(p.RADIANS);
    p.frameRate(60);

    baseRadius = p.min(p.width, p.height) / 5.0;

    for (let i = 0; i < numVertices; i++) {
      vertices.push(p.createVector(0, 0));
    }

    updateColor(0); // Initial color set
    calculateBlobShape(0); // Initial shape

    console.log(`p5 Blob Setup Complete.`);
  };

  // --- p5.js Draw Loop ---
  p.draw = () => {
    const timeDelta = p.deltaTime / (1000 / 60);
    p.clear(); // Transparent background

    p.push();
    p.translate(Math.floor(p.width / 2), Math.floor(p.height / 2));

    updateState(timeDelta);
    updateColor(timeDelta);
    calculateBlobShape(timeDelta);
    drawBlob();
    drawMicrophoneIcon(); // Draw the icon

    p.pop();
  };

  // --- Update Internal State ---
  const updateState = (timeDelta) => {
    targetVisualActivity = isVisuallyActive ? 1.0 : 0.0;
    currentVisualActivity = p.lerp(currentVisualActivity, targetVisualActivity, visualActivityLerpFactor * timeDelta);
    // smoothedVolumeLevel is updated directly via p.updateVolume method
  };

  // --- Update Color ---
  const updateColor = (timeDelta) => {
    let targetH, targetS, targetB;

    if (isConnectingVisually) {
      targetH = connectingHue;
      targetS = connectingSaturation;
      targetB = connectingBrightness;
      connectionPulseTime += connectionPulseSpeed * timeDelta;
      const pulse = (p.sin(connectionPulseTime) + 1) / 2;
      targetS = p.lerp(connectingSaturation * 0.8, connectingSaturation, pulse);
      targetB = p.lerp(connectingBrightness * 0.95, connectingBrightness, pulse);
    } else if (currentVisualActivity > 0.01) { // Base color change on smoothed activity
      targetH = activeHue;
      targetS = activeSaturation;
      targetB = activeBrightness;
      targetS = p.lerp(activeSaturation * 0.8, activeSaturation, smoothedVolumeLevel);
      targetB = p.lerp(activeBrightness * 0.98, activeBrightness, smoothedVolumeLevel);
    } else {
      targetH = inactiveHue;
      targetS = inactiveSaturation;
      targetB = inactiveBrightness;
    }

    currentHue = p.lerp(currentHue, targetH, colorLerpFactor * timeDelta);
    currentSaturation = p.lerp(currentSaturation, targetS, colorLerpFactor * timeDelta);
    currentBrightness = p.lerp(currentBrightness, targetB, colorLerpFactor * timeDelta);
  };

  // --- Blob Shape Calculation ---
  const calculateBlobShape = (timeDelta) => {
    if (currentVisualActivity > 0.01 || isConnectingVisually) {
      activeNoiseTime += activeNoiseSpeed * timeDelta * (0.5 + currentVisualActivity * 0.5);
      activeWavinessTime += activeWavinessSpeed * timeDelta * (0.5 + currentVisualActivity * 0.5);
    }
    idleNoiseTime += idleNoiseSpeed * timeDelta;

    for (let i = 0; i < numVertices; i++) {
      const angle = p.map(i, 0, numVertices, 0, p.TWO_PI);
      const cosAngle = p.cos(angle);
      const sinAngle = p.sin(angle);

      const idleNoiseX = cosAngle * idleNoiseScale;
      const idleNoiseY = sinAngle * idleNoiseScale;
      const idleNoiseVal = p.noise(idleNoiseX, idleNoiseY, idleNoiseTime);
      const idleOffset = p.map(idleNoiseVal, 0, 1, -idleDeformationAmount, idleDeformationAmount) * baseRadius;
      let radius = baseRadius + idleOffset;

      if (currentVisualActivity > 0.01) {
        const activeNoiseX = cosAngle * activeNoiseScale;
        const activeNoiseY = sinAngle * activeNoiseScale;
        const activeNoiseVal = p.noise(activeNoiseX, activeNoiseY, activeNoiseTime);
        const activeDeformationAmount = activeDeformationBase + smoothedVolumeLevel * volumeDeformationFactor;
        const activeOffset = p.map(activeNoiseVal, 0, 1, -activeDeformationAmount, activeDeformationAmount) * baseRadius;

        const wavinessNoiseX = cosAngle * activeWavinessScale;
        const wavinessNoiseY = sinAngle * activeWavinessScale;
        const wavinessNoiseVal = p.noise(wavinessNoiseX, wavinessNoiseY, activeWavinessTime);
        const wavinessAmount = activeWavinessBaseAmount + smoothedVolumeLevel * volumeWavinessFactor;
        const wavinessOffset = p.map(wavinessNoiseVal, 0, 1, -wavinessAmount, wavinessAmount) * baseRadius;

        radius += (activeOffset + wavinessOffset) * currentVisualActivity;
      }

      if (isConnectingVisually) {
        const pulseAmount = (p.sin(connectionPulseTime * 2 + angle * 3) + 1) / 2 * baseRadius * 0.05 * (1.0 - currentVisualActivity); // Pulse more when less active
        radius += pulseAmount;
      }


      const minRadiusClamp = baseRadius * 0.6;
      const maxRadiusClamp = baseRadius * 1.4;
      radius = p.constrain(radius, minRadiusClamp, maxRadiusClamp);

      vertices[i].set(radius * cosAngle, radius * sinAngle);
    }
  };

  // --- Draw Microphone Icon ---
  const drawMicrophoneIcon = () => {
    // Icon color slightly less opaque than before
    const iconColor = p.color(0, 0, 100, 65); // White with more transparency
    // Scale icon size slightly with volume, but less dramatically
    const iconScale = 1.0 + smoothedVolumeLevel * 0.15 * currentVisualActivity; // Subtle scale when active
    const iconSize = baseRadius * 0.28 * iconScale; // Adjust base size relative to blob

    p.push();
    p.fill(iconColor);
    p.noStroke();
    p.rectMode(p.CENTER);

    // Simple microphone shape
    const capsuleWidth = iconSize * 0.5;
    const capsuleHeight = iconSize * 0.8;
    const standWidth = iconSize * 0.1;
    const standHeight = iconSize * 0.5;
    const baseWidth = iconSize * 0.4;
    const baseHeight = iconSize * 0.1;
    const cornerRadius = iconSize * 0.2;

    // Capsule
    p.rect(0, -iconSize * 0.2, capsuleWidth, capsuleHeight, cornerRadius);
    // Stand
    p.rect(0, (capsuleHeight / 2 - iconSize * 0.2) + standHeight / 2, standWidth, standHeight);
    // Base
    p.ellipse(0, (capsuleHeight / 2 - iconSize * 0.2) + standHeight, baseWidth, baseHeight);

    p.pop();
  };

  // --- Blob Rendering ---
  const drawBlob = () => {
    const layers = 8;
    const baseAlpha = 95;
    const alphaStep = (baseAlpha - 10) / layers; // Fade out more towards center
    const radiusStepRatio = 0.03;

    for (let layer = 0; layer < layers; layer++) {
      const layerRadiusRatio = 1.0 - (layer * radiusStepRatio);
      const layerAlpha = baseAlpha - layer * alphaStep;

      // Interpolate color: center is slightly brighter/less saturated
      const colorMix = p.map(layer, 0, layers - 1, 0.8, 1.0);
      const layerColor = p.color(
        currentHue,
        p.lerp(currentSaturation * 0.85, currentSaturation, colorMix),
        p.lerp(currentBrightness, currentBrightness * 0.97, colorMix),
        p.max(0, layerAlpha)
      );

      p.noStroke();
      p.fill(layerColor);

      p.beginShape();
      p.curveVertex(vertices[numVertices - 1].x * layerRadiusRatio, vertices[numVertices - 1].y * layerRadiusRatio);
      for (let i = 0; i < numVertices; i++) {
        p.curveVertex(vertices[i].x * layerRadiusRatio, vertices[i].y * layerRadiusRatio);
      }
      p.curveVertex(vertices[0].x * layerRadiusRatio, vertices[0].y * layerRadiusRatio);
      p.curveVertex(vertices[1].x * layerRadiusRatio, vertices[1].y * layerRadiusRatio);
      p.endShape(p.CLOSE);
    }
  };

  // --- External Control Methods ---
  p.updateActivity = (isActive) => {
    if (typeof isActive === 'boolean') {
      isVisuallyActive = isActive;
    }
  };

  p.updateVolume = (volume) => {
    if (typeof volume === 'number' && volume >= 0 && volume <= 1) {
      // Apply smoothing to the volume level for visual stability
      smoothedVolumeLevel = p.lerp(smoothedVolumeLevel, volume, volumeLerpFactor);
    }
  };

  p.updateConnecting = (isConnecting) => {
    if (typeof isConnecting === 'boolean') {
      if (isConnecting && !isConnectingVisually) {
        connectionPulseTime = 0; // Reset pulse time
      }
      isConnectingVisually = isConnecting;
    }
  };

  // --- Cleanup ---
  p.cleanup = () => {
    console.log("p5: Cleaning up blob sketch.");
    p.remove();
  };

  // --- Resize ---
  p.windowResized = () => {
    const container = document.getElementById('blob-canvas-container');
    if (!container) return;
    const canvasWidth = Math.floor(container.offsetWidth);
    const canvasHeight = Math.floor(container.offsetHeight);
    p.resizeCanvas(canvasWidth, canvasHeight);
    baseRadius = p.min(p.width, p.height) / 5.0;
    p.redraw();
  };
};

// --- React Component Definition ---
const AudioReactivePaintBlob = ({ isActive, averageVolume = 0, isConnecting = false }) => {
  const canvasContainerRef = useRef(null);
  const p5InstanceRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true); // Manage loading state
  const [errorMessage] = useState(''); // Keep error state, though might not be needed now

  useEffect(() => {
    let p5instance;
    let mounted = true;

    import('p5').then(p5 => {
      if (!mounted || !canvasContainerRef.current) return;
      if (!p5InstanceRef.current) {
        try {
          p5instance = new p5.default(sketch, canvasContainerRef.current);
          p5InstanceRef.current = p5instance;
          console.log("React: p5 blob instance created.");
          setTimeout(() => { if (mounted) setIsLoading(false); }, 150); // Slightly longer delay
        } catch (err) {
          console.error("Error creating p5 blob instance:", err);
          // setErrorMessage("Failed to initialize visualization."); // Keep if needed
          if (mounted) setIsLoading(false);
        }
      } else {
        console.log("React: p5 blob instance already exists.");
        setIsLoading(false);
      }
    }).catch(error => {
      console.error("Failed to load p5.js:", error);
      // setErrorMessage("Failed to load visualization component."); // Keep if needed
      if (mounted) setIsLoading(false);
    });

    return () => {
      mounted = false;
      if (p5InstanceRef.current) {
        console.log("React: Cleaning up p5 blob instance.");
        try {
          if (typeof p5InstanceRef.current.cleanup === 'function') {
            p5InstanceRef.current.cleanup();
          } else if (typeof p5InstanceRef.current.remove === 'function') {
            p5InstanceRef.current.remove(); // Fallback cleanup
          }
        } catch (e) { console.error("Error during p5 blob cleanup:", e); }
        p5InstanceRef.current = null;
      }
    };
  }, []);

  // Update p5 sketch when props change
  useEffect(() => {
    if (p5InstanceRef.current?.updateActivity) {
      p5InstanceRef.current.updateActivity(isActive);
    }
  }, [isActive]);

  useEffect(() => {
    if (p5InstanceRef.current?.updateVolume) {
      p5InstanceRef.current.updateVolume(averageVolume);
    }
  }, [averageVolume]);

  useEffect(() => {
    if (p5InstanceRef.current?.updateConnecting) {
      p5InstanceRef.current.updateConnecting(isConnecting);
    }
  }, [isConnecting]);

  return (
    // This container is specifically for the p5 canvas
    <Box
      id="blob-canvas-container" // Use specific ID for p5 parent
      ref={canvasContainerRef}
      sx={{
        width: '100%',
        height: '100%',
        position: 'absolute', // Position canvas absolutely within parent
        top: 0,
        left: 0,
        zIndex: 1, // Lower z-index so it's behind controls
        pointerEvents: 'none', // Ensure it doesn't intercept clicks meant for parent
        overflow: 'hidden',
      }}
    >
      {isLoading &&
        <Box sx={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          color: grey[500], zIndex: 5
        }}>
          Loading...
        </Box>
      }
      {errorMessage && (
        <Box sx={{
          position: 'absolute', bottom: 16, left: 16, right: 16,
          color: 'error.main', textAlign: 'center', bgcolor: 'rgba(255, 235, 238, 0.9)',
          p: 1, borderRadius: 1, fontSize: '0.875rem', zIndex: 10
        }}>
          {errorMessage}
        </Box>
      )}
      {/* p5 canvas attaches here */}
    </Box>
  );
};

export default AudioReactivePaintBlob;