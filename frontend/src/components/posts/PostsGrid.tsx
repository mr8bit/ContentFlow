import React from 'react';
import { PostCard } from './PostCard';
import { Post } from '@/types';

interface PostsGridProps {
  posts: Post[];
  onView: (post: Post) => void;
  onEdit: (post: Post) => void;
  onApprove: (post: Post) => void;
  onReject: (post: Post) => void;
  onPublish: (post: Post) => void;
  onSchedule: (post: Post) => void;
  onImageClick: (imageUrl: string) => void;
}

export function PostsGrid({
  posts,
  onView,
  onEdit,
  onApprove,
  onReject,
  onPublish,
  onSchedule,
  onImageClick,
}: PostsGridProps): JSX.Element {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
      {posts.map((post, index) => (
        <div
          key={post.id}
          className="animate-in fade-in-50 slide-in-from-bottom-4"
          style={{
            animationDelay: `${index * 100}ms`,
            animationDuration: '600ms',
            animationFillMode: 'both'
          }}
        >
          <PostCard
            post={post}
            onView={onView}
            onEdit={onEdit}
            onApprove={onApprove}
            onReject={onReject}
            onPublish={onPublish}
            onSchedule={onSchedule}
            onImageClick={onImageClick}
          />
        </div>
      ))}
    </div>
  );
}