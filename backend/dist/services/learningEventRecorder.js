/**
 * 学习行为事件记录器
 *
 * ⚠️ learning_events 是排行榜、积分、学习分析的【唯一事实来源】
 * ⚠️ 禁止从 quiz 表读取数据进行统计
 *
 * 统一记录所有学习行为到 learning_events 表
 *
 * 规则：
 * - append-only：只增不改
 * - 所有统计必须从 learning_events 读取
 * - 禁止直接读取 quiz_sessions / level_tests 表进行统计
 *
 * 禁止数据源：
 * - ❌ quiz_sessions / quiz_results 表
 * - ❌ 前端统计结果
 * - ❌ session / store 中的临时值
 */
// ===== 记录学习事件 =====
/**
 * 记录学习行为事件
 *
 * 使用示例：
 * await recordLearningEvent(db, {
 *   userId: 'user-123',
 *   eventType: 'QUIZ',
 *   subject: '数学',
 *   questionCount: 10,
 *   correctCount: 8,
 *   durationSeconds: 300,
 *   sourceId: 'quiz-session-abc'
 * });
 */
export async function recordLearningEvent(db, input) {
    try {
        const { userId, eventType, subject, questionCount, correctCount, durationSeconds, accuracy: inputAccuracy, sourceId, metadata, } = input;
        // 自动计算正确率
        const accuracy = inputAccuracy ?? (questionCount > 0 ? correctCount / questionCount : 0);
        // 序列化 metadata
        const metadataJson = metadata ? JSON.stringify(metadata) : null;
        // 插入事件
        const result = await db.prepare(`
      INSERT INTO learning_events (
        user_id, event_type, subject, question_count, correct_count,
        duration_seconds, accuracy, source_id, metadata, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).bind(userId, eventType, subject || null, questionCount, correctCount, durationSeconds, accuracy, sourceId || null, metadataJson).run();
        if (result.success) {
            // 获取插入的 ID（SQLite）
            const lastRow = await db.prepare('SELECT last_insert_rowid() as id').first();
            return { success: true, eventId: lastRow?.id };
        }
        return { success: false, error: '插入失败' };
    }
    catch (error) {
        console.error('Record learning event error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : '未知错误'
        };
    }
}
// ===== 批量记录 =====
/**
 * 批量记录学习事件
 */
export async function recordLearningEventsBatch(db, events) {
    const errors = [];
    let successCount = 0;
    for (const event of events) {
        const result = await recordLearningEvent(db, event);
        if (result.success) {
            successCount++;
        }
        else if (result.error) {
            errors.push(`Event for user ${event.userId}: ${result.error}`);
        }
    }
    return {
        success: errors.length === 0,
        count: successCount,
        errors,
    };
}
// ===== 统计查询 =====
/**
 * 获取用户学习统计（从 learning_events 读取）
 */
export async function getUserLearningStats(db, userId, options) {
    const { eventType, subject, startDate, endDate } = options || {};
    // 构建条件
    const conditions = ['user_id = ?'];
    const params = [userId];
    if (eventType) {
        conditions.push('event_type = ?');
        params.push(eventType);
    }
    if (subject) {
        conditions.push('subject = ?');
        params.push(subject);
    }
    if (startDate) {
        conditions.push('DATE(created_at) >= ?');
        params.push(startDate);
    }
    if (endDate) {
        conditions.push('DATE(created_at) <= ?');
        params.push(endDate);
    }
    const whereClause = conditions.join(' AND ');
    // 总体统计
    const overallQuery = `
    SELECT 
      COUNT(*) as quiz_count,
      COALESCE(SUM(question_count), 0) as total_questions,
      COALESCE(SUM(correct_count), 0) as total_correct,
      COALESCE(SUM(duration_seconds), 0) as total_duration,
      COALESCE(AVG(accuracy), 0) as avg_accuracy
    FROM learning_events
    WHERE ${whereClause}
  `;
    const overall = await db.prepare(overallQuery).bind(...params).first();
    // 分科目统计
    const subjectQuery = `
    SELECT 
      subject,
      COUNT(*) as quiz_count,
      COALESCE(SUM(question_count), 0) as total_questions,
      COALESCE(SUM(correct_count), 0) as total_correct,
      COALESCE(AVG(accuracy), 0) as avg_accuracy
    FROM learning_events
    WHERE ${whereClause} AND subject IS NOT NULL
    GROUP BY subject
  `;
    const subjectResults = await db.prepare(subjectQuery).bind(...params).all();
    // 构建分科目统计对象
    const subjectStats = {};
    for (const row of subjectResults.results || []) {
        subjectStats[row.subject] = {
            quizCount: row.quiz_count,
            correctCount: row.total_correct,
            questionCount: row.total_questions,
            accuracy: row.avg_accuracy,
        };
    }
    const totalQuestions = overall?.total_questions || 0;
    const totalCorrect = overall?.total_correct || 0;
    return {
        totalQuizCount: overall?.quiz_count || 0,
        totalCorrectCount: totalCorrect,
        totalQuestionCount: totalQuestions,
        overallAccuracy: totalQuestions > 0 ? totalCorrect / totalQuestions : 0,
        totalDurationSeconds: overall?.total_duration || 0,
        averageAccuracy: overall?.avg_accuracy || 0,
        subjectStats,
    };
}
/**
 * 获取今日学习统计
 */
export async function getTodayLearningStats(db, userId) {
    const result = await db.prepare(`
    SELECT 
      COUNT(*) as quiz_count,
      COALESCE(SUM(question_count), 0) as total_questions,
      COALESCE(SUM(correct_count), 0) as total_correct,
      COALESCE(SUM(duration_seconds), 0) as total_duration,
      COALESCE(AVG(accuracy), 0) as avg_accuracy
    FROM learning_events
    WHERE user_id = ?
    AND DATE(created_at) = DATE('now')
  `).bind(userId).first();
    return {
        quizCount: result?.quiz_count || 0,
        questionCount: result?.total_questions || 0,
        correctCount: result?.total_correct || 0,
        accuracy: result?.avg_accuracy || 0,
        durationSeconds: result?.total_duration || 0,
    };
}
/**
 * 获取用户连续学习天数
 */
export async function getUserStreakDays(db, userId) {
    const result = await db.prepare(`
    SELECT DISTINCT DATE(created_at) as learning_date
    FROM learning_events
    WHERE user_id = ?
    ORDER BY learning_date DESC
    LIMIT 60
  `).bind(userId).all();
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const dates = result.results?.map(r => r.learning_date) || [];
    for (let i = 0; i < dates.length; i++) {
        const date = dates[i];
        const expectedDate = new Date(Date.now() - i * 86400000).toISOString().split('T')[0];
        // 第一天特殊处理：今天或昨天都算连续
        if (i === 0 && date !== today && date !== yesterday) {
            break;
        }
        if (date === expectedDate || (i === 0 && (date === today || date === yesterday))) {
            tempStreak++;
            currentStreak = tempStreak;
        }
        else {
            longestStreak = Math.max(longestStreak, tempStreak);
            break;
        }
    }
    longestStreak = Math.max(longestStreak, tempStreak);
    return { currentStreak, longestStreak };
}
// ===== 排行榜数据获取 =====
/**
 * 获取排行榜数据（从 learning_events 读取）
 */
export async function getLeaderboardFromEvents(db, options) {
    const { metric, range, subject, limit = 50 } = options;
    // 时间条件
    let timeCondition = '';
    if (range === 'DAY') {
        timeCondition = "AND DATE(le.created_at) = DATE('now')";
    }
    else if (range === 'WEEK') {
        timeCondition = "AND le.created_at >= DATE('now', '-7 days')";
    }
    // 科目条件
    const subjectCondition = subject && subject !== 'ALL'
        ? `AND le.subject = '${subject}'`
        : '';
    // 排序字段
    let orderBy = '';
    switch (metric) {
        case 'QUIZ_COUNT':
            orderBy = 'quiz_count DESC';
            break;
        case 'ACCURACY':
            orderBy = 'avg_accuracy DESC';
            break;
        case 'SPEED':
            orderBy = 'avg_time ASC';
            break;
    }
    const query = `
    SELECT 
      le.user_id,
      u.nickname as name,
      u.avatar as avatar_url,
      COUNT(DISTINCT le.id) as quiz_count,
      ROUND(AVG(le.accuracy) * 100, 1) as avg_accuracy,
      ROUND(
        CASE 
          WHEN SUM(le.question_count) > 0 
          THEN SUM(le.duration_seconds) * 1.0 / SUM(le.question_count)
          ELSE 0 
        END, 1
      ) as avg_time,
      u.created_at as user_created_at
    FROM learning_events le
    JOIN users u ON u.id = le.user_id
    WHERE le.event_type = 'QUIZ'
    AND le.accuracy >= 0.4  -- 抗刷：正确率 >= 40%
    ${timeCondition}
    ${subjectCondition}
    GROUP BY le.user_id
    HAVING quiz_count > 0
    ORDER BY ${orderBy}, user_created_at ASC
    LIMIT ?
  `;
    const results = await db.prepare(query).bind(limit).all();
    // 计算排名（处理并列）
    let currentRank = 0;
    let previousValue = null;
    let skipCount = 0;
    return (results.results || []).map((row, index) => {
        // 获取当前排序值
        let currentValue;
        switch (metric) {
            case 'QUIZ_COUNT':
                currentValue = row.quiz_count;
                break;
            case 'ACCURACY':
                currentValue = row.avg_accuracy;
                break;
            case 'SPEED':
                currentValue = row.avg_time;
                break;
        }
        // 处理并列排名
        if (previousValue === null || currentValue !== previousValue) {
            currentRank = index + 1;
            skipCount = 0;
        }
        else {
            skipCount++;
        }
        previousValue = currentValue;
        return {
            userId: row.user_id,
            name: row.name || 'Anonymous',
            avatarUrl: row.avatar_url,
            quizCount: row.quiz_count,
            accuracy: row.avg_accuracy || 0,
            avgTime: row.avg_time || 0,
            rank: currentRank,
        };
    });
}
/**
 * 获取用户在排行榜中的位置（从 learning_events 读取）
 */
export async function getUserRankFromEvents(db, userId, options) {
    const { metric, range, subject } = options;
    // 时间条件
    let timeCondition = '';
    if (range === 'DAY') {
        timeCondition = "AND DATE(created_at) = DATE('now')";
    }
    else if (range === 'WEEK') {
        timeCondition = "AND created_at >= DATE('now', '-7 days')";
    }
    // 科目条件
    const subjectCondition = subject && subject !== 'ALL'
        ? `AND subject = '${subject}'`
        : '';
    // 获取用户数据
    const userQuery = `
    SELECT 
      COUNT(DISTINCT id) as quiz_count,
      ROUND(AVG(accuracy) * 100, 1) as avg_accuracy,
      ROUND(
        CASE 
          WHEN SUM(question_count) > 0 
          THEN SUM(duration_seconds) * 1.0 / SUM(question_count)
          ELSE 0 
        END, 1
      ) as avg_time
    FROM learning_events
    WHERE user_id = ?
    AND event_type = 'QUIZ'
    AND accuracy >= 0.4
    ${timeCondition}
    ${subjectCondition}
  `;
    const userData = await db.prepare(userQuery).bind(userId).first();
    if (!userData || userData.quiz_count === 0) {
        return null;
    }
    // 计算排名
    let rankCondition = '';
    switch (metric) {
        case 'QUIZ_COUNT':
            rankCondition = `HAVING COUNT(DISTINCT id) > ${userData.quiz_count}`;
            break;
        case 'ACCURACY':
            rankCondition = `HAVING ROUND(AVG(accuracy) * 100, 1) > ${userData.avg_accuracy}`;
            break;
        case 'SPEED':
            rankCondition = `HAVING ROUND(
        CASE WHEN SUM(question_count) > 0 
        THEN SUM(duration_seconds) * 1.0 / SUM(question_count) 
        ELSE 999999 END, 1) < ${userData.avg_time}`;
            break;
    }
    const rankQuery = `
    SELECT COUNT(*) as higher_count
    FROM (
      SELECT user_id
      FROM learning_events
      WHERE event_type = 'QUIZ'
      AND accuracy >= 0.4
      ${timeCondition}
      ${subjectCondition}
      GROUP BY user_id
      ${rankCondition}
    )
  `;
    const rankResult = await db.prepare(rankQuery).first();
    // 获取总参与人数
    const totalQuery = `
    SELECT COUNT(DISTINCT user_id) as total
    FROM learning_events
    WHERE event_type = 'QUIZ'
    AND accuracy >= 0.4
    ${timeCondition}
    ${subjectCondition}
  `;
    const totalResult = await db.prepare(totalQuery).first();
    const totalParticipants = totalResult?.total || 0;
    const rank = (rankResult?.higher_count || 0) + 1;
    const percentile = totalParticipants > 0
        ? Math.round(((totalParticipants - rank) / totalParticipants) * 100)
        : 0;
    return {
        rank,
        quizCount: userData.quiz_count,
        accuracy: userData.avg_accuracy || 0,
        avgTime: userData.avg_time || 0,
        totalParticipants,
        percentile,
    };
}
//# sourceMappingURL=learningEventRecorder.js.map