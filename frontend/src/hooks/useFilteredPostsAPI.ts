import { useQuery } from 'react-query';
import { postsAPI } from '../services/api';
import { Post } from '../types';

export interface PostFilters {
  skip?: number;
  limit?: number;
  status?: string;
  source_channel_id?: number;
  target_channel_id?: number;
  date_from?: string;
  date_to?: string;
  is_manual?: boolean;
}

export function useFilteredPostsAPI(filters: PostFilters) {
  return useQuery<Post[], Error>(
    ['posts', filters],
    () => postsAPI.getAll(filters).then(res => res.data),
    {
      staleTime: 30000, // 30 seconds
      refetchInterval: 60000, // 1 minute
      keepPreviousData: true, // Keep previous data while loading new data
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
      rejected: 0,
      scheduled: 0,
      published: 0,
    };
  }

  return {
    total: posts.length,
    pending: posts.filter(p => p.status === 'pending').length,
    processed: posts.filter(p => p.status === 'processed').length,
    approved: posts.filter(p => p.status === 'approved').length,
    rejected: posts.filter(p => p.status === 'rejected').length,
    scheduled: posts.filter(p => p.status === 'scheduled').length,
    published: posts.filter(p => p.status === 'published').length,
  };
}

// Helper function to filter posts by status on the client side
export function filterPostsByStatus(posts: Post[] | undefined, statusFilter: string) {
  if (!posts) return [];
  
  if (statusFilter === 'all') {
    return posts;
  }
  
  return posts.filter(post => post.status === statusFilter);
}