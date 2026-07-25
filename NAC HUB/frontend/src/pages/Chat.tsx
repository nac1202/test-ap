import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Send, Sparkles, RotateCcw, Trash2, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';

const API_BASE = 'http://localhost:8000/api/v1/ai';

interface ChatMessage {
  id: number;
  question: string;
  answer: string;
  created_at: string;
  // Client-side only fields
  status?: 'sending' | 'error' | 'ok';
  errorDetail?: string;
}

// A pending message that hasn't been sent yet
interface PendingMessage {
  tempId: number;
  question: string;
  status: 'sending' | 'error';
  errorDetail?: string;
}

export default function Chat() {
  const { token } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pendingMessage, setPendingMessage] = useState<PendingMessage | null>(null);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [loadError, setLoadError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  // Scroll to bottom
  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }, []);

  // Load chat history
  const loadHistory = useCallback(async () => {
    setIsLoading(true);
    setLoadError('');
    try {
      const res = await fetch(`${API_BASE}/history`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`${res.status}`);
      const data = await res.json();
      setMessages(data);
    } catch (err) {
      setLoadError('履歴の取得に失敗しました。');
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, pendingMessage, scrollToBottom]);

  // Auto-resize textarea
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 150) + 'px';
  };

  // Send message
  const sendMessage = async (question: string) => {
    if (!question.trim() || isSending) return;

    const tempId = Date.now();
    setPendingMessage({ tempId, question, status: 'sending' });
    setInput('');
    setIsSending(true);

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    try {
      const res = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ question }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.detail || `送信に失敗しました (${res.status})`);
      }

      const data: ChatMessage = await res.json();
      setMessages(prev => [...prev, data]);
      setPendingMessage(null);
    } catch (err: any) {
      setPendingMessage(prev =>
        prev ? { ...prev, status: 'error', errorDetail: err.message } : null
      );
    } finally {
      setIsSending(false);
    }
  };

  // Retry failed message
  const retryMessage = () => {
    if (!pendingMessage) return;
    const question = pendingMessage.question;
    setPendingMessage(null);
    sendMessage(question);
  };

  // Handle form submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  // Handle keyboard (Enter to send, Shift+Enter for newline)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  // Clear history (new conversation)
  const handleClearHistory = async () => {
    if (!window.confirm('チャット履歴をクリアして新しい会話を始めますか？')) return;

    try {
      const res = await fetch(`${API_BASE}/history`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('履歴の削除に失敗しました。');
      setMessages([]);
      setPendingMessage(null);
    } catch (err: any) {
      alert(err.message || '履歴の削除に失敗しました。');
    }
  };

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col animate-in fade-in duration-500">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-gray-800 flex items-center gap-2">
            <img src="/nakkun.png" alt="なっくん" className="h-8 w-8 object-contain" />
            AIコンシェルジュ なっくん
          </h2>
          <p className="text-sm text-text-muted mt-1">社内の知識、なんでも聞いてください。</p>
        </div>
        {messages.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleClearHistory}
            className="text-gray-500 hover:text-red-500 gap-1.5"
            id="btn-new-conversation"
          >
            <Trash2 className="h-4 w-4" />
            新しい会話
          </Button>
        )}
      </div>

      {/* Chat Area */}
      <Card className="flex-1 flex flex-col overflow-hidden border-primary/20 shadow-sm">
        <CardContent className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50/50">
          {/* Loading state */}
          {isLoading && (
            <div className="flex items-center justify-center h-full text-gray-400">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              読み込み中...
            </div>
          )}

          {/* Load error */}
          {loadError && !isLoading && (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3">
              <AlertCircle className="h-8 w-8 text-red-400" />
              <p className="text-sm text-red-500">{loadError}</p>
              <Button variant="outline" size="sm" onClick={loadHistory} className="gap-1.5">
                <RotateCcw className="h-4 w-4" /> 再読み込み
              </Button>
            </div>
          )}

          {/* Empty state - welcome message */}
          {!isLoading && !loadError && messages.length === 0 && !pendingMessage && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4 overflow-hidden">
                <img src="/nakkun.png" alt="なっくん" className="h-14 w-14 object-contain" />
              </div>
              <h3 className="text-lg font-bold text-gray-700 mb-2">こんにちは！なっくんです</h3>
              <p className="text-sm text-gray-500 max-w-md">
                案件の状況確認、社内ナレッジの検索、スケジュールの確認など、
                なんでもお気軽にご質問ください。
              </p>
              <div className="flex flex-wrap gap-2 mt-6 max-w-lg justify-center">
                {['A案件の状況を教えて', '来週の予定は？', 'Slackで検索して'].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => sendMessage(suggestion)}
                    className="px-4 py-2 text-sm rounded-full border border-primary/30 text-primary hover:bg-primary/5 transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Message list */}
          {!isLoading && !loadError && (
            <>
              {messages.map((msg) => (
                <React.Fragment key={msg.id}>
                  {/* User message (question) */}
                  <div className="flex gap-3 max-w-3xl ml-auto flex-row-reverse">
                    <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0 font-bold text-gray-600 text-sm">
                      Me
                    </div>
                    <div className="p-4 rounded-2xl rounded-tr-sm whitespace-pre-wrap text-sm shadow-sm bg-primary text-white">
                      {msg.question}
                    </div>
                  </div>
                  {/* AI message (answer) */}
                  <div className="flex gap-3 max-w-3xl">
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
                      <img src="/nakkun.png" alt="なっくん" className="h-6 w-6 object-contain" />
                    </div>
                    <div className="p-4 rounded-2xl rounded-tl-sm whitespace-pre-wrap text-sm shadow-sm bg-white border border-gray-100">
                      {msg.answer}
                    </div>
                  </div>
                </React.Fragment>
              ))}

              {/* Pending message */}
              {pendingMessage && (
                <>
                  {/* User question */}
                  <div className="flex gap-3 max-w-3xl ml-auto flex-row-reverse">
                    <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0 font-bold text-gray-600 text-sm">
                      Me
                    </div>
                    <div className="p-4 rounded-2xl rounded-tr-sm whitespace-pre-wrap text-sm shadow-sm bg-primary text-white">
                      {pendingMessage.question}
                    </div>
                  </div>

                  {/* Sending indicator or error */}
                  {pendingMessage.status === 'sending' && (
                    <div className="flex gap-3 max-w-3xl">
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
                        <img src="/nakkun.png" alt="なっくん" className="h-6 w-6 object-contain" />
                      </div>
                      <div className="p-4 rounded-2xl rounded-tl-sm text-sm shadow-sm bg-white border border-gray-100 flex items-center gap-2 text-gray-400">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="animate-pulse">なっくんが考えています...</span>
                      </div>
                    </div>
                  )}

                  {pendingMessage.status === 'error' && (
                    <div className="flex gap-3 max-w-3xl">
                      <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                        <AlertCircle className="h-5 w-5 text-red-500" />
                      </div>
                      <div className="p-4 rounded-2xl rounded-tl-sm text-sm shadow-sm bg-red-50 border border-red-200">
                        <p className="text-red-600 mb-2">
                          {pendingMessage.errorDetail || '送信に失敗しました。'}
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={retryMessage}
                          className="gap-1.5 text-red-600 border-red-300 hover:bg-red-100"
                          id="btn-retry-message"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          再送信
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          <div ref={messagesEndRef} />
        </CardContent>

        {/* Input area */}
        <div className="p-4 bg-white border-t">
          <form onSubmit={handleSubmit} className="flex gap-2 items-end">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="メッセージを入力して「なっくん」に質問... (Shift+Enterで改行)"
              rows={1}
              className="flex-1 rounded-2xl px-5 py-3 bg-gray-50 border border-gray-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all resize-none text-sm"
              disabled={isSending}
              id="chat-input"
            />
            <Button
              type="submit"
              className="rounded-full w-12 h-12 p-0 flex items-center justify-center flex-shrink-0"
              disabled={isSending || !input.trim()}
              id="btn-send-message"
            >
              {isSending ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5 ml-0.5" />
              )}
            </Button>
          </form>
          <p className="text-xs text-gray-400 mt-2 text-center">
            なっくんは現在モック回答モードで動作しています
          </p>
        </div>
      </Card>
    </div>
  );
}
