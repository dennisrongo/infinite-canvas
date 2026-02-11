'use client';

import React from 'react';

interface SkeletonLoaderProps {
  /**
   * Number of skeleton items to show
   * @default 3
   */
  count?: number;

  /**
   * Height of each skeleton item
   * @default "h-4"
   */
  height?: string;

  /**
   * Width of skeleton items (can be an array for varying widths)
   * @default "w-full"
   */
  width?: string | string[];

  /**
   * Additional CSS classes
   */
  className?: string;

  /**
   * Whether to animate pulse
   * @default true
   */
  animate?: boolean;
}

/**
 * SkeletonLoader - Loading placeholder for content
 *
 * Provides visual feedback during data fetching with a pulsing animation.
 * Meets WCAG accessibility requirements and provides consistent loading states.
 *
 * @example
 * <SkeletonLoader count={3} />
 * @example
 * <SkeletonLoader count={5} height="h-12" width={["w-full", "w-3/4", "w-1/2"]} />
 */
export default function SkeletonLoader({
  count = 3,
  height = 'h-4',
  width = 'w-full',
  className = '',
  animate = true,
}: SkeletonLoaderProps) {
  const widths = Array.isArray(width) ? width : Array(count).fill(width);

  return (
    <div className={`space-y-3 ${className}`} aria-live="polite" aria-busy="true">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className={`
            bg-gray-200 dark:bg-gray-700 rounded
            ${animate ? 'animate-pulse' : ''}
            ${height}
            ${widths[index % widths.length]}
          `}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}

/**
 * CardSkeleton - Skeleton for card-based layouts
 */
export function CardSkeleton({
  count = 3,
}: {
  count?: number;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="bg-white dark:bg-dark-note border border-light-note-border dark:border-dark-note-border rounded-lg p-4 space-y-3"
          aria-hidden="true"
        >
          {/* Title skeleton */}
          <div className="h-5 w-3/4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          {/* Content skeleton */}
          <div className="space-y-2">
            <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            <div className="h-4 w-5/6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          </div>
          {/* Action button skeleton */}
          <div className="h-8 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        </div>
      ))}
    </div>
  );
}

/**
 * ListSkeleton - Skeleton for list-based layouts
 */
export function ListSkeleton({
  count = 5,
  hasIcon = true,
}: {
  count?: number;
  hasIcon?: boolean;
}) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="flex items-center gap-3 p-3 bg-white dark:bg-dark-note border border-light-note-border dark:border-dark-note-border rounded"
          aria-hidden="true"
        >
          {hasIcon && (
            <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse flex-shrink-0" />
          )}
          <div className="flex-1 space-y-2">
            <div className="h-4 w-1/3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            <div className="h-3 w-2/3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * TextSkeleton - Skeleton for text content
 */
export function TextSkeleton({
  lines = 3,
  className = '',
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={`space-y-2 ${className}`} aria-live="polite" aria-busy="true">
      {Array.from({ length: lines }).map((_, index) => (
        <div
          key={index}
          className={`
            h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse
            ${index === lines - 1 ? 'w-3/4' : 'w-full'}
          `}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}

/**
 * CircleSkeleton - Skeleton for avatar/image placeholders
 */
export function CircleSkeleton({
  size = 'md',
  className = '',
}: {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24',
  };

  return (
    <div
      className={`${sizeClasses[size]} bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse ${className}`}
      aria-hidden="true"
    />
  );
}
