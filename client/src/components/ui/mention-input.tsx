import { useState, useRef, useEffect, useCallback, forwardRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import UserAvatar from '@/components/user-avatar';

interface User {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
  profileImageUrl: string | null;
  isActive: boolean;
}

interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
}

export function parseMentions(text: string): string[] {
  const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
  const userIds: string[] = [];
  let match;
  while ((match = mentionRegex.exec(text)) !== null) {
    userIds.push(match[2]);
  }
  return userIds;
}

export function renderMentionText(text: string): (string | JSX.Element)[] {
  const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
  const parts: (string | JSX.Element)[] = [];
  let lastIndex = 0;
  let match;

  while ((match = mentionRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    parts.push(
      <span key={match.index} className="inline-flex items-center bg-blue-100 text-blue-800 rounded px-1 py-0.5 text-sm font-medium">
        @{match[1]}
      </span>
    );
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
}

export function getDisplayText(text: string): string {
  return text.replace(/@\[([^\]]+)\]\([^)]+\)/g, '@$1');
}

export const MentionInput = forwardRef<HTMLTextAreaElement, MentionInputProps>(
  function MentionInput({ value, onChange, placeholder, rows = 3, className }, ref) {
    const [showDropdown, setShowDropdown] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [mentionStartPos, setMentionStartPos] = useState<number | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const displayValue = getDisplayText(value);

    const { data: allUsers = [] } = useQuery<User[]>({
      queryKey: ['/api/users'],
    });

    const activeUsers = allUsers.filter(u => u.isActive);

    const filteredUsers = activeUsers.filter(u => {
      if (!searchQuery) return true;
      const fullName = `${u.firstName} ${u.lastName}`.toLowerCase();
      return fullName.includes(searchQuery.toLowerCase()) ||
        u.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.lastName.toLowerCase().includes(searchQuery.toLowerCase());
    }).slice(0, 8);

    const convertDisplayPosToValuePos = useCallback((displayPos: number): number => {
      const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
      let match;
      let offset = 0;
      const tempValue = value;
      while ((match = mentionRegex.exec(tempValue)) !== null) {
        const displayLen = match[1].length + 1;
        const rawLen = match[0].length;
        if (match.index + offset <= displayPos) {
          offset += rawLen - displayLen;
        } else break;
      }
      return displayPos + offset;
    }, [value]);

    const handleInput = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newDisplayValue = e.target.value;
      const cursorPos = e.target.selectionStart || 0;

      const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
      let result = value;
      let match;
      const existingMentions: { start: number; end: number; display: string; raw: string }[] = [];
      while ((match = mentionRegex.exec(value)) !== null) {
        existingMentions.push({
          start: match.index,
          end: match.index + match[0].length,
          display: `@${match[1]}`,
          raw: match[0],
        });
      }

      let newValue = '';
      let displayIdx = 0;
      let valueIdx = 0;

      for (const mention of existingMentions) {
        const beforeMention = value.slice(valueIdx, mention.start);
        const displayBefore = newDisplayValue.slice(displayIdx, displayIdx + beforeMention.length);
        newValue += displayBefore;
        displayIdx += beforeMention.length;
        valueIdx = mention.start;

        const displayMention = newDisplayValue.slice(displayIdx, displayIdx + mention.display.length);
        if (displayMention === mention.display) {
          newValue += mention.raw;
          displayIdx += mention.display.length;
        } else {
          newValue += newDisplayValue.slice(displayIdx, displayIdx + Math.max(0, mention.display.length));
          displayIdx += mention.display.length;
        }
        valueIdx = mention.end;
      }

      newValue += newDisplayValue.slice(displayIdx);

      onChange(newValue);

      const textBeforeCursor = newDisplayValue.slice(0, cursorPos);
      const atIndex = textBeforeCursor.lastIndexOf('@');

      if (atIndex !== -1) {
        const charBefore = atIndex > 0 ? textBeforeCursor[atIndex - 1] : ' ';
        const textAfterAt = textBeforeCursor.slice(atIndex + 1);
        const hasSpace = /\s{2}/.test(textAfterAt);

        if ((charBefore === ' ' || charBefore === '\n' || atIndex === 0) && !hasSpace && textAfterAt.length < 30) {
          setShowDropdown(true);
          setSearchQuery(textAfterAt);
          setMentionStartPos(atIndex);
          setSelectedIndex(0);
          return;
        }
      }

      setShowDropdown(false);
      setMentionStartPos(null);
    }, [value, onChange]);

    const insertMention = useCallback((user: User) => {
      if (mentionStartPos === null || !textareaRef.current) return;

      const displayText = getDisplayText(value);
      const cursorPos = textareaRef.current.selectionStart || 0;
      const beforeMention = displayText.slice(0, mentionStartPos);
      const afterCursor = displayText.slice(cursorPos);

      const mentionTag = `@[${user.firstName} ${user.lastName}](${user.id})`;
      const newRawValue = rebuildValue(value, mentionStartPos, cursorPos, mentionTag);

      onChange(newRawValue);
      setShowDropdown(false);
      setMentionStartPos(null);
      setSearchQuery('');

      setTimeout(() => {
        if (textareaRef.current) {
          const newDisplayValue = getDisplayText(newRawValue);
          const newPos = mentionStartPos + `@${user.firstName} ${user.lastName}`.length + 1;
          textareaRef.current.selectionStart = Math.min(newPos, newDisplayValue.length);
          textareaRef.current.selectionEnd = Math.min(newPos, newDisplayValue.length);
          textareaRef.current.focus();
        }
      }, 0);
    }, [value, onChange, mentionStartPos]);

    const rebuildValue = (currentRaw: string, displayStart: number, displayEnd: number, replacement: string): string => {
      const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
      let match;
      const mentionsList: { start: number; end: number; display: string; raw: string }[] = [];
      while ((match = mentionRegex.exec(currentRaw)) !== null) {
        mentionsList.push({
          start: match.index,
          end: match.index + match[0].length,
          display: `@${match[1]}`,
          raw: match[0],
        });
      }

      let rawStart = displayStart;
      let rawEnd = displayEnd;
      let displayOffset = 0;
      let rawOffset = 0;

      for (const m of mentionsList) {
        const mDisplayStart = m.start - rawOffset + displayOffset;
        const mDisplayEnd = mDisplayStart + m.display.length;
        const diff = m.raw.length - m.display.length;

        if (mDisplayEnd <= displayStart) {
          rawStart += diff;
          rawEnd += diff;
        } else if (mDisplayStart < displayEnd) {
          rawEnd += diff;
        }
        rawOffset += diff;
        displayOffset = 0;
      }

      return currentRaw.slice(0, rawStart) + replacement + currentRaw.slice(rawEnd);
    };

    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (!showDropdown || filteredUsers.length === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % filteredUsers.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + filteredUsers.length) % filteredUsers.length);
      } else if (e.key === 'Enter' && showDropdown) {
        e.preventDefault();
        insertMention(filteredUsers[selectedIndex]);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setShowDropdown(false);
        setMentionStartPos(null);
      }
    }, [showDropdown, filteredUsers, selectedIndex, insertMention]);

    useEffect(() => {
      if (showDropdown && dropdownRef.current) {
        const selected = dropdownRef.current.children[selectedIndex] as HTMLElement;
        if (selected) {
          selected.scrollIntoView({ block: 'nearest' });
        }
      }
    }, [selectedIndex, showDropdown]);

    useEffect(() => {
      const handleClickOutside = (e: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
          setShowDropdown(false);
        }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
      <div ref={containerRef} className="relative">
        <textarea
          ref={(node) => {
            textareaRef.current = node;
            if (typeof ref === 'function') ref(node);
            else if (ref) ref.current = node;
          }}
          value={displayValue}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={rows}
          className={cn(
            "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none",
            className
          )}
        />

        {showDropdown && filteredUsers.length > 0 && (
          <div
            ref={dropdownRef}
            className="absolute z-50 mt-1 w-full max-h-48 overflow-y-auto bg-white border border-gray-200 rounded-md shadow-lg"
          >
            {filteredUsers.map((user, index) => (
              <button
                key={user.id}
                type="button"
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-blue-50 transition-colors",
                  index === selectedIndex && "bg-blue-50"
                )}
                onMouseDown={(e) => {
                  e.preventDefault();
                  insertMention(user);
                }}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <UserAvatar user={user} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">
                    {user.firstName} {user.lastName}
                  </div>
                  <div className="text-xs text-gray-500 capitalize">{user.role}</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }
);
