import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from 'react-query';
import { postsAPI } from '../services/api';
import { Button } from '../components/ui';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { PostContent } from '../components/posts/PostDialog/PostContent';

export const PostViewPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  // Fetch post data
  const { data: post, isLoading, error } = useQuery(
    ['post', id],
    () => postsAPI.getById(Number(id)).then(res => res.data),
    { enabled: !!id }
  );

  // Handlers
  const handleBack = () => {
    navigate('/posts');
  };

  const handleClose = () => {
    navigate('/posts');
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
        <PostContent post={post} onClose={handleClose} />
      </div>
    </div>
  );
};