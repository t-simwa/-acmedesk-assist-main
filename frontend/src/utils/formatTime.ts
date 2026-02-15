import { format, formatDistanceToNow } from "date-fns";

/**
 * Formats a timestamp as relative time (e.g., "2 minutes ago", "just now")
 * @param timestamp - The date to format
 * @returns Relative time string
 */
export function formatRelativeTime(timestamp: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - timestamp.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  // Less than 1 minute ago
  if (diffSeconds < 60) {
    return "just now";
  }

  // Less than 1 hour ago
  if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes > 1 ? "s" : ""} ago`;
  }

  // Less than 24 hours ago
  if (diffHours < 24) {
    return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  }

  // Less than 7 days ago
  if (diffDays < 7) {
    return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
  }

  // More than 7 days - use formatDistanceToNow for better formatting
  return formatDistanceToNow(timestamp, { addSuffix: true });
}

/**
 * Formats a timestamp as absolute time (e.g., "Jan 15, 2024 at 3:45 PM")
 * @param timestamp - The date to format
 * @returns Absolute time string
 */
export function formatAbsoluteTime(timestamp: Date): string {
  return format(timestamp, "MMM d, yyyy 'at' h:mm a");
}
