'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface HeaderProps {
  currentCanvasId?: string;
  onMenuClick?: () => void;
  showMenuButton?: boolean;
  title?: string;
  showCollapseButton?: boolean;
  onCollapseClick?: () => void;
  isCollapsed?: boolean;
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
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [searchScope, setSearchScope] = useState<'all' | 'current'>('all');
  const [searching, setSearching] = useState(false);

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

  // Handle search input
  const handleSearch = async (query: string) => {
    setSearchQuery(query);

    if (!query.trim()) {
      setSearchResults([]);
      setShowResults(false);
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
        body: JSON.stringify({ query: query.trim() }),
      });

      if (!res.ok) throw new Error('Search failed');

      const data = await res.json();
      setSearchResults(data.results || []);
      setShowResults(true);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  // Handle clicking a search result
  const handleResultClick = (result: any) => {
    setShowResults(false);
    setSearchQuery('');
    setSearchResults([]);

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
    <header className="bg-white dark:bg-[#0F172A] border-b border-[#E2E8F0] dark:border-[#475569] px-6 py-4 sticky top-0 z-40">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 flex-1">
          {/* Hamburger menu button - visible on mobile */}
          {showMenuButton && onMenuClick && (
            <button
              onClick={onMenuClick}
              className="lg:hidden p-2 rounded-lg hover:bg-[#F1F5F9] dark:hover:bg-[#1E293B] transition"
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
              className="p-2 text-sm border border-[#E2E8F0] dark:border-[#475569] rounded-lg hover:bg-[#F1F5F9] dark:hover:bg-[#1E293B] transition"
              aria-label="Toggle sidebar"
            >
              {isCollapsed ? '☰' : '«'}
            </button>
          )}

          {/* Logo or Title */}
          {title ? (
            <h1 className="text-2xl font-bold text-[#1E293B] dark:text-[#F1F5F9]">
              {title}
            </h1>
          ) : (
            <a href="/dashboard" className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-[#1E293B] dark:text-[#F1F5F9]">
                Infinite Canvas
              </h1>
            </a>
          )}

          {/* Search Container */}
          <div className="search-container relative flex-1 max-w-2xl ml-8">
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
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search notes... (Ctrl+K)"
                className="w-full pl-10 pr-24 py-2 border border-[#E2E8F0] dark:border-[#475569] rounded-lg bg-white dark:bg-[#1E293B] text-[#1E293B] dark:text-[#F1F5F9] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
              />

              {/* Scope Selector */}
              {currentCanvasId && (
                <select
                  value={searchScope}
                  onChange={(e) => {
                    setSearchScope(e.target.value as 'all' | 'current');
                    if (searchQuery.trim()) {
                      handleSearch(searchQuery);
                    }
                  }}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 px-2 py-1 text-xs border border-[#E2E8F0] dark:border-[#475569] rounded bg-white dark:bg-[#0F172A] text-[#64748B] dark:text-[#94A3B8] focus:outline-none"
                >
                  <option value="all">All Canvases</option>
                  <option value="current">This Canvas</option>
                </select>
              )}
            </div>

            {/* Search Results Dropdown */}
            {showResults && searchQuery.trim() && (
              <div className="absolute mt-2 w-full bg-white dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#475569] rounded-lg shadow-lg max-h-96 overflow-y-auto z-50">
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
                    {searchResults.map((result) => (
                      <button
                        key={result.id}
                        onClick={() => handleResultClick(result)}
                        className="w-full text-left p-4 hover:bg-[#F8FAFC] dark:hover:bg-[#1E293B] transition"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-[#1E293B] dark:text-[#F1F5F9] truncate">
                              {result.title}
                            </div>
                            <div className="text-sm text-[#64748B] dark:text-[#94A3B8] mt-1 line-clamp-2">
                              {result.contentPreview}
                            </div>
                            <div className="text-xs text-[#94A3B8] dark:text-[#64748B] mt-1">
                              in {result.canvasName}
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
        <div className="flex items-center gap-4">
          <a
            href="/settings"
            className="px-4 py-2 text-sm border border-[#E2E8F0] dark:border-[#475569] rounded-lg hover:bg-[#F1F5F9] dark:hover:bg-[#1E293B] transition text-[#1E293B] dark:text-[#F1F5F9]"
          >
            Settings
          </a>
          <form action="/api/auth/logout" method="POST">
            <button
              type="submit"
              className="px-4 py-2 text-sm border border-[#E2E8F0] dark:border-[#475569] rounded-lg hover:bg-[#F1F5F9] dark:hover:bg-[#1E293B] transition text-[#1E293B] dark:text-[#F1F5F9]"
            >
              Logout
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
