/**
 * mockVapiService.js
 * 
 * This file provides a mock implementation of the Vapi.ai voice AI service.
 * It simulates a conversation flow for the Alzheimer's cognitive assessment,
 * including speech synthesis, user input processing, and state management.
 * 
 * In a production environment, this would be replaced with actual Vapi.ai API calls
 * that connect to a real LLM service with voice capabilities.
 * 
 * Key features:
 * - Simulated speech with appropriate timing
 * - Sample cognitive assessment questions
 * - State management for the conversation flow
 * - Event-based communication with the React components
 */

/**
 * SpeechState Enumeration
 * 
 * Defines the possible states in the conversation flow:
 * - IDLE: System is not actively speaking or listening
 * - SPEAKING: AI is currently speaking (blob should animate)
 * - LISTENING: System is listening for user input
 * - PROCESSING: System is processing the user's response
 * - ERROR: An error has occurred in the conversation
 * 
 * @enum {string}
 */
export const SpeechState = {
  /** System is ready but not actively doing anything */
  IDLE: 'idle',
  
  /** AI is actively speaking (blob should animate) */
  SPEAKING: 'speaking',
  
  /** System is listening for user input */
  LISTENING: 'listening',
  
  /** System is processing user input */
  PROCESSING: 'processing',
  
  /** An error has occurred */
  ERROR: 'error'
};

/**
 * Sample Assessment Questions
 * 
 * A set of cognitive assessment questions based on standard tests.
 * Each question includes:
 * - id: Unique identifier
 * - text: The question text to be spoken by the AI
 * - category: The cognitive domain being assessed
 * - expectedDuration: How long the AI should "speak" this text in milliseconds
 * 
 * These questions are designed to assess different aspects of cognitive function:
 * - Orientation: Awareness of time, place, and context
 * - Memory: Ability to recall information
 * - Attention: Ability to focus and perform calculations
 * - Recall: Delayed memory recall
 */
const sampleQuestions = [
  {
    id: 1,
    text: "Can you tell me today's date, including the month, day, and year?",
    category: "orientation", // Tests time orientation
    expectedDuration: 4000   // Milliseconds for simulated speech
  },
  {
    id: 2,
    text: "What season are we currently in?",
    category: "orientation", // Tests time orientation
    expectedDuration: 3000
  },
  {
    id: 3,
    text: "I'm going to name three objects, and I'd like you to repeat them after me: Apple, Table, Penny. Could you repeat those for me?",
    category: "memory",      // Tests immediate recall
    expectedDuration: 7000
  },
  {
    id: 4,
    text: "Can you count backward from 100 by 7? Just give me the first five numbers.",
    category: "attention",   // Tests calculation and concentration
    expectedDuration: 5000
  },
  {
    id: 5,
    text: "Earlier I mentioned three objects. Could you tell me what those three objects were?",
    category: "recall",      // Tests delayed recall
    expectedDuration: 5000
  }
];

/**
 * Introduction and Closing Messages
 * 
 * Standard messages to begin and end the assessment.
 * These provide context and instructions to the user.
 */
const introMessage = {
  text: "Hello, I'm here to help you with a brief cognitive assessment. I'll ask you a few simple questions. Please answer them to the best of your ability. There's no rush, and you can take your time to think about each answer. Are you ready to begin?",
  expectedDuration: 10000 // Longer duration for the introduction
};

const closingMessage = {
  text: "Thank you for completing this assessment. Remember, this is just a simple screening tool and not a diagnostic test. I recommend discussing the results with your healthcare provider for proper evaluation and advice.",
  expectedDuration: 8000  // Duration for the closing message
};

/**
 * MockVapiService Class
 * 
 * Simulates a voice AI service for the Alzheimer's assessment.
 * This mock service provides all the functionality needed for the prototype
 * without requiring actual voice recognition or LLM integration.
 * 
 * In a production version, this would be replaced with a class that connects
 * to the real Vapi.ai API for LLM-based voice interactions.
 */
class MockVapiService {
  /**
   * Constructor
   * 
   * Initializes the service with default state values.
   */
  constructor() {
    this.currentQuestion = 0;         // Current question index
    this.speechState = SpeechState.IDLE; // Initial speech state
    this.onStateChange = null;        // State change callback
    this.onTextChange = null;         // Text change callback
    this.currentText = '';            // Current text being spoken
    this.isInitialized = false;       // Service initialization flag
  }

  /**
   * Initialize the Service
   * 
   * Sets up the service and simulates an initialization delay.
   * In a real implementation, this would connect to the Vapi API
   * and initialize any required resources.
   * 
   * @returns {Promise<boolean>} Success of initialization
   */
  async initialize() {
    console.log('Initializing mock Vapi service');
    
    // Simulate an initialization delay (as real APIs would have)
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Mark as initialized and set initial state
    this.isInitialized = true;
    this.setSpeechState(SpeechState.IDLE);
    
    return true;
  }

  /**
   * Start Assessment
   * 
   * Begins the cognitive assessment by speaking the introduction.
   * Initializes the service if not already initialized.
   * 
   * @returns {Promise<boolean>} Success of starting the assessment
   */
  async startAssessment() {
    // Initialize if needed
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    // Reset to the first question
    this.currentQuestion = 0;
    
    // Speak the introduction message
    await this.speakText(introMessage.text, introMessage.expectedDuration);
    
    return true;
  }

  /**
   * Ask Next Question
   * 
   * Advances to the next question in the assessment.
   * If all questions have been asked, delivers the closing message.
   * 
   * @returns {Promise<Object>} Information about the question and assessment status
   */
  async askNextQuestion() {
    // Check if we've completed all questions
    if (this.currentQuestion >= sampleQuestions.length) {
      // Assessment is complete, deliver closing message
      await this.speakText(closingMessage.text, closingMessage.expectedDuration);
      this.setSpeechState(SpeechState.IDLE);
      return { isComplete: true };
    }
    
    // Get the current question and speak it
    const question = sampleQuestions[this.currentQuestion];
    await this.speakText(question.text, question.expectedDuration);
    
    // Advance to next question
    this.currentQuestion++;
    
    // Return information about the question status
    return {
      isComplete: false,
      questionNumber: this.currentQuestion,
      totalQuestions: sampleQuestions.length
    };
  }

  /**
   * Speak Text
   * 
   * Simulates the AI speaking text by:
   * - Setting the speech state to SPEAKING
   * - Updating the current text
   * - Calculating an appropriate duration based on text length
   * - Waiting for the simulated speech to complete
   * - Returning to IDLE state
   * 
   * @param {string} text - The text to speak
   * @param {number} duration - Minimum duration in milliseconds (defaults to 3000ms)
   * @returns {Promise<boolean>} Success of speaking
   */
  async speakText(text, duration = 3000) {
    // Update state to speaking
    this.setSpeechState(SpeechState.SPEAKING);
    this.setCurrentText(text);
    
    // Calculate realistic speaking duration based on text length
    // This makes longer sentences take more time
    const calculatedDuration = Math.max(
      duration,
      // At least 100ms per character, but minimum of duration provided
      Math.min(text.length * 100, 15000) // Cap at 15 seconds
    );
    
    // Log the text being spoken (abbreviated for readability)
    console.log(`Speaking text (${calculatedDuration}ms): ${text.substring(0, 50)}${text.length > 50 ? '...' : ''}`);
    
    // Simulate the speaking duration with a Promise
    return new Promise(resolve => {
      // Use a stable timeout ID that won't be affected by component re-renders
      const timeoutId = setTimeout(() => {
        // Safety check: only change state if we're still speaking
        // This prevents race conditions when multiple speak calls happen
        if (this.speechState === SpeechState.SPEAKING) {
          this.setSpeechState(SpeechState.IDLE);
        }
        resolve(true);
      }, calculatedDuration);
    });
  }

  /**
   * Process Voice Input
   * 
   * Simulates processing a user's voice input:
   * - Sets state to LISTENING during input capture
   * - Sets state to PROCESSING during analysis
   * - Returns to IDLE state when complete
   * - Returns simulated transcription results
   * 
   * In a real implementation, this would use speech recognition APIs
   * to capture and transcribe the user's spoken response.
   * 
   * @param {number} duration - Simulated listening duration in milliseconds
   * @returns {Promise<Object>} Simulated transcription results
   */
  async processVoiceInput(duration = 2000) {
    // Update state to listening
    this.setSpeechState(SpeechState.LISTENING);
    
    // Simulate listening for user input
    await new Promise(resolve => setTimeout(resolve, duration));
    
    // Update state to processing (analyzing speech)
    this.setSpeechState(SpeechState.PROCESSING);
    
    // Simulate processing time (speech-to-text conversion)
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Return to idle state
    this.setSpeechState(SpeechState.IDLE);
    
    // Return simulated transcription results
    return {
      transcribedText: "This is simulated user speech input",
      confidence: 0.95 // High confidence score
    };
  }

  /**
   * Set Speech State
   * 
   * Updates the current speech state and notifies listeners.
   * This is used to communicate state changes to the React components.
   * 
   * @param {string} state - New speech state (from SpeechState enum)
   */
  setSpeechState(state) {
    this.speechState = state;
    
    // Notify listeners if callback is registered
    if (this.onStateChange) {
      this.onStateChange(state);
    }
  }

  /**
   * Set Current Text
   * 
   * Updates the current text being spoken and notifies listeners.
   * This is used to communicate text changes to the React components.
   * 
   * @param {string} text - The new text being spoken
   */
  setCurrentText(text) {
    this.currentText = text;
    
    // Notify listeners if callback is registered
    if (this.onTextChange) {
      this.onTextChange(text);
    }
  }

  /**
   * Get Speech State
   * 
   * Returns the current speech state.
   * 
   * @returns {string} Current speech state
   */
  getSpeechState() {
    return this.speechState;
  }

  /**
   * Get Current Text
   * 
   * Returns the current text being spoken.
   * 
   * @returns {string} Current text
   */
  getCurrentText() {
    return this.currentText;
  }

  /**
   * Clean Up
   * 
   * Releases resources and resets the service state.
   * This should be called when the service is no longer needed.
   */
  cleanup() {
    // Clear all callbacks
    this.onStateChange = null;
    this.onTextChange = null;
    
    // Reset state
    this.currentText = '';
    this.speechState = SpeechState.IDLE;
  }
}

export default MockVapiService;