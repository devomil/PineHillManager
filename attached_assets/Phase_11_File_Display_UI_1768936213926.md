# Phase 11: File Display UI

## Task
Display files within chat messages.

## Instructions
Update the message rendering in `client/src/components/homer-ai-assistant.tsx`

---

## Step 1: Create File Display Component

**Add this component BEFORE the main HomerAIAssistant component:**

```typescript
interface FileAttachmentProps {
  file: {
    fileId: string;
    url: string;
    name: string;
    type: string;
  };
}

const FileAttachment: React.FC<FileAttachmentProps> = ({ file }) => {
  const isImage = file.type.startsWith('image/');
  
  if (isImage) {
    return (
      <div className="mt-2 max-w-[200px]">
        <a href={file.url} target="_blank" rel="noopener noreferrer">
          <img 
            src={file.url} 
            alt={file.name}
            className="rounded-lg border shadow-sm hover:shadow-md transition-shadow"
          />
        </a>
        <p className="text-xs text-muted-foreground mt-1 truncate">{file.name}</p>
      </div>
    );
  }
  
  // Non-image file
  return (
    <a 
      href={file.url} 
      target="_blank" 
      rel="noopener noreferrer"
      className="mt-2 flex items-center gap-2 p-2 bg-muted/50 rounded-lg border hover:bg-muted transition-colors max-w-[250px]"
    >
      <div className="p-2 bg-background rounded">
        <FileText className="w-5 h-5 text-blue-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{file.name}</p>
        <p className="text-xs text-muted-foreground">Click to open</p>
      </div>
    </a>
  );
};
```

---

## Step 2: Update Message Rendering

**Find where messages are rendered (look for `messages.map`). Update the message content area to include files.**

**Find the message content section (usually shows `message.content`) and update to:**

```tsx
{messages.map((message) => (
  <div
    key={message.id}
    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
  >
    <div
      className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
        message.role === 'user'
          ? 'bg-primary text-primary-foreground rounded-br-md'
          : 'bg-muted rounded-bl-md'
      }`}
    >
      {/* Query type badge for assistant */}
      {message.role === 'assistant' && message.queryType && (
        <div className="mb-1">
          {getQueryTypeBadge(message.queryType)}
        </div>
      )}
      
      {/* Message content */}
      <div className="text-sm whitespace-pre-wrap">
        {message.content}
      </div>
      
      {/* File attachment */}
      {message.file && (
        <FileAttachment file={message.file} />
      )}
      
      {/* Response time for assistant */}
      {message.role === 'assistant' && message.responseTimeMs && (
        <p className="text-xs text-muted-foreground mt-1.5 opacity-60">
          {(message.responseTimeMs / 1000).toFixed(1)}s
        </p>
      )}
    </div>
  </div>
))}
```

---

## Step 3: Add Click-to-Enlarge for Images (Optional Enhancement)

**Add state for image preview modal:**

```typescript
const [previewImage, setPreviewImage] = useState<string | null>(null);
```

**Update the FileAttachment image section:**

```tsx
if (isImage) {
  return (
    <div className="mt-2 max-w-[200px]">
      <img 
        src={file.url} 
        alt={file.name}
        className="rounded-lg border shadow-sm hover:shadow-md transition-shadow cursor-pointer"
        onClick={() => setPreviewImage(file.url)}
      />
      <p className="text-xs text-muted-foreground mt-1 truncate">{file.name}</p>
    </div>
  );
}
```

**Add modal at the end of the component (before final closing div):**

```tsx
{/* Image Preview Modal */}
{previewImage && (
  <div 
    className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4"
    onClick={() => setPreviewImage(null)}
  >
    <div className="relative max-w-4xl max-h-[90vh]">
      <img 
        src={previewImage} 
        alt="Preview" 
        className="max-w-full max-h-[90vh] object-contain rounded-lg"
      />
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white"
        onClick={() => setPreviewImage(null)}
      >
        <XIcon className="w-5 h-5" />
      </Button>
    </div>
  </div>
)}
```

---

## Verification
1. No TypeScript errors
2. User messages with files show the file
3. Images display as thumbnails
4. Documents show as downloadable links
5. Clicking images enlarges them (optional)

## Next
Proceed to Phase 12.
