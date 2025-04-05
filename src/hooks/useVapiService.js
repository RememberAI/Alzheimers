/**
 * useVapiService.js
 * 
 * Custom hook for integrating with the Vapi service (voice AI assistant).
 * This hook provides a complete wrapper around microphone permissions,
 * state management, and conversation flow for the Alzheimer's assessment tool.
 * 
 * Key features:
 * - Microphone permission handling
 * - Speech and conversation state management
 * - Assessment flow control
 * - Race condition prevention with refs
 * - Simplified API for React components
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import MockVapiService, { SpeechState } from '../utils/mockVapiService';

/**
 * MicrophoneState - Enumeration of possible microphone states
 * 
 * Simplified to just ON/OFF to make the interface intuitive,
 * especially for elderly users who may be confused by more complex states.
 * 
 * @enum {string}
 */
export const MicrophoneState = {
  /** Microphone is turned off or not permitted */
  OFF: 'off',
  
  /** Microphone is turned on and actively receiving audio */
  ON: 'on'
};

/**
 * useVapiService - Custom React hook
 * 
 * Provides a complete interface for working with the voice AI service.
 * This hook handles all the complex state management, permissions,
 * and conversation flow, exposing only a simple API to the component.
 * 
 * The two primary states managed are:
 * 1. Microphone ON/OFF - Whether the microphone is active
 * 2. AI Speaking/Idle - Whether the AI assistant is currently speaking
 * 
 * @returns {Object} Service state and control functions
 * @property {boolean} isActive - Whether the AI is currently speaking
 * @property {string} currentText - The current text being spoken by the AI
 * @property {string} serviceState - Current state of the voice service (from SpeechState enum)
 * @property {boolean} hasInteracted - Whether the user has interacted with the assessment
 * @property {string} microphoneState - Current microphone state (from MicrophoneState enum)
 * @property {Function} toggleMicrophone - Toggle microphone on/off and handle assessment flow
 */
export function useVapiService() {
  /**
   * Core State Variables
   * 
   * These state variables track the overall status of the system:
   * - microphoneState: Whether the microphone is on or off (MicrophoneState enum)
   * - isActive: Whether the AI is currently speaking
   * - currentText: The text currently being spoken by the AI
   * - serviceState: Current state of the voice service (SpeechState enum)
   * - hasInteracted: Whether the user has interacted with the assessment
   */
  const [microphoneState, setMicrophoneState] = useState(MicrophoneState.OFF);
  const [isActive, setIsActive] = useState(false);
  const [currentText, setCurrentText] = useState('');
  const [serviceState, setServiceState] = useState(SpeechState.IDLE);
  const [hasInteracted, setHasInteracted] = useState(false);
  
  /**
   * Refs for Persistent Data and Race Condition Prevention
   * 
   * These refs help maintain consistent state across renders and prevent
   * race conditions in asynchronous operations:
   * - serviceRef: Holds the service instance across renders
   * - isProcessingRef: Tracks if we're in the middle of a state change
   * - micStateRef: Tracks the actual microphone state to avoid race conditions
   */
  const serviceRef = useRef(null);
  const isProcessingRef = useRef(false);
  const micStateRef = useRef(MicrophoneState.OFF);
  
  /**
   * Synchronize microphone state ref with state variable
   * 
   * Updates the ref whenever the state changes to ensure consistent
   * access to the current microphone state, even in async operations.
   */
  useEffect(() => {
    micStateRef.current = microphoneState;
    console.log(`Microphone state updated to: ${microphoneState}`, new Error().stack);
  }, [microphoneState]);
  
  /**
   * Set AI Speaking State
   * 
   * Updates the isActive state which controls whether the blob
   * shows the AI as currently speaking.
   * 
   * @param {boolean} toActive - Whether the AI should be marked as speaking
   */
  const setAISpeakingState = useCallback((toActive) => {
    // Set the active state immediately for a quick response
    setIsActive(toActive);
    console.log(`AI speaking state set to: ${toActive}`);
  }, []);
  
  /**
   * Activate Microphone
   * 
   * Requests microphone permissions and activates the microphone.
   * This function:
   * - Checks browser compatibility
   * - Requests microphone permissions from the browser
   * - Updates the microphone state once permissions are granted
   * - Handles errors and permission denials
   * 
   * @returns {Promise<boolean>} Success or failure of activation
   */
  const activateMicrophone = useCallback(async () => {
    console.log("useVapiService: Activating microphone");
    
    // Check if the browser supports necessary APIs
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.error("useVapiService: Browser doesn't support getUserMedia");
      return false;
    }

    try {
      // Request microphone access to trigger browser's permission prompt
      // Configure with noise suppression for better speech quality
      console.log("useVapiService: Requesting microphone permission");
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { 
          echoCancellation: true, // Reduce echo
          noiseSuppression: true, // Reduce background noise
          autoGainControl: true   // Normalize volume levels
        } 
      });
      
      // If we reached here, permissions were granted
      console.log("useVapiService: Microphone permission granted");
      
      if (stream && stream.active) {
        // The stream is active, update microphone state to ON
        setMicrophoneState(MicrophoneState.ON);
        
        // Release this stream - the AudioReactiveBlob component will create its own
        // This prevents having multiple active streams to the same microphone
        stream.getTracks().forEach(track => track.stop());
        
        return true;
      } else {
        // This should rarely happen, but handle it just in case
        console.error("useVapiService: Stream not active after permission granted");
        setMicrophoneState(MicrophoneState.OFF);
        return false;
      }
    } catch (error) {
      // This happens when user denies permission or there's a system error
      console.error("useVapiService: Error activating microphone:", error);
      setMicrophoneState(MicrophoneState.OFF);
      return false;
    }
  }, []);
  
  /**
   * Deactivate Microphone
   * 
   * Turns off the microphone and stops any active AI speech.
   * This function is called when the user explicitly wants to
   * stop the interaction.
   */
  const deactivateMicrophone = useCallback(() => {
    console.log("useVapiService: Deactivating microphone");
    
    // Update microphone state to OFF
    setMicrophoneState(MicrophoneState.OFF);
    
    // If the AI is speaking when we turn off the mic, it should stop
    if (isActive) {
      console.log("useVapiService: Stopping active speech");
      setAISpeakingState(false);
    }
  }, [isActive, setAISpeakingState]);
  
  /**
   * Initialize the Vapi Service
   * 
   * Sets up the service instance and event handlers when the component mounts.
   * This effect runs once on mount and handles:
   * - Creating a new MockVapiService instance
   * - Setting up state change handlers
   * - Setting up text change handlers
   * - Cleanup on component unmount
   */
  useEffect(() => {
    // Create a new service instance
    serviceRef.current = new MockVapiService();
    
    /**
     * Speech State Change Handler
     * 
     * Updates the UI based on changes in the speech state.
     * For example, when the AI starts or stops speaking.
     * 
     * @param {string} newState - The new speech state (from SpeechState enum)
     */
    serviceRef.current.onStateChange = (newState) => {
      console.log("Speech state changed:", newState);
      setServiceState(newState);
      
      // Update UI based on speech state
      if (newState === SpeechState.SPEAKING) {
        // AI has started speaking - activate the blob
        setAISpeakingState(true);
      } else if (newState === SpeechState.IDLE && isActive) {
        // AI has stopped speaking - deactivate the blob
        setAISpeakingState(false);
      }
    };
    
    /**
     * Text Change Handler
     * 
     * Updates the displayed text when the AI's speech text changes.
     * 
     * @param {string} text - The new text being spoken
     */
    serviceRef.current.onTextChange = (text) => {
      console.log("Text changed:", text);
      setCurrentText(text);
    };
    
    // Initialize the service
    serviceRef.current.initialize();
    
    // Cleanup function that runs on component unmount
    return () => {
      if (serviceRef.current) {
        serviceRef.current.cleanup();
      }
      // Ensure microphone is off when component unmounts
      setMicrophoneState(MicrophoneState.OFF);
    };
  }, [isActive, setAISpeakingState]);
  
  /**
   * Start Assessment
   * 
   * Begins the cognitive assessment process:
   * - Ensures microphone is active
   * - Marks the user as having interacted
   * - Calls the service's startAssessment method
   * 
   * @returns {Promise<void>}
   */
  const startAssessment = async () => {
    // Don't proceed if service isn't ready or we're already processing
    if (!serviceRef.current || isProcessingRef.current) return;
    
    // Check if microphone is active first, and activate if not
    if (micStateRef.current !== MicrophoneState.ON) {
      console.log("useVapiService: Can't start assessment without microphone permission");
      const micSuccess = await activateMicrophone();
      if (!micSuccess) {
        console.log("useVapiService: Failed to get microphone permission, aborting assessment");
        return;
      }
    }
    
    try {
      // Set processing flag to prevent concurrent operations
      isProcessingRef.current = true;
      // Mark user as having interacted with assessment
      setHasInteracted(true);
      
      // Start the assessment if service is idle
      if (serviceState === SpeechState.IDLE) {
        await serviceRef.current.startAssessment();
      }
    } finally {
      // Clear processing flag when done
      isProcessingRef.current = false;
    }
  };
  
  /**
   * Ask Next Question
   * 
   * Advances to the next question in the assessment:
   * - Ensures the service is in the IDLE state
   * - Ensures microphone is active
   * - Calls the service's askNextQuestion method
   * 
   * @returns {Promise<void>}
   */
  const askNextQuestion = async () => {
    // Only proceed if service is ready, idle, and we're not already processing
    if (!serviceRef.current || serviceState !== SpeechState.IDLE || isProcessingRef.current) return;
    
    // Check if microphone is active
    if (micStateRef.current !== MicrophoneState.ON) {
      console.log("useVapiService: Can't advance questions without microphone permission");
      return;
    }
    
    try {
      // Set processing flag to prevent concurrent operations
      isProcessingRef.current = true;
      // Ask the next question
      await serviceRef.current.askNextQuestion();
    } finally {
      // Clear processing flag when done
      isProcessingRef.current = false;
    }
  };
  
  /**
   * Handle Blob Click
   * 
   * Processes clicks on the blob visualization:
   * - Ensures microphone is active
   * - Marks user as having interacted
   * - Starts assessment or advances to next question as appropriate
   * 
   * Note: This function is not currently used as we've simplified to just
   * use toggleMicrophone, but it's kept for future enhancements.
   * 
   * @returns {Promise<void>}
   */
  const handleBlobClick = async () => {
    // Don't process if we're already in the middle of an operation
    if (isProcessingRef.current) return;
    console.log("useVapiService: Blob clicked, mic state:", micStateRef.current);
    
    // Only process if microphone is active
    if (micStateRef.current !== MicrophoneState.ON) {
      console.log("useVapiService: Blob click ignored - microphone is off");
      return;
    }
    
    try {
      // Set processing flag to prevent concurrent operations
      isProcessingRef.current = true;
      // Mark user as having interacted
      setHasInteracted(true);
      
      // If the service is idle, handle the assessment flow
      if (serviceState === SpeechState.IDLE) {
        if (!hasInteracted || serviceRef.current.currentQuestion === 0) {
          // First click - start assessment
          await startAssessment();
        } else {
          // Subsequent clicks - ask next question
          await askNextQuestion();
        }
      } 
      // If we're speaking, clicking doesn't do anything
      // except mark that we've interacted
    } finally {
      // Clear processing flag when done
      isProcessingRef.current = false;
    }
  };
  
  /**
   * Toggle Microphone
   * 
   * Main control function for the application:
   * - Toggles microphone on/off
   * - Handles assessment flow automatically
   * - Provides visual feedback during microphone activation
   * - Prevents rapid/multiple clicks
   * 
   * This is the primary function exposed to components, providing
   * a simple interface to control the entire application.
   * 
   * @returns {Promise<void>}
   */
  const toggleMicrophone = useCallback(async () => {
    console.log("useVapiService: toggleMicrophone called, current state:", micStateRef.current);
    
    // Prevent concurrent toggle operations
    if (isProcessingRef.current) {
      console.log("useVapiService: Already processing a toggle request, ignoring");
      return;
    }
    
    try {
      // Set processing flag to prevent multiple clicks
      isProcessingRef.current = true;
      
      if (micStateRef.current === MicrophoneState.OFF) {
        // TURNING MICROPHONE ON
        console.log("useVapiService: Turning microphone ON");
        
        // Show wait cursor for visual feedback during permission request
        document.body.style.cursor = 'wait';
        
        // Request microphone permission and wait for result
        const success = await activateMicrophone();
        
        // Reset cursor to default
        document.body.style.cursor = 'default';
        
        if (success) {
          console.log("useVapiService: Microphone activated successfully");
          
          // Automatically start or continue the assessment
          console.log("useVapiService: Automatically starting/continuing assessment");
          
          // Small delay to allow audio streams to initialize
          setTimeout(() => {
            // Simple flow control logic:
            if (!hasInteracted || serviceRef.current.currentQuestion === 0) {
              // First time - start new assessment
              startAssessment();
            } else if (serviceState === SpeechState.IDLE) {
              // Continue existing assessment
              askNextQuestion();
            }
          }, 200);
        } else {
          console.log("useVapiService: Failed to activate microphone");
        }
      } else {
        // TURNING MICROPHONE OFF
        // Simple - just deactivate the microphone
        deactivateMicrophone();
      }
    } finally {
      // Reset the processing flag with small delay to prevent rapid toggling
      setTimeout(() => {
        isProcessingRef.current = false;
      }, 300);
    }
  }, [serviceState, hasInteracted, activateMicrophone, deactivateMicrophone, startAssessment, askNextQuestion]);
  
  /**
   * Check Microphone Active State
   * 
   * Returns whether the microphone is currently active.
   * Uses the ref for consistent access across async operations.
   * 
   * @returns {boolean} Whether the microphone is active
   */
  const isMicrophoneActive = useCallback(() => {
    return micStateRef.current === MicrophoneState.ON;
  }, []);
  
  /**
   * Return the hook's public API
   * 
   * Exposes only the necessary states and functions to the component.
   * This creates a simple, clean API that hides the internal complexity.
   */
  return {
    // States
    isActive,                // Whether the AI is currently speaking
    currentText,             // Current text being spoken by the AI
    serviceState,            // Current state of the voice service
    hasInteracted,           // Whether the user has interacted with the assessment
    microphoneState,         // Current state of the microphone
    
    // Actions
    toggleMicrophone,        // Primary function to toggle microphone and control assessment
  };
}

export default useVapiService;