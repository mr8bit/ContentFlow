import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from 'react-query';
import { postsAPI } from '../../../services/api';
import { Post } from '../../../types';

export function usePostDialog(post: Post | null, onClose: () => void) {
  const [improvedText, setImprovedText] = useState('');
  const [isImproving, setIsImproving] = useState(false);
  const [fullscreenMedia, setFullscreenMedia] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const improveTextMutation = useMutation({
    mutationFn: (text: string) => postsAPI.improveText(text),
    onSuccess: (data: any) => {
      setImprovedText(data.improved_text);
      // toast.success('Текст улучшен');
    },
    onError: (error: any) => {
      // toast.error(error.response?.data?.detail || 'Ошибка при улучшении текста');
    },
    onSettled: () => {
      setIsImproving(false);
    },
  });

  const updatePostMutation = useMutation({
    mutationFn: ({ id, text }: { id: number; text: string }) => 
      postsAPI.update(id, { processed_text: text }),
    onSuccess: () => {
      // toast.success('Пост обновлен');
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      onClose();
    },
    onError: (error: any) => {
      // toast.error(error.response?.data?.detail || 'Ошибка при обновлении поста');
    },
  });

  const updateOriginalTextMutation = useMutation({
    mutationFn: ({ id, original_text }: { id: number; original_text: string }) => 
      postsAPI.update(id, { original_text }),
    onSuccess: () => {
      // toast.success('Оригинальный текст обновлен');
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
    onError: (error: any) => {
      // toast.error(error.response?.data?.detail || 'Ошибка при обновлении оригинального текста');
    },
  });

  const handleImproveText = useCallback((): void => {
    const textToImprove = post?.processed_text || post?.original_text;
    if (!textToImprove) return;
    setIsImproving(true);
    improveTextMutation.mutate(textToImprove);
  }, [post, improveTextMutation]);

  const handleSaveImprovedText = useCallback((): void => {
    if (!post || !improvedText) return;
    updatePostMutation.mutate({ id: post.id, text: improvedText });
  }, [post, improvedText, updatePostMutation]);

  const handleMediaClick = useCallback((url: string) => {
    setFullscreenMedia(url);
  }, []);

  const handleCloseFullscreen = useCallback(() => {
    setFullscreenMedia(null);
  }, []);

  const handleCancelImprovement = useCallback(() => {
    setImprovedText('');
  }, []);

  return {
    improvedText,
    setImprovedText,
    isImproving,
    fullscreenMedia,
    handleImproveText,
    handleSaveImprovedText,
    handleMediaClick,
    handleCloseFullscreen,
    handleCancelImprovement,
    updatePostMutation,
    updateOriginalTextMutation,
  };
}