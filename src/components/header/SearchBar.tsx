'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useDebounce } from '@/hooks/useDebounce';
import { useSearch } from '@/hooks/api/useSearch';
import { Select } from '@/components/ui';
import { Search, SlidersHorizontal } from 'lucide-react';
import { escapeAndHighlight } from '@/lib/sanitize';

interface SearchBarProps {
  currentCanvasId?: string;
}

/**
 * SearchBar - Global search component with filters
 *
 * Features:
 * - Keyboard shortcut (Ctrl+K / Cmd+K)
 * - Search scope selector (all canvases or current)
 * - Sort and filter options
 * - Highlighted search results
 * - Debounced search queries
 */
export default function SearchBar({ currentCanvasId }: SearchBarProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [searchScope, setSearchScope] = useState<'all' | 'current'>('all');
  const [sortBy, setSortBy] = useState<'createdAt' | 'updatedAt' | 'title'>('updatedAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month' | 'year'>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);

  // Debounce search query with 400ms delay
  const debouncedSearchQuery = useDebounce(searchQuery, 400);

  // Use TanStack Query for search
  const searchFilters = useMemo(() => ({
    canvasId: searchScope === 'current' && currentCanvasId ? currentCanvasId : undefined,
    sortBy,
    sortOrder,
    dateFilter: dateFilter === 'all' ? undefined : dateFilter,
  }), [searchScope, currentCanvasId, sortBy, sortOrder, dateFilter]);

  const { data: searchData, isFetching: searching } = useSearch(debouncedSearchQuery, searchFilters);
  const searchResults: any[] = searchData?.results || [];
  const searchWarning: string | null = searchData?.warning || null;

  // Show results when data arrives
  useEffect(() => {
    if (searchResults.length > 0 || (debouncedSearchQuery.trim() && !searching)) {
      setShowResults(true);
      setFocusedIndex(-1);
    }
    if (!debouncedSearchQuery.trim()) {
      setShowResults(false);
    }
  }, [searchResults, debouncedSearchQuery, searching]);

  // Memoize highlighted results using the escapeAndHighlight utility
  const highlightedResults = useMemo(() => {
    return searchResults.map(result => ({
      ...result,
      highlightedTitle: escapeAndHighlight(result.title, searchQuery),
      highlightedContent: escapeAndHighlight(result.contentPreview || '', searchQuery)
    }));
  }, [searchResults, searchQuery]);

  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.search-container')) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle keyboard shortcut (Ctrl+K / Cmd+K)
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('global-search-input')?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, []);

  // Handle clicking a search result
  const handleResultClick = useCallback((result: any) => {
    setShowResults(false);
    setSearchQuery('');
    setFocusedIndex(-1);
    // Include note ID query parameter to auto-open editor
    // Use result.noteId (actual note ID), not result.id (search index row ID)
    router.push(`/canvas/${result.canvasId}?note=${result.noteId}`);
  }, [router]);

  // Format date for display
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  // Handle keyboard navigation for search results
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!showResults || searchResults.length === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusedIndex(prev =>
          prev < searchResults.length - 1 ? prev + 1 : prev
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedIndex(prev => prev > 0 ? prev - 1 : 0);
      } else if (e.key === 'Enter' && focusedIndex >= 0) {
        e.preventDefault();
        handleResultClick(searchResults[focusedIndex]);
      } else if (e.key === 'Escape') {
        setShowResults(false);
        setFocusedIndex(-1);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showResults, searchResults, focusedIndex, handleResultClick]);

  return (
    <div className="search-container relative flex-1 max-w-2xl ml-2 md:ml-8">
      <div className="relative">
        {/* Search Icon */}
        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-light-text-secondary dark:text-dark-text-secondary">
          <Search className="w-5 h-5" />
        </div>

        {/* Search Input */}
        <input
          id="global-search-input"
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search notes... (Ctrl+K)"
          className="search-input type-nav w-full pl-10 pr-24 py-2 border border-light-note-border dark:border-dark-note-border rounded-lg bg-white dark:bg-dark-input text-light-text dark:text-dark-text focus:outline-none focus:border-light-primary dark:focus:border-dark-primary"
        />

        {/* Scope Selector and Filter Button */}
        <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
          {currentCanvasId && (
            <Select
              id="search-scope"
              options={[
                { label: 'All Canvases', value: 'all' },
                { label: 'This Canvas', value: 'current' },
              ]}
              value={searchScope}
              onChange={(val) => setSearchScope(val as 'all' | 'current')}
              showLabel={false}
              className="w-32 text-sm"
            />
          )}

          {/* Filter Toggle Button */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="type-meta flex items-center gap-1 px-2 py-1 border border-light-note-border dark:border-dark-note-border rounded bg-white dark:bg-dark-bg text-light-text-secondary dark:text-dark-text-tertiary hover:bg-light-hover dark:hover:bg-dark-hover transition focus:outline-none"
            title="Filter and sort options"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Filters</span>
          </button>
        </div>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="absolute mt-2 w-full bg-white dark:bg-dark-bg border border-light-note-border dark:border-dark-note-border rounded-lg shadow-lg p-4 z-50">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Sort By */}
            <div>
              <label className="block text-xs font-medium text-light-text-secondary dark:text-dark-text-tertiary mb-1">
                Sort By
              </label>
              <Select
                id="sort-by"
                options={[
                  { label: 'Last Modified', value: 'updatedAt' },
                  { label: 'Date Created', value: 'createdAt' },
                  { label: 'Title (A-Z)', value: 'title' },
                ]}
                value={sortBy}
                onChange={(val) => setSortBy(val as 'createdAt' | 'updatedAt' | 'title')}
                showLabel={false}
                className="text-sm"
              />
            </div>

            {/* Sort Order */}
            <div>
              <label className="block text-xs font-medium text-light-text-secondary dark:text-dark-text-tertiary mb-1">
                Order
              </label>
              <Select
                id="sort-order"
                options={[
                  { label: 'Newest First', value: 'desc' },
                  { label: 'Oldest First', value: 'asc' },
                ]}
                value={sortOrder}
                onChange={(val) => setSortOrder(val as 'asc' | 'desc')}
                showLabel={false}
                className="text-sm"
              />
            </div>

            {/* Date Filter */}
            <div>
              <label className="block text-xs font-medium text-light-text-secondary dark:text-dark-text-tertiary mb-1">
                Date Range
              </label>
              <Select
                id="date-filter"
                options={[
                  { label: 'All Time', value: 'all' },
                  { label: 'Today', value: 'today' },
                  { label: 'Last 7 Days', value: 'week' },
                  { label: 'Last 30 Days', value: 'month' },
                  { label: 'Last 365 Days', value: 'year' },
                ]}
                value={dateFilter}
                onChange={(val) => setDateFilter(val as 'all' | 'today' | 'week' | 'month' | 'year')}
                showLabel={false}
                className="text-sm"
              />
            </div>
          </div>

          {/* Active Filters Display */}
          {(dateFilter !== 'all' || sortBy !== 'updatedAt' || sortOrder !== 'desc') && (
            <div className="mt-3 pt-3 border-t border-light-note-border dark:border-dark-note-border flex items-center justify-between">
              <div className="type-meta text-light-text-secondary dark:text-dark-text-tertiary">
                Active filters:{' '}
                {dateFilter !== 'all' && (
                  <span className="inline-flex items-center gap-1 ml-1 px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded">
                    📅 {dateFilter === 'today' ? 'Today' : dateFilter === 'week' ? 'Last 7 days' : dateFilter === 'month' ? 'Last 30 days' : 'Last 365 days'}
                  </span>
                )}
                {sortBy !== 'updatedAt' && (
                  <span className="inline-flex items-center gap-1 ml-1 px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded">
                    📊 {sortBy === 'createdAt' ? 'Created' : 'Title'}
                  </span>
                )}
                {sortOrder !== 'desc' && (
                  <span className="inline-flex items-center gap-1 ml-1 px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded">
                    ⬆️ Ascending
                  </span>
                )}
              </div>
              <button
                onClick={() => {
                  setSortBy('updatedAt');
                  setSortOrder('desc');
                  setDateFilter('all');
                }}
                className="type-meta text-light-primary dark:text-dark-primary hover:text-light-primary-hover dark:hover:text-dark-primary-hover transition"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>
      )}

      {/* Search Results Dropdown */}
      {showResults && searchQuery.trim() && (
        <div
          role="listbox"
          aria-label="Search results"
          className="absolute mt-2 w-full bg-white dark:bg-dark-bg border border-light-note-border dark:border-dark-note-border rounded-lg shadow-lg max-h-96 overflow-y-auto z-[70]"
        >
          {searchWarning && (
            <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-sm">
              ⚠️ {searchWarning}
            </div>
          )}
          {searching ? (
            <div className="p-4 type-nav text-center text-light-text-secondary dark:text-dark-text-tertiary">
              Searching...
            </div>
          ) : searchResults.length === 0 ? (
            <div className="p-4 type-nav text-center text-light-text-secondary dark:text-dark-text-tertiary">
              No results found for "{searchQuery}"
            </div>
          ) : (
            <div className="divide-y divide-light-note-border dark:divide-dark-note-border">
              {highlightedResults.map((result, index) => (
                <button
                  key={result.id}
                  role="option"
                  aria-selected={focusedIndex === index}
                  aria-label={`Go to ${result.title} in ${result.canvasName}`}
                  onClick={() => handleResultClick(result)}
                  className={`w-full text-left p-4 hover:bg-light-canvas dark:hover:bg-dark-canvas transition min-h-[44px] flex items-start ${
                    focusedIndex === index ? 'bg-light-hover dark:bg-dark-hover' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 w-full">
                    <div className="flex-1 min-w-0">
                      <div
                        className="type-nav text-light-text dark:text-dark-text truncate"
                        dangerouslySetInnerHTML={{ __html: result.highlightedTitle }}
                      />
                      <div
                        className="type-meta text-light-text-secondary dark:text-dark-text-tertiary mt-1 line-clamp-2"
                        dangerouslySetInnerHTML={{ __html: result.highlightedContent }}
                      />
                      <div className="type-meta flex items-center gap-2 mt-1 text-light-text-tertiary dark:text-dark-text-secondary">
                        <span>in {result.canvasName}</span>
                        <span>•</span>
                        <span title={formatDateTime(result[sortBy === 'createdAt' ? 'createdAt' : 'updatedAt'])}>
                          {sortBy === 'createdAt' ? 'Created' : 'Updated'}: {formatRelativeTime(result[sortBy === 'createdAt' ? 'createdAt' : 'updatedAt'])}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
