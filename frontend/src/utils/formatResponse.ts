/**
 * Response formatting utilities
 * Ensures consistent formatting for all AI responses before presentation
 */

/**
 * Formats a response text to ensure consistent presentation
 * 
 * @param text - Raw response text from the LLM
 * @returns Formatted text with consistent structure
 */
export function formatResponse(text: string): string {
  if (!text || !text.trim()) {
    return text;
  }

  let formatted = text.trim();

  // Step 1: Format headers and titles - ensure proper spacing
  formatted = formatHeaders(formatted);

  // Step 2: Fix numbered lists - ensure each item is on its own line
  formatted = formatNumberedLists(formatted);

  // Step 3: Fix bullet lists - ensure each item is on its own line
  formatted = formatBulletLists(formatted);

  // Step 4: Normalize line breaks and spacing
  formatted = normalizeSpacing(formatted);

  // Step 5: Ensure proper spacing around citations
  formatted = formatCitations(formatted);

  // Step 6: Clean up any remaining formatting issues
  formatted = finalCleanup(formatted);

  return formatted;
}

/**
 * Formats headers and titles to ensure consistent structure
 */
function formatHeaders(text: string): string {
  let formatted = text;

  // Normalize markdown headers (ensure they're on their own line)
  // Pattern: "text##Header" or "text###Header" -> "text\n##Header"
  formatted = formatted.replace(/([^\n])(#{1,6}\s+)/g, '$1\n$2');
  
  // Ensure headers are followed by a newline (if not already)
  formatted = formatted.replace(/(#{1,6}\s+[^\n]+)([^\n])/g, '$1\n$2');

  // Remove any citations or extra text from header lines
  // Headers should be clean: "## Title" not "## Title [1]"
  // We'll move citations to the next line if they appear in headers
  formatted = formatted.replace(/(#{1,6}\s+[^\n]+?)\s*\[(\d+)\]/g, '$1\n[$2]');

  // Ensure proper spacing before headers (blank line if needed)
  formatted = formatted.replace(/([^\n])\n(#{1,6}\s+)/g, '$1\n\n$2');

  // Ensure headers are not preceded by list items on the same line
  formatted = formatted.replace(/(\d+\.\s+[^\n]+?)\s+(#{1,6}\s+)/g, '$1\n\n$2');
  formatted = formatted.replace(/([•\-*]\s+[^\n]+?)\s+(#{1,6}\s+)/g, '$1\n\n$2');

  // Clean up any headers that might be inline with text
  const lines = formatted.split('\n');
  const processedLines: string[] = [];

  lines.forEach((line, index) => {
    // Check if line contains a header but also other content
    const headerMatch = line.match(/^(#{1,6}\s+)(.+)$/);
    if (headerMatch) {
      const headerPrefix = headerMatch[1];
      const headerContent = headerMatch[2].trim();
      
      // If header content has citations or extra text, clean it up
      const citationMatch = headerContent.match(/^(.+?)\s*\[(\d+)\]$/);
      if (citationMatch) {
        // Split header and citation
        processedLines.push(headerPrefix + citationMatch[1].trim());
        processedLines.push('[' + citationMatch[2] + ']');
      } else {
        processedLines.push(headerPrefix + headerContent);
      }
    } else {
      processedLines.push(line);
    }
  });

  formatted = processedLines.join('\n');

  return formatted;
}

/**
 * Formats numbered lists to ensure each item is on its own line
 */
function formatNumberedLists(text: string): string {
  const lines = text.split('\n');
  const processedLines: string[] = [];

  lines.forEach(line => {
    // Check if line contains multiple numbered items (pattern: "N. ... M. ...")
    const numberedItemPattern = /\d+\.\s+/g;
    const matches = Array.from(line.matchAll(numberedItemPattern));

    if (matches.length > 1) {
      // Split the line at each numbered item (except the first)
      let lastIndex = 0;
      matches.forEach((match, idx) => {
        if (idx > 0 && match.index !== null) {
          // Add the previous item
          processedLines.push(line.substring(lastIndex, match.index).trim());
          lastIndex = match.index;
        }
      });
      // Add the last item
      if (lastIndex < line.length) {
        processedLines.push(line.substring(lastIndex).trim());
      }
    } else {
      // Single item or no numbered items, keep as is
      processedLines.push(line);
    }
  });

  return processedLines.join('\n');
}

/**
 * Formats bullet lists to ensure each item is on its own line
 */
function formatBulletLists(text: string): string {
  // Handle bullet points that might be on the same line
  // Pattern: "• item • item" or "- item - item"
  const bulletPatterns = [
    /(•\s+[^\n•]+?)(?=\s+•\s+)/g,  // • item • item
    /(-\s+[^\n-]+?)(?=\s+-\s+)/g,  // - item - item
    /(\*\s+[^\n*]+?)(?=\s+\*\s+)/g, // * item * item
  ];

  let formatted = text;
  bulletPatterns.forEach(pattern => {
    formatted = formatted.replace(pattern, (match) => match.trim() + '\n');
  });

  // Normalize all bullet types to use "-" for consistency
  formatted = formatted.replace(/^(\s*)[•*](\s+)/gm, '$1-$2');

  // Ensure each bullet item is on its own line
  const lines = formatted.split('\n');
  const processedLines: string[] = [];

  lines.forEach(line => {
    // Check if line contains multiple bullet items
    const bulletMatch = line.match(/^(\s*)(-\s+[^\n-]+?)(?=\s+-\s+)/);
    if (bulletMatch) {
      // Split at each bullet point
      const parts = line.split(/(?=^\s*-\s+)/m);
      parts.forEach(part => {
        if (part.trim()) {
          processedLines.push(part.trim());
        }
      });
    } else {
      processedLines.push(line);
    }
  });

  return processedLines.join('\n');
}

/**
 * Normalizes spacing and line breaks
 */
function normalizeSpacing(text: string): string {
  // Remove excessive blank lines (more than 2 consecutive)
  let formatted = text.replace(/\n{3,}/g, '\n\n');

  // Clean up multiple spaces (but preserve intentional line breaks)
  formatted = formatted.replace(/[ \t]+/g, ' ');

  // Clean up spaces at start/end of lines
  formatted = formatted.split('\n').map(line => line.trim()).join('\n');

  // Remove excessive blank lines again after trimming
  formatted = formatted.replace(/\n{3,}/g, '\n\n');

  // Ensure headers have proper spacing (blank line before and after)
  formatted = formatted.replace(/([^\n])\n(#{1,6}\s+)/g, '$1\n\n$2');
  formatted = formatted.replace(/(#{1,6}\s+[^\n]+)\n([^\n#])/g, '$1\n\n$2');

  // Ensure numbered lists have proper spacing (blank line before if needed)
  formatted = formatted.replace(/([^\n])\n(\d+\.\s)/g, '$1\n\n$2');

  // Ensure bullet lists have proper spacing
  formatted = formatted.replace(/([^\n])\n([•\-*]\s)/g, '$1\n\n$2');

  return formatted;
}

/**
 * Ensures proper spacing around citations and normalizes all citation formats
 */
function formatCitations(text: string): string {
  // Step 1: Normalize all citation formats to [X] or [X, Y, Z]
  let formatted = text.replace(/\[Chunk\s+(\d+)\]/gi, '[$1]');
  formatted = formatted.replace(/\[Citation:\s*(\d+)\]/gi, '[$1]');
  formatted = formatted.replace(/\[citation\s+(\d+)\]/gi, '[$1]');
  formatted = formatted.replace(/\[chunk\s+(\d+)\]/gi, '[$1]');

  // Step 2: Normalize multiple citations: [1, 2] or [1,2] or [1,2,3] -> [1, 2, 3] (consistent spacing)
  formatted = formatted.replace(/\[(\d+)\s*,\s*(\d+)(?:\s*,\s*(\d+))?(?:\s*,\s*(\d+))?(?:\s*,\s*(\d+))?\s*\]/g, (match, ...nums) => {
    const numbers = nums.filter(n => n && n !== undefined).map(n => parseInt(n)).sort((a, b) => a - b);
    // Remove duplicates
    const uniqueNumbers = Array.from(new Set(numbers));
    return `[${uniqueNumbers.join(', ')}]`;
  });

  // Step 3: Move citations from middle of sentences to end (better readability)
  // Pattern: "text [1] more text" -> "text more text [1]"
  formatted = formatted.replace(/([^.\n])\s+\[(\d+(?:\s*,\s*\d+)*)\]\s+([A-Za-z])/g, '$1 $3 [$2]');

  // Step 4: Ensure proper spacing around citations (single or multiple)
  // "text[1]" -> "text [1]" or "text[1, 2]" -> "text [1, 2]"
  formatted = formatted.replace(/([^\s\[\]])\[(\d+(?:\s*,\s*\d+)*)\]/g, '$1 [$2]');
  
  // "[1]text" -> "[1] text" (but not if it's at the start of a line or after punctuation)
  formatted = formatted.replace(/\[(\d+(?:\s*,\s*\d+)*)\]([A-Za-z])/g, '[$1] $2');

  // Step 5: Citations at end of sentences should be before punctuation
  // "text. [1]" -> "text [1]." or "text, [1]" -> "text [1],"
  formatted = formatted.replace(/([.,!?;:])\s+\[(\d+(?:\s*,\s*\d+)*)\]/g, ' [$2]$1');
  
  // Step 6: Citations should come after punctuation if they're at the end
  // "text [1]." -> "text [1]." (keep as is, this is correct)
  // But fix: "text. [1]" -> "text [1]." (already handled above)

  // Step 7: Ensure citations in lists are at the end of the list item
  // "- item [1] more text" -> "- item more text [1]"
  formatted = formatted.replace(/(^[\s]*[-•*]\s+[^\n]+?)\s+\[(\d+(?:\s*,\s*\d+)*)\]\s+([^\n]+)/gm, '$1 $3 [$2]');
  
  // Step 8: For numbered lists, same treatment
  formatted = formatted.replace(/(^\d+\.\s+[^\n]+?)\s+\[(\d+(?:\s*,\s*\d+)*)\]\s+([^\n]+)/gm, '$1 $3 [$2]');

  return formatted;
}

/**
 * Final cleanup of any remaining formatting issues
 */
function finalCleanup(text: string): string {
  // Remove trailing whitespace from each line
  let formatted = text.split('\n').map(line => line.trimEnd()).join('\n');

  // Ensure no more than one blank line between paragraphs
  formatted = formatted.replace(/\n{3,}/g, '\n\n');

  // Remove leading/trailing blank lines
  formatted = formatted.trim();

  // Fix any double spaces that might have been created
  formatted = formatted.replace(/  +/g, ' ');

  return formatted;
}
