import { useVirtualizer } from "@tanstack/react-virtual";
import { useRef, ReactNode } from "react";

interface VirtualListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => ReactNode;
  estimateSize?: number;
  overscan?: number;
  className?: string;
  containerClassName?: string;
}

/**
 * Virtual scrolling list component
 * Only renders visible items for performance with long lists
 * 
 * @param items - Array of items to render
 * @param renderItem - Function to render each item
 * @param estimateSize - Estimated height of each item in pixels (default: 50)
 * @param overscan - Number of items to render outside visible area (default: 5)
 * @param className - Additional CSS classes for the container
 * @param containerClassName - Additional CSS classes for the scroll container
 */
export function VirtualList<T>({
  items,
  renderItem,
  estimateSize = 50,
  overscan = 5,
  className = "",
  containerClassName = "",
}: VirtualListProps<T>) {
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
      <div
        className={className}
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
            {renderItem(items[virtualItem.index], virtualItem.index)}
          </div>
        ))}
      </div>
    </div>
  );
}
