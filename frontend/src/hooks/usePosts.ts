import { useQuery } from 'react-query';
import { postsAPI } from '../services/api';
import { Post } from '../types';

export function usePosts() {
  return useQuery<Post[], Error>(
    ['posts'],
    () => postsAPI.getAll().then(res => res.data),
    {
      staleTime: 30000, // 30 seconds
      refetchInterval: 60000, // 1 minute
    }
  );
}

export function usePostsStats(posts: Post[] | undefined) {
  if (!posts) {
    return {
      total: 0,
      pending: 0,
      processed: 0,
      approved: 0,
      scheduled: 0,
      published: 0,
    };
  }

  return {
    total: posts.length,
    pending: posts.filter(p => p.status === 'pending').length,
    processed: posts.filter(p => p.status === 'processed').length,
    approved: posts.filter(p => p.status === 'approved').length,
    scheduled: posts.filter(p => p.status === 'scheduled').length,
    published: posts.filter(p => p.status === 'published').length,
  };
}

export function useFilteredPosts(posts: Post[] | undefined, statusFilter: string) {
  if (!posts) return [];
  
  if (statusFilter === 'all') {
    return posts;
  }
  
  return posts.filter(post => post.status === statusFilter);
}