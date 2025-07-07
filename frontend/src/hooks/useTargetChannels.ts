import { useQuery } from 'react-query';
import { targetChannelsAPI } from '../services/api';
import { TargetChannel } from '../types';

export function useTargetChannels() {
  return useQuery<TargetChannel[], Error>(
    ['target-channels'],
    () => targetChannelsAPI.getAll().then(res => res.data),
    {
      staleTime: 300000, // 5 minutes
    }
  );
}