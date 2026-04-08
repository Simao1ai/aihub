import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getGetAnthropicConversationQueryKey } from '@workspace/api-client-react';
import { toast } from 'sonner';
import { useAppStore } from '@/store';

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
  const addNotification = useAppStore(s => s.addNotification);

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

              // ── Social post saved to the queue ───────────────────────────
              if (data.socialPostSaved) {
                const post = data.socialPostSaved;
                const platformLabel = PLATFORM_LABELS[post.platform] ?? post.platform;
                const label = post.topic ? `"${post.topic}"` : 'post';
                setSavedPostCount(prev => prev + 1);

                const href = '/social';
                toast.success('Post saved to Social Queue', {
                  description: `${label} — ${platformLabel}`,
                  action: { label: 'View Queue', onClick: () => { window.location.href = href; } },
                  duration: 6000,
                });
                addNotification({
                  type: 'socialPost',
                  icon: '📱',
                  title: 'Post saved to Social Queue',
                  body: `${label} — ${platformLabel}. Review and publish with one click.`,
                  action: { label: 'View Queue', href },
                });
              }

              // ── Universal agent handoff ───────────────────────────────────
              if (data.agentHandoff) {
                const { conversationId: convId, agentSlug, agentName, agentIcon } = data.agentHandoff;
                const href = `/agents?agent=${agentSlug}&conv=${convId}`;

                toast.success(`${agentIcon} ${agentName} has your brief`, {
                  description: `A new ${agentName} conversation is ready with full context loaded.`,
                  action: { label: `Open ${agentName}`, onClick: () => { window.location.href = href; } },
                  duration: 10000,
                });
                addNotification({
                  type: 'agentHandoff',
                  icon: agentIcon,
                  title: `${agentName} has your brief`,
                  body: `A conversation was started for ${agentName} with full context from this chat.`,
                  action: { label: `Open ${agentName}`, href },
                });
              }
            } catch {
              // Ignore parse errors for incomplete SSE chunks
            }
          }
        }
      }
    } catch (error) {
      console.error('Streaming error:', error);
    } finally {
      setIsStreaming(false);
      queryClient.invalidateQueries({
        queryKey: getGetAnthropicConversationQueryKey(conversationId)
      });
      setStreamingMessage('');
    }
  }, [conversationId, queryClient, addNotification]);

  return { sendMessage, streamingMessage, isStreaming, savedPostCount };
}
