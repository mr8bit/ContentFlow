import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { postsAPI } from '../services/api';
import { Button } from '../components/ui';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { PostContent } from '../components/posts/PostDialog/PostContent';
import { useToast } from '../hooks/use-toast';
import { Post } from '../types';

export const PostViewPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Fetch post data
  const { data: post, isLoading, error } = useQuery(
    ['post', id],
    () => postsAPI.getById(Number(id)).then(res => res.data),
    { enabled: !!id }
  );

  // Process post mutation
  const processPostMutation = useMutation({
    mutationFn: (postId: number) => postsAPI.process(postId),
    onMutate: () => {
      toast({
        title: 'Обработка поста',
        description: 'Пост отправлен на обработку ИИ...',
      });
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['post', id] });
      toast({
        title: 'Пост обработан',
        description: 'Пост успешно обработан с помощью ИИ',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Ошибка обработки',
        description: error.response?.data?.detail || 'Не удалось обработать пост',
        variant: 'destructive',
      });
    },
  });

  // Handlers
  const handleBack = () => {
    navigate('/posts');
  };

  const handleClose = () => {
    navigate('/posts');
  };

  const handleProcess = (post: Post) => {
    processPostMutation.mutate(post.id);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Загрузка поста...</span>
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-foreground">Пост не найден</h1>
          <p className="text-muted-foreground">Запрашиваемый пост не существует или был удален.</p>
          <Button onClick={handleBack} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Вернуться к постам
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={handleBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Назад к постам
        </Button>
        <h1 className="text-xl font-semibold text-foreground">Пост #{post.id}</h1>
      </div>
      
      {/* Content */}
      <div className="w-full">
        <PostContent post={post} onClose={handleClose} onProcess={handleProcess} />
      </div>
    </div>
  );
};