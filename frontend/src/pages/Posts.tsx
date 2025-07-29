import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQueryClient } from 'react-query';
import { Post, TargetChannel } from '../types';
import {
  PostsHeader,
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
  Pagination
} from '../components/posts';
import { useFilteredPostsAPI, usePostsCount, PostFilters } from '../hooks/useFilteredPostsAPI';
import { usePostMutations } from '../hooks/usePostMutations';
import { useTargetChannels } from '../hooks/useTargetChannels';
import { useSourceChannels } from '../hooks/useSourceChannels';
import { FilterParams } from '../components/posts/AdvancedPostsFilters';
import { postsAPI } from '../services/api';
import { useToast } from '../hooks/use-toast';

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
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Helper functions for URL params
  const getTabFromUrl = useCallback((): number => {
    const status = searchParams.get('status');
    if (status) {
      const index = STATUS_FILTERS.indexOf(status as StatusFilter);
      return index >= 0 ? index : 0;
    }
    return 0;
  }, [searchParams]);

  const getPageFromUrl = useCallback((): number => {
    const page = searchParams.get('page');
    return page ? parseInt(page, 10) : 1;
  }, [searchParams]);

  const getAdvancedFiltersFromUrl = useCallback((): FilterParams => {
    const filters: FilterParams = {};
    
    const sourceChannelId = searchParams.get('source_channel_id');
    if (sourceChannelId) filters.source_channel_id = parseInt(sourceChannelId, 10);
    
    const targetChannelId = searchParams.get('target_channel_id');
    if (targetChannelId) filters.target_channel_id = parseInt(targetChannelId, 10);
    
    const dateFrom = searchParams.get('date_from');
    if (dateFrom) filters.date_from = dateFrom;
    
    const dateTo = searchParams.get('date_to');
    if (dateTo) filters.date_to = dateTo;
    
    const isManual = searchParams.get('is_manual');
    if (isManual !== null) filters.is_manual = isManual === 'true';
    
    return filters;
  }, [searchParams]);

  const updateUrlParams = useCallback((updates: Record<string, string | number | boolean | null>) => {
    const newParams = new URLSearchParams(searchParams);
    
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === undefined || value === '') {
        newParams.delete(key);
      } else {
        newParams.set(key, String(value));
      }
    });
    
    setSearchParams(newParams);
  }, [searchParams, setSearchParams]);

  // Initialize state from URL
  const [selectedTab, setSelectedTab] = useState(getTabFromUrl());
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [advancedFilters, setAdvancedFilters] = useState<FilterParams>(getAdvancedFiltersFromUrl());
  const [currentPage, setCurrentPage] = useState(getPageFromUrl());
  const [pageSize] = useState(20); // Posts per page
  const [dialogs, setDialogs] = useState<DialogState>({
    view: null,
    edit: null,
    approve: null,
    schedule: null
  });

  // Sync state with URL on mount and URL changes
  useEffect(() => {
    setSelectedTab(getTabFromUrl());
    setCurrentPage(getPageFromUrl());
    setAdvancedFilters(getAdvancedFiltersFromUrl());
  }, [getTabFromUrl, getPageFromUrl, getAdvancedFiltersFromUrl]);

  // Helper function to get status from tab
  const getStatusFromTab = (tabIndex: number): StatusFilter => {
    return STATUS_FILTERS[tabIndex];
  };

  // Computed values
  const currentStatus = STATUS_FILTERS[selectedTab];

  // Build filters for API call
  const apiFilters: PostFilters = useMemo(() => {
    const filters: PostFilters = {
      skip: (currentPage - 1) * pageSize,
      limit: pageSize,
    };

    // Add status filter from tab
    const statusFilter = getStatusFromTab(selectedTab);
    if (statusFilter !== 'all') {
      filters.status = statusFilter;
    }

    // Add advanced filters
    if (advancedFilters.source_channel_id) {
      filters.source_channel_id = advancedFilters.source_channel_id;
    }
    if (advancedFilters.target_channel_id) {
      filters.target_channel_id = advancedFilters.target_channel_id;
    }
    if (advancedFilters.date_from) {
      filters.date_from = advancedFilters.date_from;
    }
    if (advancedFilters.date_to) {
      filters.date_to = advancedFilters.date_to;
    }
    if (advancedFilters.is_manual !== undefined) {
      filters.is_manual = advancedFilters.is_manual;
    }

    return filters;
  }, [selectedTab, currentPage, pageSize, advancedFilters]);

  // Build count filters (same as apiFilters but without skip/limit)
  const countFilters = useMemo(() => {
    const filters: Omit<PostFilters, 'skip' | 'limit'> = {};

    // Add status filter from tab
    const statusFilter = getStatusFromTab(selectedTab);
    if (statusFilter !== 'all') {
      filters.status = statusFilter;
    }

    // Add advanced filters
    if (advancedFilters.source_channel_id) {
      filters.source_channel_id = advancedFilters.source_channel_id;
    }
    if (advancedFilters.target_channel_id) {
      filters.target_channel_id = advancedFilters.target_channel_id;
    }
    if (advancedFilters.date_from) {
      filters.date_from = advancedFilters.date_from;
    }
    if (advancedFilters.date_to) {
      filters.date_to = advancedFilters.date_to;
    }
    if (advancedFilters.is_manual !== undefined) {
      filters.is_manual = advancedFilters.is_manual;
    }

    return filters;
  }, [selectedTab, advancedFilters]);

  // Hooks
  const { data: posts, error: postsError, isLoading: postsLoading, refetch: refetchPosts } = useFilteredPostsAPI(apiFilters);
  const { data: totalCount, error: countError, isLoading: countLoading } = usePostsCount(countFilters);
  const { data: targetChannels, error: channelsError, isLoading: channelsLoading } = useTargetChannels();
  const { data: sourceChannels, error: sourceChannelsError, isLoading: sourceChannelsLoading } = useSourceChannels();
  const mutations = usePostMutations();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Process post mutation
  const processPostMutation = useMutation(
    (post: Post) => postsAPI.process(post.id),
    {
      onMutate: (post: Post) => {
        toast({
          title: "Обработка поста",
          description: `Начинаем обработку поста #${post.id}...`,
        });
      },
      onSuccess: (data, post: Post) => {
        toast({
          title: "Пост обработан",
          description: `Пост #${post.id} успешно обработан с помощью ИИ.`,
        });
        queryClient.invalidateQueries(['posts']);
        queryClient.invalidateQueries(['post', post.id]);
      },
      onError: (error: any, post: Post) => {
        toast({
          title: "Ошибка обработки",
          description: `Не удалось обработать пост #${post.id}: ${error.message || 'Неизвестная ошибка'}`,
          variant: "destructive",
        });
      },
    }
  );

  // Computed values
  const totalPages = Math.ceil((totalCount || 0) / pageSize);

  // Event handlers
  const handleTabChange = useCallback((tabIndex: number) => {
    const newStatus = STATUS_FILTERS[tabIndex];
    updateUrlParams({
      status: newStatus === 'all' ? null : newStatus,
      page: null // Reset page when changing tabs
    });
  }, [updateUrlParams]);

  const handlePageChange = useCallback((page: number) => {
    updateUrlParams({ page: page === 1 ? null : page });
  }, [updateUrlParams]);

  const handleAdvancedFiltersChange = useCallback((filters: FilterParams) => {
    updateUrlParams({
      source_channel_id: filters.source_channel_id || null,
      target_channel_id: filters.target_channel_id || null,
      date_from: filters.date_from || null,
      date_to: filters.date_to || null,
      is_manual: filters.is_manual !== undefined ? filters.is_manual : null,
      page: null // Reset page when changing filters
    });
  }, [updateUrlParams]);

  const handleClearAdvancedFilters = useCallback(() => {
    updateUrlParams({
      source_channel_id: null,
      target_channel_id: null,
      date_from: null,
      date_to: null,
      is_manual: null,
      page: null
    });
  }, [updateUrlParams]);

  const handleViewPost = useCallback((post: Post) => {
    navigate(`/posts/${post.id}`);
  }, [navigate]);

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

  const handleProcessPost = useCallback((post: Post) => {
    processPostMutation.mutate(post);
  }, [processPostMutation]);

  const handleImageClick = useCallback((imageUrl: string) => {
    setFullscreenImage(imageUrl);
  }, []);

  const closeDialog = useCallback((dialogType: keyof DialogState) => {
    setDialogs(prev => ({ ...prev, [dialogType]: null }));
  }, []);

  const closeFullscreenImage = useCallback(() => {
    setFullscreenImage(null);
  }, []);

  const handleRefresh = useCallback(async () => {
    toast({
      title: "Обновление постов",
      description: "Загружаем актуальные данные...",
    });
    
    try {
      await refetchPosts();
      toast({
        title: "Посты обновлены",
        description: "Данные успешно загружены",
      });
    } catch (error) {
      toast({
        title: "Ошибка обновления",
        description: "Не удалось загрузить данные",
        variant: "destructive",
      });
    }
  }, [refetchPosts, toast]);

  // Loading state
  if (postsLoading || countLoading || channelsLoading || sourceChannelsLoading) {
    return (
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 space-y-4 sm:space-y-6">
        <PostsHeader onRefresh={handleRefresh} />
        <LoadingSkeleton />
      </div>
    );
  }

  // Error state
  if (postsError || countError || channelsError || sourceChannelsError) {
    return (
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
        <ErrorAlert error={(postsError || countError || channelsError || sourceChannelsError) as Error} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 space-y-4 sm:space-y-8">
        <PostsHeader onRefresh={handleRefresh} />
        

        <div className="animate-in fade-in-50 duration-700">
          <PostsFilters
            statusFilters={STATUS_FILTERS}
            statusLabels={STATUS_LABELS}
            selectedTab={selectedTab}
            posts={posts as Post[] | undefined}
            onTabChange={handleTabChange}
            advancedFilters={advancedFilters}
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
          {!posts || posts.length === 0 ? (
            <EmptyState message={`Нет постов со статусом "${STATUS_LABELS[currentStatus]}"`} />
          ) : (
            <div className="space-y-4 sm:space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <h2 className="text-lg sm:text-xl font-semibold text-foreground">
                    {STATUS_LABELS[currentStatus]}
                  </h2>
                  <span className="text-xs sm:text-sm text-muted-foreground">
                    ({totalCount || 0} {(totalCount || 0) === 1 ? 'пост' : 'постов'})
                  </span>
                </div>
              </div>
              
              <PostsGrid
                posts={posts}
                onView={handleViewPost}
                onEdit={handleEditPost}
                onApprove={handleApprovePost}
                onReject={handleRejectPost}
                onPublish={handlePublishPost}
                onSchedule={handleSchedulePost}
                onProcess={handleProcessPost}
                onImageClick={handleImageClick}
              />

              {totalPages > 1 && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                  itemsPerPage={pageSize}
                  totalItems={totalCount || 0}
                />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Dialogs */}
      <PostDialog
        post={dialogs.view}
        onClose={() => closeDialog('view')}
        onProcess={handleProcessPost}
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