import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../ui/dialog';
import { PostDialogProps } from './types';
import { PostContent } from './PostContent';

export const PostDialog = React.memo<PostDialogProps>(({ post, onClose, isFullPage = false, onProcess }) => {
  if (!post) {
    return null;
  }

  // Если это полная страница, возвращаем только контент
  if (isFullPage) {
    return <PostContent post={post} onClose={onClose} onProcess={onProcess} />;
  }

  // Иначе возвращаем диалог

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-full h-[90vh] flex flex-col p-0 gap-0">
        <PostContent post={post} onClose={onClose} onProcess={onProcess} />
      </DialogContent>
    </Dialog>
  );
});

PostDialog.displayName = 'PostDialog';