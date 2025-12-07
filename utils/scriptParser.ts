/**
 * Parses raw script text into frames.
 * Priority:
 * 1. Numbered lists (1. xxx or 1、xxx)
 * 2. Line by line
 */
export const parseScriptToFrames = (text: string): string[] => {
  if (!text) return [];

  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  
  // Check for numbered pattern (e.g., "1.", "1、", "1 ") at start of lines
  const numberedPattern = /^(\d+)[\.\、\s]\s*(.*)/;
  
  const hasNumbering = lines.some(line => numberedPattern.test(line));

  if (hasNumbering) {
    const frames: string[] = [];
    let currentBuffer = "";

    lines.forEach(line => {
        const match = line.match(numberedPattern);
        if (match) {
            // If we have a buffer from previous frame, push it
            if (currentBuffer) {
                frames.push(currentBuffer);
            }
            // Start new frame
            currentBuffer = match[2]; // The content after number
        } else {
            // Append to current frame (multiline frame logic)
            if (currentBuffer) {
                currentBuffer += "\n" + line;
            } else {
                // Case where text starts without number but numbering exists later
                currentBuffer = line;
            }
        }
    });
    // Push last buffer
    if (currentBuffer) frames.push(currentBuffer);
    
    // Fallback: if numbering parsing failed to produce arrays (rare), fallback to lines
    return frames.length > 0 ? frames : lines;
  } else {
    // No numbering detected, strict line-by-line
    return lines;
  }
};

/**
 * Splits text into two parts:
 * Part 1: Everything except the last sentence/segment.
 * Part 2: The last sentence/segment.
 * Delimiters: 。！？.!?
 */
export const splitLastSentence = (text: string): [string, string] => {
  const trimmed = text.trim();
  if (!trimmed) return ["", ""];

  const parts = trimmed.split(/([。！？.!?]+["”’']?\s*)/).filter(p => p.length > 0);

  if (parts.length <= 1) {
    return [trimmed, ""]; 
  }

  const sentences: string[] = [];
  for (let i = 0; i < parts.length; i += 2) {
    const textPart = parts[i];
    const punctPart = parts[i+1] || "";
    sentences.push(textPart + punctPart);
  }

  if (sentences.length === 0) return [trimmed, ""];
  if (sentences.length === 1) return [sentences[0], ""]; 

  const last = sentences.pop()!;
  const rest = sentences.join("");
  
  return [rest, last];
};

/**
 * Formats script content for display:
 * Replaces punctuations (comma, period, etc.) and spaces with newlines for visual clarity.
 */
export const formatScriptText = (text: string): string => {
  if (!text) return "";
  // 1. Replace Chinese/English punctuation with newline + punctuation (optional) or just break after them
  // The request says "还录下来威胁 这女人" -> split by space or punctuation
  // Logic: Replace separators with Newline
  
  return text
    // Replace punctuation followed by anything with Punctuation + Newline
    .replace(/([，,。！？.!?]+)/g, "$1\n") 
    // Replace multiple spaces with Newline
    .replace(/\s{2,}/g, "\n")
    // Clean up
    .replace(/\n\s+/g, "\n")
    .replace(/\n+/g, "\n")
    .trim();
};