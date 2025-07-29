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

export function usePostsCount(filters: Omit<PostFilters, 'skip' | 'limit'>) {
  return useQuery<number, Error>(
    ['posts-count', filters],
    () => postsAPI.getCount(filters).then(res => res.data.count),
    {
      staleTime: 30000, // 30 seconds
      refetchInterval: 60000, // 1 minute
      keepPreviousData: true,
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

// Hook for getting real statistics from API
export function usePostsStatsAPI(filters: Omit<PostFilters, 'skip' | 'limit' | 'status'> = {}) {
  // Get count for each status using separate hooks
  const pendingQuery = useQuery<number, Error>(
    ['posts-count', { ...filters, status: 'pending' }],
    () => postsAPI.getCount({ ...filters, status: 'pending' }).then(res => res.data.count),
    {
      staleTime: 30000, // 30 seconds
      refetchInterval: 60000, // 1 minute
      keepPreviousData: true,
    }
  );

  const processedQuery = useQuery<number, Error>(
    ['posts-count', { ...filters, status: 'processed' }],
    () => postsAPI.getCount({ ...filters, status: 'processed' }).then(res => res.data.count),
    {
      staleTime: 30000, // 30 seconds
      refetchInterval: 60000, // 1 minute
      keepPreviousData: true,
    }
  );

  const approvedQuery = useQuery<number, Error>(
    ['posts-count', { ...filters, status: 'approved' }],
    () => postsAPI.getCount({ ...filters, status: 'approved' }).then(res => res.data.count),
    {
      staleTime: 30000, // 30 seconds
      refetchInterval: 60000, // 1 minute
      keepPreviousData: true,
    }
  );

  const rejectedQuery = useQuery<number, Error>(
    ['posts-count', { ...filters, status: 'rejected' }],
    () => postsAPI.getCount({ ...filters, status: 'rejected' }).then(res => res.data.count),
    {
      staleTime: 30000, // 30 seconds
      refetchInterval: 60000, // 1 minute
      keepPreviousData: true,
    }
  );

  const scheduledQuery = useQuery<number, Error>(
    ['posts-count', { ...filters, status: 'scheduled' }],
    () => postsAPI.getCount({ ...filters, status: 'scheduled' }).then(res => res.data.count),
    {
      staleTime: 30000, // 30 seconds
      refetchInterval: 60000, // 1 minute
      keepPreviousData: true,
    }
  );

  const publishedQuery = useQuery<number, Error>(
    ['posts-count', { ...filters, status: 'published' }],
    () => postsAPI.getCount({ ...filters, status: 'published' }).then(res => res.data.count),
    {
      staleTime: 30000, // 30 seconds
      refetchInterval: 60000, // 1 minute
      keepPreviousData: true,
    }
  );

  // Get total count
  const totalQuery = useQuery<number, Error>(
    ['posts-count', filters],
    () => postsAPI.getCount(filters).then(res => res.data.count),
    {
      staleTime: 30000, // 30 seconds
      refetchInterval: 60000, // 1 minute
      keepPreviousData: true,
    }
  );

  const isLoading = pendingQuery.isLoading || processedQuery.isLoading || approvedQuery.isLoading || 
                   rejectedQuery.isLoading || scheduledQuery.isLoading || publishedQuery.isLoading || 
                   totalQuery.isLoading;
  
  const error = pendingQuery.error || processedQuery.error || approvedQuery.error || 
               rejectedQuery.error || scheduledQuery.error || publishedQuery.error || 
               totalQuery.error;

  const stats = {
    total: totalQuery.data || 0,
    pending: pendingQuery.data || 0,
    processed: processedQuery.data || 0,
    approved: approvedQuery.data || 0,
    rejected: rejectedQuery.data || 0,
    scheduled: scheduledQuery.data || 0,
    published: publishedQuery.data || 0,
  };

  return {
    stats,
    isLoading,
    error,
    refetch: () => {
      pendingQuery.refetch();
      processedQuery.refetch();
      approvedQuery.refetch();
      rejectedQuery.refetch();
      scheduledQuery.refetch();
      publishedQuery.refetch();
      totalQuery.refetch();
    }
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