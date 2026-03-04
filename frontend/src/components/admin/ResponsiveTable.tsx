import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface ResponsiveTableProps {
  columns: Array<{
    key: string;
    label: string;
    width?: string;
    render?: (value: any, row: any) => React.ReactNode;
  }>;
  data: any[];
  isLoading?: boolean;
  emptyState?: React.ReactNode;
  onRowClick?: (row: any) => void;
  renderCard?: (row: any, index: number) => React.ReactNode; // Custom card render for mobile
  selectedIds?: Set<string>;
  onSelect?: (id: string) => void;
  onSelectAll?: (selected: boolean) => void;
  showCheckbox?: boolean;
}

/**
 * ResponsiveTable Component
 *
 * Displays a table on desktop (≥1024px) and card layout on mobile/tablet
 * - Desktop: Full table with all columns
 * - Tablet (768-1023px): Card layout with key columns visible, details expandable
 * - Mobile (<768px): Compact cards with minimal info, swipeable/expandable
 */
export function ResponsiveTable({
  columns,
  data,
  isLoading,
  emptyState,
  onRowClick,
  renderCard,
  selectedIds = new Set(),
  onSelect,
  onSelectAll,
  showCheckbox = false,
}: ResponsiveTableProps) {
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const [isMobileView, setIsMobileView] = useState(window.innerWidth < 1024);

  React.useEffect(() => {
    const handleResize = () => {
      setIsMobileView(window.innerWidth < 1024);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Desktop Table View
  if (!isMobileView) {
    return (
      <div
        style={{
          background: '#1C1F26',
          border: '1px solid #2D333B',
          borderRadius: 16,
          overflow: 'hidden',
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', minWidth: 900, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #2D333B' }}>
                {showCheckbox && (
                  <th style={{ width: 44, padding: '12px 16px' }}>
                    <input
                      type="checkbox"
                      onChange={(e) => onSelectAll?.(e.target.checked)}
                      checked={data.length > 0 && data.every((row) => selectedIds.has(row.id))}
                    />
                  </th>
                )}
                {columns.map((col) => (
                  <th
                    key={col.key}
                    style={{
                      padding: '12px 12px',
                      textAlign: 'left',
                      fontSize: 11,
                      fontWeight: 600,
                      color: '#6B7280',
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      whiteSpace: 'nowrap',
                      width: col.width,
                    }}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.length === 0 && !isLoading ? (
                <tr>
                  <td
                    colSpan={columns.length + (showCheckbox ? 1 : 0)}
                    style={{ padding: '56px 24px', textAlign: 'center' }}
                  >
                    {emptyState}
                  </td>
                </tr>
              ) : (
                data.map((row) => (
                  <tr
                    key={row.id}
                    onClick={() => onRowClick?.(row)}
                    style={{
                      borderBottom: '1px solid #2D333B',
                      cursor: 'pointer',
                      background: selectedIds.has(row.id)
                        ? 'rgba(79,142,247,0.05)'
                        : 'transparent',
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLTableRowElement).style.background =
                        selectedIds.has(row.id)
                          ? 'rgba(79,142,247,0.08)'
                          : 'rgba(255,255,255,0.025)';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLTableRowElement).style.background =
                        selectedIds.has(row.id)
                          ? 'rgba(79,142,247,0.05)'
                          : 'transparent';
                    }}
                  >
                    {showCheckbox && (
                      <td
                        style={{ padding: '14px 16px' }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={selectedIds.has(row.id)}
                          onChange={() => onSelect?.(row.id)}
                        />
                      </td>
                    )}
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        style={{
                          padding: '14px 12px',
                          fontSize: 13,
                          color: '#F9FAFB',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {col.render
                          ? col.render(row[col.key], row)
                          : row[col.key]}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // Mobile/Tablet Card View
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {data.length === 0 && !isLoading ? (
        <div
          style={{
            padding: '56px 24px',
            textAlign: 'center',
            background: '#1C1F26',
            border: '1px solid #2D333B',
            borderRadius: 12,
          }}
        >
          {emptyState}
        </div>
      ) : (
        data.map((row, index) => {
          const isExpanded = expandedCardId === row.id;

          return renderCard ? (
            renderCard(row, index)
          ) : (
            <div
              key={row.id}
              style={{
                background: '#1C1F26',
                border: `1px solid ${selectedIds.has(row.id) ? '#4F8EF7' : '#2D333B'}`,
                borderRadius: 12,
                padding: '12px 16px',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onClick={() => {
                setExpandedCardId(isExpanded ? null : row.id);
                onRowClick?.(row);
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.borderColor =
                  selectedIds.has(row.id) ? '#4F8EF7' : '#4F8EF7';
                (e.currentTarget as HTMLDivElement).style.background =
                  'rgba(255,255,255,0.02)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.borderColor =
                  selectedIds.has(row.id) ? '#4F8EF7' : '#2D333B';
                (e.currentTarget as HTMLDivElement).style.background = '#1C1F26';
              }}
            >
              {/* Card Header - Key Info */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                }}
              >
                {showCheckbox && (
                  <input
                    type="checkbox"
                    checked={selectedIds.has(row.id)}
                    onChange={() => onSelect?.(row.id)}
                    onClick={(e) => e.stopPropagation()}
                    style={{ cursor: 'pointer' }}
                  />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  {/* Show first 2 columns in card header */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {columns.slice(0, 2).map((col) => (
                      <div key={col.key}>
                        <div
                          style={{
                            fontSize: 11,
                            color: '#9CA3AF',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            fontWeight: 600,
                            marginBottom: 2,
                          }}
                        >
                          {col.label}
                        </div>
                        <div
                          style={{
                            fontSize: 13,
                            color: '#F9FAFB',
                            fontWeight: 500,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {col.render
                            ? col.render(row[col.key], row)
                            : row[col.key]}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setExpandedCardId(isExpanded ? null : row.id);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    color: '#9CA3AF',
                    padding: '4px 8px',
                    transition: 'transform 0.2s',
                    transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                  }}
                >
                  <ChevronDown size={18} />
                </button>
              </div>

              {/* Expanded Details */}
              {isExpanded && (
                <div
                  style={{
                    marginTop: 12,
                    paddingTop: 12,
                    borderTop: '1px solid #2D333B',
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '12px 16px',
                  }}
                >
                  {columns.slice(2).map((col) => (
                    <div key={col.key}>
                      <div
                        style={{
                          fontSize: 10,
                          color: '#9CA3AF',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          fontWeight: 600,
                          marginBottom: 4,
                        }}
                      >
                        {col.label}
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          color: '#F9FAFB',
                          wordBreak: 'break-word',
                        }}
                      >
                        {col.render
                          ? col.render(row[col.key], row)
                          : row[col.key] || '—'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
