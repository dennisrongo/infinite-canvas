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
    <div className="bg-gray-50 dark:bg-[#0a0f1a]" aria-live="polite" aria-busy="true">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-6">
          <div className="h-8 w-36 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2" />
          <div className="h-4 w-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6">
          <aside className="lg:col-span-3">
            <div className="bg-white dark:bg-[#111827] border border-gray-200/80 dark:border-gray-800 rounded-lg p-2">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-1">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-10 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"
                  />
                ))}
              </div>
            </div>
          </aside>

          <section className="lg:col-span-9">
            <div className="bg-white dark:bg-[#111827] border border-gray-200/80 dark:border-gray-800 rounded-lg p-6">
              <div className="h-6 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-5" />

              <div className="flex items-center gap-3 p-4 mb-5 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg">
                <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                  <div className="h-3 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="h-4 w-14 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2" />
                  <div className="h-10 w-full bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
                </div>
                <div>
                  <div className="h-4 w-28 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2" />
                  <div className="h-10 w-full bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
                </div>
                <div className="flex flex-col sm:flex-row gap-3 pt-1">
                  <div className="h-10 w-full sm:w-40 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
                  <div className="h-10 w-full sm:w-32 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

/**
 * AuthFormSkeleton - Skeleton for auth form pages (login, register, reset password)
 * Matches the split-screen AuthLayout design
 */
export function AuthFormSkeleton() {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row" aria-live="polite" aria-busy="true">
      {/* Left branding panel skeleton (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-[480px] xl:w-[520px] flex-shrink-0 bg-gradient-to-br from-[#0F172A] via-[#1a2744] to-[#0F172A]">
        <div className="p-10 w-full flex flex-col justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-500/20 animate-pulse" />
            <div className="h-5 w-32 bg-white/10 rounded animate-pulse" />
          </div>
          <div className="space-y-4">
            <div className="h-8 w-48 bg-white/10 rounded animate-pulse" />
            <div className="h-8 w-40 bg-white/10 rounded animate-pulse" />
            <div className="h-4 w-56 bg-white/5 rounded animate-pulse mt-4" />
          </div>
          <div className="h-3 w-32 bg-white/5 rounded animate-pulse" />
        </div>
      </div>

      {/* Mobile brand header skeleton */}
      <div className="lg:hidden flex items-center gap-2.5 px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-[#0a0f1a]">
        <div className="w-8 h-8 rounded-lg bg-gray-200 dark:bg-gray-700 animate-pulse" />
        <div className="h-4 w-28 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
      </div>

      {/* Right form panel skeleton */}
      <div className="flex-1 flex items-center justify-center px-6 py-10 sm:px-10 bg-white dark:bg-[#0a0f1a]">
        <div className="w-full max-w-md">
          {/* Title skeleton */}
          <div className="mb-8">
            <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2" />
            <div className="h-4 w-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          </div>

          {/* Form fields skeleton */}
          <div className="space-y-5">
            <div>
              <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-1.5" />
              <div className="h-10 w-full bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
            </div>
            <div>
              <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-1.5" />
              <div className="h-10 w-full bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
            </div>
            <div className="flex gap-3 pt-1">
              <div className="flex-1 h-10 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
              <div className="flex-[2] h-10 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
            </div>
          </div>

          {/* Footer link skeleton */}
          <div className="h-4 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mx-auto mt-8" />
        </div>
      </div>
    </div>
  );
}
