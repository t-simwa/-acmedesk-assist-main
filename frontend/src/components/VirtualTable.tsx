import { useVirtualizer } from "@tanstack/react-virtual";
import { useRef, ReactNode } from "react";

interface VirtualTableProps<T> {
  items: T[];
  renderRow: (item: T, index: number) => ReactNode;
  estimateSize?: number;
  overscan?: number;
  header: ReactNode;
  className?: string;
  containerClassName?: string;
}

/**
 * Virtual scrolling table component
 * Only renders visible rows for performance with long lists
 * 
 * @param items - Array of items to render
 * @param renderRow - Function to render each row
 * @param estimateSize - Estimated height of each row in pixels (default: 60)
 * @param overscan - Number of rows to render outside visible area (default: 5)
 * @param header - Table header component
 * @param className - Additional CSS classes for the container
 * @param containerClassName - Additional CSS classes for the scroll container
 */
export function VirtualTable<T>({
  items,
  renderRow,
  estimateSize = 60,
  overscan = 5,
  header,
  className = "",
  containerClassName = "",
}: VirtualTableProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
    overscan,
  });

  return (
    <div
      ref={parentRef}
      className={`overflow-auto ${containerClassName}`}
      style={{ height: "100%", width: "100%" }}
    >
      <div className={className}>
        {header}
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: "100%",
            position: "relative",
          }}
        >
          {virtualizer.getVirtualItems().map((virtualItem) => (
            <div
              key={virtualItem.key}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: `${virtualItem.size}px`,
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              {renderRow(items[virtualItem.index], virtualItem.index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
