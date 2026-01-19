import { useState, useEffect, useRef, useCallback } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Bot, 
  Mic, 
  MicOff, 
  Send, 
  X, 
  Volume2, 
  VolumeX,
  Sparkles,
  MessageSquare,
  Loader2,
  ChevronDown,
  Brain
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  audioUrl?: string;
  queryType?: string;
  responseTimeMs?: number;
  timestamp: Date;
}

interface HomerStatus {
  available: boolean;
  voiceEnabled: boolean;
  aiModel: string;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface SpeechRecognitionType extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognitionType;
    webkitSpeechRecognition: new () => SpeechRecognitionType;
  }
}

export function HomerAIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [sessionId, setSessionId] = useState<string>('');
  const [isListening, setIsListening] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isWakeWordActive, setIsWakeWordActive] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [speechSupported, setSpeechSupported] = useState(false);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    setSpeechSupported(!!SpeechRecognition);
  }, []);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const recognitionRef = useRef<SpeechRecognitionType | null>(null);
  const wakeWordRecognitionRef = useRef<SpeechRecognitionType | null>(null);

  const { data: status } = useQuery<HomerStatus>({
    queryKey: ['/api/homer/status'],
    enabled: isOpen,
  });

  const queryMutation = useMutation({
    mutationFn: async (data: { question: string; generateVoice: boolean }) => {
      const response = await apiRequest('POST', '/api/homer/query', {
        question: data.question,
        sessionId: sessionId || undefined,
        inputMethod: isListening ? 'voice' : 'text',
        generateVoice: data.generateVoice && !isMuted,
      });
      return response;
    },
    onSuccess: (data: any) => {
      if (!sessionId && data.sessionId) {
        setSessionId(data.sessionId);
      }

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.response.text,
        audioUrl: data.response.audioUrl,
        queryType: data.response.queryType,
        responseTimeMs: data.response.responseTimeMs,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);

      if (data.response.audioUrl && !isMuted) {
        playAudio(data.response.audioUrl);
      }
    },
  });

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      const wakeWordRecognition = new SpeechRecognition();
      wakeWordRecognition.continuous = true;
      wakeWordRecognition.interimResults = true;
      wakeWordRecognition.lang = 'en-US';

      wakeWordRecognition.onresult = (event) => {
        const last = event.results.length - 1;
        const text = event.results[last][0].transcript.toLowerCase();
        
        if (text.includes('homer') || text.includes('hey homer') || text.includes('ok homer')) {
          setIsWakeWordActive(false);
          setIsOpen(true);
          startListening();
          wakeWordRecognition.stop();
        }
      };

      wakeWordRecognition.onerror = (event) => {
        console.error('[Homer] Wake word recognition error:', event.error);
        setIsWakeWordActive(false);
      };

      wakeWordRecognition.onend = () => {
        if (isWakeWordActive) {
          try {
            wakeWordRecognition.start();
          } catch (e) {
            console.warn('[Homer] Could not restart wake word recognition');
          }
        }
      };

      wakeWordRecognitionRef.current = wakeWordRecognition;
    }

    return () => {
      wakeWordRecognitionRef.current?.stop();
      recognitionRef.current?.stop();
    };
  }, []);

  const toggleWakeWord = () => {
    if (isWakeWordActive) {
      setIsWakeWordActive(false);
      wakeWordRecognitionRef.current?.stop();
    } else {
      setIsWakeWordActive(true);
      try {
        wakeWordRecognitionRef.current?.start();
      } catch (e) {
        console.error('[Homer] Failed to start wake word recognition:', e);
      }
    }
  };

  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      console.error('[Homer] Speech recognition not supported');
      return;
    }

    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
      setTranscript('');
    };

    recognition.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      setTranscript(finalTranscript || interimTranscript);

      if (finalTranscript) {
        let cleanedTranscript = finalTranscript
          .replace(/^(homer|hey homer|ok homer)[,\s]*/i, '')
          .trim();

        if (cleanedTranscript) {
          handleSendMessage(cleanedTranscript, true);
        }
      }
    };

    recognition.onerror = (event) => {
      console.error('[Homer] Speech recognition error:', event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      setTranscript('');
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setIsListening(false);
  };

  const playAudio = (audioUrl: string) => {
    if (audioRef.current) {
      audioRef.current.src = audioUrl;
      audioRef.current.play().catch(console.error);
    }
  };

  const handleSendMessage = (message: string, generateVoice: boolean = false) => {
    if (!message.trim()) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: message,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');

    queryMutation.mutate({ question: message, generateVoice });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendMessage(inputValue, false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(inputValue, false);
    }
  };

  const getQueryTypeBadge = (queryType?: string) => {
    const badges: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
      financial: { label: 'Financial', variant: 'default' },
      forecast: { label: 'Forecast', variant: 'secondary' },
      comparison: { label: 'Comparison', variant: 'outline' },
      inventory: { label: 'Inventory', variant: 'secondary' },
      hr: { label: 'HR', variant: 'outline' },
      general: { label: 'General', variant: 'outline' },
    };

    const badge = badges[queryType || 'general'] || badges.general;
    return <Badge variant={badge.variant} className="text-xs">{badge.label}</Badge>;
  };

  return (
    <>
      <audio ref={audioRef} className="hidden" />

      {!isOpen && (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
          {isWakeWordActive && (
            <div className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100 px-3 py-1 rounded-full text-sm flex items-center gap-2 animate-pulse">
              <Mic className="w-4 h-4" />
              Listening for "Homer"...
            </div>
          )}
          
          <div className="flex gap-2">
            {speechSupported && (
              <Button
                variant="outline"
                size="icon"
                onClick={toggleWakeWord}
                className={cn(
                  "rounded-full w-12 h-12 shadow-lg",
                  isWakeWordActive && "bg-green-100 dark:bg-green-900 border-green-500"
                )}
                title={isWakeWordActive ? "Disable wake word" : "Enable wake word (say 'Homer')"}
              >
                {isWakeWordActive ? <Mic className="w-5 h-5 text-green-600" /> : <MicOff className="w-5 h-5" />}
              </Button>
            )}

            <Button
              onClick={() => setIsOpen(true)}
              className="rounded-full w-14 h-14 shadow-lg bg-gradient-to-br from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              title="Open Homer AI Assistant"
            >
              <Brain className="w-7 h-7" />
            </Button>
          </div>
        </div>
      )}

      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-[420px] max-h-[600px] flex flex-col bg-background border rounded-2xl shadow-2xl overflow-hidden">
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
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsMuted(!isMuted)}
                  className="text-white hover:bg-white/20"
                  title={isMuted ? "Enable voice" : "Mute voice"}
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

          <ScrollArea className="flex-1 p-4">
            {!status?.available && (
              <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 mb-4">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  Homer is currently unavailable. The AI service may not be configured.
                </p>
              </div>
            )}

            {messages.length === 0 ? (
              <div className="text-center py-8">
                <Bot className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="font-semibold text-lg mb-2">Hello! I'm Homer</h3>
                <p className="text-muted-foreground text-sm mb-4">
                  Your AI business intelligence assistant. Ask me about revenue, profitability, forecasts, and more.
                </p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {[
                    "How did we do last month?",
                    "What's our profit margin?",
                    "Lake Geneva performance",
                  ].map((suggestion) => (
                    <Button
                      key={suggestion}
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => handleSendMessage(suggestion, false)}
                      disabled={!status?.available}
                    >
                      {suggestion}
                    </Button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      "flex",
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[85%] rounded-2xl px-4 py-3",
                        message.role === 'user'
                          ? 'bg-blue-600 text-white rounded-br-md'
                          : 'bg-muted rounded-bl-md'
                      )}
                    >
                      {message.role === 'assistant' && message.queryType && (
                        <div className="mb-2">
                          {getQueryTypeBadge(message.queryType)}
                        </div>
                      )}
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      {message.role === 'assistant' && message.audioUrl && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="mt-2 text-xs"
                          onClick={() => playAudio(message.audioUrl!)}
                        >
                          <Volume2 className="w-3 h-3 mr-1" />
                          Play response
                        </Button>
                      )}
                      {message.responseTimeMs && (
                        <p className="text-xs opacity-60 mt-1">
                          Response time: {(message.responseTimeMs / 1000).toFixed(1)}s
                        </p>
                      )}
                    </div>
                  </div>
                ))}
                
                {queryMutation.isPending && (
                  <div className="flex justify-start">
                    <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm">Homer is thinking...</span>
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>
            )}
          </ScrollArea>

          <div className="p-4 border-t flex-shrink-0">
            {isListening && (
              <div className="mb-3 bg-blue-50 dark:bg-blue-950 rounded-lg p-3 flex items-center gap-3">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                <span className="text-sm flex-1">
                  {transcript || 'Listening...'}
                </span>
                <Button variant="ghost" size="sm" onClick={stopListening}>
                  Stop
                </Button>
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex gap-2">
              {speechSupported && (
                <Button
                  type="button"
                  variant={isListening ? "destructive" : "outline"}
                  size="icon"
                  onClick={isListening ? stopListening : startListening}
                  className="flex-shrink-0"
                  title={isListening ? "Stop listening" : "Start voice input"}
                  disabled={!status?.available}
                >
                  {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </Button>
              )}

              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask Homer anything..."
                className="flex-1"
                disabled={queryMutation.isPending || isListening || !status?.available}
              />

              <Button
                type="submit"
                disabled={!inputValue.trim() || queryMutation.isPending || !status?.available}
                className="flex-shrink-0 bg-gradient-to-r from-blue-600 to-purple-600"
              >
                <Send className="w-5 h-5" />
              </Button>
            </form>

            {status && (
              <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  status.available ? "bg-green-500" : "bg-red-500"
                )} />
                {status.available ? 'Online' : 'Offline'}
                {status.voiceEnabled && (
                  <>
                    <span>•</span>
                    <span>Voice enabled</span>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}