import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, Button, Textarea, Label } from '../ui';
import { Post } from '../../types';
import { useMutation, useQueryClient } from 'react-query';
import { postsAPI } from '../../services/api';
// import { toast } from 'sonner';

interface EditDialogProps {
  post: Post | null;
  onClose: () => void;
}

export function EditDialog({ post, onClose }: EditDialogProps): JSX.Element {
  const [text, setText] = useState('');
  const queryClient = useQueryClient();

  useEffect(() => {
    if (post) {
      setText(post.processed_text || post.original_text || '');
    }
  }, [post]);

  const updatePostMutation = useMutation({
    mutationFn: ({ id, text }: { id: number; text: string }) => postsAPI.update(id, { processed_text: text }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      // toast.success('Пост обновлен');
      onClose();
    },
    onError: (error: any) => {
      // toast.error(error.response?.data?.detail || 'Ошибка при обновлении поста');
    },
  });

  const handleSave = (): void => {
    if (!post) return;
    updatePostMutation.mutate({ id: post.id, text });
  };

  if (!post) return <></>;

  return (
    <Dialog open={!!post} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-md sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">Редактировать пост</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 sm:space-y-4">
          <div className="space-y-1 sm:space-y-2">
            <Label htmlFor="post-text" className="text-sm sm:text-base">Текст поста</Label>
            <Textarea
              id="post-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Введите текст поста..."
              className="min-h-24 sm:min-h-32 text-sm sm:text-base"
            />
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
            Отмена
          </Button>
          <Button 
            onClick={handleSave}
            disabled={updatePostMutation.isLoading}
            className="w-full sm:w-auto"
          >
            {updatePostMutation.isLoading ? 'Сохраняю...' : 'Сохранить'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}