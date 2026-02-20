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

  // Fix split headings (e.g., "# Heading\n\nk" -> "# Headingk")
  formatted = fixSplitHeadings(formatted);

  return formatted;
}

/**
 * Fixes headings that have been split across lines
 * Example: "# Getting Started with AcmeDes\n\nk" -> "# Getting Started with AcmeDesk"
 */
function fixSplitHeadings(text: string): string {
  const lines = text.split('\n');
  const fixedLines: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trim();
    
    // Check if this is a heading line (markdown header)
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    
    if (headingMatch) {
      const headingLevel = headingMatch[1];
      const headingText = headingMatch[2];
      
      // Look ahead for potential fragment lines
      let j = i + 1;
      // Skip empty lines
      while (j < lines.length && !lines[j].trim()) {
        j++;
      }
      
      // Check if next non-empty line is a fragment
      if (j < lines.length) {
        const nextLine = lines[j].trim();
        
        // Fragment detection: short (1-5 chars), no spaces, alphanumeric
        const isFragment = (
          nextLine.length <= 5 &&
          !nextLine.includes(' ') &&
          /^[a-zA-Z0-9]+$/.test(nextLine) &&
          !nextLine.startsWith('#') &&
          !nextLine.startsWith('-') &&
          !nextLine.startsWith('*') &&
          !/^\d+\./.test(nextLine)
        );
        
        if (isFragment) {
          // Merge the fragment with the heading
          const mergedHeading = `${headingLevel} ${headingText}${nextLine}`;
          fixedLines.push(mergedHeading);
          i = j + 1; // Skip both the heading line and the fragment line
          continue;
        }
      }
    }
    
    fixedLines.push(lines[i]);
    i++;
  }

  return fixedLines.join('\n');
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
  // Normalize all bullet types to use "-" for consistency first
  let formatted = text.replace(/^(\s*)[•*](\s+)/gm, '$1-$2');

  // CRITICAL FIX: Handle cases where multiple bullet points are on same line
  // Pattern examples: "- item [1]- item [2]" or "- item [1] - item [2]" or "- item- item"
  
  // First, fix cases where citation ends and new bullet starts: "]- " or "] - "
  formatted = formatted.replace(/(\])\s*(?=-\s+)/g, '$1\n');
  
  // Fix cases where citation ends and new bold bullet starts: "]- **" or "] - **"
  formatted = formatted.replace(/(\])\s*(?=-\s*\*\*)/g, '$1\n');
  
  // Fix cases where item ends (no citation) and new bullet starts: "text- " (but be careful not to break "text - text")
  // Look for pattern: word or punctuation, then "- " followed by capital letter or **
  formatted = formatted.replace(/([^\n])\s*(?=-\s+[A-Z**])/g, '$1\n');
  
  // Now handle bullet points that might be on the same line
  const bulletPatterns = [
    /(•\s+[^\n•]+?)(?=\s+•\s+)/g,  // • item • item
    /(-\s+[^\n-]+?)(?=\s+-\s+)/g,  // - item - item
    /(\*\s+[^\n*]+?)(?=\s+\*\s+)/g, // * item * item
  ];

  bulletPatterns.forEach(pattern => {
    formatted = formatted.replace(pattern, (match) => match.trim() + '\n');
  });

  // Ensure each bullet item is on its own line
  const lines = formatted.split('\n');
  const processedLines: string[] = [];

  lines.forEach((line, lineIndex) => {
    // Count bullet points on this line
    const bulletMatches = line.match(/-\s+/g);
    if (bulletMatches && bulletMatches.length > 1) {
      // Multiple bullets on same line - split them
      // Find all positions where "- " appears
      const positions: number[] = [];
      let searchIndex = 0;
      while ((searchIndex = line.indexOf('- ', searchIndex)) !== -1) {
        positions.push(searchIndex);
        searchIndex += 2;
      }
      
      // Split at each bullet point (except first)
      for (let i = 0; i < positions.length; i++) {
        const start = positions[i];
        const end = i < positions.length - 1 ? positions[i + 1] : line.length;
        const item = line.substring(start, end).trim();
        if (item) {
          processedLines.push(item);
        }
      }
    } else {
      // Check for pattern like "- item [1]- item [2]" (no space between citation and next bullet)
      const patternMatch = line.match(/^(\s*)(-\s+[^\n]+?\[[^\]]+\])\s*(?=-\s+)/);
      if (patternMatch) {
        // Split at the second bullet
        const firstPart = line.substring(0, line.indexOf('- ', patternMatch[0].length)).trim();
        const secondPart = line.substring(line.indexOf('- ', patternMatch[0].length)).trim();
        if (firstPart) processedLines.push(firstPart);
        if (secondPart) processedLines.push(secondPart);
      } else {
        processedLines.push(line);
      }
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
  
  // Step 1.5: STRICT PASS - Remove ANY citation that contains NaN, undefined, or null
  // This must happen FIRST - even if a citation has valid numbers like [1, 2, NaN], remove the entire citation
  // This is more aggressive than trying to clean individual values
  formatted = formatted.replace(/\[[^\]]*\bNaN\b[^\]]*\]/gi, '');
  formatted = formatted.replace(/\[[^\]]*\bundefined\b[^\]]*\]/gi, '');
  formatted = formatted.replace(/\[[^\]]*\bnull\b[^\]]*\]/gi, '');
  
  // Step 1.6: Clean citations to remove invalid numbers (out of range, non-numeric)
  // Use more conservative limit (20 instead of 100) as safety net
  // Backend should have already cleaned with actual max_chunks, but this is a fallback
  const MAX_CITATION_LIMIT = 20; // Conservative limit - most RAG systems use 5-10 chunks
  
  formatted = formatted.replace(/\[([^\]]+)\]/g, (match, content) => {
    // Check if this looks like a citation (contains numbers)
    if (!/\d/.test(content)) {
      return match; // Not a citation, leave it
    }
    
    // Double-check: if content still contains NaN/undefined after initial removal, skip it
    if (/\bNaN\b|\bundefined\b|\bnull\b/i.test(content)) {
      return ''; // Remove citation entirely if it contains invalid values
    }
    
    // Split by comma and process each number
    const numbers: number[] = [];
    for (const numStr of content.split(',')) {
      const trimmed = numStr.trim();
      // Skip empty strings
      if (!trimmed) {
        continue;
      }
      // Must be a pure integer (no letters, no decimals, no special chars)
      if (!/^\d+$/.test(trimmed)) {
        continue;
      }
      const num = parseInt(trimmed, 10);
      // Only keep valid numbers (1 to MAX_CITATION_LIMIT)
      // Using conservative limit since we don't know actual max_chunks on frontend
      if (num >= 1 && num <= MAX_CITATION_LIMIT) {
        numbers.push(num);
      }
    }
    
    if (numbers.length === 0) {
      return ''; // Remove citation if no valid numbers
    }
    
    // Remove duplicates and sort
    const uniqueNumbers = Array.from(new Set(numbers)).sort((a, b) => a - b);
    if (uniqueNumbers.length === 1) {
      return `[${uniqueNumbers[0]}]`;
    } else {
      return `[${uniqueNumbers.join(', ')}]`;
    }
  });
  
  // Step 1.7: Final validation pass - Re-validate all citations one more time
  // This catches any edge cases where cleaning might have missed something
  formatted = formatted.replace(/\[([^\]]+)\]/g, (match, content) => {
    if (!/\d/.test(content)) {
      return match;
    }
    // Check again for invalid values
    if (/\bNaN\b|\bundefined\b|\bnull\b/i.test(content)) {
      return '';
    }
    // Validate numbers again
    const numbers: number[] = [];
    for (const numStr of content.split(',')) {
      const trimmed = numStr.trim();
      if (!trimmed || !/^\d+$/.test(trimmed)) {
        continue;
      }
      const num = parseInt(trimmed, 10);
      if (num >= 1 && num <= MAX_CITATION_LIMIT) {
        numbers.push(num);
      }
    }
    if (numbers.length === 0) {
      return '';
    }
    const uniqueNumbers = Array.from(new Set(numbers)).sort((a, b) => a - b);
    return uniqueNumbers.length === 1 
      ? `[${uniqueNumbers[0]}]` 
      : `[${uniqueNumbers.join(', ')}]`;
  });
  
  // Step 1.8: Final safety pass - Remove any citations that still contain invalid values
  // This is a last resort to catch anything that slipped through
  formatted = formatted.replace(/\[[^\]]*\bNaN\b[^\]]*\]/gi, '');
  formatted = formatted.replace(/\[[^\]]*\bundefined\b[^\]]*\]/gi, '');
  formatted = formatted.replace(/\[[^\]]*\bnull\b[^\]]*\]/gi, '');

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
