import React from 'react';

interface ResponsiveFiltersProps {
  children: React.ReactNode;
  searchComponent?: React.ReactNode;
  filterComponents?: React.ReactNode[];
  dateRangeComponents?: React.ReactNode[];
}

/**
 * ResponsiveFilters Component
 *
 * Organizes filters responsively:
 * - Desktop (≥1024px): All filters in one row
 * - Tablet (768-1023px): Search full width, filters wrap below
 * - Mobile (<768px): Search full width, filters stack vertically
 */
export function ResponsiveFilters({
  children,
  searchComponent,
  filterComponents,
  dateRangeComponents,
}: ResponsiveFiltersProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      {/* Search Bar - Always full width on mobile */}
      {searchComponent && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          {searchComponent}
        </div>
      )}

      {/* Filters Row - Responsive layout */}
      {(filterComponents || dateRangeComponents) && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 8,
            '@media (max-width: 640px)': {
              flexDirection: 'column',
            },
          }}
        >
          {filterComponents?.map((filter, idx) => (
            <div
              key={idx}
              style={{
                flex: '0 0 auto',
                minWidth: 120,
              }}
            >
              {filter}
            </div>
          ))}
        </div>
      )}

      {/* Date Range - Responsive layout */}
      {dateRangeComponents && dateRangeComponents.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: 8,
          }}
        >
          {dateRangeComponents.map((dateComponent, idx) => (
            <div key={idx}>{dateComponent}</div>
          ))}
        </div>
      )}

      {children}
    </div>
  );
}

/**
 * Mobile-first filter styles
 * Add this as a CSS media query helper
 */
export const mobileFilterStyles = {
  container: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 12,
  },
  searchContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 8,
  },
  filterRow: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: 8,
    // On mobile, make filters full width
    '@media (max-width: 640px)': {
      flexDirection: 'column' as const,
    },
  },
  filterItem: {
    flex: '0 0 auto',
    minWidth: 120,
  },
  dateRangeRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
    gap: 8,
    // On mobile, stack vertically
    '@media (max-width: 640px)': {
      gridTemplateColumns: '1fr',
    },
  },
};
