/**
 * 种子数据脚本
 * 向数据库插入初始课程、课时、练习、单词、听力素材数据
 *
 * 执行流程：
 * 1. 连接数据库并开启事务
 * 2. TRUNCATE 清空相关表（CASCADE 级联清理外键依赖）
 * 3. 按外键依赖顺序依次插入：课程 -> 课时 -> 练习，以及独立的单词、听力素材
 * 4. 提交事务并打印各表数据量
 *
 * 运行方式：node scripts/seed.mjs
 */
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// ===== 课程数据（3 门英语课程）=====
const courses = [
  {
    title: '英语 A1 入门',
    description: '适合零基础学习者，掌握基本日常用语',
    language: 'en',
    level: 'A1',
    sort_order: 1,
  },
  {
    title: '英语 A2 基础',
    description: '在 A1 基础上扩展词汇与语法，能进行简单对话',
    language: 'en',
    level: 'A2',
    sort_order: 2,
  },
  {
    title: '英语 B1 进阶',
    description: '能理解工作/学习中的常见话题，表达观点',
    language: 'en',
    level: 'B1',
    sort_order: 3,
  },
];

// ===== 课时数据（每门课程 2 个课时，共 6 个）=====
// courseIndex 对应 courses 数组下标，用于在插入后建立外键关联
const lessons = [
  // 课程 1（英语 A1 入门）
  { courseIndex: 0, title: '第一课：日常问候', sort_order: 1 },
  { courseIndex: 0, title: '第二课：自我介绍', sort_order: 2 },
  // 课程 2（英语 A2 基础）
  { courseIndex: 1, title: '第一课：购物对话', sort_order: 1 },
  { courseIndex: 1, title: '第二课：餐厅点餐', sort_order: 2 },
  // 课程 3（英语 B1 进阶）
  { courseIndex: 2, title: '第一课：旅行计划', sort_order: 1 },
  { courseIndex: 2, title: '第二课：工作面试', sort_order: 2 },
];

// ===== 练习数据（每个课时 2 个练习：1 vocabulary + 1 listening，共 12 个）=====
// lessonIndex 对应 lessons 数组下标，用于在插入后建立外键关联
const exercises = [
  // 课程1 第一课：日常问候（lessonIndex 0）
  {
    lessonIndex: 0,
    type: 'vocabulary',
    question: "How do you say '你好' in English?",
    options: ['Hello', 'Goodbye', 'Thanks', 'Sorry'],
    correct_answer: 'Hello',
    metadata: { explanation: 'Hello 是常见的英语问候语' },
    sort_order: 1,
  },
  {
    lessonIndex: 0,
    type: 'listening',
    question: "Listen and choose: 'Good morning'",
    options: ['Good morning', 'Good evening', 'Good night', 'Good afternoon'],
    correct_answer: 'Good morning',
    metadata: {
      audioUrl: 'https://example.com/audio/good-morning.mp3',
      explanation: 'Good morning 用于早晨打招呼',
    },
    sort_order: 2,
  },
  // 课程1 第二课：自我介绍（lessonIndex 1）
  {
    lessonIndex: 1,
    type: 'vocabulary',
    question: "How do you say '名字' in English?",
    options: ['Name', 'Age', 'Job', 'City'],
    correct_answer: 'Name',
    metadata: { explanation: 'Name 表示姓名' },
    sort_order: 1,
  },
  {
    lessonIndex: 1,
    type: 'listening',
    question: "Listen and choose: 'My name is John'",
    options: ['My name is John', 'My age is John', 'My job is John', 'My city is John'],
    correct_answer: 'My name is John',
    metadata: {
      audioUrl: 'https://example.com/audio/my-name-is-john.mp3',
      explanation: '自我介绍时常用 My name is ...',
    },
    sort_order: 2,
  },
  // 课程2 第一课：购物对话（lessonIndex 2）
  {
    lessonIndex: 2,
    type: 'vocabulary',
    question: "How do you say '多少钱' in English?",
    options: ['How much', 'How many', 'How old', 'How long'],
    correct_answer: 'How much',
    metadata: { explanation: 'How much 用于询问价格' },
    sort_order: 1,
  },
  {
    lessonIndex: 2,
    type: 'listening',
    question: "Listen and choose: 'Can I help you?'",
    options: ['Can I help you?', 'Can you help me?', 'May I come in?', 'How can I go?'],
    correct_answer: 'Can I help you?',
    metadata: {
      audioUrl: 'https://example.com/audio/can-i-help-you.mp3',
      explanation: '店员常用 Can I help you? 询问顾客',
    },
    sort_order: 2,
  },
  // 课程2 第二课：餐厅点餐（lessonIndex 3）
  {
    lessonIndex: 3,
    type: 'vocabulary',
    question: "How do you say '菜单' in English?",
    options: ['Menu', 'Order', 'Bill', 'Tip'],
    correct_answer: 'Menu',
    metadata: { explanation: 'Menu 表示菜单' },
    sort_order: 1,
  },
  {
    lessonIndex: 3,
    type: 'listening',
    question: "Listen and choose: 'I'd like a cup of coffee'",
    options: ["I'd like a cup of coffee", 'I\'d like a glass of water', "I'd like a piece of cake", "I'd like a bowl of soup"],
    correct_answer: "I'd like a cup of coffee",
    metadata: {
      audioUrl: 'https://example.com/audio/cup-of-coffee.mp3',
      explanation: "I'd like ... 是点餐的礼貌表达",
    },
    sort_order: 2,
  },
  // 课程3 第一课：旅行计划（lessonIndex 4）
  {
    lessonIndex: 4,
    type: 'vocabulary',
    question: "Which word means '预订' in English?",
    options: ['Book', 'Cancel', 'Delay', 'Arrive'],
    correct_answer: 'Book',
    metadata: { explanation: 'book 作动词表示预订（酒店/机票）' },
    sort_order: 1,
  },
  {
    lessonIndex: 4,
    type: 'listening',
    question: "Listen and choose: 'I'm planning to visit Japan'",
    options: ["I'm planning to visit Japan", "I'm planning to leave Japan", "I'm planning to work in Japan", "I'm planning to study in Japan"],
    correct_answer: "I'm planning to visit Japan",
    metadata: {
      audioUrl: 'https://example.com/audio/visit-japan.mp3',
      explanation: 'plan to do sth 表示计划做某事',
    },
    sort_order: 2,
  },
  // 课程3 第二课：工作面试（lessonIndex 5）
  {
    lessonIndex: 5,
    type: 'vocabulary',
    question: "Which word means '经验' in English?",
    options: ['Experience', 'Education', 'Salary', 'Position'],
    correct_answer: 'Experience',
    metadata: { explanation: 'Experience 表示工作经验' },
    sort_order: 1,
  },
  {
    lessonIndex: 5,
    type: 'listening',
    question: "Listen and choose: 'Why do you want this job?'",
    options: ['Why do you want this job?', 'When do you start this job?', 'Where is your job?', 'How much is your job?'],
    correct_answer: 'Why do you want this job?',
    metadata: {
      audioUrl: 'https://example.com/audio/why-this-job.mp3',
      explanation: '面试官常问 Why do you want this job?',
    },
    sort_order: 2,
  },
];

// ===== 单词数据（20 个常用英语单词：A1 10 个 + A2 10 个）=====
const vocabularies = [
  // A1 级别（10 个）
  {
    word: 'hello',
    phonetic: '/həˈloʊ/',
    part_of_speech: 'exclamation',
    definition: '你好',
    example_sentence: 'Hello, how are you?',
    example_translation: '你好，你好吗？',
    level: 'A1',
    language: 'en',
  },
  {
    word: 'book',
    phonetic: '/bʊk/',
    part_of_speech: 'noun',
    definition: '书，书籍',
    example_sentence: 'I have a book.',
    example_translation: '我有一本书。',
    level: 'A1',
    language: 'en',
  },
  {
    word: 'water',
    phonetic: '/ˈwɔːtər/',
    part_of_speech: 'noun',
    definition: '水',
    example_sentence: 'I drink water every day.',
    example_translation: '我每天喝水。',
    level: 'A1',
    language: 'en',
  },
  {
    word: 'friend',
    phonetic: '/frɛnd/',
    part_of_speech: 'noun',
    definition: '朋友',
    example_sentence: 'She is my friend.',
    example_translation: '她是我的朋友。',
    level: 'A1',
    language: 'en',
  },
  {
    word: 'eat',
    phonetic: '/iːt/',
    part_of_speech: 'verb',
    definition: '吃',
    example_sentence: 'I eat breakfast at 7.',
    example_translation: '我7点吃早餐。',
    level: 'A1',
    language: 'en',
  },
  {
    word: 'good',
    phonetic: '/ɡʊd/',
    part_of_speech: 'adjective',
    definition: '好的',
    example_sentence: 'This is a good book.',
    example_translation: '这是一本好书。',
    level: 'A1',
    language: 'en',
  },
  {
    word: 'school',
    phonetic: '/skuːl/',
    part_of_speech: 'noun',
    definition: '学校',
    example_sentence: 'I go to school by bus.',
    example_translation: '我坐公交车去学校。',
    level: 'A1',
    language: 'en',
  },
  {
    word: 'family',
    phonetic: '/ˈfæməli/',
    part_of_speech: 'noun',
    definition: '家庭',
    example_sentence: 'I love my family.',
    example_translation: '我爱我的家庭。',
    level: 'A1',
    language: 'en',
  },
  {
    word: 'name',
    phonetic: '/neɪm/',
    part_of_speech: 'noun',
    definition: '名字',
    example_sentence: 'My name is Tom.',
    example_translation: '我的名字是汤姆。',
    level: 'A1',
    language: 'en',
  },
  {
    word: 'thank',
    phonetic: '/θæŋk/',
    part_of_speech: 'verb',
    definition: '感谢',
    example_sentence: 'Thank you very much.',
    example_translation: '非常感谢你。',
    level: 'A1',
    language: 'en',
  },
  // A2 级别（10 个）
  {
    word: 'buy',
    phonetic: '/baɪ/',
    part_of_speech: 'verb',
    definition: '买，购买',
    example_sentence: 'I want to buy a car.',
    example_translation: '我想买一辆车。',
    level: 'A2',
    language: 'en',
  },
  {
    word: 'weather',
    phonetic: '/ˈwɛðər/',
    part_of_speech: 'noun',
    definition: '天气',
    example_sentence: 'The weather is nice today.',
    example_translation: '今天天气很好。',
    level: 'A2',
    language: 'en',
  },
  {
    word: 'learn',
    phonetic: '/lɜːrn/',
    part_of_speech: 'verb',
    definition: '学习',
    example_sentence: 'I learn English every day.',
    example_translation: '我每天学习英语。',
    level: 'A2',
    language: 'en',
  },
  {
    word: 'travel',
    phonetic: '/ˈtrævəl/',
    part_of_speech: 'verb',
    definition: '旅行',
    example_sentence: 'I like to travel by train.',
    example_translation: '我喜欢坐火车旅行。',
    level: 'A2',
    language: 'en',
  },
  {
    word: 'job',
    phonetic: '/dʒɒb/',
    part_of_speech: 'noun',
    definition: '工作',
    example_sentence: 'He has a new job.',
    example_translation: '他有一份新工作。',
    level: 'A2',
    language: 'en',
  },
  {
    word: 'prefer',
    phonetic: '/prɪˈfɜːr/',
    part_of_speech: 'verb',
    definition: '更喜欢',
    example_sentence: 'I prefer tea to coffee.',
    example_translation: '比起咖啡我更喜欢茶。',
    level: 'A2',
    language: 'en',
  },
  {
    word: 'expensive',
    phonetic: '/ɪkˈspɛnsɪv/',
    part_of_speech: 'adjective',
    definition: '昂贵的',
    example_sentence: 'This car is too expensive.',
    example_translation: '这辆车太贵了。',
    level: 'A2',
    language: 'en',
  },
  {
    word: 'meeting',
    phonetic: '/ˈmiːtɪŋ/',
    part_of_speech: 'noun',
    definition: '会议',
    example_sentence: 'We have a meeting at 10.',
    example_translation: '我们10点有个会议。',
    level: 'A2',
    language: 'en',
  },
  {
    word: 'decide',
    phonetic: '/dɪˈsaɪd/',
    part_of_speech: 'verb',
    definition: '决定',
    example_sentence: 'I decided to learn Japanese.',
    example_translation: '我决定学习日语。',
    level: 'A2',
    language: 'en',
  },
  {
    word: 'improve',
    phonetic: '/ɪmˈpruːv/',
    part_of_speech: 'verb',
    definition: '改善，提高',
    example_sentence: 'I want to improve my English.',
    example_translation: '我想提高我的英语水平。',
    level: 'A2',
    language: 'en',
  },
];

// ===== 听力素材数据（6 个，每个课程级别 2 个）=====
const listeningMaterials = [
  // A1 级别（2 个）
  {
    title: '日常问候对话',
    audio_url: 'https://example.com/audio/greetings.mp3',
    duration_seconds: 45,
    transcript: "A: Hello! B: Hi, how are you? A: I'm fine, thank you.",
    level: 'A1',
    language: 'en',
  },
  {
    title: '自我介绍对话',
    audio_url: 'https://example.com/audio/self-introduction.mp3',
    duration_seconds: 60,
    transcript: "A: Hi, my name is Anna. B: Nice to meet you, Anna. I'm Tom. A: Nice to meet you too.",
    level: 'A1',
    language: 'en',
  },
  // A2 级别（2 个）
  {
    title: '购物对话',
    audio_url: 'https://example.com/audio/shopping.mp3',
    duration_seconds: 90,
    transcript: 'A: Can I help you? B: Yes, I\'m looking for a shirt. A: What size do you want? B: Medium, please.',
    level: 'A2',
    language: 'en',
  },
  {
    title: '餐厅点餐对话',
    audio_url: 'https://example.com/audio/restaurant.mp3',
    duration_seconds: 75,
    transcript: "A: Are you ready to order? B: Yes, I'd like a cup of coffee and a piece of cake. A: Anything else? B: No, that's all.",
    level: 'A2',
    language: 'en',
  },
  // B1 级别（2 个）
  {
    title: '旅行计划讨论',
    audio_url: 'https://example.com/audio/travel-plan.mp3',
    duration_seconds: 120,
    transcript: "A: I'm planning to visit Japan next month. B: That sounds great! How long will you stay? A: About two weeks. I've already booked the flight.",
    level: 'B1',
    language: 'en',
  },
  {
    title: '工作面试对话',
    audio_url: 'https://example.com/audio/job-interview.mp3',
    duration_seconds: 150,
    transcript: "A: Why do you want this job? B: I'm interested in this position because I want to use my skills. A: What experience do you have? B: I've worked in this field for three years.",
    level: 'B1',
    language: 'en',
  },
];

// ===== 勋章定义数据（P1：5 种）=====
const achievements = [
  {
    code: 'first_login',
    name: '初次相遇',
    description: '完成注册并首次登录平台',
    icon: '🎉',
    category: 'general',
    sort_order: 1,
  },
  {
    code: 'streak_7',
    name: '一周打卡王',
    description: '连续 7 天完成至少 1 道练习',
    icon: '🔥',
    category: 'streak',
    sort_order: 2,
  },
  {
    code: 'exercises_100',
    name: '百题斩',
    description: '累计完成 100 道练习题',
    icon: '💯',
    category: 'exercise',
    sort_order: 3,
  },
  {
    code: 'perfect_streak_10',
    name: '十全十美',
    description: '连续 10 道练习全部答对',
    icon: '🎯',
    category: 'exercise',
    sort_order: 4,
  },
  {
    code: 'xp_500',
    name: '经验达人',
    description: '累计获得 500 XP 经验值',
    icon: '⚡',
    category: 'xp',
    sort_order: 5,
  },
];

/**
 * 种子数据主流程
 */
async function seed() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. 清空相关表数据（CASCADE 级联清理外键依赖）
    // 注意：不清理 users 表，避免影响已注册用户
    console.log('[seed] 清空已有数据...');
    await client.query(
      'TRUNCATE TABLE exercise_attempts, progress_records, exercises, lessons, courses, vocabulary, listening_materials CASCADE'
    );

    // 2. 插入课程，并保留返回的 id 用于关联课时
    console.log('[seed] 插入课程数据...');
    const courseIds = [];
    for (const course of courses) {
      const res = await client.query(
        `INSERT INTO courses (title, description, language, level, sort_order)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [course.title, course.description, course.language, course.level, course.sort_order]
      );
      courseIds.push(res.rows[0].id);
    }

    // 3. 插入课时，通过 courseIndex 关联到对应课程的 id
    console.log('[seed] 插入课时数据...');
    const lessonIds = [];
    for (const lesson of lessons) {
      const courseId = courseIds[lesson.courseIndex];
      const res = await client.query(
        `INSERT INTO lessons (course_id, title, sort_order)
         VALUES ($1, $2, $3)
         RETURNING id`,
        [courseId, lesson.title, lesson.sort_order]
      );
      lessonIds.push(res.rows[0].id);
    }

    // 4. 插入练习，通过 lessonIndex 关联到对应课时的 id
    console.log('[seed] 插入练习数据...');
    for (const exercise of exercises) {
      const lessonId = lessonIds[exercise.lessonIndex];
      await client.query(
        `INSERT INTO exercises (lesson_id, type, question, options, correct_answer, metadata, sort_order)
         VALUES ($1, $2, $3, $4::jsonb, $5, $6::jsonb, $7)`,
        [
          lessonId,
          exercise.type,
          exercise.question,
          JSON.stringify(exercise.options),
          exercise.correct_answer,
          JSON.stringify(exercise.metadata),
          exercise.sort_order,
        ]
      );
    }

    // 5. 插入单词数据
    console.log('[seed] 插入单词数据...');
    for (const vocab of vocabularies) {
      await client.query(
        `INSERT INTO vocabulary (word, phonetic, part_of_speech, definition, example_sentence, example_translation, level, language)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          vocab.word,
          vocab.phonetic,
          vocab.part_of_speech,
          vocab.definition,
          vocab.example_sentence,
          vocab.example_translation,
          vocab.level,
          vocab.language,
        ]
      );
    }

    // 6. 插入听力素材数据
    console.log('[seed] 插入听力素材数据...');
    for (const material of listeningMaterials) {
      await client.query(
        `INSERT INTO listening_materials (title, audio_url, duration_seconds, transcript, level, language)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          material.title,
          material.audio_url,
          material.duration_seconds,
          material.transcript,
          material.level,
          material.language,
        ]
      );
    }

    // 7. 插入勋章定义（upsert，不清空已有解锁记录）
    console.log('[seed] 插入勋章定义数据...');
    for (const ach of achievements) {
      await client.query(
        `INSERT INTO achievement_definitions (code, name, description, icon, category, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (code) DO UPDATE SET
           name = EXCLUDED.name,
           description = EXCLUDED.description,
           icon = EXCLUDED.icon,
           category = EXCLUDED.category,
           sort_order = EXCLUDED.sort_order`,
        [ach.code, ach.name, ach.description, ach.icon, ach.category, ach.sort_order]
      );
    }

    await client.query('COMMIT');
    console.log('[seed] 事务已提交，数据插入完成\n');

    // 8. 打印各表数据量
    const tables = [
      'courses',
      'lessons',
      'exercises',
      'vocabulary',
      'listening_materials',
      'achievement_definitions',
    ];
    console.log('===== 各表数据量 =====');
    for (const table of tables) {
      const res = await client.query(`SELECT COUNT(*) AS count FROM ${table}`);
      console.log(`  ${table}: ${res.rows[0].count} 条`);
    }
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[seed] 插入失败，已回滚：', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch((err) => {
  console.error('[seed] 种子数据脚本执行失败：', err.message);
  process.exit(1);
});
