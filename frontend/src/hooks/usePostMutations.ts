import { useMutation, useQueryClient } from 'react-query';
import { postsAPI } from '../services/api';
import { useToast } from './use-toast';

export function usePostMutations() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const updatePostMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => postsAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      toast({
        title: 'Пост обновлен',
        description: 'Пост успешно обновлен',
      });
    },
  });

  const approvePostMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => postsAPI.approve(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      toast({
        title: 'Пост одобрен',
        description: 'Пост успешно одобрен',
      });
    },
  });

  const rejectPostMutation = useMutation({
    mutationFn: ({ id, admin_notes }: { id: number; admin_notes?: string }) => postsAPI.reject(id, admin_notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      toast({
        title: 'Пост отклонен',
        description: 'Пост успешно отклонен',
      });
    },
  });

  const publishPostMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => postsAPI.publish(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      toast({
        title: 'Пост опубликован',
        description: 'Пост успешно опубликован',
      });
    },
  });

  const schedulePostMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => postsAPI.schedule(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      toast({
        title: 'Пост запланирован',
        description: 'Пост успешно запланирован',
      });
    },
  });

  return {
    updatePost: updatePostMutation,
    approvePost: approvePostMutation,
    rejectPost: rejectPostMutation,
    publishPost: publishPostMutation,
    schedulePost: schedulePostMutation,
  };
}