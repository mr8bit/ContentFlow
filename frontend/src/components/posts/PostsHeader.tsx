import React from 'react';
import { Button, Badge } from '../ui';
import { RefreshCw as RefreshIcon, Plus, BarChart3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface PostsHeaderProps {
  onRefresh: () => void;
}

export function PostsHeader({ onRefresh }: PostsHeaderProps): JSX.Element {
  const navigate = useNavigate();

  const handleCreatePost = () => {
    navigate('/posts/create');
  };
  return (
    <div className="relative">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-secondary/5 rounded-2xl -z-10" />
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-6 p-3 sm:p-6">
        <div className="space-y-1 sm:space-y-2">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 bg-primary/10 rounded-lg">
              <BarChart3 className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl sm:text-3xl font-bold bg-gradient-to-r from-primary via-primary/80 to-secondary bg-clip-text text-transparent">
                Управление постами
              </h1>
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mt-0.5 sm:mt-1">
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Модерируйте и публикуйте контент из источников
                </p>
                <Badge variant="secondary" className="text-xs w-fit">
                  Beta
                </Badge>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-1 sm:gap-2 w-full sm:w-auto">
          <Button variant="outline" size="icon" onClick={onRefresh} className="hover:bg-primary/10 h-7 w-7 sm:h-8 sm:w-8">
            <RefreshIcon className="h-3 w-3 sm:h-4 sm:w-4" />
          </Button>
          
          <Button size="sm" onClick={handleCreatePost} className="gap-1 sm:gap-2 bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-xs sm:text-sm h-7 sm:h-8 flex-1 sm:flex-none">
            <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="sm:inline">Создать</span>
          </Button>
        </div>
      </div>
    </div>
  );
}