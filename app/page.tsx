'use client';

import { useChat } from '@ai-sdk/react';
import { useState } from 'react';
import MessageList from './components/MessageList';
import ChatInput from './components/ChatInput';

export default function Chat() {
  const [input, setInput] = useState('');
  const { messages, sendMessage, status } = useChat();
  const isLoading = status === 'streaming' || status === 'submitted';

  return (
    <div className="flex flex-col h-dvh max-w-2xl mx-auto">
      <header className="p-4 text-center text-sm font-medium border-b border-zinc-200 dark:border-zinc-800 space-y-1">
        <div>sambhala-ai@v0.1.0</div>
        <div className="text-zinc-500">A knowledge graph powered by ROSH</div>
        <div className="text-zinc-400 text-xs">Ask me anything!</div>
      </header>

      <MessageList messages={messages} />
      <ChatInput
        input={input}
        setInput={setInput}
        isLoading={isLoading}
        onSubmit={e => {
          e.preventDefault();
          if (!input.trim()) return;
          sendMessage({ text: input });
          setInput('');
        }}
      />
    </div>
  );
}
