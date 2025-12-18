
import { AIWeights, AI_DIFFICULTY } from '@/ai/AIController';

export type AIDifficultyLevel = 'easy' | 'normal' | 'hard' | 'god';

export interface LevelConfig {
    id: number;
    name?: string;
    targetLines: number;              // How many lines AI needs to clear to survive (Player loses)
    aiDifficultyLevel: AIDifficultyLevel;
    aiWeights: AIWeights;             // Actual weights
    aiSpeed: number;                  // AI delay in ms
    initialGrid?: number[][];         // Preset grid
    pieceChoices: number;             // 3 or 4
    timeLimit?: number;               // Seconds AI needs to survive? Or Player time?
}

export const DIFFICULTY_MAP: Record<AIDifficultyLevel, AIWeights> = {
    'easy': AI_DIFFICULTY.EASY,
    'normal': AI_DIFFICULTY.NORMAL,
    'hard': AI_DIFFICULTY.HARD,
    'god': {
        ...AI_DIFFICULTY.GOD,
        lookahead: 2, // placeholder; not implemented yet
    }
};
