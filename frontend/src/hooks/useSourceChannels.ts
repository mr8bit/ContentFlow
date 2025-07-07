import { useQuery } from 'react-query';
import { sourceChannelsAPI } from '../services/api';
import { SourceChannel } from '../types';

export function useSourceChannels(activeOnly: boolean = false) {
  return useQuery<SourceChannel[], Error>(
    ['source-channels', { active_only: activeOnly }],
    () => sourceChannelsAPI.getAll({ active_only: activeOnly }).then(res => res.data),
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchInterval: 10 * 60 * 1000, // 10 minutes
    }
  );
}