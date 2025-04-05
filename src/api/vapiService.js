/**
 * Mock Vapi service for handling voice-based interactions with an LLM
 * In production, this would be replaced with actual Vapi API calls
 */

// Sample quiz questions for the Alzheimer's assessment
const quizQuestions = [
  {
    id: 1,
    question: "Can you tell me today's date, including the month, day, and year?",
    category: "orientation",
    audioUrl: "/audio/question1.mp3", // These would be real audio files in production
  },
  {
    id: 2,
    question: "What season are we currently in?",
    category: "orientation",
    audioUrl: "/audio/question2.mp3",
  },
  {
    id: 3,
    question: "I'm going to name three objects, and I'd like you to repeat them after me: Apple, Table, Penny. Could you repeat those for me?",
    category: "memory",
    audioUrl: "/audio/question3.mp3", 
  },
  {
    id: 4,
    question: "Can you count backward from 100 by 7? Just give me the first five numbers.",
    category: "attention",
    audioUrl: "/audio/question4.mp3",
  },
  {
    id: 5,
    question: "Earlier I mentioned three objects. Could you tell me what those three objects were?",
    category: "recall",
    audioUrl: "/audio/question5.mp3",
  }
];

// Introduction and closing messages
const introMessage = {
  text: "Hello, I'm here to help you with a brief cognitive assessment. I'll ask you a few simple questions. Please answer them to the best of your ability. There's no rush, and you can take your time to think about each answer. Are you ready to begin?",
  audioUrl: "/audio/intro.mp3",
};

const closingMessage = {
  text: "Thank you for completing this assessment. Remember, this is just a simple screening tool and not a diagnostic test. I recommend discussing the results with your healthcare provider for proper evaluation and advice.",
  audioUrl: "/audio/closing.mp3",
};

// Feedback responses based on user answers
const feedbackResponses = {
  positive: [
    "That's correct, well done.",
    "Very good, that's right.",
    "Excellent, you got it.",
    "That's correct, thank you.",
  ],
  neutral: [
    "I've recorded your answer, let's continue.",
    "Thank you for your response.",
    "I understand, let's move to the next question.",
    "I've noted your answer.",
  ],
  encouragement: [
    "Take your time, there's no rush.",
    "It's okay if you're not sure, just give your best answer.",
    "Don't worry if you can't remember exactly, just try your best.",
    "That's alright, let's try the next question.",
  ]
};

// Speech states for the blob visualization
const speechStates = {
  IDLE: "idle",
  SPEAKING: "speaking",
  LISTENING: "listening",
  PROCESSING: "processing",
};

class VapiService {
  constructor() {
    this.currentQuestion = 0;
    this.responses = [];
    this.speechState = speechStates.IDLE;
    this.audioContext = null;
    this.audioElement = null;
    this.onSpeechStateChange = null;
    this.onTranscriptUpdate = null;
  }

  /**
   * Initialize the audio context
   */
  async initialize() {
    // In a real implementation, this would initialize the Vapi SDK
    // and set up voice recognition services
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      this.audioElement = new Audio();
      this.audioElement.addEventListener('ended', () => {
        this.updateSpeechState(speechStates.LISTENING);
      });
      
      console.log("VapiService initialized successfully");
      return true;
    } catch (error) {
      console.error("Failed to initialize VapiService:", error);
      return false;
    }
  }

  /**
   * Start the quiz
   */
  async startQuiz() {
    this.currentQuestion = 0;
    this.responses = [];
    
    // Play the introduction message
    await this.speakMessage(introMessage.text);
    
    // Wait for user acknowledgment (in real implementation)
    // then proceed to first question
    setTimeout(() => {
      this.askNextQuestion();
    }, 1000);
    
    return true;
  }

  /**
   * Ask the next question in the quiz
   */
  async askNextQuestion() {
    if (this.currentQuestion < quizQuestions.length) {
      const question = quizQuestions[this.currentQuestion];
      await this.speakMessage(question.question);
      return question;
    } else {
      // End of quiz
      await this.speakMessage(closingMessage.text);
      return null;
    }
  }

  /**
   * Record and process the user's answer
   * @param {string} answer - The transcribed user response
   */
  async processUserAnswer(answer) {
    if (this.currentQuestion >= quizQuestions.length) {
      return null;
    }
    
    // Record the response
    this.responses.push({
      questionId: quizQuestions[this.currentQuestion].id,
      answer: answer,
      timestamp: new Date().toISOString(),
    });
    
    // In a real implementation, we would analyze the answer
    // and provide appropriate feedback
    
    // For this mock, randomly select feedback
    const feedbackTypes = ['positive', 'neutral', 'encouragement'];
    const feedbackType = feedbackTypes[Math.floor(Math.random() * feedbackTypes.length)];
    const feedbackOptions = feedbackResponses[feedbackType];
    const feedback = feedbackOptions[Math.floor(Math.random() * feedbackOptions.length)];
    
    // Speak the feedback
    await this.speakMessage(feedback);
    
    // Move to the next question
    this.currentQuestion++;
    
    // Check if we've reached the end of the quiz
    if (this.currentQuestion < quizQuestions.length) {
      // Ask the next question after a short delay
      setTimeout(() => {
        this.askNextQuestion();
      }, 1000);
      
      return {
        feedback,
        isComplete: false,
        nextQuestion: quizQuestions[this.currentQuestion]
      };
    } else {
      // Quiz is complete
      setTimeout(() => {
        this.speakMessage(closingMessage.text);
      }, 1000);
      
      return {
        feedback,
        isComplete: true,
        results: this.generateResults()
      };
    }
  }

  /**
   * Generate quiz results (mock implementation)
   */
  generateResults() {
    // In a real implementation, this would analyze the user's responses
    // and provide meaningful results or recommendations
    
    return {
      completionTime: new Date().toISOString(),
      questionsAnswered: this.responses.length,
      recommendation: "Please share these results with your healthcare provider for a comprehensive evaluation."
    };
  }

  /**
   * Simulate speech synthesis for the LLM
   * @param {string} message - The text to be spoken
   */
  async speakMessage(message) {
    return new Promise((resolve) => {
      // Update speech state to speaking
      this.updateSpeechState(speechStates.SPEAKING);
      
      // In a real implementation, this would use the Web Speech API
      // or a similar service to convert text to speech
      
      // For the mock, we'll simulate the speech duration based on message length
      console.log("LLM speaking:", message);
      
      // Simulate the audio duration (roughly 100ms per character)
      const duration = message.length * 100;
      
      // Simulate audio playing with setTimeout
      setTimeout(() => {
        this.updateSpeechState(speechStates.IDLE);
        resolve(true);
      }, duration);
    });
  }

  /**
   * Start listening for user input
   */
  startListening() {
    this.updateSpeechState(speechStates.LISTENING);
    
    // In a real implementation, this would activate the microphone
    // and begin speech recognition
    
    console.log("Started listening for user input");
    
    // For the mock, we'll simulate user input after a short delay
    setTimeout(() => {
      // Simulate receiving user input
      this.updateSpeechState(speechStates.PROCESSING);
      
      // Simulate processing the user's speech
      setTimeout(() => {
        // In a real implementation, this would be replaced with actual
        // speech recognition results
        const mockUserResponse = "This is a simulated user response";
        
        // Update the transcript
        if (this.onTranscriptUpdate) {
          this.onTranscriptUpdate(mockUserResponse);
        }
        
        // Process the response
        this.processUserAnswer(mockUserResponse);
      }, 1000);
    }, 3000);
  }

  /**
   * Update the speech state and notify listeners
   * @param {string} newState - The new speech state
   */
  updateSpeechState(newState) {
    this.speechState = newState;
    
    // Notify any listeners about the state change
    if (this.onSpeechStateChange) {
      this.onSpeechStateChange(newState);
    }
  }

  /**
   * Get the current speech state
   */
  getSpeechState() {
    return this.speechState;
  }

  /**
   * Clean up resources
   */
  cleanup() {
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
    }
    
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.src = '';
    }
    
    this.onSpeechStateChange = null;
    this.onTranscriptUpdate = null;
  }
}

export { VapiService, speechStates };