# Alzheimer's Voice Assessment

A voice-based cognitive assessment tool using an interactive speaking blob visualization with LLM integration through Vapi.ai

## Overview

This project is a single-page web application designed for elderly users to participate in Alzheimer's cognitive assessments through natural voice conversation with an AI assistant. The interface features a calming, soothing visual blob that reacts to the AI's speech, creating an intuitive and engaging experience.

## Key Features

- **Voice-Based Interaction**: Users interact with the application entirely through voice, eliminating the need for complex UI navigation
- **Reactive Visualization**: The central blob visualization responds to the AI's speech patterns in real-time
- **Elderly-Friendly Design**: Large text, simple layout, clear instructions, and soothing color scheme
- **Material Design**: Consistent, accessible UI components following Material Design principles
- **Mock Vapi.ai Integration**: Simulated LLM responses with appropriate timing for prototype demonstration

## Technical Stack

- **Framework**: Next.js with React 18
- **UI Components**: Material UI v5
- **Visualization**: p5.js for the audio-reactive blob
- **Audio Processing**: Web Audio API for audio analysis (simulated in the current version)
- **State Management**: React Hooks for local state management

## Project Structure

```
/
├── app/                # Next.js app directory
│   ├── globals.css     # Global styles
│   ├── layout.js       # Root layout
│   └── page.js         # Main page with interface
├── components/
│   └── AudioReactiveBlob.jsx  # Blob visualization component
├── src/
│   ├── api/
│   │   └── vapiService.js     # API service interface (mock)
│   └── utils/
│       └── mockVapiService.js # Mock implementation for testing
├── public/             # Static assets
└── README.md           # Project documentation
```

## How It Works

1. **Initial Load**: The application presents a welcome screen explaining the purpose of the assessment
2. **Assessment Start**: Upon clicking "Begin Assessment", the AI assistant (simulated) introduces itself
3. **Voice Interaction**: The blob animates in response to the AI's speech, creating a visual indicator of active speaking
4. **Cognitive Assessment**: The AI asks a series of questions designed to evaluate cognitive function
5. **Response Processing**: User's voice responses would be captured and processed (simulated in current version)
6. **Results**: After completion, a summary would be provided for sharing with healthcare professionals

## Blob Visualization Component

The AudioReactiveBlob component is a sophisticated visualization that:

- Renders a calm, soothing blob with subtle animations
- Responds to audio input with gentle waviness and color changes
- Features a microphone icon in the center
- Scales and animates in response to audio patterns
- Provides visual feedback during LLM speech

## Mock Vapi.ai Integration

This prototype demonstrates how the application would interact with Vapi.ai:

- Simulates LLM responses with appropriate timing
- Controls the blob visualization to align with speech patterns
- Manages the conversation flow through simulated interaction

The integration is handled through two main components:

1. **MockVapiService** (`src/utils/mockVapiService.js`): Handles the state management, event handling, and timing for the simulated conversation
2. **Service Integration** (`app/page.js`): Connects the UI components with the service, responding to speech state changes

Key speech states that control the blob animation:

- `IDLE`: No speech occurring
- `SPEAKING`: LLM is speaking (blob animates)
- `LISTENING`: System is listening for user input
- `PROCESSING`: System is processing user input

## Accessibility Considerations

The application is designed with elderly users in mind:

- Larger text for better readability
- High contrast colors for visual clarity
- Simple, uncluttered layout
- Clear, concise instructions
- Voice-based interaction to reduce UI complexity
- Gentle animations that avoid visual overstimulation

## Future Development

In a production version, the application would:

1. Integrate with actual Vapi.ai API endpoints
2. Process real voice input through speech recognition
3. Implement proper assessment scoring and result tracking
4. Add user profiles and session management
5. Implement healthcare provider sharing options
6. Add multilingual support
7. Include progress tracking over multiple sessions

## Getting Started

1. Install dependencies:
   ```
   npm install
   ```

2. Run the development server:
   ```
   npm run dev
   ```

3. Open your browser to `http://localhost:3000`

## Important Notes

- This is a prototype for demonstration purposes only
- The application does not provide actual medical diagnosis
- Results should always be discussed with healthcare professionals
- In a production environment, proper privacy and security measures would be implemented for handling sensitive health information

## Credits

- Blob visualization adapted from AudioReactivePaintBlob component
- Design concepts inspired by accessible UI research for elderly users
