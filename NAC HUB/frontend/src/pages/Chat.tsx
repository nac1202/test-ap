import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Send, RotateCcw, Trash2, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const API_BASE = 'http://localhost:8000/api/v1/ai';

interface ChatMessage {
  id: number;
  question: string;
  answer: string;
  created_at: string;
  status?: 'sending' | 'error' | 'ok';
  errorDetail?: string;
}

interface PendingMessage {
  tempId: number;
  question: string;
  status: 'sending' | 'error';
  errorDetail?: string;
}

export default function Chat() {
  const { token } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pendingMessage, setPendingMessage] = useState<PendingMessage | null>(null);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [loadError, setLoadError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // Guard: consume the initial question exactly once, never re-fire
  const hasConsumedInitialQ = useRef(false);
  // Keep a stable ref to sendMessage to avoid stale closure in effects
  const sendMessageRef = useRef<(q: string) => void>(() => {});

  const headers = useCallback(() => ({
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }), [token]);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }, []);

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
    } catch {
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

  const sendMessage = useCallback(async (question: string) => {
    if (!question.trim() || isSending) return;

    const tempId = Date.now();
    setPendingMessage({ tempId, question, status: 'sending' });
    setInput('');
    setIsSending(true);

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.overflowY = 'hidden';
    }

    try {
      const res = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ question }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.detail || `送信に失敗しました (${res.status})`);
      }

      const data: ChatMessage = await res.json();
      setMessages(prev => [...prev, data]);
      setPendingMessage(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '送信エラー';
      setPendingMessage(prev =>
        prev ? { ...prev, status: 'error', errorDetail: msg } : null
      );
    } finally {
      setIsSending(false);
    }
  }, [isSending, headers]);

  // Keep sendMessageRef always pointing to the latest sendMessage
  // (avoids stale closures without adding sendMessage to effect deps)
  useEffect(() => {
    sendMessageRef.current = sendMessage;
  });

  // If redirected from Home page with an initial question
  // IMPORTANT: consumed exactly once via hasConsumedInitialQ ref.
  // Do NOT add messages.length or sendMessage to deps — that was the
  // root cause of the infinite-loop duplicate message bug.
  useEffect(() => {
    const state = location.state as { initialQuestion?: string } | null;
    if (
      state?.initialQuestion &&
      !isLoading &&
      !hasConsumedInitialQ.current
    ) {
      hasConsumedInitialQ.current = true;
      const initialQ = state.initialQuestion;
      // Clear React Router location state properly (window.history.replaceState
      // does NOT update location in React Router v6)
      navigate('/chat', { replace: true, state: null });
      sendMessageRef.current(initialQ);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state, isLoading]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInput(val);
    const el = e.target;
    el.style.height = 'auto';
    const newHeight = Math.min(el.scrollHeight, 120);
    el.style.height = `${newHeight}px`;
    if (el.scrollHeight > 120) {
      el.style.overflowY = 'auto';
    } else {
      el.style.overflowY = 'hidden';
    }
  };

  const retryMessage = () => {
    if (!pendingMessage) return;
    const question = pendingMessage.question;
    setPendingMessage(null);
    sendMessage(question);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

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
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'エラー';
      alert(msg);
    }
  };

  return (
    <div className="h-full w-full flex flex-col overflow-hidden">
      {/* Chat Title Header (Shrink-0, outside scroll area) */}
      <div className="px-3 sm:px-6 pt-3 sm:pt-5 pb-2 sm:pb-4 flex items-center justify-between gap-2 shrink-0 bg-[#f8f9fa]">
        <div className="min-w-0 flex-1">
          <h2 className="text-base sm:text-2xl font-black text-gray-800 flex items-center gap-2 truncate">
            <img src="/nakkun.png" alt="なっくん" className="h-6 w-6 sm:h-8 sm:w-8 object-contain shrink-0" />
            <span className="truncate">AIコンシェルジュ なっくん</span>
          </h2>
          <p className="text-xs sm:text-sm text-text-muted mt-0.5 truncate hidden sm:block">
            社内の知識、なんでも聞いてください。
          </p>
        </div>

        {messages.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleClearHistory}
            className="text-gray-500 hover:text-red-500 gap-1.5 shrink-0 min-h-[36px] text-xs bg-white"
            id="btn-new-conversation"
          >
            <Trash2 className="h-4 w-4" />
            <span className="hidden sm:inline">新しい会話</span>
          </Button>
        )}
      </div>

      {/* Chat Main Card Container (flex-1, the only scroll wrapper is CardContent inside) */}
      <Card className="flex-1 flex flex-col min-h-0 mx-3 sm:mx-6 mb-3 sm:mb-5 overflow-hidden border-primary/20 shadow-sm rounded-2xl">
        {/* Messages List Area (The ONLY vertical scroll element) */}
        <CardContent 
          className="flex-1 min-h-0 min-w-0 w-full overflow-y-auto overflow-x-hidden overscroll-y-contain touch-pan-y pointer-events-auto p-3 sm:p-6 space-y-4 sm:space-y-6 bg-gray-50/50"
          style={{ touchAction: 'pan-y' }}
        >
          {isLoading && (
            <div className="flex items-center justify-center h-full text-gray-400">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              読み込み中...
            </div>
          )}

          {loadError && !isLoading && (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3">
              <AlertCircle className="h-8 w-8 text-red-400" />
              <p className="text-xs sm:text-sm text-red-500">{loadError}</p>
              <Button variant="outline" size="sm" onClick={loadHistory} className="gap-1.5 min-h-[44px]">
                <RotateCcw className="h-4 w-4" /> 再読み込み
              </Button>
            </div>
          )}

          {!isLoading && !loadError && messages.length === 0 && !pendingMessage && (
            <div className="flex flex-col items-center justify-center h-full text-center p-4">
              <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-full bg-primary/10 flex items-center justify-center mb-3 sm:mb-4 overflow-hidden">
                <img src="/nakkun.png" alt="なっくん" className="h-10 w-10 sm:h-14 sm:w-14 object-contain" />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-gray-700 mb-1 sm:mb-2">こんにちは！なっくんです</h3>
              <p className="text-xs sm:text-sm text-gray-500 max-w-md">
                案件の状況確認、社内ナレッジの検索、スケジュールの確認など、何でも聞いてください。
              </p>
              <div className="flex flex-wrap gap-2 mt-4 sm:mt-6 max-w-lg justify-center">
                {['A案件の状況を教えて', '来週の予定は？', 'Slackで検索して'].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => sendMessage(suggestion)}
                    className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm rounded-full border border-primary/30 text-primary hover:bg-primary/5 transition-colors min-h-[36px]"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {!isLoading && !loadError && (
            <>
              {messages.map((msg) => (
                <React.Fragment key={msg.id}>
                  {/* User Question */}
                  <div className="flex gap-2 sm:gap-3 max-w-[88%] sm:max-w-2xl ml-auto flex-row-reverse">
                    <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-full bg-gray-200 flex items-center justify-center shrink-0 font-bold text-gray-600 text-xs sm:text-sm">
                      Me
                    </div>
                    <div className="p-3 sm:p-4 rounded-2xl rounded-tr-sm text-xs sm:text-sm shadow-sm bg-primary text-white break-words [overflow-wrap:anywhere] leading-relaxed">
                      {msg.question}
                    </div>
                  </div>

                  {/* Nakkun Answer */}
                  <div className="flex gap-2 sm:gap-3 max-w-[88%] sm:max-w-2xl">
                    <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
                      <img src="/nakkun.png" alt="なっくん" className="h-5 w-5 sm:h-6 sm:w-6 object-contain" />
                    </div>
                    <div className="p-3 sm:p-4 rounded-2xl rounded-tl-sm text-xs sm:text-sm shadow-sm bg-white border border-gray-100 break-words [overflow-wrap:anywhere] leading-relaxed text-gray-800">
                      {msg.answer}
                    </div>
                  </div>
                </React.Fragment>
              ))}

              {/* Pending message */}
              {pendingMessage && (
                <>
                  <div className="flex gap-2 sm:gap-3 max-w-[88%] sm:max-w-2xl ml-auto flex-row-reverse">
                    <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-full bg-gray-200 flex items-center justify-center shrink-0 font-bold text-gray-600 text-xs sm:text-sm">
                      Me
                    </div>
                    <div className="p-3 sm:p-4 rounded-2xl rounded-tr-sm text-xs sm:text-sm shadow-sm bg-primary text-white break-words [overflow-wrap:anywhere] leading-relaxed">
                      {pendingMessage.question}
                    </div>
                  </div>

                  {pendingMessage.status === 'sending' && (
                    <div className="flex gap-2 sm:gap-3 max-w-[88%] sm:max-w-2xl">
                      <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
                        <img src="/nakkun.png" alt="なっくん" className="h-5 w-5 sm:h-6 sm:w-6 object-contain" />
                      </div>
                      <div className="p-3 sm:p-4 rounded-2xl rounded-tl-sm text-xs sm:text-sm shadow-sm bg-white border border-gray-100 flex items-center gap-2 text-gray-400">
                        <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                        <span className="animate-pulse truncate">なっくんが考えています...</span>
                      </div>
                    </div>
                  )}

                  {pendingMessage.status === 'error' && (
                    <div className="flex gap-2 sm:gap-3 max-w-[88%] sm:max-w-2xl">
                      <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                        <AlertCircle className="h-4 w-4 text-red-500" />
                      </div>
                      <div className="p-3 sm:p-4 rounded-2xl rounded-tl-sm text-xs sm:text-sm shadow-sm bg-red-50 border border-red-200">
                        <p className="text-red-600 mb-2">{pendingMessage.errorDetail || '送信に失敗しました。'}</p>
                        <Button variant="outline" size="sm" onClick={retryMessage} className="gap-1.5 text-red-600 border-red-300 hover:bg-red-100 min-h-[36px]">
                          <RotateCcw className="h-3.5 w-3.5" /> 再送信
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

        {/* Input Area (Shrink-0) */}
        <div className="p-3 sm:p-4 bg-white border-t shrink-0 flex flex-col gap-1.5 z-10">
          <p className="text-[11px] sm:text-xs text-gray-400 text-center py-0.5 truncate">
            ※ なっくんは現在モック回答モードで動作しています
          </p>

          <form onSubmit={handleSubmit} className="flex gap-2 items-end">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="なっくんに質問…"
              rows={1}
              className="flex-1 rounded-2xl px-3.5 py-2.5 sm:px-4 sm:py-3 bg-gray-50 border border-gray-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all resize-none text-base md:text-sm leading-normal min-h-[44px] max-h-32 overflow-y-hidden"
              disabled={isSending}
              id="chat-input"
            />
            <Button
              type="submit"
              className="rounded-2xl sm:rounded-full w-11 h-11 sm:w-12 sm:h-12 p-0 flex items-center justify-center shrink-0 min-h-[44px] min-w-[44px]"
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
        </div>
      </Card>
    </div>
  );
}


