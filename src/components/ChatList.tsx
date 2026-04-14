import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

interface Chat {
  id: string;
  name: string;
  unreadCount: number;
  lastMessage?: {
    body: string;
    timestamp: number;
  };
}

interface ChatListProps {
  chats: Chat[];
  selectedChatId?: string;
  onSelectChat: (chatId: string) => void;
}

export function ChatList({ chats, selectedChatId, onSelectChat }: ChatListProps) {
  return (
    <div className="flex flex-col h-full border-r bg-muted/10">
      <div className="p-4 border-bottom font-semibold text-lg">Chats</div>
      <ScrollArea className="flex-1">
        <div className="space-y-1 p-2">
          {chats.map((chat) => (
            <button
              key={chat.id}
              onClick={() => onSelectChat(chat.id)}
              className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left ${
                selectedChatId === chat.id ? 'bg-primary/10' : 'hover:bg-muted'
              }`}
            >
              <Avatar className="h-12 w-12">
                <AvatarFallback>{chat.name?.charAt(0) || '?'}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline mb-1">
                  <span className="font-medium truncate">{chat.name || chat.id}</span>
                  {chat.lastMessage && (
                    <span className="text-xs text-muted-foreground">
                      {format(chat.lastMessage.timestamp * 1000, 'HH:mm')}
                    </span>
                  )}
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-sm text-muted-foreground truncate">
                    {chat.lastMessage?.body || 'No messages yet'}
                  </p>
                  {chat.unreadCount > 0 && (
                    <Badge variant="default" className="h-5 min-w-5 flex items-center justify-center rounded-full px-1">
                      {chat.unreadCount}
                    </Badge>
                  )}
                </div>
              </div>
            </button>
          ))}
          {chats.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No chats found
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
