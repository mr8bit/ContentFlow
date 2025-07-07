import React from 'react';
import { Card, CardContent, Skeleton } from '../ui';

export function LoadingSkeleton(): JSX.Element {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
      {Array.from({ length: 8 }).map((_, index) => (
        <Card key={index} className="overflow-hidden">
          <CardContent className="p-0">
            <Skeleton className="w-full h-40 sm:h-48" />
            <div className="p-3 sm:p-4 space-y-2 sm:space-y-3">
              <div className="flex items-center justify-between">
                <Skeleton className="h-5 sm:h-6 w-16 sm:w-20" />
                <Skeleton className="h-5 sm:h-6 w-5 sm:w-6 rounded" />
              </div>
              <Skeleton className="h-3 sm:h-4 w-full" />
              <Skeleton className="h-3 sm:h-4 w-3/4" />
              <div className="space-y-1 sm:space-y-2">
                <div className="flex justify-between">
                  <Skeleton className="h-2 sm:h-3 w-12 sm:w-16" />
                  <Skeleton className="h-2 sm:h-3 w-20 sm:w-24" />
                </div>
                <div className="flex justify-between">
                  <Skeleton className="h-2 sm:h-3 w-16 sm:w-20" />
                  <Skeleton className="h-2 sm:h-3 w-12 sm:w-16" />
                </div>
              </div>
              <div className="flex gap-1 sm:gap-2 pt-1 sm:pt-2">
                <Skeleton className="h-7 sm:h-8 flex-1" />
                <Skeleton className="h-7 sm:h-8 flex-1" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}