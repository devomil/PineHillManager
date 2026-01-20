# Phase 0: Wake Word Enhancement (Voice Activation)

## Current State
Wake word detection already exists but may need enhancement for reliability.

## Task
Improve wake word activation with better phrases, feedback, and reliability.

## Instructions
Update `client/src/components/homer-ai-assistant.tsx`

---

## Step 1: Update Wake Word Detection

**Find the wake word detection section (search for `wakeWordRecognition.onresult`). Replace the entire onresult handler:**

```typescript
wakeWordRecognition.onresult = (event) => {
  for (let i = event.resultIndex; i < event.results.length; i++) {
    const text = event.results[i][0].transcript.toLowerCase().trim();
    
    // Check for wake phrases
    const wakePatterns = [
      /\bhomer\b/,           // "Homer"
      /\bhey homer\b/,       // "Hey Homer"
      /\bok homer\b/,        // "Ok Homer"
      /\bhi homer\b/,        // "Hi Homer"
      /\bhello homer\b/,     // "Hello Homer"
      /\bhomer[,]?\s+i\b/,   // "Homer, I have a question"
      /\bhomer[,]?\s+can\b/, // "Homer, can you..."
      /\bhomer[,]?\s+what\b/,// "Homer, what is..."
    ];
    
    const isWakeWord = wakePatterns.some(pattern => pattern.test(text));
    
    if (isWakeWord) {
      console.log('[Homer] Wake word detected:', text);
      
      // Play activation sound (optional)
      playActivationSound();
      
      // Stop wake word listening
      setIsWakeWordActive(false);
      wakeWordRecognition.stop();
      
      // Open Homer
      setIsOpen(true);
      
      // Extract any command after the wake word
      const commandMatch = text.match(/homer[,]?\s+(.+)/i);
      if (commandMatch && commandMatch[1]) {
        const command = commandMatch[1].trim();
        // If they said something after "Homer", use it as input
        if (command.length > 3 && !command.match(/^(i|can|what|how|why|when|where)$/)) {
          setInputValue(command);
        }
      }
      
      // Start listening for the actual question
      setTimeout(() => startListening(), 300);
      
      break;
    }
  }
};
```

---

## Step 2: Add Activation Sound Function

**Add this function near the other audio functions:**

```typescript
const playActivationSound = () => {
  // Create a subtle "listening" chime using Web Audio API
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Create two quick tones for a "ding-ding" effect
    const playTone = (frequency: number, startTime: number, duration: number) => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = frequency;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.1, startTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
      
      oscillator.start(startTime);
      oscillator.stop(startTime + duration);
    };
    
    const now = audioContext.currentTime;
    playTone(800, now, 0.1);        // First tone
    playTone(1200, now + 0.1, 0.15); // Second tone (higher)
    
  } catch (e) {
    console.log('[Homer] Could not play activation sound');
  }
};
```

---

## Step 3: Add Visual Activation Feedback

**Add state for activation animation:**

```typescript
const [justActivated, setJustActivated] = useState(false);
```

**Update the wake word detection to trigger animation:**

```typescript
if (isWakeWord) {
  console.log('[Homer] Wake word detected:', text);
  
  // Visual feedback
  setJustActivated(true);
  setTimeout(() => setJustActivated(false), 1000);
  
  // ... rest of activation code
}
```

**Update the floating button to show activation:**

```tsx
<Button
  onClick={() => setIsOpen(true)}
  className={`rounded-full w-14 h-14 shadow-lg bg-gradient-to-br from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 transition-all ${
    justActivated ? 'scale-110 ring-4 ring-blue-400 ring-opacity-50' : ''
  }`}
  title="Open Homer AI Assistant"
>
  <Brain className={`w-7 h-7 ${justActivated ? 'animate-pulse' : ''}`} />
</Button>
```

---

## Step 4: Improve Wake Word Toggle Button

**Find the wake word toggle button and update for better UX:**

```tsx
{speechSupported && !isOpen && (
  <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3">
    {/* Wake word status indicator */}
    {isWakeWordActive && (
      <div className="flex items-center gap-2 px-3 py-2 bg-green-100 dark:bg-green-900/30 rounded-full shadow-lg animate-pulse">
        <div className="w-2 h-2 bg-green-500 rounded-full" />
        <span className="text-xs text-green-700 dark:text-green-300 font-medium">
          Say "Hey Homer"
        </span>
      </div>
    )}
    
    {/* Wake word toggle */}
    <Button
      onClick={toggleWakeWord}
      variant="outline"
      size="icon"
      className={`rounded-full w-10 h-10 shadow-md ${
        isWakeWordActive 
          ? 'bg-green-100 border-green-300 hover:bg-green-200' 
          : 'bg-background'
      }`}
      title={isWakeWordActive ? "Voice activation ON - say 'Hey Homer'" : "Enable voice activation"}
    >
      {isWakeWordActive ? (
        <Mic className="w-5 h-5 text-green-600" />
      ) : (
        <MicOff className="w-5 h-5 text-muted-foreground" />
      )}
    </Button>
    
    {/* Main Homer button */}
    <Button
      onClick={() => setIsOpen(true)}
      className={`rounded-full w-14 h-14 shadow-lg bg-gradient-to-br from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 transition-all ${
        justActivated ? 'scale-110 ring-4 ring-blue-400/50' : ''
      }`}
      title="Open Homer AI Assistant"
    >
      <Brain className={`w-7 h-7 ${justActivated ? 'animate-pulse' : ''}`} />
    </Button>
  </div>
)}
```

---

## Step 5: Add Wake Word Instructions to Welcome Screen

**In the welcome/empty state (when `messages.length === 0`), add wake word info:**

```tsx
{/* Voice activation hint */}
{speechSupported && (
  <div className="mt-4 p-3 bg-muted/50 rounded-lg">
    <p className="text-xs text-muted-foreground flex items-center justify-center gap-2">
      <Mic className="w-3 h-3" />
      <span>Tip: Enable the mic button and say <strong>"Hey Homer"</strong> to activate hands-free</span>
    </p>
  </div>
)}
```

---

## Supported Wake Phrases

After this enhancement, users can say:

| Phrase | Action |
|--------|--------|
| "Homer" | Opens Homer, starts listening |
| "Hey Homer" | Opens Homer, starts listening |
| "Ok Homer" | Opens Homer, starts listening |
| "Hi Homer" | Opens Homer, starts listening |
| "Hello Homer" | Opens Homer, starts listening |
| "Homer, I have a question" | Opens Homer, starts listening |
| "Homer, can you check sales?" | Opens Homer with "can you check sales?" pre-filled |
| "Homer, what was our revenue?" | Opens Homer with "what was our revenue?" pre-filled |

---

## Verification
1. Enable wake word (click mic button when Homer is closed)
2. Say "Hey Homer" - should hear chime and see animation
3. Homer opens and starts listening
4. Say "Homer, how did we do last month?" - should open with question ready
5. Visual indicator shows "Say Hey Homer" when active

## Note
Wake word detection uses the Web Speech API which requires:
- HTTPS connection (or localhost)
- Microphone permission granted
- Chrome, Edge, or Safari browser (Firefox has limited support)

## Next
This should be done FIRST, then proceed to Phase 1 of voice implementation.
