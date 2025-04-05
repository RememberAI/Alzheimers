/**
 * Mock Vapi Service
 * 
 * This file simulates the integration with Vapi.ai for the Alzheimer's assessment tool.
 * In a production environment, this would be replaced with actual Vapi API calls.
 */

// Speech states for tracking the conversation flow
export const SpeechState = {
  IDLE: 'idle',
  SPEAKING: 'speaking',
  LISTENING: 'listening',
  PROCESSING: 'processing',
  ERROR: 'error'
};

// Sample questions for the Alzheimer's assessment
const sampleQuestions = [
  {
    id: 1,
    text: "Can you tell me today's date, including the month, day, and year?",
    category: "orientation",
    expectedDuration: 4000 // milliseconds for simulated speech
  },
  {
    id: 2,
    text: "What season are we currently in?",
    category: "orientation",
    expectedDuration: 3000
  },
  {
    id: 3,
    text: "I'm going to name three objects, and I'd like you to repeat them after me: Apple, Table, Penny. Could you repeat those for me?",
    category: "memory",
    expectedDuration: 7000
  },
  {
    id: 4,
    text: "Can you count backward from 100 by 7? Just give me the first five numbers.",
    category: "attention",
    expectedDuration: 5000
  },
  {
    id: 5,
    text: "Earlier I mentioned three objects. Could you tell me what those three objects were?",
    category: "recall",
    expectedDuration: 5000
  }
];

// Introduction and closing messages
const introMessage = {
  text: "Hello, I'm here to help you with a brief cognitive assessment. I'll ask you a few simple questions. Please answer them to the best of your ability. There's no rush, and you can take your time to think about each answer. Are you ready to begin?",
  expectedDuration: 10000
};

const closingMessage = {
  text: "Thank you for completing this assessment. Remember, this is just a simple screening tool and not a diagnostic test. I recommend discussing the results with your healthcare provider for proper evaluation and advice.",
  expectedDuration: 8000
};

class MockVapiService {
  constructor() {
    this.currentQuestion = 0;
    this.speechState = SpeechState.IDLE;
    this.onStateChange = null;
    this.onTextChange = null;
    this.currentText = '';
    this.isInitialized = false;
  }

  /**
   * Initialize the service
   */
  async initialize() {
    console.log('Initializing mock Vapi service');
    
    // Simulate an initialization delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    this.isInitialized = true;
    this.setSpeechState(SpeechState.IDLE);
    
    return true;
  }

  /**
   * Start the assessment
   */
  async startAssessment() {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    this.currentQuestion = 0;
    
    // Speak the introduction
    await this.speakText(introMessage.text, introMessage.expectedDuration);
    
    return true;
  }

  /**
   * Proceed to the next question
   */
  async askNextQuestion() {
    if (this.currentQuestion >= sampleQuestions.length) {
      // Assessment is complete, deliver closing message
      await this.speakText(closingMessage.text, closingMessage.expectedDuration);
      this.setSpeechState(SpeechState.IDLE);
      return { isComplete: true };
    }
    
    const question = sampleQuestions[this.currentQuestion];
    await this.speakText(question.text, question.expectedDuration);
    
    this.currentQuestion++;
    
    return {
      isComplete: false,
      questionNumber: this.currentQuestion,
      totalQuestions: sampleQuestions.length
    };
  }

  /**
   * Simulate the LLM speaking
   */
  async speakText(text, duration = 3000) {
    // Update state to speaking
    this.setSpeechState(SpeechState.SPEAKING);
    this.setCurrentText(text);
    
    // Calculate speaking duration based on text length
    // This makes longer sentences take more time
    const calculatedDuration = Math.max(
      duration,
      // At least 100ms per character, but minimum of duration provided
      Math.min(text.length * 100, 15000) // Cap at 15 seconds
    );
    
    console.log(`Speaking text (${calculatedDuration}ms): ${text.substring(0, 50)}${text.length > 50 ? '...' : ''}`);
    
    // Simulate the speaking duration
    return new Promise(resolve => {
      // Use a stable timeout ID that won't be affected by component re-renders
      const timeoutId = setTimeout(() => {
        // Ensure we're still in SPEAKING state before changing to IDLE
        // This prevents race conditions when multiple speak calls happen
        if (this.speechState === SpeechState.SPEAKING) {
          this.setSpeechState(SpeechState.IDLE);
        }
        resolve(true);
      }, calculatedDuration);
    });
  }

  /**
   * Simulate processing a user's voice input
   */
  async processVoiceInput(duration = 2000) {
    this.setSpeechState(SpeechState.LISTENING);
    
    // Simulate listening and then processing
    await new Promise(resolve => setTimeout(resolve, duration));
    
    this.setSpeechState(SpeechState.PROCESSING);
    
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Return to idle state
    this.setSpeechState(SpeechState.IDLE);
    
    return {
      transcribedText: "This is simulated user speech input",
      confidence: 0.95
    };
  }

  /**
   * Update the speech state and notify listeners
   */
  setSpeechState(state) {
    this.speechState = state;
    
    if (this.onStateChange) {
      this.onStateChange(state);
    }
  }

  /**
   * Update the current text and notify listeners
   */
  setCurrentText(text) {
    this.currentText = text;
    
    if (this.onTextChange) {
      this.onTextChange(text);
    }
  }

  /**
   * Get the current speech state
   */
  getSpeechState() {
    return this.speechState;
  }

  /**
   * Get the current text
   */
  getCurrentText() {
    return this.currentText;
  }

  /**
   * Clean up resources
   */
  cleanup() {
    this.onStateChange = null;
    this.onTextChange = null;
    this.currentText = '';
    this.speechState = SpeechState.IDLE;
  }
}

export default MockVapiService;