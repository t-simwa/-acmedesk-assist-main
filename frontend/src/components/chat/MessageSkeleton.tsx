/**
 * MessageSkeleton Component
 * 
 * A sophisticated skeleton loader that mimics the structure of an assistant message
 * with animated placeholder blocks. Used during loading states to provide visual
 * feedback that mimics the actual message structure.
 */

export function MessageSkeleton() {
  return (
    <div className="flex justify-start animate-fade-in">
      <div className="max-w-[85%] space-y-1">
        {/* Avatar and name skeleton */}
        <div className="flex items-center gap-2 px-1 mb-1">
          <div className="w-5 h-5 rounded-full skeleton-shimmer" />
          <div className="h-3 w-16 rounded skeleton-shimmer" />
        </div>
        
        {/* Message bubble skeleton */}
        <div className="bg-muted rounded-[18px] rounded-bl-[4px] px-4 py-2.5 space-y-2">
          {/* First line - longer */}
          <div className="h-4 w-full rounded skeleton-shimmer" />
          {/* Second line - medium */}
          <div className="h-4 w-[85%] rounded skeleton-shimmer" />
          {/* Third line - shorter */}
          <div className="h-4 w-[60%] rounded skeleton-shimmer" />
        </div>
        
        {/* Timestamp skeleton */}
        <div className="flex items-center gap-2 px-1">
          <div className="h-3 w-12 rounded skeleton-shimmer" />
        </div>
      </div>
    </div>
  );
}
