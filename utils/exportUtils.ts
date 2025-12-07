import JSZip from 'jszip';
import { Project } from '../types';

// Helper to generate UUID
const generateUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

// Convert SRT timestamp (00:00:05,500) to Microseconds
const timeToMicroseconds = (timeStr: string): number => {
    if (!timeStr) return 0;
    const [h, m, sWithMs] = timeStr.split(':');
    const [s, ms] = sWithMs.split(',');
    const totalSeconds = parseInt(h) * 3600 + parseInt(m) * 60 + parseInt(s) + parseInt(ms) / 1000;
    return Math.round(totalSeconds * 1000000);
};

export const exportToJianYing = async (project: Project): Promise<void> => {
  const zip = new JSZip();
  const folderName = `JianYing_Draft_${project.name.replace(/\s+/g, '_')}`;
  const root = zip.folder(folderName);

  if (!root) throw new Error("Could not create zip folder");

  // Arrays to hold JianYing JSON structure
  const materials = {
      videos: [] as any[],
      speeds: [] as any[],
      canvases: [] as any[],
      sound_channel_mappings: [] as any[]
  };
  
  const tracks: any[] = [{
      id: generateUUID(),
      type: "video",
      segments: [] as any[]
  }];

  let currentTimeOffset = 0;
  
  const base64ToBlob = async (base64: string) => {
    const res = await fetch(base64);
    return await res.blob();
  };

  for (let i = 0; i < project.frames.length; i++) {
    const frame = project.frames[i];
    
    // Only process frames with images for the video track
    // If no image, we skip it in the track but it might mess up sync. 
    // Ideally, we should place a placeholder, but let's assume images exist or skip.
    if (!frame.imageUrl) continue;

    try {
        const blob = await base64ToBlob(frame.imageUrl);
        const fileName = `${(i + 1).toString().padStart(3, '0')}.png`;
        
        // Add image file to zip
        root.file(fileName, blob);

        // --- JianYing Logic ---
        
        // 1. Determine Duration
        let duration = 3000000; // Default 3s (in us)
        if (frame.startTime && frame.endTime) {
            const startUs = timeToMicroseconds(frame.startTime);
            const endUs = timeToMicroseconds(frame.endTime);
            duration = endUs - startUs;
        }

        const materialId = generateUUID();
        
        // 2. Add to Materials -> Videos
        materials.videos.push({
            id: materialId,
            type: "photo",
            path: fileName, // Relative path, hoping JianYing resolves it or asks user to relocate
            material_name: fileName,
            duration: 10800000000, // Arbitrary long duration for photo source
            height: 0,
            width: 0
        });

        // 3. Add to Track Segments
        tracks[0].segments.push({
            id: generateUUID(),
            material_id: materialId,
            target_timerange: {
                start: currentTimeOffset,
                duration: duration
            },
            source_timerange: {
                start: 0,
                duration: duration
            }
        });

        currentTimeOffset += duration;

    } catch (e) {
        console.error(`Failed to add image for frame ${i+1}`, e);
    }
  }

  // Generate draft_content.json
  const draftContent = {
      materials: materials,
      tracks: tracks,
      id: generateUUID(),
      version: 2, // Simple version
      canvas_config: {
          width: 1920,
          height: 1080,
          ratio: "16:9"
      }
  };
  
  // Generate draft_meta.info (Required for JianYing to recognize it as a draft bundle)
  const draftMeta = {
      id: generateUUID(),
      name: project.name,
      draft_root_path: "",
      draft_fold_path: "",
      tm_draft_create: Date.now(),
      tm_draft_modified: Date.now()
  };

  root.file("draft_content.json", JSON.stringify(draftContent, null, 2));
  root.file("draft_meta.info", JSON.stringify(draftMeta, null, 2));

  // Generate Download
  const content = await zip.generateAsync({ type: "blob" });
  
  const url = window.URL.createObjectURL(content);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${folderName}.zip`;
  document.body.appendChild(a);
  a.click();
  
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
  
  return;
};