/**
 * 积分系统领域定义（唯一真源）
 *
 * 规则：
 * - 所有积分任务在此定义
 * - 前后端共用同一套规则
 * - 禁止在其他地方定义积分逻辑
 * - 【关键】积分触发基于 learning_events 事实表，而非前端行为
 */
export const POINT_TASKS = {
    // ===== 每日任务 =====
    DAILY_LOGIN: {
        points: 5,
        repeatable: true,
        dailyLimit: 1,
        displayName: {
            'zh-HK': '每日登入',
            'zh-CN': '每日登录',
            en: 'Daily Login',
        },
        description: {
            'zh-HK': '每日首次登入獲得積分',
            'zh-CN': '每日首次登录获得积分',
            en: 'Get points for daily first login',
        },
    },
    // ===== 学习任务（基于 learning_events 触发）=====
    COMPLETE_QUIZ: {
        points: 10,
        repeatable: true,
        dailyLimit: 10,
        displayName: {
            'zh-HK': '完成練習',
            'zh-CN': '完成练习',
            en: 'Complete Quiz',
        },
        description: {
            'zh-HK': '完成一次有效刷題（≥5題，正確率≥50%）',
            'zh-CN': '完成一次有效刷题（≥5题，正确率≥50%）',
            en: 'Complete a valid quiz (≥5 questions, ≥50% accuracy)',
        },
        // 【关键】基于 learning_events 触发，而非前端行为
        trigger: {
            eventType: 'QUIZ',
            minQuestionCount: 5,
            minAccuracy: 0.5,
        },
    },
    COMPLETE_LEVEL_TEST: {
        points: 15,
        repeatable: true,
        dailyLimit: 5,
        displayName: {
            'zh-HK': '完成水平測試',
            'zh-CN': '完成水平测试',
            en: 'Complete Level Test',
        },
        description: {
            'zh-HK': '完成一次有效水平測試（正確率≥40%）',
            'zh-CN': '完成一次有效水平测试（正确率≥40%）',
            en: 'Complete a valid level test (≥40% accuracy)',
        },
        trigger: {
            eventType: 'LEVEL_TEST',
            minAccuracy: 0.4,
        },
    },
    // ===== 每日刷题里程碑任务 =====
    DAILY_QUIZ_30: {
        points: 20,
        repeatable: true,
        dailyLimit: 1,
        displayName: {
            'zh-HK': '每日刷題30題',
            'zh-CN': '每日刷题30题',
            en: 'Daily 30 Questions',
        },
        description: {
            'zh-HK': '當日累計完成30道有效題目（正確率≥50%）',
            'zh-CN': '当日累计完成30道有效题目（正确率≥50%）',
            en: 'Complete 30 valid questions today (≥50% accuracy)',
        },
        trigger: {
            eventType: 'QUIZ',
            minQuestionCount: 30,
            minAccuracy: 0.5,
        },
    },
    DAILY_QUIZ_50: {
        points: 30,
        repeatable: true,
        dailyLimit: 1,
        displayName: {
            'zh-HK': '每日刷題50題',
            'zh-CN': '每日刷题50题',
            en: 'Daily 50 Questions',
        },
        description: {
            'zh-HK': '當日累計完成50道有效題目（正確率≥50%）',
            'zh-CN': '当日累计完成50道有效题目（正确率≥50%）',
            en: 'Complete 50 valid questions today (≥50% accuracy)',
        },
        trigger: {
            eventType: 'QUIZ',
            minQuestionCount: 50,
            minAccuracy: 0.5,
        },
    },
    DAILY_QUIZ_100: {
        points: 50,
        repeatable: true,
        dailyLimit: 1,
        displayName: {
            'zh-HK': '每日刷題100題',
            'zh-CN': '每日刷题100题',
            en: 'Daily 100 Questions',
        },
        description: {
            'zh-HK': '當日累計完成100道有效題目（正確率≥50%）',
            'zh-CN': '当日累计完成100道有效题目（正确率≥50%）',
            en: 'Complete 100 valid questions today (≥50% accuracy)',
        },
        trigger: {
            eventType: 'QUIZ',
            minQuestionCount: 100,
            minAccuracy: 0.5,
        },
    },
    // ===== 分析任务 =====
    COMPLETE_ANALYSIS: {
        points: 20,
        repeatable: true,
        dailyLimit: 3,
        displayName: {
            'zh-HK': '完成插班分析',
            'zh-CN': '完成插班分析',
            en: 'Complete Transfer Analysis',
        },
        description: {
            'zh-HK': '完成一次插班分析',
            'zh-CN': '完成一次插班分析',
            en: 'Complete a transfer analysis',
        },
    },
    COMPLETE_UNIVERSITY_ANALYSIS: {
        points: 20,
        repeatable: true,
        dailyLimit: 3,
        displayName: {
            'zh-HK': '完成大學分析',
            'zh-CN': '完成大学分析',
            en: 'Complete University Analysis',
        },
        description: {
            'zh-HK': '完成一次大學申請分析',
            'zh-CN': '完成一次大学申请分析',
            en: 'Complete a university application analysis',
        },
    },
    // ===== 首次任务（不可重复） =====
    FIRST_ANALYSIS: {
        points: 30,
        repeatable: false,
        dailyLimit: 0,
        displayName: {
            'zh-HK': '首次分析',
            'zh-CN': '首次分析',
            en: 'First Analysis',
        },
        description: {
            'zh-HK': '首次完成任意分析任務',
            'zh-CN': '首次完成任意分析任务',
            en: 'Complete your first analysis',
        },
    },
    FIRST_QUIZ: {
        points: 20,
        repeatable: false,
        dailyLimit: 0,
        displayName: {
            'zh-HK': '首次刷題',
            'zh-CN': '首次刷题',
            en: 'First Quiz',
        },
        description: {
            'zh-HK': '首次完成刷題練習',
            'zh-CN': '首次完成刷题练习',
            en: 'Complete your first quiz',
        },
    },
    // ===== 社区任务 =====
    POST_CREATED: {
        points: 5,
        repeatable: true,
        dailyLimit: 3,
        displayName: {
            'zh-HK': '發佈帖子',
            'zh-CN': '发布帖子',
            en: 'Create Post',
        },
        description: {
            'zh-HK': '在社區發佈一篇帖子',
            'zh-CN': '在社区发布一篇帖子',
            en: 'Create a post in the community',
        },
    },
    POST_LIKED: {
        points: 2,
        repeatable: true,
        dailyLimit: 20,
        displayName: {
            'zh-HK': '帖子被讚',
            'zh-CN': '帖子被赞',
            en: 'Post Liked',
        },
        description: {
            'zh-HK': '你的帖子被其他用戶點讚',
            'zh-CN': '你的帖子被其他用户点赞',
            en: 'Your post received a like',
        },
    },
    // ===== 成就任务 =====
    STREAK_7_DAYS: {
        points: 50,
        repeatable: false,
        dailyLimit: 0,
        displayName: {
            'zh-HK': '連續登入7天',
            'zh-CN': '连续登录7天',
            en: '7-Day Streak',
        },
        description: {
            'zh-HK': '連續7天登入系統',
            'zh-CN': '连续7天登录系统',
            en: 'Login for 7 consecutive days',
        },
    },
    STREAK_30_DAYS: {
        points: 200,
        repeatable: false,
        dailyLimit: 0,
        displayName: {
            'zh-HK': '連續登入30天',
            'zh-CN': '连续登录30天',
            en: '30-Day Streak',
        },
        description: {
            'zh-HK': '連續30天登入系統',
            'zh-CN': '连续30天登录系统',
            en: 'Login for 30 consecutive days',
        },
    },
};
// ===== 积分任务 Key 列表 =====
export const POINT_TASK_KEYS = Object.keys(POINT_TASKS);
// ===== 辅助函数 =====
/**
 * 获取任务定义
 */
export function getPointTask(key) {
    return POINT_TASKS[key];
}
/**
 * 获取任务显示名称
 */
export function getPointTaskDisplayName(key, lang) {
    return POINT_TASKS[key]?.displayName[lang] ?? key;
}
/**
 * 获取任务描述
 */
export function getPointTaskDescription(key, lang) {
    return POINT_TASKS[key]?.description[lang] ?? '';
}
/**
 * 检查是否为有效的任务 Key
 */
export function isValidPointTaskKey(key) {
    return key in POINT_TASKS;
}
/**
 * 获取可重复任务列表
 */
export function getRepeatableTasks() {
    return POINT_TASK_KEYS.filter(key => POINT_TASKS[key].repeatable);
}
/**
 * 获取一次性任务列表
 */
export function getOneTimeTasks() {
    return POINT_TASK_KEYS.filter(key => !POINT_TASKS[key].repeatable);
}
//# sourceMappingURL=points.js.map