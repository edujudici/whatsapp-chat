import React, { useState, useEffect } from 'react';
import { WhatsAppManager } from '@/components/WhatsAppManager.tsx';
import { ChatList } from '@/components/ChatList.tsx';
import { ChatWindow } from '@/components/ChatWindow.tsx';
import { wahaService } from '@/services/wahaService.ts';
import { Toaster } from '@/components/ui/sonner.tsx';
import { toast } from 'sonner';
import { MessageSquare, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button.tsx';

export default function App() {
  const [instanceName, setInstanceName] = useState<string | null>(null);
  const [chats, setChats] = useState<any[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [showSettings, setShowSettings] = useState(true);

  const fetchChats = async (name: string) => {
    try {
      const data = await wahaService.getChats(name);
      setChats(data);
    } catch (error) {
      console.error('Failed to fetch chats', error);
    }
  };

  const fetchMessages = async (chatId: string) => {
    if (!instanceName) return;
    setLoadingMessages(true);
    try {
      const data = await wahaService.getMessages(instanceName, chatId);
      setMessages(data.reverse()); // WAHA returns newest first
    } catch (error) {
      toast.error('Failed to fetch messages');
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleSendMessage = async (text: string) => {
    if (!instanceName || !selectedChatId) return;
    try {
      const newMessage = await wahaService.sendMessage(instanceName, selectedChatId, text);
      // Optimistically add message
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        body: text,
        fromMe: true,
        timestamp: Math.floor(Date.now() / 1000)
      }]);
    } catch (error) {
      toast.error('Failed to send message');
    }
  };

  useEffect(() => {
    if (instanceName) {
      fetchChats(instanceName);
      const interval = setInterval(() => fetchChats(instanceName), 15000);
      return () => clearInterval(interval);
    }
  }, [instanceName]);

  useEffect(() => {
    if (selectedChatId) {
      fetchMessages(selectedChatId);
      const interval = setInterval(() => fetchMessages(selectedChatId), 5000);
      return () => clearInterval(interval);
    }
  }, [selectedChatId]);

  const selectedChat = chats.find(c => c.id === selectedChatId);

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Toaster position="top-center" />
      
      {/* Sidebar Navigation */}
      <div className="w-16 border-r flex flex-col items-center py-4 gap-4 bg-muted/20">
        <Button 
          variant={!showSettings ? "default" : "ghost"} 
          size="icon" 
          onClick={() => setShowSettings(false)}
          disabled={!instanceName}
        >
          <MessageSquare className="h-5 w-5" />
        </Button>
        <Button 
          variant={showSettings ? "default" : "ghost"} 
          size="icon" 
          onClick={() => setShowSettings(true)}
        >
          <Settings className="h-5 w-5" />
        </Button>
      </div>

      {showSettings ? (
        <div className="flex-1 flex items-center justify-center p-8">
          <WhatsAppManager onInstanceReady={(name) => {
            setInstanceName(name);
            setShowSettings(false);
          }} />
        </div>
      ) : (
        <div className="flex-1 flex overflow-hidden">
          <div className="w-80 flex-shrink-0">
            <ChatList 
              chats={chats} 
              selectedChatId={selectedChatId || undefined} 
              onSelectChat={setSelectedChatId} 
            />
          </div>
          <ChatWindow 
            chatName={selectedChat?.name || selectedChat?.id}
            messages={messages}
            onSendMessage={handleSendMessage}
            loading={loadingMessages}
          />
        </div>
      )}
    </div>
  );
}
