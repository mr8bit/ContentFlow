import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from 'react-query';
import { postsAPI } from '../services/api';
import { Button } from '../components/ui';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { PostDialog } from '../components/posts';
import { Post } from '../types';

export default function PostView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const { data: post, isLoading, error } = useQuery(
    ['post', id],
    () => postsAPI.getById(parseInt(id!)),
    {
      enabled: !!id,
      retry: 1,
    }
  );

  const handleBack = () => {
    navigate('/posts');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Загрузка поста...</p>
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center">
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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
        {/* Header with back button */}
        <div className="mb-6">
          <Button 
            variant="outline" 
            onClick={handleBack}
            className="gap-2 mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Вернуться к постам
          </Button>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            Пост #{post.data.id}
          </h1>
        </div>

        {/* Post content in full-page view */}
        <div className="bg-card rounded-xl border shadow-sm">
          <PostDialog 
            post={post.data as Post} 
            onClose={() => {}} 
            isFullPage={true}
          />
        </div>
      </div>
    </div>
  );
}