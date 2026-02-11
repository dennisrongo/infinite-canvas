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

/**
 * DashboardSkeleton - Full-page skeleton for the dashboard
 */
export function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-light-canvas dark:bg-dark-canvas" aria-live="polite" aria-busy="true">
      {/* Header skeleton */}
      <div className="h-16 bg-white dark:bg-dark-bg border-b border-light-note-border/60 dark:border-dark-note-border/60 flex items-center px-6">
        <div className="h-6 w-40 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        <div className="ml-auto flex gap-3">
          <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
          <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
        </div>
      </div>

      <div className="flex">
        {/* Sidebar skeleton */}
        <aside className="hidden lg:block w-80 bg-white/95 dark:bg-dark-bg/95 border-r border-light-note-border/60 dark:border-dark-note-border/60 p-5 min-h-[calc(100vh-4rem)]">
          <div className="flex items-center justify-between mb-4">
            <div className="h-5 w-28 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          </div>
          <div className="flex gap-2 mb-6">
            <div className="flex-1 h-9 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
            <div className="flex-1 h-9 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
          </div>
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg">
                <div className="w-5 h-5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse flex-shrink-0" />
                <div className={`h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse ${i % 2 === 0 ? 'w-3/4' : 'w-1/2'}`} />
              </div>
            ))}
          </div>
        </aside>

        {/* Main content skeleton */}
        <main className="flex-1 p-6">
          <div className="mb-6">
            <div className="h-7 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2" />
            <div className="h-4 w-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="bg-white dark:bg-dark-note border border-light-note-border dark:border-dark-note-border rounded-xl p-5 space-y-3"
              >
                <div className="h-5 w-3/4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                <div className="space-y-2">
                  <div className="h-3 w-full bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                  <div className="h-3 w-5/6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                </div>
                <div className="h-3 w-1/3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}

/**
 * CanvasSkeleton - Full-page skeleton for the canvas editor
 */
export function CanvasSkeleton() {
  return (
    <div className="min-h-screen bg-light-canvas dark:bg-dark-canvas flex flex-col overflow-hidden" aria-live="polite" aria-busy="true">
      {/* Header skeleton */}
      <div className="h-16 bg-white dark:bg-dark-bg border-b border-light-note-border/60 dark:border-dark-note-border/60 flex items-center px-6">
        <div className="h-5 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        <div className="ml-4 h-5 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        <div className="ml-auto flex gap-3">
          <div className="h-8 w-20 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
          <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
        </div>
      </div>

      {/* Canvas area skeleton with scattered note placeholders */}
      <div className="flex-1 relative">
        {/* Toolbar skeleton */}
        <div className="absolute top-4 left-4 z-10 flex gap-2">
          <div className="h-9 w-9 bg-white dark:bg-dark-bg border border-light-note-border/60 dark:border-dark-note-border/60 rounded-lg animate-pulse" />
          <div className="h-9 w-9 bg-white dark:bg-dark-bg border border-light-note-border/60 dark:border-dark-note-border/60 rounded-lg animate-pulse" />
          <div className="h-9 w-9 bg-white dark:bg-dark-bg border border-light-note-border/60 dark:border-dark-note-border/60 rounded-lg animate-pulse" />
        </div>

        {/* Scattered note card placeholders */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative w-full max-w-3xl h-96">
            <div className="absolute top-8 left-12 w-48 h-32 bg-white dark:bg-dark-note border border-light-note-border/40 dark:border-dark-note-border/40 rounded-lg p-3 space-y-2 animate-pulse opacity-60">
              <div className="h-4 w-3/4 bg-gray-200 dark:bg-gray-700 rounded" />
              <div className="h-3 w-full bg-gray-200 dark:bg-gray-700 rounded" />
              <div className="h-3 w-2/3 bg-gray-200 dark:bg-gray-700 rounded" />
            </div>
            <div className="absolute top-20 right-16 w-52 h-36 bg-white dark:bg-dark-note border border-light-note-border/40 dark:border-dark-note-border/40 rounded-lg p-3 space-y-2 animate-pulse opacity-50">
              <div className="h-4 w-2/3 bg-gray-200 dark:bg-gray-700 rounded" />
              <div className="h-3 w-full bg-gray-200 dark:bg-gray-700 rounded" />
              <div className="h-3 w-5/6 bg-gray-200 dark:bg-gray-700 rounded" />
              <div className="h-3 w-1/2 bg-gray-200 dark:bg-gray-700 rounded" />
            </div>
            <div className="absolute bottom-12 left-1/3 w-44 h-28 bg-white dark:bg-dark-note border border-light-note-border/40 dark:border-dark-note-border/40 rounded-lg p-3 space-y-2 animate-pulse opacity-40">
              <div className="h-4 w-1/2 bg-gray-200 dark:bg-gray-700 rounded" />
              <div className="h-3 w-full bg-gray-200 dark:bg-gray-700 rounded" />
              <div className="h-3 w-3/4 bg-gray-200 dark:bg-gray-700 rounded" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * SettingsSkeleton - Full-page skeleton for the settings page
 */
export function SettingsSkeleton() {
  return (
    <div className="min-h-screen bg-light-canvas dark:bg-dark-canvas p-4 md:p-8" aria-live="polite" aria-busy="true">
      <div className="max-w-4xl mx-auto w-full">
        {/* Header skeleton */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <div className="h-8 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2" />
            <div className="h-4 w-56 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          </div>
          <div className="h-10 w-40 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
        </div>

        {/* Profile section skeleton */}
        <div className="bg-white dark:bg-dark-bg rounded-xl shadow-sm border border-light-note-border/60 dark:border-dark-note-border/60 p-6 mb-6">
          <div className="h-6 w-44 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-4" />
          <div className="space-y-4">
            <div>
              <div className="h-4 w-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2" />
              <div className="h-10 w-full bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
            </div>
            <div>
              <div className="h-4 w-28 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2" />
              <div className="h-10 w-full bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
            </div>
            <div className="h-11 w-full bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
          </div>
        </div>

        {/* Password section skeleton */}
        <div className="bg-white dark:bg-dark-bg rounded-xl shadow-sm border border-light-note-border/60 dark:border-dark-note-border/60 p-6">
          <div className="h-6 w-40 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-4" />
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i}>
                <div className="h-4 w-36 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2" />
                <div className="h-10 w-full bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
              </div>
            ))}
            <div className="flex gap-3">
              <div className="flex-1 h-11 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
              <div className="flex-1 h-11 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * AuthFormSkeleton - Skeleton for auth form pages (login, register, reset password)
 */
export function AuthFormSkeleton() {
  return (
    <div className="min-h-screen bg-light-canvas dark:bg-dark-canvas flex items-center justify-center p-4" aria-live="polite" aria-busy="true">
      <div className="max-w-md w-full">
        <div className="bg-white dark:bg-dark-bg rounded-2xl shadow-sm border border-light-note-border/60 dark:border-dark-note-border/60 p-8">
          {/* Title skeleton */}
          <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mx-auto mb-2" />
          <div className="h-4 w-56 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mx-auto mb-8" />

          {/* Form fields skeleton */}
          <div className="space-y-4">
            <div>
              <div className="h-4 w-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2" />
              <div className="h-10 w-full bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
            </div>
            <div>
              <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2" />
              <div className="h-10 w-full bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
            </div>
            <div className="flex gap-3">
              <div className="flex-1 h-11 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
              <div className="flex-1 h-11 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
            </div>
          </div>

          {/* Footer link skeleton */}
          <div className="h-4 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mx-auto mt-6" />
        </div>
      </div>
    </div>
  );
}
