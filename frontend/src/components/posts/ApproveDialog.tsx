import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, Button } from '../ui';
import { Post } from '../../types';
import { useMutation, useQueryClient } from 'react-query';
import { postsAPI } from '../../services/api';
// import { toast } from 'sonner';

interface ApproveDialogProps {
  post: Post | null;
  onClose: () => void;
}

export function ApproveDialog({ post, onClose }: ApproveDialogProps): JSX.Element {
  const queryClient = useQueryClient();

  const approvePostMutation = useMutation({
    mutationFn: (id: number) => postsAPI.approve(id, { target_channel_id: post?.target_channel_id || 1 }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      // toast.success('Пост одобрен');
      onClose();
    },
    onError: (error: any) => {
      // toast.error(error.response?.data?.detail || 'Ошибка при одобрении поста');
    },
  });

  const handleApprove = (): void => {
    if (!post) return;
    approvePostMutation.mutate(post.id);
  };

  if (!post) return <></>;

  return (
    <Dialog open={!!post} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-md sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">Одобрить пост</DialogTitle>
          <DialogDescription className="text-sm sm:text-base">
            Вы уверены, что хотите одобрить этот пост? После одобрения пост можно будет опубликовать или запланировать.
          </DialogDescription>
        </DialogHeader>

        {(post.processed_text || post.original_text) && (
          <div className="p-3 sm:p-4 bg-muted rounded-lg max-h-24 sm:max-h-32 overflow-y-auto">
            <p className="text-xs sm:text-sm whitespace-pre-wrap">{post.processed_text || post.original_text}</p>
          </div>
        )}

        <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
            Отмена
          </Button>
          <Button 
            onClick={handleApprove}
            disabled={approvePostMutation.isLoading}
            className="w-full sm:w-auto"
          >
            {approvePostMutation.isLoading ? 'Одобряю...' : 'Одобрить'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}