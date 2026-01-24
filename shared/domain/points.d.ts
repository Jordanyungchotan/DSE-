/**
 * 积分系统领域定义（唯一真源）
 *
 * 规则：
 * - 所有积分任务在此定义
 * - 前后端共用同一套规则
 * - 禁止在其他地方定义积分逻辑
 * - 【关键】积分触发基于 learning_events 事实表，而非前端行为
 */
import { LanguageCode } from './subjects';
export interface PointTaskDefinition {
    /** 获得积分数 */
    points: number;
    /** 是否可重复完成 */
    repeatable: boolean;
    /** 每日限制次数（0 = 无限制） */
    dailyLimit: number;
    /** 任务名称（三语） */
    displayName: Record<LanguageCode, string>;
    /** 任务描述（三语） */
    description: Record<LanguageCode, string>;
    /** 触发条件（基于 learning_events，可选） */
    trigger?: {
        /** 基于 learning_events 的事件类型 */
        eventType?: 'QUIZ' | 'LEVEL_TEST' | 'ANALYSIS';
        /** 最低题目数要求 */
        minQuestionCount?: number;
        /** 最低正确率要求 (0-1) */
        minAccuracy?: number;
    };
}
export declare const POINT_TASKS: {
    readonly DAILY_LOGIN: {
        readonly points: 5;
        readonly repeatable: true;
        readonly dailyLimit: 1;
        readonly displayName: {
            readonly 'zh-HK': "每日登入";
            readonly 'zh-CN': "每日登录";
            readonly en: "Daily Login";
        };
        readonly description: {
            readonly 'zh-HK': "每日首次登入獲得積分";
            readonly 'zh-CN': "每日首次登录获得积分";
            readonly en: "Get points for daily first login";
        };
    };
    readonly COMPLETE_QUIZ: {
        readonly points: 10;
        readonly repeatable: true;
        readonly dailyLimit: 10;
        readonly displayName: {
            readonly 'zh-HK': "完成練習";
            readonly 'zh-CN': "完成练习";
            readonly en: "Complete Quiz";
        };
        readonly description: {
            readonly 'zh-HK': "完成一次有效刷題（≥5題，正確率≥50%）";
            readonly 'zh-CN': "完成一次有效刷题（≥5题，正确率≥50%）";
            readonly en: "Complete a valid quiz (≥5 questions, ≥50% accuracy)";
        };
        readonly trigger: {
            readonly eventType: "QUIZ";
            readonly minQuestionCount: 5;
            readonly minAccuracy: 0.5;
        };
    };
    readonly COMPLETE_LEVEL_TEST: {
        readonly points: 15;
        readonly repeatable: true;
        readonly dailyLimit: 5;
        readonly displayName: {
            readonly 'zh-HK': "完成水平測試";
            readonly 'zh-CN': "完成水平测试";
            readonly en: "Complete Level Test";
        };
        readonly description: {
            readonly 'zh-HK': "完成一次有效水平測試（正確率≥40%）";
            readonly 'zh-CN': "完成一次有效水平测试（正确率≥40%）";
            readonly en: "Complete a valid level test (≥40% accuracy)";
        };
        readonly trigger: {
            readonly eventType: "LEVEL_TEST";
            readonly minAccuracy: 0.4;
        };
    };
    readonly DAILY_QUIZ_30: {
        readonly points: 20;
        readonly repeatable: true;
        readonly dailyLimit: 1;
        readonly displayName: {
            readonly 'zh-HK': "每日刷題30題";
            readonly 'zh-CN': "每日刷题30题";
            readonly en: "Daily 30 Questions";
        };
        readonly description: {
            readonly 'zh-HK': "當日累計完成30道有效題目（正確率≥50%）";
            readonly 'zh-CN': "当日累计完成30道有效题目（正确率≥50%）";
            readonly en: "Complete 30 valid questions today (≥50% accuracy)";
        };
        readonly trigger: {
            readonly eventType: "QUIZ";
            readonly minQuestionCount: 30;
            readonly minAccuracy: 0.5;
        };
    };
    readonly DAILY_QUIZ_50: {
        readonly points: 30;
        readonly repeatable: true;
        readonly dailyLimit: 1;
        readonly displayName: {
            readonly 'zh-HK': "每日刷題50題";
            readonly 'zh-CN': "每日刷题50题";
            readonly en: "Daily 50 Questions";
        };
        readonly description: {
            readonly 'zh-HK': "當日累計完成50道有效題目（正確率≥50%）";
            readonly 'zh-CN': "当日累计完成50道有效题目（正确率≥50%）";
            readonly en: "Complete 50 valid questions today (≥50% accuracy)";
        };
        readonly trigger: {
            readonly eventType: "QUIZ";
            readonly minQuestionCount: 50;
            readonly minAccuracy: 0.5;
        };
    };
    readonly DAILY_QUIZ_100: {
        readonly points: 50;
        readonly repeatable: true;
        readonly dailyLimit: 1;
        readonly displayName: {
            readonly 'zh-HK': "每日刷題100題";
            readonly 'zh-CN': "每日刷题100题";
            readonly en: "Daily 100 Questions";
        };
        readonly description: {
            readonly 'zh-HK': "當日累計完成100道有效題目（正確率≥50%）";
            readonly 'zh-CN': "当日累计完成100道有效题目（正确率≥50%）";
            readonly en: "Complete 100 valid questions today (≥50% accuracy)";
        };
        readonly trigger: {
            readonly eventType: "QUIZ";
            readonly minQuestionCount: 100;
            readonly minAccuracy: 0.5;
        };
    };
    readonly COMPLETE_ANALYSIS: {
        readonly points: 20;
        readonly repeatable: true;
        readonly dailyLimit: 3;
        readonly displayName: {
            readonly 'zh-HK': "完成插班分析";
            readonly 'zh-CN': "完成插班分析";
            readonly en: "Complete Transfer Analysis";
        };
        readonly description: {
            readonly 'zh-HK': "完成一次插班分析";
            readonly 'zh-CN': "完成一次插班分析";
            readonly en: "Complete a transfer analysis";
        };
    };
    readonly COMPLETE_UNIVERSITY_ANALYSIS: {
        readonly points: 20;
        readonly repeatable: true;
        readonly dailyLimit: 3;
        readonly displayName: {
            readonly 'zh-HK': "完成大學分析";
            readonly 'zh-CN': "完成大学分析";
            readonly en: "Complete University Analysis";
        };
        readonly description: {
            readonly 'zh-HK': "完成一次大學申請分析";
            readonly 'zh-CN': "完成一次大学申请分析";
            readonly en: "Complete a university application analysis";
        };
    };
    readonly FIRST_ANALYSIS: {
        readonly points: 30;
        readonly repeatable: false;
        readonly dailyLimit: 0;
        readonly displayName: {
            readonly 'zh-HK': "首次分析";
            readonly 'zh-CN': "首次分析";
            readonly en: "First Analysis";
        };
        readonly description: {
            readonly 'zh-HK': "首次完成任意分析任務";
            readonly 'zh-CN': "首次完成任意分析任务";
            readonly en: "Complete your first analysis";
        };
    };
    readonly FIRST_QUIZ: {
        readonly points: 20;
        readonly repeatable: false;
        readonly dailyLimit: 0;
        readonly displayName: {
            readonly 'zh-HK': "首次刷題";
            readonly 'zh-CN': "首次刷题";
            readonly en: "First Quiz";
        };
        readonly description: {
            readonly 'zh-HK': "首次完成刷題練習";
            readonly 'zh-CN': "首次完成刷题练习";
            readonly en: "Complete your first quiz";
        };
    };
    readonly POST_CREATED: {
        readonly points: 5;
        readonly repeatable: true;
        readonly dailyLimit: 3;
        readonly displayName: {
            readonly 'zh-HK': "發佈帖子";
            readonly 'zh-CN': "发布帖子";
            readonly en: "Create Post";
        };
        readonly description: {
            readonly 'zh-HK': "在社區發佈一篇帖子";
            readonly 'zh-CN': "在社区发布一篇帖子";
            readonly en: "Create a post in the community";
        };
    };
    readonly POST_LIKED: {
        readonly points: 2;
        readonly repeatable: true;
        readonly dailyLimit: 20;
        readonly displayName: {
            readonly 'zh-HK': "帖子被讚";
            readonly 'zh-CN': "帖子被赞";
            readonly en: "Post Liked";
        };
        readonly description: {
            readonly 'zh-HK': "你的帖子被其他用戶點讚";
            readonly 'zh-CN': "你的帖子被其他用户点赞";
            readonly en: "Your post received a like";
        };
    };
    readonly STREAK_7_DAYS: {
        readonly points: 50;
        readonly repeatable: false;
        readonly dailyLimit: 0;
        readonly displayName: {
            readonly 'zh-HK': "連續登入7天";
            readonly 'zh-CN': "连续登录7天";
            readonly en: "7-Day Streak";
        };
        readonly description: {
            readonly 'zh-HK': "連續7天登入系統";
            readonly 'zh-CN': "连续7天登录系统";
            readonly en: "Login for 7 consecutive days";
        };
    };
    readonly STREAK_30_DAYS: {
        readonly points: 200;
        readonly repeatable: false;
        readonly dailyLimit: 0;
        readonly displayName: {
            readonly 'zh-HK': "連續登入30天";
            readonly 'zh-CN': "连续登录30天";
            readonly en: "30-Day Streak";
        };
        readonly description: {
            readonly 'zh-HK': "連續30天登入系統";
            readonly 'zh-CN': "连续30天登录系统";
            readonly en: "Login for 30 consecutive days";
        };
    };
};
export type PointTaskKey = keyof typeof POINT_TASKS;
export declare const POINT_TASK_KEYS: PointTaskKey[];
/**
 * 获取任务定义
 */
export declare function getPointTask(key: PointTaskKey): PointTaskDefinition;
/**
 * 获取任务显示名称
 */
export declare function getPointTaskDisplayName(key: PointTaskKey, lang: LanguageCode): string;
/**
 * 获取任务描述
 */
export declare function getPointTaskDescription(key: PointTaskKey, lang: LanguageCode): string;
/**
 * 检查是否为有效的任务 Key
 */
export declare function isValidPointTaskKey(key: string): key is PointTaskKey;
/**
 * 获取可重复任务列表
 */
export declare function getRepeatableTasks(): PointTaskKey[];
/**
 * 获取一次性任务列表
 */
export declare function getOneTimeTasks(): PointTaskKey[];
export interface PointsSummary {
    /** 总积分 */
    totalPoints: number;
    /** 各任务完成次数 */
    taskCounts: Partial<Record<PointTaskKey, number>>;
    /** 今日已完成次数 */
    todayCounts: Partial<Record<PointTaskKey, number>>;
}
export interface DailyTaskStatus {
    /** 任务 Key */
    taskKey: PointTaskKey;
    /** 任务显示名称（当前语言） */
    label: string;
    /** 任务描述（当前语言） */
    description: string;
    /** 是否已完成（达到每日上限） */
    completed: boolean;
    /** 今日已获得积分 */
    achievedPoints: number;
    /** 今日可获得最大积分 */
    maxPoints: number;
    /** 今日已完成次数 */
    todayCount: number;
    /** 每日限制次数 */
    dailyLimit: number;
    /** 单次积分 */
    pointsPerTime: number;
}
export interface LeaderboardEntry {
    /** 排名（后端计算，支持并列） */
    rank: number;
    /** 用户 ID */
    userId: string;
    /** 用户显示名称 */
    name: string;
    /** 用户头像 URL */
    avatarUrl?: string;
    /** 总积分 */
    score: number;
    /** 是否为当前用户 */
    isCurrentUser?: boolean;
}
export interface LeaderboardResponse {
    /** 排行榜列表 */
    rankings: LeaderboardEntry[];
    /** 当前用户排名信息（如已登录） */
    currentUserRank?: LeaderboardEntry;
    /** 总参与人数 */
    totalParticipants: number;
    /** 最后更新时间 */
    lastUpdated: string;
}
export interface PointEvent {
    id: string;
    userId: string;
    task: PointTaskKey;
    points: number;
    createdAt: string;
}
export interface PointsApiResponse<T> {
    code: number;
    data: T;
    message: string;
}
//# sourceMappingURL=points.d.ts.map