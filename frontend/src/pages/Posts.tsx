import React, { useState, useCallback } from 'react';
import { Post, TargetChannel } from '../types';
import {
  PostsHeader,
  PostsStats,
  PostsFilters,
  AdvancedPostsFilters,
  PostsGrid,
  EmptyState,
  LoadingSkeleton,
  ErrorAlert,
  FullscreenImageModal,
  PostDialog,
  EditDialog,
  ApproveDialog,
  ScheduleDialog,
} from '../components/posts';
import { useFilteredPostsAPI, usePostsStats, filterPostsByStatus, PostFilters } from '../hooks/useFilteredPostsAPI';
import { usePostMutations } from '../hooks/usePostMutations';
import { useTargetChannels } from '../hooks/useTargetChannels';
import { useSourceChannels } from '../hooks/useSourceChannels';
import { FilterParams } from '../components/posts/AdvancedPostsFilters';

// Types
interface DialogState {
  view: Post | null;
  edit: Post | null;
  approve: Post | null;
  schedule: Post | null;
}

const STATUS_FILTERS = ['all', 'pending', 'processed', 'approved', 'rejected', 'scheduled', 'published'] as const;
type StatusFilter = typeof STATUS_FILTERS[number];

const STATUS_LABELS: Record<StatusFilter, string> = {
  all: 'Все',
  pending: 'Ожидают',
  processed: 'Обработаны',
  approved: 'Одобрены',
  rejected: 'Отклонены',
  scheduled: 'Запланированы',
  published: 'Опубликованы',
};

export function Posts(): JSX.Element {
  const [selectedTab, setSelectedTab] = useState(0);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [advancedFilters, setAdvancedFilters] = useState<FilterParams>({});
  const [dialogs, setDialogs] = useState<DialogState>({
    view: null,
    edit: null,
    approve: null,
    schedule: null,
  });

  // Computed values
  const currentStatus = STATUS_FILTERS[selectedTab];
  const apiFilters: PostFilters = {
    status: currentStatus === 'all' ? undefined : currentStatus,
    ...advancedFilters,
  };

  // Hooks
  const { data: posts, error: postsError, isLoading: postsLoading, refetch: refetchPosts } = useFilteredPostsAPI(apiFilters);
  const { data: targetChannels, error: channelsError, isLoading: channelsLoading } = useTargetChannels();
  const { data: sourceChannels, error: sourceChannelsError, isLoading: sourceChannelsLoading } = useSourceChannels();
  const mutations = usePostMutations();

  // Computed values
  const stats = usePostsStats(posts as Post[] | undefined);
  const filteredPosts = filterPostsByStatus(posts as Post[] | undefined, currentStatus);

  // Event handlers
  const handleTabChange = useCallback((tabIndex: number) => {
    setSelectedTab(tabIndex);
  }, []);

  const handleViewPost = useCallback((post: Post) => {
    setDialogs(prev => ({ ...prev, view: post }));
  }, []);

  const handleEditPost = useCallback((post: Post) => {
    setDialogs(prev => ({ ...prev, edit: post }));
  }, []);

  const handleApprovePost = useCallback((post: Post) => {
    setDialogs(prev => ({ ...prev, approve: post }));
  }, []);

  const handleSchedulePost = useCallback((post: Post) => {
    setDialogs(prev => ({ ...prev, schedule: post }));
  }, []);

  const handleRejectPost = useCallback(async (post: Post) => {
    mutations.rejectPost.mutate({ id: post.id, admin_notes: '' });
  }, [mutations.rejectPost]);

  const handlePublishPost = useCallback(async (post: Post) => {
    const channels = targetChannels as TargetChannel[] || [];
    if (channels.length === 0) {
      return;
    }
    // Используем первый доступный канал или показываем диалог выбора
    mutations.publishPost.mutate({ id: post.id, data: { target_channel_id: channels[0].id } });
  }, [mutations.publishPost, targetChannels]);

  const handleImageClick = useCallback((imageUrl: string) => {
    setFullscreenImage(imageUrl);
  }, []);

  const closeDialog = useCallback((dialogType: keyof DialogState) => {
    setDialogs(prev => ({ ...prev, [dialogType]: null }));
  }, []);

  const closeFullscreenImage = useCallback(() => {
    setFullscreenImage(null);
  }, []);

  const handleAdvancedFiltersChange = useCallback((filters: FilterParams) => {
    setAdvancedFilters(filters);
  }, []);

  const handleClearAdvancedFilters = useCallback(() => {
    setAdvancedFilters({});
  }, []);









  // Loading state
  if (postsLoading || channelsLoading || sourceChannelsLoading) {
    return (
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 space-y-4 sm:space-y-6">
        <PostsHeader onRefresh={refetchPosts} />
        <LoadingSkeleton />
      </div>
    );
  }

  // Error state
  if (postsError || channelsError || sourceChannelsError) {
    return (
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
        <ErrorAlert error={(postsError || channelsError || sourceChannelsError) as Error} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 space-y-4 sm:space-y-8">
        <PostsHeader onRefresh={refetchPosts} />
        
        <div className="animate-in fade-in-50 duration-500">
          <PostsStats stats={stats} />
        </div>
        
        <div className="animate-in fade-in-50 duration-700">
          <PostsFilters
            statusFilters={STATUS_FILTERS}
            statusLabels={STATUS_LABELS}
            selectedTab={selectedTab}
            posts={posts as Post[] | undefined}
            onTabChange={handleTabChange}
          />
        </div>

        <div className="animate-in fade-in-50 duration-900">
          <AdvancedPostsFilters
            sourceChannels={sourceChannels as any[] || []}
            targetChannels={targetChannels as any[] || []}
            filters={advancedFilters}
            onFiltersChange={handleAdvancedFiltersChange}
            onClearFilters={handleClearAdvancedFilters}
          />
        </div>

        <div className="animate-in fade-in-50 duration-1000">
          {filteredPosts.length === 0 ? (
            <EmptyState message={`Нет постов со статусом "${STATUS_LABELS[currentStatus]}"`} />
          ) : (
            <div className="space-y-4 sm:space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <h2 className="text-lg sm:text-xl font-semibold text-foreground">
                    {STATUS_LABELS[currentStatus]}
                  </h2>
                  <span className="text-xs sm:text-sm text-muted-foreground">
                    ({filteredPosts.length} {filteredPosts.length === 1 ? 'пост' : 'постов'})
                  </span>
                </div>
              </div>
              
              <PostsGrid
                posts={filteredPosts}
                onView={handleViewPost}
                onEdit={handleEditPost}
                onApprove={handleApprovePost}
                onReject={handleRejectPost}
                onPublish={handlePublishPost}
                onSchedule={handleSchedulePost}
                onImageClick={handleImageClick}
              />
            </div>
          )}
        </div>
      </div>

      {/* Dialogs */}
      <PostDialog
        post={dialogs.view}
        onClose={() => closeDialog('view')}
      />

      <EditDialog
        post={dialogs.edit}
        onClose={() => closeDialog('edit')}
      />

      <ApproveDialog
        post={dialogs.approve}
        onClose={() => closeDialog('approve')}
      />

      <ScheduleDialog
        post={dialogs.schedule}
        targetChannels={targetChannels as TargetChannel[] || []}
        onClose={() => closeDialog('schedule')}
      />

      <FullscreenImageModal
        imageUrl={fullscreenImage}
        onClose={closeFullscreenImage}
      />
    </div>
  );
}

export default Posts;