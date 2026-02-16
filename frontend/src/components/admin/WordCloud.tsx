import { useMemo, useRef, useState } from "react";
import { useAccessibility } from "@/contexts/AccessibilityContext";
import { getChartTheme, chartA11y } from "@/lib/chartTheme";

interface WordCloudItem {
  word: string;
  count: number;
}

interface WordCloudProps {
  words: WordCloudItem[];
  title?: string;
  maxWords?: number;
  onWordClick?: (word: WordCloudItem) => void;
}

export function WordCloud({ words, title, maxWords = 50, onWordClick }: WordCloudProps) {
  const { highContrast, reduceMotion } = useAccessibility();
  const theme = getChartTheme(highContrast);
  const chartId = useRef(`wordcloud-${Math.random().toString(36).substr(2, 9)}`);
  const [focusedWord, setFocusedWord] = useState<string | null>(null);

  const displayWords = useMemo(() => {
    const sorted = [...words].sort((a, b) => b.count - a.count);
    return sorted.slice(0, maxWords);
  }, [words, maxWords]);

  const maxCount = displayWords[0]?.count || 1;
  const minCount = displayWords[displayWords.length - 1]?.count || 1;

  const getFontSize = (count: number): string => {
    const ratio = (count - minCount) / (maxCount - minCount);
    const minSize = 12;
    const maxSize = 48;
    const size = minSize + ratio * (maxSize - minSize);
    return `${size}px`;
  };

  const getColor = (count: number): string => {
    const ratio = (count - minCount) / (maxCount - minCount);
    if (ratio > 0.8) return "text-blue-950 dark:text-blue-300";
    if (ratio > 0.6) return "text-blue-800 dark:text-blue-400";
    if (ratio > 0.4) return "text-blue-600 dark:text-blue-500";
    if (ratio > 0.2) return "text-blue-400 dark:text-blue-600";
    return "text-blue-300 dark:text-blue-700";
  };

  // Generate data summary for screen readers
  const dataSummary = useMemo(() => {
    if (displayWords.length === 0) return "No keywords available";
    const topWords = displayWords.slice(0, 5).map((w) => `${w.word} (${w.count})`).join(", ");
    return `Top keywords: ${topWords}. Total ${displayWords.length} words displayed.`;
  }, [displayWords]);

  const chartLabel = title
    ? chartA11y.getChartLabel(title, "wordcloud", displayWords.length)
    : `Word cloud with ${displayWords.length} words`;

  const handleWordClick = (word: WordCloudItem) => {
    if (onWordClick) {
      onWordClick(word);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, word: WordCloudItem) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleWordClick(word);
    }
  };

  return (
    <div className="w-full" role="region" aria-labelledby={`${chartId.current}-title`}>
      {title && (
        <h4 id={`${chartId.current}-title`} className="text-sm font-medium mb-4">
          {title}
        </h4>
      )}
      <div
        className="flex flex-wrap gap-3 items-center justify-center p-6 bg-muted/30 rounded-lg min-h-[200px]"
        role="img"
        aria-label={chartLabel}
        aria-describedby={`${chartId.current}-description`}
      >
        <div id={`${chartId.current}-description`} className="sr-only">
          {dataSummary}
        </div>
        {displayWords.length === 0 ? (
          <p className="text-sm text-muted-foreground" role="status">
            No keywords available
          </p>
        ) : (
          displayWords.map((item, index) => {
            const wordId = `${chartId.current}-word-${index}`;
            const isFocused = focusedWord === wordId;
            return (
              <button
                key={`${item.word}-${index}`}
                id={wordId}
                type="button"
                className={`inline-block transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-1 rounded px-1 ${
                  reduceMotion ? "" : "hover:scale-110"
                }`}
                style={{
                  fontSize: getFontSize(item.count),
                  focusRingColor: theme.accessibility.focusRing,
                }}
                onClick={() => handleWordClick(item)}
                onKeyDown={(e) => handleKeyDown(e, item)}
                onFocus={() => setFocusedWord(wordId)}
                onBlur={() => setFocusedWord(null)}
                aria-label={`${item.word}: ${item.count} occurrence${item.count !== 1 ? "s" : ""}`}
                tabIndex={0}
              >
                <span className={getColor(item.count)}>{item.word}</span>
              </button>
            );
          })
        )}
      </div>
      {/* Data list for screen readers */}
      <div className="sr-only">
        <ol>
          {displayWords.map((item, index) => (
            <li key={`${item.word}-${index}`}>
              {item.word}: {item.count} occurrence{item.count !== 1 ? "s" : ""}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
