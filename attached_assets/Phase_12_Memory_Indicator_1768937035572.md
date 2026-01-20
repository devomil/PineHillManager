# Phase 12: Memory Indicator UI

## Task
Add visual indicators showing Homer's memory status and personalization.

## Instructions
Update `client/src/components/homer-ai-assistant.tsx`

---

## Step 1: Add Imports

**Add this import:**

```typescript
import { Brain, Database, User, Sparkles } from 'lucide-react';
```

---

## Step 2: Fetch Memory Count

**Add a query to fetch memory stats. Add this with other queries:**

```typescript
const { data: memoryStats } = useQuery({
  queryKey: ['/api/homer/memories'],
  enabled: isOpen,
  select: (data: any) => ({
    count: data?.memories?.length || 0,
  }),
});
```

---

## Step 3: Add Memory Indicator to Header

**Find the CardHeader section. Add this indicator after the title area, before the buttons:**

```tsx
{/* Status indicators */}
<div className="flex items-center gap-1.5 text-white/70">
  {status?.voiceEnabled && (
    <div className="flex items-center gap-1 px-2 py-0.5 bg-white/10 rounded-full text-xs">
      <Volume2 className="w-3 h-3" />
      <span>Voice</span>
    </div>
  )}
  {memoryStats && memoryStats.count > 0 && (
    <div className="flex items-center gap-1 px-2 py-0.5 bg-white/10 rounded-full text-xs">
      <Database className="w-3 h-3" />
      <span>{memoryStats.count}</span>
    </div>
  )}
</div>
```

---

## Step 4: Create Welcome Message with Personalization

**Update the welcome/empty state message to show personalization. Find the section that shows when `messages.length === 0` and update:**

```tsx
{messages.length === 0 ? (
  <div className="text-center py-8 px-4">
    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 flex items-center justify-center">
      <Sparkles className="w-8 h-8 text-blue-600 dark:text-blue-400" />
    </div>
    
    <h3 className="text-lg font-semibold mb-2">
      {status?.available ? "Hi! I'm Homer" : "Homer is Offline"}
    </h3>
    
    <p className="text-sm text-muted-foreground mb-4">
      {status?.available 
        ? "Your AI Business Intelligence assistant. I can analyze sales, inventory, and financial data across all your locations."
        : "The AI service is not currently available."}
    </p>
    
    {/* Feature badges */}
    <div className="flex flex-wrap justify-center gap-2 mb-6">
      <div className="flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 rounded-full text-xs text-blue-700 dark:text-blue-300">
        <Brain className="w-3 h-3" />
        <span>AI Analysis</span>
      </div>
      {status?.voiceEnabled && (
        <div className="flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 rounded-full text-xs text-green-700 dark:text-green-300">
          <Volume2 className="w-3 h-3" />
          <span>Voice Enabled</span>
        </div>
      )}
      {memoryStats && memoryStats.count > 0 && (
        <div className="flex items-center gap-1 px-2 py-1 bg-purple-100 dark:bg-purple-900/30 rounded-full text-xs text-purple-700 dark:text-purple-300">
          <Database className="w-3 h-3" />
          <span>Memory Active</span>
        </div>
      )}
    </div>
    
    {/* Quick suggestions */}
    {status?.available && (
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">Try asking:</p>
        <div className="flex flex-wrap justify-center gap-2">
          {[
            "How did we do last month?",
            "Compare store performance",
            "What's our inventory status?",
          ].map((suggestion) => (
            <button
              key={suggestion}
              onClick={() => {
                setInputValue(suggestion);
              }}
              className="px-3 py-1.5 text-xs bg-muted hover:bg-muted/80 rounded-full transition-colors"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>
    )}
  </div>
) : (
  // ... existing messages rendering ...
)}
```

---

## Step 5: Add Memory Save Confirmation

**When Homer saves a memory, show a subtle confirmation. Add this state:**

```typescript
const [memorySaved, setMemorySaved] = useState(false);
```

**In the queryMutation onSuccess, after processing the response, add:**

```typescript
// Check if response indicates memory was saved
if (data.response.text?.includes('noted') || 
    data.response.text?.includes("I'll remember") ||
    data.response.text?.includes("I've saved")) {
  setMemorySaved(true);
  setTimeout(() => setMemorySaved(false), 3000);
}
```

**Add the memory saved indicator near the input area:**

```tsx
{memorySaved && (
  <div className="px-4 py-1.5 bg-purple-50 dark:bg-purple-900/20 border-t border-purple-200 dark:border-purple-800">
    <div className="flex items-center gap-2 text-xs text-purple-700 dark:text-purple-300">
      <Database className="w-3 h-3" />
      <span>Memory saved</span>
    </div>
  </div>
)}
```

---

## Step 6: Add Footer with Memory Info

**Add a subtle footer showing Homer's capabilities. Place this at the bottom of the chat panel:**

```tsx
{/* Footer */}
<div className="px-4 py-2 border-t bg-muted/30 text-center">
  <p className="text-xs text-muted-foreground">
    {status?.voiceEnabled && '🎤 Voice'} 
    {status?.voiceEnabled && memoryStats?.count ? ' • ' : ''}
    {memoryStats?.count ? `🧠 ${memoryStats.count} memories` : ''}
    {!status?.voiceEnabled && !memoryStats?.count ? 'Homer AI' : ''}
  </p>
</div>
```

---

## Complete Header Example

For reference, here's what the header should look like:

```tsx
<CardHeader className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 px-4 flex-shrink-0">
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-3">
      <div className="p-2 bg-white/20 rounded-full">
        <Brain className="w-6 h-6" />
      </div>
      <div>
        <CardTitle className="text-lg font-semibold">Homer</CardTitle>
        <p className="text-xs text-white/80">AI Business Intelligence</p>
      </div>
    </div>
    
    {/* Status indicators */}
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1.5 text-white/70 mr-2">
        {memoryStats && memoryStats.count > 0 && (
          <div className="flex items-center gap-1 px-2 py-0.5 bg-white/10 rounded-full text-xs">
            <Database className="w-3 h-3" />
            <span>{memoryStats.count}</span>
          </div>
        )}
      </div>
      
      {isSpeaking && (
        <div className="flex items-center gap-1 text-white/80 text-xs animate-pulse">
          <Volume2 className="w-4 h-4" />
        </div>
      )}
      
      <Button
        variant="ghost"
        size="icon"
        onClick={() => {/* mute toggle */}}
        className="text-white hover:bg-white/20"
      >
        {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
      </Button>
      
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(false)}
        className="text-white hover:bg-white/20"
      >
        <X className="w-5 h-5" />
      </Button>
    </div>
  </div>
</CardHeader>
```

---

## Verification
1. No TypeScript errors
2. Memory count shows in header when memories exist
3. Feature badges show in empty state
4. Quick suggestions are clickable
5. "Memory saved" indicator appears when Homer remembers something

## Complete!
All phases are now complete. Homer now has:
- ✅ Voice output (OpenAI TTS + browser fallback)
- ✅ Memory system (persistent across conversations)
- ✅ File sharing (upload, view, download)
- ✅ User awareness (personalized for each team member)
- ✅ Visual indicators for all features
