import { Bot, User } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatMessageProps {
  message: Message;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';

  // Format the content - convert markdown-like syntax to HTML-friendly format
  const formatContent = (content: string) => {
    return content
      .split('\n')
      .map((line, i) => {
        // Handle bullet points
        if (line.startsWith('• ') || line.startsWith('- ')) {
          return (
            <li key={i} className="ml-4 list-disc">
              {line.substring(2)}
            </li>
          );
        }
        // Handle numbered lists
        if (/^\d+\.\s/.test(line)) {
          return (
            <li key={i} className="ml-4 list-decimal">
              {line.replace(/^\d+\.\s/, '')}
            </li>
          );
        }
        // Handle bold text
        if (line.includes('**')) {
          const parts = line.split(/\*\*(.*?)\*\*/g);
          return (
            <p key={i} className={i > 0 ? 'mt-1' : ''}>
              {parts.map((part, j) =>
                j % 2 === 1 ? (
                  <strong key={j} className="font-semibold">
                    {part}
                  </strong>
                ) : (
                  part
                )
              )}
            </p>
          );
        }
        // Regular line
        if (line.trim()) {
          return (
            <p key={i} className={i > 0 ? 'mt-1' : ''}>
              {line}
            </p>
          );
        }
        // Empty line - add spacing
        return <div key={i} className="h-2" />;
      });
  };

  return (
    <div className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
          isUser
            ? 'bg-primary text-primary-foreground'
            : 'bg-primary/10'
        }`}
      >
        {isUser ? (
          <User className="w-4 h-4" />
        ) : (
          <Bot className="w-4 h-4 text-primary" />
        )}
      </div>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
          isUser
            ? 'bg-primary text-primary-foreground rounded-tr-none'
            : 'bg-secondary/50 rounded-tl-none'
        }`}
      >
        <div className="text-sm leading-relaxed">{formatContent(message.content)}</div>
        <p
          className={`text-[10px] mt-2 ${
            isUser ? 'text-primary-foreground/70' : 'text-muted-foreground'
          }`}
        >
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  );
}
