/**
 * DSE水平测试服务
 *
 * 提供水平测试的核心业务逻辑
 */
export interface TestConfig {
    grade: '中四' | '中五' | '中六';
    subject: string;
    testType: 'quick' | 'full';
}
export interface GeneratedQuestion {
    id: string;
    questionIndex: number;
    questionText: string;
    questionType: 'choice' | 'short' | 'long';
    options?: string[];
    correctAnswer: string;
    scoringPoints?: string[];
    difficulty: 'easy' | 'medium' | 'hard';
    difficultyWeight: number;
    estimatedTime: number;
    knowledgePoints: string[];
    dseReference?: string;
    topic?: string;
    maxScore: number;
}
export interface LevelTest {
    id: string;
    userId: string;
    grade: string;
    subject: string;
    testType: string;
    status: string;
    timeLimit: number;
    questions: GeneratedQuestion[];
    createdAt: string;
}
export interface TestSubmission {
    answers: Array<{
        questionId: string;
        answer: string;
        timeSpent?: number;
    }>;
    totalTimeSpent: number;
}
export interface GradingResult {
    questionId: string;
    userAnswer: string;
    correctAnswer: string;
    isCorrect: boolean;
    score: number;
    maxScore: number;
    feedback: string;
    autoGraded: boolean;
}
export interface TestReport {
    testId: string;
    overallLevel: string;
    overallScore: number;
    gradeEquivalent: string;
    abilityRadar: {
        knowledge: number;
        application: number;
        analysis: number;
        synthesis: number;
        evaluation: number;
    };
    strengthPoints: string[];
    weaknessPoints: string[];
    errorPatterns: Array<{
        type: string;
        count: number;
        examples: string[];
    }>;
    recommendations: Array<{
        priority: number;
        topic: string;
        suggestion: string;
        resources: string[];
    }>;
    peerComparison: {
        sameGradePercentile: number;
        sameSubjectPercentile: number;
    };
}
export declare function scoreToLevel(score: number): string;
export declare function levelToDescription(level: string): string;
export declare const TEST_CONFIG: {
    quick: {
        questionCount: {
            min: number;
            max: number;
        };
        timeLimit: number;
        distribution: {
            choice: number;
            short: number;
            long: number;
        };
        difficultyDistribution: {
            easy: number;
            medium: number;
            hard: number;
        };
    };
    full: {
        questionCount: {
            min: number;
            max: number;
        };
        timeLimit: number;
        distribution: {
            choice: number;
            short: number;
            long: number;
        };
        difficultyDistribution: {
            easy: number;
            medium: number;
            hard: number;
        };
    };
};
export declare const SUBJECTS: {
    core: string[];
    elective: string[];
};
export declare const SUBJECT_TOPICS: Record<string, Record<string, string[]>>;
export declare const DIFFICULTY_WEIGHTS: {
    easy: number;
    medium: number;
    hard: number;
};
export declare const SCORE_CONFIG: {
    choice: {
        easy: number;
        medium: number;
        hard: number;
    };
    short: {
        easy: number;
        medium: number;
        hard: number;
    };
    long: {
        easy: number;
        medium: number;
        hard: number;
    };
};
export declare const ESTIMATED_TIME: {
    choice: {
        easy: number;
        medium: number;
        hard: number;
    };
    short: {
        easy: number;
        medium: number;
        hard: number;
    };
    long: {
        easy: number;
        medium: number;
        hard: number;
    };
};
/**
 * 生成UUID
 */
export declare function generateId(): string;
/**
 * 计算测试所需题目数量
 */
export declare function calculateQuestionDistribution(testType: 'quick' | 'full'): {
    choice: {
        easy: number;
        medium: number;
        hard: number;
    };
    short: {
        easy: number;
        medium: number;
        hard: number;
    };
    long: {
        easy: number;
        medium: number;
        hard: number;
    };
};
/**
 * 计算加权得分
 */
export declare function calculateWeightedScore(results: GradingResult[], questions: GeneratedQuestion[]): {
    rawScore: number;
    weightedScore: number;
    finalScore: number;
};
/**
 * 分析能力维度
 */
export declare function analyzeAbilityDimensions(results: GradingResult[], questions: GeneratedQuestion[]): {
    knowledge: number;
    application: number;
    analysis: number;
    synthesis: number;
    evaluation: number;
};
/**
 * 识别优势和薄弱知识点
 */
export declare function analyzeKnowledgePoints(results: GradingResult[], questions: GeneratedQuestion[]): {
    strengthPoints: string[];
    weaknessPoints: string[];
};
/**
 * 计算等价年级水平
 */
export declare function calculateGradeEquivalent(score: number, targetGrade: string): string;
/**
 * 生成学习建议
 */
export declare function generateRecommendations(weaknessPoints: string[], subject: string, grade: string): Array<{
    priority: number;
    topic: string;
    suggestion: string;
    resources: string[];
}>;
//# sourceMappingURL=levelTestService.d.ts.map