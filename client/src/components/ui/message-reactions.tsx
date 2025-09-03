import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { Check, ThumbsUp, X, HelpCircle } from "lucide-react";
import type { MessageReaction } from "@shared/schema";

interface MessageReactionsProps {
  messageId?: number;
  announcementId?: number;
  existingReactions?: MessageReaction[];
  className?: string;
}

const REACTION_TYPES = [
  { type: 'check', icon: Check, label: 'Acknowledged', color: 'text-green-600' },
  { type: 'thumbs_up', icon: ThumbsUp, label: 'Approved', color: 'text-blue-600' },
  { type: 'x', icon: X, label: 'Declined', color: 'text-red-600' },
  { type: 'question', icon: HelpCircle, label: 'Question', color: 'text-yellow-600' },
] as const;

export function MessageReactions({ messageId, announcementId, existingReactions = [], className }: MessageReactionsProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showReactions, setShowReactions] = useState(false);

  // Group reactions by type and count them
  const reactionCounts = existingReactions.reduce((acc, reaction) => {
    acc[reaction.reactionType] = (acc[reaction.reactionType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Check if current user has reacted
  const userReactions = existingReactions.filter(r => r.userId === user?.id);
  const userReactionTypes = new Set(userReactions.map(r => r.reactionType));

  const reactionMutation = useMutation({
    mutationFn: async ({ reactionType, action }: { reactionType: string; action: 'add' | 'remove' }) => {
      if (announcementId) {
        // Handle announcement reactions
        if (action === 'add') {
          await apiRequest('POST', '/api/announcements/reactions', {
            announcementId,
            reactionType,
          });
        } else {
          await apiRequest('DELETE', `/api/announcements/reactions/${announcementId}/${reactionType}`);
        }
      } else if (messageId) {
        // Handle message reactions
        if (action === 'add') {
          await apiRequest('POST', '/api/messages/reactions', {
            messageId,
            reactionType,
          });
        } else {
          await apiRequest('DELETE', `/api/messages/reactions/${messageId}/${reactionType}`);
        }
      }
    },
    onSuccess: () => {
      // Invalidate queries to refresh reactions
      queryClient.invalidateQueries({ queryKey: ['/api/announcements'] });
      queryClient.invalidateQueries({ queryKey: ['/api/announcements/published'] });
      queryClient.invalidateQueries({ queryKey: ['/api/messages'] });
    },
  });

  const handleReaction = (reactionType: string) => {
    if (!user) return;

    const hasReacted = userReactionTypes.has(reactionType);
    const action = hasReacted ? 'remove' : 'add';
    
    reactionMutation.mutate({ reactionType, action });
  };

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {/* Existing reaction counts */}
      {Object.keys(reactionCounts).length > 0 && (
        <div className="flex flex-wrap gap-1">
          {REACTION_TYPES.map(({ type, icon: Icon, label, color }) => {
            const count = reactionCounts[type];
            const hasUserReacted = userReactionTypes.has(type);
            
            if (!count) return null;

            return (
              <Button
                key={type}
                variant={hasUserReacted ? "default" : "outline"}
                size="sm"
                onClick={() => handleReaction(type)}
                className={cn(
                  "h-6 px-2 text-xs gap-1",
                  hasUserReacted && "bg-blue-50 border-blue-200 text-blue-700"
                )}
                disabled={reactionMutation.isPending}
              >
                <Icon className={cn("h-3 w-3", color)} />
                <span>{count}</span>
              </Button>
            );
          })}
        </div>
      )}

      {/* Add reaction button */}
      <div className="relative">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowReactions(!showReactions)}
          className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
        >
          Add Reaction
        </Button>

        {/* Reaction picker */}
        {showReactions && (
          <div className="absolute top-full left-0 mt-1 bg-white border rounded-lg shadow-lg p-2 flex gap-1 z-10">
            {REACTION_TYPES.map(({ type, icon: Icon, label, color }) => (
              <Button
                key={type}
                variant="ghost"
                size="sm"
                onClick={() => {
                  handleReaction(type);
                  setShowReactions(false);
                }}
                className={cn("h-8 w-8 p-0", color)}
                disabled={reactionMutation.isPending}
                title={label}
              >
                <Icon className="h-4 w-4" />
              </Button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}