import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getGetAnthropicConversationQueryKey } from '@workspace/api-client-react';

export function useChatStream(conversationId: number | null) {
  const [streamingMessage, setStreamingMessage] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const queryClient = useQueryClient();

  const sendMessage = useCallback(async (content: string) => {
    if (!conversationId) return;
    
    setIsStreaming(true);
    setStreamingMessage('');

    try {
      const response = await fetch(`/api/anthropic/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      });

      if (!response.ok) throw new Error('Failed to send message');
      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.trim() === '') continue;
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.done) break;
              if (data.content) {
                setStreamingMessage((prev) => prev + data.content);
              }
            } catch (e) {
              // Ignore parse errors for incomplete chunks in SSE
            }
          }
        }
      }
    } catch (error) {
      console.error("Streaming error:", error);
    } finally {
      setIsStreaming(false);
      // Invalidate to fetch the final saved messages from DB
      queryClient.invalidateQueries({
        queryKey: getGetAnthropicConversationQueryKey(conversationId)
      });
      setStreamingMessage('');
    }
  }, [conversationId, queryClient]);

  return { sendMessage, streamingMessage, isStreaming };
}
