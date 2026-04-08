import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getGetAnthropicConversationQueryKey } from '@workspace/api-client-react';
import { toast } from 'sonner';

const PLATFORM_LABELS: Record<string, string> = {
  meta: 'Facebook / Instagram',
  linkedin: 'LinkedIn',
  twitter: 'Twitter / X',
  tiktok: 'TikTok',
};

export function useChatStream(conversationId: number | null) {
  const [streamingMessage, setStreamingMessage] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [savedPostCount, setSavedPostCount] = useState(0);
  const queryClient = useQueryClient();

  const sendMessage = useCallback(async (content: string) => {
    if (!conversationId) return;
    
    setIsStreaming(true);
    setStreamingMessage('');
    setSavedPostCount(0);

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
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        // Keep the last (potentially incomplete) line in the buffer
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (line.trim() === '') continue;
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.done) break;

              if (data.content) {
                setStreamingMessage((prev) => prev + data.content);
              }

              // SOSHI tool: social post saved to the queue
              if (data.socialPostSaved) {
                const post = data.socialPostSaved;
                const platformLabel = PLATFORM_LABELS[post.platform] ?? post.platform;
                const label = post.topic ? `"${post.topic}"` : 'post';
                setSavedPostCount(prev => prev + 1);
                toast.success(`Post saved to Social Queue`, {
                  description: `${label} — ${platformLabel}`,
                  action: {
                    label: 'View Queue',
                    onClick: () => { window.location.href = '/social'; },
                  },
                  duration: 6000,
                });
              }

              // SOSHI tool: PIXEL handoff created
              if (data.pixelHandoff) {
                const { conversationId } = data.pixelHandoff;
                toast.success(`PIXEL has your visual brief`, {
                  description: 'A new PIXEL conversation is ready with the full brief loaded.',
                  action: {
                    label: 'Open PIXEL',
                    onClick: () => { window.location.href = `/agents?agent=pixel&conv=${conversationId}`; },
                  },
                  duration: 10000,
                });
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

  return { sendMessage, streamingMessage, isStreaming, savedPostCount };
}
