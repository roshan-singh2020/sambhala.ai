'use client';

import type { UIMessage } from 'ai';
import { User, Bot } from 'lucide-react';
import dynamic from 'next/dynamic';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

const MarkdownPreview = dynamic(
  () => import('@uiw/react-markdown-preview').then((mod) => mod.default),
  { ssr: false }
);

interface ChatMessageProps {
  message: UIMessage;
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const text = message.parts
    .filter((p): p is Extract<typeof p, { type: 'text' }> => p.type === 'text')
    .map(p => p.text)
    .join('');

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar */}
      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
        isUser ? 'bg-blue-600' : 'bg-zinc-200 dark:bg-zinc-700'
      }`}>
        {isUser ? (
          <User className="w-4 h-4 text-white" />
        ) : (
          <Bot className="w-4 h-4 text-zinc-700 dark:text-zinc-300" />
        )}
      </div>

      {/* Message Bubble */}
      <div className={`max-w-[80%] px-4 py-3 rounded-2xl ${
        isUser
          ? 'bg-blue-600 text-white rounded-br-md'
          : 'bg-zinc-100 dark:bg-zinc-800 text-foreground rounded-bl-md'
      }`}>
        {isUser ? (
          <p className="text-sm leading-relaxed">{text}</p>
        ) : (
          <div className="prose prose-sm dark:prose-invert max-w-none [&_p]:mb-2 [&_p:last-child]:mb-0 [&_pre]:bg-zinc-900 [&_pre]:p-3 [&_pre]:rounded-lg [&_code]:text-xs">
            <MarkdownPreview 
              source={text}
              remarkPlugins={[remarkMath]}
              rehypePlugins={[rehypeKatex]}
              wrapperElement={{ "data-color-mode": "dark" }}
              style={{ 
                backgroundColor: 'transparent',
                color: 'inherit',
                padding: 0
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
