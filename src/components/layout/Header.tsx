'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/contexts/ThemeContext';

interface HeaderProps {
  currentCanvasId?: string;
  onMenuClick?: () => void;
  showMenuButton?: boolean;
  title?: string;
  showCollapseButton?: boolean;
  onCollapseClick?: () => void;
  isCollapsed?: boolean;
}

// Custom hook for debouncing values
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Set up timer to update debounced value after delay
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Cleanup timer if value changes before delay expires
    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

export default function Header({
  currentCanvasId,
  onMenuClick,
  showMenuButton,
  title,
  showCollapseButton,
  onCollapseClick,
  isCollapsed
}: HeaderProps) {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [searchScope, setSearchScope] = useState<'all' | 'current'>('all');
  const [searching, setSearching] = useState(false);
  const [sortBy, setSortBy] = useState<'createdAt' | 'updatedAt' | 'title'>('updatedAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month' | 'year'>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [searchWarning, setSearchWarning] = useState<string | null>(null);

  // Debounce search query with 400ms delay
  const debouncedSearchQuery = useDebounce(searchQuery, 400);

  // Helper function to highlight search terms in text
  const highlightTerms = (text: string, query: string) => {
    if (!query.trim() || !text) return text;

    const terms = query.trim().split(/\s+/).filter(term => term.length > 0);
    let highlightedText = text;

    terms.forEach(term => {
      const regex = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
      highlightedText = highlightedText.replace(regex, '<mark style="background-color: #FEF08A; color: #1E293B; padding: 1px 2px; border-radius: 2px;">$1</mark>');
    });

    return highlightedText;
  };

  // Memoize highlighted results to avoid recalculating on every render
  const highlightedResults = useMemo(() => {
    return searchResults.map(result => ({
      ...result,
      highlightedTitle: highlightTerms(result.title, searchQuery),
      highlightedContent: highlightTerms(result.contentPreview || '', searchQuery)
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

  // Perform search when debounced query changes or filters change
  useEffect(() => {
    const performSearch = async () => {
      if (!debouncedSearchQuery.trim()) {
        setSearchResults([]);
        setShowResults(false);
        setSearchWarning(null);
        return;
      }

      setSearching(true);

      try {
        const scopeParam = searchScope === 'current' && currentCanvasId
          ? `?canvasId=${currentCanvasId}`
          : '';

        const res = await fetch(`/api/search${scopeParam}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: debouncedSearchQuery.trim(),
            sortBy,
            sortOrder,
            dateFilter: dateFilter === 'all' ? undefined : dateFilter,
          }),
        });

        if (!res.ok) throw new Error('Search failed');

        const data = await res.json();
        setSearchResults(data.results || []);
        setSearchWarning(data.warning || null);
        setShowResults(true);
      } catch (error) {
        console.error('Search error:', error);
        setSearchResults([]);
        setSearchWarning(null);
      } finally {
        setSearching(false);
      }
    };

    performSearch();
  }, [debouncedSearchQuery, searchScope, currentCanvasId, sortBy, sortOrder, dateFilter]);

  // Handle search input change
  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
  };

  // Trigger immediate search when scope changes
  const handleScopeChange = (newScope: 'all' | 'current') => {
    setSearchScope(newScope);
    if (searchQuery.trim()) {
      // Trigger search immediately with new scope
      setTimeout(() => {
        // Debounced value will update and trigger search
      }, 0);
    }
  };

  // Handle clicking a search result
  const handleResultClick = (result: any) => {
    setShowResults(false);
    setSearchQuery('');
    setSearchResults([]);
    setSearchWarning(null);

    // Navigate to the canvas
    router.push(`/canvas/${result.canvasId}`);
  };

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

  return (
    <header className="bg-white dark:bg-[#0F172A] border-b border-[#E2E8F0] dark:border-[#475569] px-4 md:px-6 py-4 sticky top-0 z-40 transition-colors duration-300">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 md:gap-4 flex-1 min-w-0">
          {/* Hamburger menu button - visible on mobile */}
          {showMenuButton && onMenuClick && (
            <button
              onClick={onMenuClick}
              className="lg:hidden p-2 rounded-lg hover:bg-[#F1F5F9] dark:hover:bg-[#1E293B] transition flex-shrink-0"
              aria-label="Toggle menu"
            >
              <svg className="w-6 h-6 text-[#1E293B] dark:text-[#F1F5F9]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          )}

          {/* Collapse sidebar button - for canvas page */}
          {showCollapseButton && onCollapseClick && (
            <button
              onClick={onCollapseClick}
              className="hidden md:block p-2 text-sm border border-[#E2E8F0] dark:border-[#475569] rounded-lg hover:bg-[#F1F5F9] dark:hover:bg-[#1E293B] transition flex-shrink-0"
              aria-label="Toggle sidebar"
            >
              {isCollapsed ? '☰' : '«'}
            </button>
          )}

          {/* Logo or Title - truncate on small screens */}
          {title ? (
            <h1 className="text-lg md:text-2xl font-bold text-[#1E293B] dark:text-[#F1F5F9] truncate">
              {title}
            </h1>
          ) : (
            <a href="/dashboard" className="flex items-center gap-1 md:gap-2 flex-shrink-0">
              <h1 className="text-lg md:text-2xl font-bold text-[#1E293B] dark:text-[#F1F5F9]">
                Infinite Canvas
              </h1>
            </a>
          )}

          {/* Search Container */}
          <div className="search-container relative flex-1 max-w-2xl ml-2 md:ml-8 min-w-0">
            <div className="relative">
              {/* Search Icon */}
              <svg
                className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#64748B]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>

              {/* Search Input */}
              <input
                id="global-search-input"
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search notes... (Ctrl+K)"
                className="w-full pl-10 pr-24 py-2 border border-[#E2E8F0] dark:border-[#475569] rounded-lg bg-white dark:bg-[#1E293B] text-[#1E293B] dark:text-[#F1F5F9] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
              />

              {/* Scope Selector and Filter Button */}
              <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
                {currentCanvasId && (
                  <select
                    value={searchScope}
                    onChange={(e) => handleScopeChange(e.target.value as 'all' | 'current')}
                    className="px-2 py-1 text-xs border border-[#E2E8F0] dark:border-[#475569] rounded bg-white dark:bg-[#0F172A] text-[#64748B] dark:text-[#94A3B8] focus:outline-none"
                  >
                    <option value="all">All Canvases</option>
                    <option value="current">This Canvas</option>
                  </select>
                )}

                {/* Filter Toggle Button */}
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="px-2 py-1 text-xs border border-[#E2E8F0] dark:border-[#475569] rounded bg-white dark:bg-[#0F172A] text-[#64748B] dark:text-[#94A3B8] hover:bg-[#F1F5F9] dark:hover:bg-[#1E293B] transition focus:outline-none"
                  title="Filter and sort options"
                >
                  ⚙️ Filters
                </button>
              </div>
            </div>

            {/* Filter Panel */}
            {showFilters && (
              <div className="absolute mt-2 w-full bg-white dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#475569] rounded-lg shadow-lg p-4 z-50">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Sort By */}
                  <div>
                    <label className="block text-xs font-medium text-[#64748B] dark:text-[#94A3B8] mb-1">
                      Sort By
                    </label>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as 'createdAt' | 'updatedAt' | 'title')}
                      className="w-full px-3 py-2 text-sm border border-[#E2E8F0] dark:border-[#475569] rounded bg-white dark:bg-[#1E293B] text-[#1E293B] dark:text-[#F1F5F9] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
                    >
                      <option value="updatedAt">Last Modified</option>
                      <option value="createdAt">Date Created</option>
                      <option value="title">Title (A-Z)</option>
                    </select>
                  </div>

                  {/* Sort Order */}
                  <div>
                    <label className="block text-xs font-medium text-[#64748B] dark:text-[#94A3B8] mb-1">
                      Order
                    </label>
                    <select
                      value={sortOrder}
                      onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
                      className="w-full px-3 py-2 text-sm border border-[#E2E8F0] dark:border-[#475569] rounded bg-white dark:bg-[#1E293B] text-[#1E293B] dark:text-[#F1F5F9] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
                    >
                      <option value="desc">Newest First</option>
                      <option value="asc">Oldest First</option>
                    </select>
                  </div>

                  {/* Date Filter */}
                  <div>
                    <label className="block text-xs font-medium text-[#64748B] dark:text-[#94A3B8] mb-1">
                      Date Range
                    </label>
                    <select
                      value={dateFilter}
                      onChange={(e) => setDateFilter(e.target.value as 'all' | 'today' | 'week' | 'month' | 'year')}
                      className="w-full px-3 py-2 text-sm border border-[#E2E8F0] dark:border-[#475569] rounded bg-white dark:bg-[#1E293B] text-[#1E293B] dark:text-[#F1F5F9] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
                    >
                      <option value="all">All Time</option>
                      <option value="today">Today</option>
                      <option value="week">Last 7 Days</option>
                      <option value="month">Last 30 Days</option>
                      <option value="year">Last 365 Days</option>
                    </select>
                  </div>
                </div>

                {/* Active Filters Display */}
                {(dateFilter !== 'all' || sortBy !== 'updatedAt' || sortOrder !== 'desc') && (
                  <div className="mt-3 pt-3 border-t border-[#E2E8F0] dark:border-[#475569] flex items-center justify-between">
                    <div className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                      Active filters:{' '}
                      {dateFilter !== 'all' && (
                        <span className="inline-flex items-center gap-1 ml-1 px-2 py-1 bg-[#DBEAFE] dark:bg-[#1E3A8A] text-[#1E40AF] dark:text-[#93C5FD] rounded">
                          📅 {dateFilter === 'today' ? 'Today' : dateFilter === 'week' ? 'Last 7 days' : dateFilter === 'month' ? 'Last 30 days' : 'Last 365 days'}
                        </span>
                      )}
                      {sortBy !== 'updatedAt' && (
                        <span className="inline-flex items-center gap-1 ml-1 px-2 py-1 bg-[#DBEAFE] dark:bg-[#1E3A8A] text-[#1E40AF] dark:text-[#93C5FD] rounded">
                          📊 {sortBy === 'createdAt' ? 'Created' : 'Title'}
                        </span>
                      )}
                      {sortOrder !== 'desc' && (
                        <span className="inline-flex items-center gap-1 ml-1 px-2 py-1 bg-[#DBEAFE] dark:bg-[#1E3A8A] text-[#1E40AF] dark:text-[#93C5FD] rounded">
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
                      className="text-xs text-[#3B82F6] hover:text-[#2563EB] dark:text-[#60A5FA] dark:hover:text-[#3B82F6] transition"
                    >
                      Clear all filters
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Search Results Dropdown */}
            {showResults && searchQuery.trim() && (
              <div className="absolute mt-2 w-full bg-white dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#475569] rounded-lg shadow-lg max-h-96 overflow-y-auto z-50">
                {searchWarning && (
                  <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-sm">
                    ⚠️ {searchWarning}
                  </div>
                )}
                {searching ? (
                  <div className="p-4 text-center text-[#64748B] dark:text-[#94A3B8]">
                    Searching...
                  </div>
                ) : searchResults.length === 0 ? (
                  <div className="p-4 text-center text-[#64748B] dark:text-[#94A3B8]">
                    No results found for "{searchQuery}"
                  </div>
                ) : (
                  <div className="divide-y divide-[#E2E8F0] dark:divide-[#475569]">
                    {highlightedResults.map((result) => (
                      <button
                        key={result.id}
                        onClick={() => handleResultClick(result)}
                        className="w-full text-left p-4 hover:bg-[#F8FAFC] dark:hover:bg-[#1E293B] transition"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div
                              className="font-medium text-[#1E293B] dark:text-[#F1F5F9] truncate"
                              dangerouslySetInnerHTML={{ __html: result.highlightedTitle }}
                            />
                            <div
                              className="text-sm text-[#64748B] dark:text-[#94A3B8] mt-1 line-clamp-2"
                              dangerouslySetInnerHTML={{ __html: result.highlightedContent }}
                            />
                            <div className="flex items-center gap-2 mt-1 text-xs text-[#94A3B8] dark:text-[#64748B]">
                              <span>in {result.canvasName}</span>
                              <span>•</span>
                              <span>
                                {sortBy === 'createdAt' ? 'Created' : 'Updated'}: {new Date(result[sortBy === 'createdAt' ? 'createdAt' : 'updatedAt']).toLocaleDateString()}
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
        </div>

        {/* Right Side Actions */}
        <div className="flex items-center gap-1 md:gap-4 flex-shrink-0">
          <a
            href="/settings"
            className="hidden md:inline-block px-4 py-2 text-sm border border-[#E2E8F0] dark:border-[#475569] rounded-lg hover:bg-[#F1F5F9] dark:hover:bg-[#1E293B] transition text-[#1E293B] dark:text-[#F1F5F9]"
          >
            Settings
          </a>

          {/* Theme Toggle Button - icon only on mobile */}
          <button
            onClick={toggleTheme}
            className="px-2 md:px-4 py-2 text-sm border border-[#E2E8F0] dark:border-[#475569] rounded-lg hover:bg-[#F1F5F9] dark:hover:bg-[#1E293B] transition text-[#1E293B] dark:text-[#F1F5F9] flex items-center gap-1 md:gap-2"
            aria-label="Toggle theme"
          >
            {theme === 'light' ? (
              <>
                {/* Moon icon for dark mode */}
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
                <span className="hidden md:inline">Dark</span>
              </>
            ) : (
              <>
                {/* Sun icon for light mode */}
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                <span className="hidden md:inline">Light</span>
              </>
            )}
          </button>

          <form action="/api/auth/logout" method="POST">
            <button
              type="submit"
              className="px-2 md:px-4 py-2 text-sm border border-[#E2E8F0] dark:border-[#475569] rounded-lg hover:bg-[#F1F5F9] dark:hover:bg-[#1E293B] transition text-[#1E293B] dark:text-[#F1F5F9]"
            >
              Logout
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
