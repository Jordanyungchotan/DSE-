/**
 * DSE水平测试 - DeepSeek API 提示词模板
 *
 * 用于生成符合香港DSE标准的测试题目
 */
export declare const SYSTEM_PROMPT = "\u4F60\u662F\u4E00\u4F4D\u8D44\u6DF1\u7684\u9999\u6E2FDSE\u8003\u8BD5\u51FA\u9898\u4E13\u5BB6\uFF0C\u62E5\u6709\u8D85\u8FC715\u5E74\u7684DSE\u547D\u9898\u7ECF\u9A8C\u3002\u4F60\u719F\u6089\u9999\u6E2F\u8003\u8BC4\u5C40\u7684\u8BFE\u7A0B\u7EB2\u8981\u548C\u8BC4\u5206\u6807\u51C6\u3002\n\n\u4F60\u7684\u4EFB\u52A1\u662F\u751F\u6210\u9AD8\u8D28\u91CF\u7684DSE\u6C34\u5E73\u6D4B\u8BD5\u9898\u76EE\uFF0C\u7528\u4E8E\u51C6\u786E\u8BC4\u4F30\u5B66\u751F\u7684\u5B9E\u9645\u5B66\u4E1A\u6C34\u5E73\u3002\n\n\u751F\u6210\u9898\u76EE\u65F6\u5FC5\u987B\u9075\u5B88\u4EE5\u4E0B\u539F\u5219\uFF1A\n1. \u4E25\u683C\u9075\u5B88\u9999\u6E2F\u8003\u8BC4\u5C40\u8BFE\u7A0B\u7EB2\u8981\n2. \u9898\u76EE\u96BE\u5EA6\u5FC5\u987B\u7B26\u5408\u6307\u5B9A\u5E74\u7EA7\u6C34\u5E73\n3. \u9898\u76EE\u5FC5\u987B\u6709\u660E\u786E\u7684\u8BC4\u5206\u6807\u51C6\n4. \u907F\u514D\u6709\u6B67\u4E49\u6216\u4E0D\u516C\u5E73\u7684\u9898\u76EE\n5. \u786E\u4FDD\u9898\u76EE\u5177\u6709\u533A\u5206\u5EA6\uFF0C\u80FD\u533A\u5206\u4E0D\u540C\u6C34\u5E73\u7684\u5B66\u751F\n\n\u8BF7\u4F7F\u7528\u7B80\u4F53\u4E2D\u6587\u56DE\u7B54\uFF08\u9664\u975E\u662F\u82F1\u6587\u79D1\u76EE\uFF09\u3002";
export declare function getChoiceQuestionPrompt(subject: string, grade: string, difficulty: 'easy' | 'medium' | 'hard', count: number, topics?: string[]): string;
export declare function getShortAnswerPrompt(subject: string, grade: string, difficulty: 'easy' | 'medium' | 'hard', count: number, topics?: string[]): string;
export declare function getLongAnswerPrompt(subject: string, grade: string, difficulty: 'easy' | 'medium' | 'hard', count: number, topics?: string[]): string;
export declare function getFullTestPrompt(subject: string, grade: string, distribution: {
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
}): string;
export declare function getGradingPrompt(question: {
    questionText: string;
    questionType: 'choice' | 'short' | 'long';
    correctAnswer: string;
    scoringPoints?: string[];
    maxScore: number;
}, userAnswer: string): string;
export declare function getReportPrompt(testInfo: {
    subject: string;
    grade: string;
    score: number;
    level: string;
    abilityRadar: Record<string, number>;
    strengthPoints: string[];
    weaknessPoints: string[];
}): string;
export declare function getEnglishQuestionPrompt(grade: string, questionType: 'choice' | 'short' | 'long', difficulty: 'easy' | 'medium' | 'hard', count: number): string;
//# sourceMappingURL=levelTestPrompts.d.ts.map