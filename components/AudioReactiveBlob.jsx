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

  let smoothedVolumeLevel = 0; // Controlled by 'averageVolume' prop - now disabled
  const volumeLerpFactor = 0; // Set to 0 to disable volume reactivity completely

  let isConnectingVisually = false; // Controlled by 'isConnecting' prop
  let connectionPulseTime = 0;
  const connectionPulseSpeed = 0.05;

  // --- Blob Geometry & Core Properties ---
  let baseRadius = 100;
  const numVertices = 180; // More vertices for smoother circle
  let vertices = [];

  // --- Core "Breathing" & Idle Effects ---
  let idleNoiseTime = Math.random() * 1000;
  const idleNoiseSpeed = 0.0005; // Slower movement
  const idleNoiseScale = 0.3;    // Reduced noise scale for smoother shape
  const idleDeformationAmount = 0.015; // Much smaller deformations for more circular shape

  // --- Active Animation Properties ---
  let activeNoiseTime = Math.random() * 2000;
  const activeNoiseSpeed = 0.0010;   // Slightly slower for smoother animation
  const activeNoiseScale = 1.0;      // Smaller scale for less extreme distortion
  const activeDeformationBase = 0.025; // Smaller base deformation for more circular shape
  const volumeDeformationFactor = 0; // Disabled volume reaction completely
  
  // For gentle animation (voice reactivity disabled)
  let activeWavinessTime = Math.random() * 3000;
  const activeWavinessSpeed = 0.0015;  // Slightly slower
  const activeWavinessScale = 2.0;     // Lower scale for smoother transitions
  const activeWavinessBaseAmount = 0.015; // Smaller base amount
  const volumeWavinessFactor = 0;   // Disabled volume-based waviness

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
    drawMicrophoneIcon(); // Draw the icon with recording indicator

    p.pop();
  };

  // --- Update Internal State ---
  const updateState = (timeDelta) => {
    // Simple state - just based on whether the assistant is speaking
    targetVisualActivity = isVisuallyActive ? 0.6 : 0.3;
    
    // Disabled volume-based activity changes
    
    currentVisualActivity = p.lerp(currentVisualActivity, targetVisualActivity, visualActivityLerpFactor * timeDelta);
    
    // Fixed activity level for consistent appearance
    // This ensures the shape stays circular and gently animated
    if (currentVisualActivity < 0.3) {
      currentVisualActivity = 0.3; // Base level activity for constant gentle motion
    }
    
    // Cap the maximum visual activity
    if (currentVisualActivity > 0.6) { // Lower cap for more consistency
      currentVisualActivity = 0.6;
    }
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
        // Removed speech reactivity - replaced with gentle pulsing
        // This creates a subtle circular pulsing that's not tied to audio
        const gentlePulse = Math.sin(activeNoiseTime * 0.5) * 0.01 * baseRadius; // Very subtle constant pulse
        
        // Base noise-based deformation (reduced impact)
        const activeNoiseX = cosAngle * activeNoiseScale;
        const activeNoiseY = sinAngle * activeNoiseScale;
        const activeNoiseVal = p.noise(activeNoiseX, activeNoiseY, activeNoiseTime);
        const activeDeformationAmount = activeDeformationBase + smoothedVolumeLevel * volumeDeformationFactor;
        const activeOffset = p.map(activeNoiseVal, 0, 1, -activeDeformationAmount, activeDeformationAmount) * baseRadius;

        // Smoother circular waviness (reduced impact)
        const wavinessNoiseX = cosAngle * activeWavinessScale;
        const wavinessNoiseY = sinAngle * activeWavinessScale;
        const wavinessNoiseVal = p.noise(wavinessNoiseX, wavinessNoiseY, activeWavinessTime);
        const wavinessAmount = activeWavinessBaseAmount + smoothedVolumeLevel * volumeWavinessFactor;
        const wavinessOffset = p.map(wavinessNoiseVal, 0, 1, -wavinessAmount, wavinessAmount) * baseRadius;

        // Combine all effects but limit their overall impact for a more circular shape
        radius += ((activeOffset + wavinessOffset) * 0.6 + gentlePulse) * currentVisualActivity;
      }

      if (isConnectingVisually) {
        const pulseAmount = (p.sin(connectionPulseTime * 2 + angle * 3) + 1) / 2 * baseRadius * 0.05 * (1.0 - currentVisualActivity); // Pulse more when less active
        radius += pulseAmount;
      }


      // Radius constraints - slightly relaxed to allow more voice reactivity
      const minRadiusClamp = baseRadius * 0.8; // Allow slightly more concave areas for reactivity
      const maxRadiusClamp = baseRadius * 1.2; // Allow slightly more bulging for reactivity
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

    // Always show a recording indicator to indicate the app is listening
    const pulseTime = p.millis() * 0.003; // For pulsing effect
    
    // If actively recording (not while assistant is speaking), show pulsing red dot
    if (isRecordingActive && !isVisuallyActive) {
      const pulseAlpha = (p.sin(pulseTime) + 1) / 2 * 40 + 40; // Pulse between 40-80% opacity
      p.fill(p.color(0, 80, 100, pulseAlpha)); // Red recording indicator
      const indicatorSize = iconSize * 0.15;
      p.circle(capsuleWidth * 0.5, -iconSize * 0.4, indicatorSize); // Position near top-right of mic
    } 
    // Otherwise show a steady indicator that we're still listening
    else {
      // Green dot (when connected but assistant is speaking or waiting)
      const steadyAlpha = 60; // More subtle but visible
      p.fill(p.color(120, 80, 80, steadyAlpha)); // Green indicator
      const indicatorSize = iconSize * 0.12; // Slightly smaller
      p.circle(capsuleWidth * 0.5, -iconSize * 0.4, indicatorSize); // Same position
    }

    p.pop();
  };

  // --- Blob Rendering ---
  const drawBlob = () => {
    const layers = 10; // More layers for smoother gradient
    const baseAlpha = 95;
    const alphaStep = (baseAlpha - 10) / layers; // Fade out more towards center
    const radiusStepRatio = 0.025; // Smaller step ratio for smoother gradient
    
    // Add a subtle glow effect first
    p.noFill();
    p.stroke(p.color(currentHue, currentSaturation, currentBrightness, 5));
    p.strokeWeight(baseRadius * 0.1);
    p.beginShape();
    for (let i = 0; i < numVertices; i++) {
      p.vertex(vertices[i].x * 1.1, vertices[i].y * 1.1);
    }
    p.endShape(p.CLOSE);
    p.noStroke();

    // Draw the layers of the blob
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
    // Volume updates ignored - reactivity disabled
    // smoothedVolumeLevel stays at 0
  };

  p.updateConnecting = (isConnecting) => {
    if (typeof isConnecting === 'boolean') {
      if (isConnecting && !isConnectingVisually) {
        connectionPulseTime = 0; // Reset pulse time
      }
      isConnectingVisually = isConnecting;
    }
  };
  
  // Track whether we're in recording mode
  let isRecordingActive = false;
  p.updateRecording = (isRecording) => {
    if (typeof isRecording === 'boolean') {
      isRecordingActive = isRecording;
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
const AudioReactivePaintBlob = ({ isActive, averageVolume = 0, isConnecting = false, isRecording = false }) => {
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
  
  // Add handler for isRecording prop
  useEffect(() => {
    if (p5InstanceRef.current?.updateRecording) {
      p5InstanceRef.current.updateRecording(isRecording);
    }
  }, [isRecording]);

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