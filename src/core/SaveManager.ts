
export interface LevelStat {
    highScore: number;
    bestDifficulty: string;
    completed: boolean;
}

export interface PlayerProfile {
    totalScore: number;
    totalLinesCleared: number;
    totalPiecesPlaced: number;
    highestLevelCompleted: number;
    achievements: string[];
    levelStats: Record<number, LevelStat>;
}

export class SaveManager {
    private static readonly KEY = 'reversetetris_player_profile';

    private static defaultProfile(): PlayerProfile {
        return {
            totalScore: 0,
            totalLinesCleared: 0,
            totalPiecesPlaced: 0,
            highestLevelCompleted: 0,
            achievements: [],
            levelStats: {}
        };
    }

    public static loadProfile(): PlayerProfile {
        try {
            const data = localStorage.getItem(this.KEY);
            if (!data) return this.defaultProfile();

            const profile = JSON.parse(data);
            // Re-merge with default to handle schema updates
            return { ...this.defaultProfile(), ...profile };
        } catch (e) {
            console.error('Failed to load player profile', e);
            return this.defaultProfile();
        }
    }

    public static saveProfile(profile: PlayerProfile): void {
        try {
            localStorage.setItem(this.KEY, JSON.stringify(profile));
        } catch (e) {
            console.error('Failed to save player profile', e);
        }
    }

    public static updateStats(
        levelId: number,
        score: number,
        linesCleared: number,
        piecesPlaced: number,
        difficulty: string,
        isWin: boolean
    ): PlayerProfile {
        const profile = this.loadProfile();

        // Update cumulative stats
        profile.totalScore += score;
        profile.totalLinesCleared += linesCleared;
        profile.totalPiecesPlaced += piecesPlaced;

        // Update level specific stats
        const currentLevelStat = profile.levelStats[levelId] || { highScore: 0, bestDifficulty: 'easy', completed: false };

        if (score > currentLevelStat.highScore) {
            currentLevelStat.highScore = score;
        }

        if (isWin) {
            currentLevelStat.completed = true;
            if (levelId > profile.highestLevelCompleted) {
                profile.highestLevelCompleted = levelId;
            }

            // Difficulty achievement check
            if (difficulty === 'god' && !profile.achievements.includes('GOD_SLAYER')) {
                profile.achievements.push('GOD_SLAYER');
            }
        }

        currentLevelStat.bestDifficulty = this.compareDifficulty(currentLevelStat.bestDifficulty, difficulty);
        profile.levelStats[levelId] = currentLevelStat;

        // Global achievement checks
        this.checkGlobalAchievements(profile);

        this.saveProfile(profile);
        return profile;
    }

    private static compareDifficulty(oldDiff: string, newDiff: string): string {
        const rank = { 'easy': 1, 'normal': 2, 'hard': 3, 'god': 4 };
        if (rank[newDiff as keyof typeof rank] > rank[oldDiff as keyof typeof rank]) {
            return newDiff;
        }
        return oldDiff;
    }

    private static checkGlobalAchievements(profile: PlayerProfile): void {
        const checkMatch = (id: string, condition: boolean) => {
            if (condition && !profile.achievements.includes(id)) {
                profile.achievements.push(id);
            }
        };

        checkMatch('NOVICE_FEEDER', profile.totalPiecesPlaced >= 100);
        checkMatch('BLOCK_MASTER', profile.totalPiecesPlaced >= 1000);
        checkMatch('LINE_CRUSHER', profile.totalLinesCleared >= 100);
        checkMatch('SCORE_MILLIONAIRE', profile.totalScore >= 100000);
    }
}
