# Phase 10: File Upload UI

## Task
Add file upload capability to the Homer chat interface.

## Instructions
Modify `client/src/components/homer-ai-assistant.tsx`

---

## Step 1: Add Imports

**Add these imports at the top:**

```typescript
import { Paperclip, Image, FileText, X as XIcon } from 'lucide-react';
```

---

## Step 2: Add State Variables

**Find where other state variables are declared and add:**

```typescript
const [selectedFile, setSelectedFile] = useState<File | null>(null);
const [filePreview, setFilePreview] = useState<string | null>(null);
const [isUploading, setIsUploading] = useState(false);
const fileInputRef = useRef<HTMLInputElement>(null);
```

---

## Step 3: Add File Handling Functions

**Add these functions inside the component, after the other function definitions:**

```typescript
const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
  const file = event.target.files?.[0];
  if (!file) return;
  
  // Validate file size (10MB max)
  if (file.size > 10 * 1024 * 1024) {
    alert('File size must be less than 10MB');
    return;
  }
  
  setSelectedFile(file);
  
  // Create preview for images
  if (file.type.startsWith('image/')) {
    const reader = new FileReader();
    reader.onload = (e) => setFilePreview(e.target?.result as string);
    reader.readAsDataURL(file);
  } else {
    setFilePreview(null);
  }
};

const clearSelectedFile = () => {
  setSelectedFile(null);
  setFilePreview(null);
  if (fileInputRef.current) {
    fileInputRef.current.value = '';
  }
};

const uploadFile = async (): Promise<{ fileId: string; url: string } | null> => {
  if (!selectedFile) return null;
  
  setIsUploading(true);
  
  try {
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('conversationId', sessionId || '');
    formData.append('isShared', 'false');
    
    const response = await fetch('/api/homer/files/upload', {
      method: 'POST',
      body: formData,
      credentials: 'include',
    });
    
    if (!response.ok) {
      throw new Error('Upload failed');
    }
    
    const data = await response.json();
    return {
      fileId: data.file.fileId,
      url: data.file.url,
    };
  } catch (error) {
    console.error('[Homer] File upload error:', error);
    return null;
  } finally {
    setIsUploading(false);
  }
};

const getFileIcon = (mimeType: string) => {
  if (mimeType.startsWith('image/')) {
    return <Image className="w-4 h-4" />;
  }
  return <FileText className="w-4 h-4" />;
};
```

---

## Step 4: Update handleSendMessage

**Find the `handleSendMessage` function and update it to handle file uploads:**

```typescript
const handleSendMessage = async (message: string) => {
  if (!message.trim() && !selectedFile) return;

  let fileInfo: { fileId: string; url: string; name: string; type: string } | null = null;
  
  // Upload file first if selected
  if (selectedFile) {
    const uploaded = await uploadFile();
    if (uploaded) {
      fileInfo = {
        fileId: uploaded.fileId,
        url: uploaded.url,
        name: selectedFile.name,
        type: selectedFile.type,
      };
    }
    clearSelectedFile();
  }

  const userMessage: Message = {
    id: `user-${Date.now()}`,
    role: 'user',
    content: message || `[Shared file: ${fileInfo?.name}]`,
    file: fileInfo || undefined,
    timestamp: new Date(),
  };

  setMessages(prev => [...prev, userMessage]);
  setInputValue('');

  // Include file context in question if file was uploaded
  const questionWithFile = fileInfo 
    ? `${message}\n\n[User attached file: ${fileInfo.name} (${fileInfo.type})]`
    : message;

  queryMutation.mutate({ question: questionWithFile || 'Please analyze this file.' });
};
```

---

## Step 5: Add File Preview UI

**Find the input area (look for the form with the text input). Add this BEFORE the input field:**

```tsx
{/* File Preview */}
{selectedFile && (
  <div className="px-4 py-2 border-t bg-muted/30">
    <div className="flex items-center gap-2 p-2 bg-background rounded-lg border">
      {filePreview ? (
        <img 
          src={filePreview} 
          alt="Preview" 
          className="w-12 h-12 object-cover rounded"
        />
      ) : (
        <div className="w-12 h-12 flex items-center justify-center bg-muted rounded">
          {getFileIcon(selectedFile.type)}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{selectedFile.name}</p>
        <p className="text-xs text-muted-foreground">
          {(selectedFile.size / 1024).toFixed(1)} KB
        </p>
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={clearSelectedFile}
        className="h-8 w-8"
      >
        <XIcon className="w-4 h-4" />
      </Button>
    </div>
  </div>
)}
```

---

## Step 6: Add File Input and Attach Button

**Find the input area with the microphone button. Add a file attach button next to it.**

**Add hidden file input:**
```tsx
<input
  type="file"
  ref={fileInputRef}
  onChange={handleFileSelect}
  className="hidden"
  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
/>
```

**Add attach button (next to the mic button):**
```tsx
<Button
  type="button"
  variant="ghost"
  size="icon"
  onClick={() => fileInputRef.current?.click()}
  disabled={isUploading}
  className="h-9 w-9"
  title="Attach file"
>
  <Paperclip className="w-5 h-5" />
</Button>
```

---

## Step 7: Update Message Interface

**Find the Message interface and add file support:**

```typescript
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  audioUrl?: string;
  queryType?: string;
  responseTimeMs?: number;
  timestamp: Date;
  file?: {
    fileId: string;
    url: string;
    name: string;
    type: string;
  };
}
```

---

## Verification
1. No TypeScript errors
2. Paperclip button appears in chat input
3. File selection shows preview
4. Files upload before sending message
5. Message includes file reference

## Next
Proceed to Phase 11.
