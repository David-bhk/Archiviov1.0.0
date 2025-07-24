import { CSSProperties } from "react";

export interface TextOverflowOptions {
  lines?: number;
  wordBreak?: "normal" | "break-all" | "break-word" | "keep-all";
}

export function useTextOverflow({ lines = 1, wordBreak = "break-word" }: TextOverflowOptions = {}) {
  const style: CSSProperties = lines === 1 
    ? {
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        wordBreak
      }
    : {
        display: '-webkit-box',
        WebkitLineClamp: lines,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
        wordBreak
      };

  return { style };
}

export function getTruncatedTextStyle(lines: number = 1, wordBreak: string = "break-word"): CSSProperties {
  if (lines === 1) {
    return {
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
      wordBreak: wordBreak as any
    };
  }
  
  return {
    display: '-webkit-box',
    WebkitLineClamp: lines,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
    wordBreak: wordBreak as any
  };
}
