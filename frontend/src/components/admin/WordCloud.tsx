import { useMemo } from "react";

interface WordCloudItem {
  word: string;
  count: number;
}

interface WordCloudProps {
  words: WordCloudItem[];
  title?: string;
  maxWords?: number;
}

export function WordCloud({ words, title, maxWords = 50 }: WordCloudProps) {
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
    if (ratio > 0.8) return "text-blue-950";
    if (ratio > 0.6) return "text-blue-800";
    if (ratio > 0.4) return "text-blue-600";
    if (ratio > 0.2) return "text-blue-400";
    return "text-blue-300";
  };

  return (
    <div className="w-full">
      {title && <h4 className="text-sm font-medium mb-4">{title}</h4>}
      <div className="flex flex-wrap gap-3 items-center justify-center p-6 bg-muted/30 rounded-lg min-h-[200px]">
        {displayWords.length === 0 ? (
          <p className="text-sm text-muted-foreground">No keywords available</p>
        ) : (
          displayWords.map((item, index) => (
            <span
              key={`${item.word}-${index}`}
              className="inline-block transition-all hover:scale-110 cursor-pointer"
              style={{ fontSize: getFontSize(item.count) }}
            >
              <span className={getColor(item.count)} title={`${item.word}: ${item.count} occurrences`}>
                {item.word}
              </span>
            </span>
          ))
        )}
      </div>
    </div>
  );
}
