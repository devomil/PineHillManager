import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  MessageCircle, 
  Send, 
  Reply, 
  AlertTriangle, 
  CheckCircle,
  HelpCircle,
  Heart,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { apiRequest } from '@/lib/queryClient';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface Response {
  id: number;
  authorId: string;
  content: string;
  announcementId?: number;
  messageId?: number;
  parentResponseId?: number;
  responseType: 'reply' | 'question' | 'confirmation' | 'concern';
  isFromSMS: boolean;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ResponseWithAuthor extends Response {
  author?: {
    firstName: string;
    lastName: string;
    role: string;
  };
}

interface AnnouncementResponsesProps {
  announcementId: number;
  className?: string;
}

const RESPONSE_TYPES = [
  { type: 'reply', icon: MessageCircle, label: 'Reply', color: 'bg-blue-100 text-blue-800' },
  { type: 'question', icon: HelpCircle, label: 'Question', color: 'bg-yellow-100 text-yellow-800' },
  { type: 'confirmation', icon: CheckCircle, label: 'Confirmed', color: 'bg-green-100 text-green-800' },
  { type: 'concern', icon: AlertTriangle, label: 'Concern', color: 'bg-red-100 text-red-800' },
] as const;

export function AnnouncementResponses({ announcementId, className }: AnnouncementResponsesProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showResponseForm, setShowResponseForm] = useState(false);
  const [responseContent, setResponseContent] = useState('');
  const [responseType, setResponseType] = useState<'reply' | 'question' | 'confirmation' | 'concern'>('reply');
  const [expandedResponses, setExpandedResponses] = useState<Set<number>>(new Set());

  // Fetch responses for this announcement
  const { data: rawResponses = [], isLoading, error } = useQuery<ResponseWithAuthor[]>({
    queryKey: ['/api/announcements', announcementId, 'responses'],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/announcements/${announcementId}/responses`);
      return response.json();
    },
    staleTime: 0, // No caching - always fresh
    refetchOnMount: 'always', // Always refetch when component mounts
    gcTime: 0, // Don't store in cache (React Query v5)
  });

  // Ensure we always have an array
  const responses = Array.isArray(rawResponses) ? rawResponses : [];

  // Debug logging - only for announcement 30
  if (announcementId === 30) {
    console.log(`🔍 AnnouncementResponses ${announcementId}:`, {
      rawResponses,
      responses,
      responsesLength: responses?.length,
      isLoading,
      error: error?.message,
      isArray: Array.isArray(rawResponses)
    });
  }

  // Create response mutation
  const createResponseMutation = useMutation({
    mutationFn: async (responseData: { content: string; responseType: string; parentResponseId?: number }) => {
      return apiRequest('POST', `/api/announcements/${announcementId}/responses`, responseData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/announcements', announcementId, 'responses'] });
      setResponseContent('');
      setShowResponseForm(false);
    },
  });

  const handleSubmitResponse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!responseContent.trim()) return;

    createResponseMutation.mutate({
      content: responseContent.trim(),
      responseType,
    });
  };

  const toggleResponseExpansion = (responseId: number) => {
    const newExpanded = new Set(expandedResponses);
    if (newExpanded.has(responseId)) {
      newExpanded.delete(responseId);
    } else {
      newExpanded.add(responseId);
    }
    setExpandedResponses(newExpanded);
  };

  const getResponseTypeInfo = (type: string) => {
    return RESPONSE_TYPES.find(rt => rt.type === type) || RESPONSE_TYPES[0];
  };

  const getInitials = (firstName?: string, lastName?: string) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase() || '?';
  };

  if (isLoading) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
          <div className="h-16 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Response Stats */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-gray-500" />
          <span className="text-sm text-gray-600">
            {responses.length} {responses.length === 1 ? 'response' : 'responses'}
          </span>
        </div>
        {user && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowResponseForm(!showResponseForm)}
            className="text-farm-blue hover:bg-blue-50"
          >
            <Reply className="w-4 h-4 mr-1" />
            Respond
          </Button>
        )}
      </div>

      {/* Response Form */}
      {showResponseForm && user && (
        <Card className="border-farm-blue/20">
          <CardContent className="pt-4">
            <form onSubmit={handleSubmitResponse} className="space-y-3">
              {/* Response Type Selector */}
              <div className="flex gap-2">
                {RESPONSE_TYPES.map(({ type, icon: Icon, label, color }) => (
                  <Button
                    key={type}
                    type="button"
                    variant={responseType === type ? "default" : "outline"}
                    size="sm"
                    onClick={() => setResponseType(type)}
                    style={responseType === type ? {
                      backgroundColor: '#1e40af',
                      borderColor: '#1e40af',
                      color: 'white',
                      fontWeight: '600'
                    } : {
                      backgroundColor: 'white',
                      borderColor: '#d1d5db',
                      color: '#374151'
                    }}
                    className="text-xs border-2"
                  >
                    <Icon className="w-3 h-3 mr-1" />
                    {label}
                  </Button>
                ))}
              </div>

              {/* Content Input */}
              <Textarea
                value={responseContent}
                onChange={(e) => setResponseContent(e.target.value)}
                placeholder="Share your thoughts, ask a question, or provide feedback..."
                rows={3}
                className="resize-none"
              />

              {/* Actions */}
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowResponseForm(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={!responseContent.trim() || createResponseMutation.isPending}
                  style={{
                    backgroundColor: '#1e40af',
                    borderColor: '#1e40af',
                    color: 'white',
                    fontWeight: '600',
                    padding: '8px 16px'
                  }}
                >
                  <Send className="w-4 h-4 mr-1" />
                  {createResponseMutation.isPending ? 'Sending...' : 'Send Response'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Responses List */}
      {responses.length > 0 && (
        <div className="space-y-3">
          {(responses as ResponseWithAuthor[]).map((response) => {
            const typeInfo = getResponseTypeInfo(response.responseType);
            const isExpanded = expandedResponses.has(response.id);
            const hasLongContent = response.content.length > 150;

            return (
              <Card key={response.id} className="border-l-4 border-l-farm-blue/30">
                <CardContent className="pt-4">
                  <div className="flex gap-3">
                    {/* Avatar */}
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="bg-farm-blue/10 text-farm-blue text-xs">
                        {getInitials(response.author?.firstName, response.author?.lastName)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 space-y-2">
                      {/* Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900">
                            {response.author?.firstName} {response.author?.lastName}
                          </span>
                          <Badge variant="outline" className={cn("text-xs", typeInfo.color)}>
                            <typeInfo.icon className="w-3 h-3 mr-1" />
                            {typeInfo.label}
                          </Badge>
                          {response.isFromSMS && (
                            <Badge variant="outline" className="text-xs bg-green-50 text-green-700">
                              📱 SMS
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs text-gray-500">
                          {format(new Date(response.createdAt), 'MMM d, h:mm a')}
                        </span>
                      </div>

                      {/* Content */}
                      <div className="text-sm text-gray-700">
                        <div 
                          className={cn(
                            "whitespace-pre-wrap",
                            hasLongContent && !isExpanded && "line-clamp-3"
                          )}
                        >
                          {response.content}
                        </div>
                        
                        {hasLongContent && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleResponseExpansion(response.id)}
                            className="p-0 h-auto text-farm-blue hover:bg-transparent"
                          >
                            {isExpanded ? (
                              <>
                                <ChevronUp className="w-4 h-4 mr-1" />
                                Show less
                              </>
                            ) : (
                              <>
                                <ChevronDown className="w-4 h-4 mr-1" />
                                Show more
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {responses.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <MessageCircle className="w-12 h-12 mx-auto mb-2 text-gray-300" />
          <p className="text-sm">No responses yet</p>
          <p className="text-xs">Be the first to share your thoughts!</p>
        </div>
      )}
    </div>
  );
}