import { StoryboardFrame } from "../types";

export interface SubtitleItem {
  id: number;
  startTime: string;
  endTime: string;
  text: string;
}

export const parseSRT = (srtContent: string): SubtitleItem[] => {
  const items: SubtitleItem[] = [];
  const blocks = srtContent.trim().replace(/\r\n/g, '\n').split('\n\n');

  blocks.forEach(block => {
    const lines = block.split('\n');
    if (lines.length >= 3) {
      const id = parseInt(lines[0], 10);
      const timeMatch = lines[1].match(/(\d{2}:\d{2}:\d{2},\d{3}) --> (\d{2}:\d{2}:\d{2},\d{3})/);
      
      if (timeMatch) {
        // Combine remaining lines as text
        const text = lines.slice(2).join(' ');
        items.push({
          id,
          startTime: timeMatch[1],
          endTime: timeMatch[2],
          text
        });
      }
    }
  });

  return items;
};

/**
 * Converts frames back to SRT string.
 * If frames don't have timecodes, it generates fake ones (3s per frame).
 */
export const framesToSRT = (frames: StoryboardFrame[]): string => {
  let output = "";
  let currentTime = 0; // in seconds

  const formatTime = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
  };

  const timeToSeconds = (timeStr: string): number => {
      const [h, m, sWithMs] = timeStr.split(':');
      const [s, ms] = sWithMs.split(',');
      return parseInt(h) * 3600 + parseInt(m) * 60 + parseInt(s) + parseInt(ms) / 1000;
  };

  frames.forEach((frame, index) => {
    let start = "";
    let end = "";

    if (frame.startTime && frame.endTime) {
        start = frame.startTime;
        end = frame.endTime;
        // Update current time tracker to end of this frame
        try {
            currentTime = timeToSeconds(end);
        } catch(e) {}
    } else {
        // Auto generate 3 seconds duration
        start = formatTime(currentTime);
        end = formatTime(currentTime + 3);
        currentTime += 3;
    }

    // Clean newlines in script content for SRT text
    const text = frame.scriptContent.replace(/\n/g, ' ');

    output += `${index + 1}\n`;
    output += `${start} --> ${end}\n`;
    output += `${text}\n\n`;
  });

  return output;
};