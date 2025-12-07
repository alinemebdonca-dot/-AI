
import { AspectRatio, GenerationModel, Project, Character } from "./types";

export const ASPECT_RATIOS: AspectRatio[] = ['1:1', '4:3', '3:4', '16:9', '9:16'];

export const MODELS = [
  { value: GenerationModel.GEMINI_2_5_FLASH_IMAGE, label: 'NanoBanana' },
  { value: GenerationModel.GEMINI_3_PRO_IMAGE_PREVIEW, label: 'NanoBanana Pro' },
];

export const MOCK_CHARACTERS: Character[] = [
  {
    id: 'char_1',
    name: 'Li Ming',
    description: 'A young man, 22 years old, short black hair, wearing a white hoodie and denim jeans. Energetic expression.',
    referenceImage: 'https://picsum.photos/200/300'
  }
];

export const MOCK_PROJECTS: Project[] = [
  {
    id: 'proj_1',
    name: 'Campus Life Ep.1',
    createdAt: Date.now() - 10000000,
    updatedAt: Date.now() - 5000,
    status: '草稿',
    localCharacters: [],
    styles: [],
    frames: []
  },
  {
    id: 'proj_2',
    name: 'Sci-Fi Short 04',
    createdAt: Date.now() - 20000000,
    updatedAt: Date.now() - 100000,
    status: '草稿',
    localCharacters: [],
    styles: [],
    frames: []
  }
];
