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
  // ===== 日语课程（3 门）=====
  {
    title: '日语 N5 入门',
    description: '适合零基础学习者，掌握五十音图与基本日常用语',
    language: 'ja',
    level: 'A1',
    sort_order: 4,
  },
  {
    title: '日语 N4 基础',
    description: '在 N5 基础上扩展词汇与语法，能进行简单日常对话',
    language: 'ja',
    level: 'A2',
    sort_order: 5,
  },
  {
    title: '日语 N3 进阶',
    description: '能理解日常场景中的常见话题，表达观点与感受',
    language: 'ja',
    level: 'B1',
    sort_order: 6,
  },
  // ===== 韩语课程（3 门）=====
  {
    title: '韩语 TOPIK1 入门',
    description: '适合零基础学习者，掌握韩文字母与基本日常用语',
    language: 'ko',
    level: 'A1',
    sort_order: 7,
  },
  {
    title: '韩语 TOPIK2 基础',
    description: '在 TOPIK1 基础上扩展词汇与语法，能进行简单日常对话',
    language: 'ko',
    level: 'A2',
    sort_order: 8,
  },
  {
    title: '韩语 TOPIK3 进阶',
    description: '能理解日常场景中的常见话题，表达观点与感受',
    language: 'ko',
    level: 'B1',
    sort_order: 9,
  },
];

// ===== 课时数据（每门课程 2 个课时，共 18 个）=====
// courseIndex 对应 courses 数组下标，用于在插入后建立外键关联
const lessons = [
  // 课程 1（英语 A1 入门）
  { courseIndex: 0, title: '第一课：日常问候', sort_order: 1 },
  { courseIndex: 0, title: '第二课：自我介绍', sort_order: 2 },
  // 课程 2（英语 A2 基础）
  { courseIndex: 1, title: '第一课：购物对话', sort_order: 1 },
  { courseIndex: 1, title: '第二课：餐厅点餐', sort_order: 2 },
  // 课程3（英语 B1 进阶）
  { courseIndex: 2, title: '第一课：旅行计划', sort_order: 1 },
  { courseIndex: 2, title: '第二课：工作面试', sort_order: 2 },
  // 课程4（日语 N5 入门）
  { courseIndex: 3, title: '第一课：日常挨拶', sort_order: 1 },
  { courseIndex: 3, title: '第二课：自己紹介', sort_order: 2 },
  // 课程5（日语 N4 基础）
  { courseIndex: 4, title: '第一课：買い物对话', sort_order: 1 },
  { courseIndex: 4, title: '第二课：レストラン注文', sort_order: 2 },
  // 课程6（日语 N3 进阶）
  { courseIndex: 5, title: '第一课：旅行計画', sort_order: 1 },
  { courseIndex: 5, title: '第二课：面接', sort_order: 2 },
  // 课程7（韩语 TOPIK1 入门）
  { courseIndex: 6, title: '第一课：일상 인사（日常问候）', sort_order: 1 },
  { courseIndex: 6, title: '第二课：자기소개（自我介绍）', sort_order: 2 },
  // 课程8（韩语 TOPIK2 基础）
  { courseIndex: 7, title: '第一课：쇼핑 대화（购物对话）', sort_order: 1 },
  { courseIndex: 7, title: '第二课：식당 주문（餐厅点餐）', sort_order: 2 },
  // 课程9（韩语 TOPIK3 进阶）
  { courseIndex: 8, title: '第一课：여행 계획（旅行计划）', sort_order: 1 },
  { courseIndex: 8, title: '第二课：면접（面试）', sort_order: 2 },
];

// ===== 练习数据（每个课时 2 个练习：1 vocabulary + 1 listening，共 36 个）=====
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
  // ===== 日语练习 =====
  // 日语N5 第一课：日常挨拶（lessonIndex 6）
  {
    lessonIndex: 6,
    type: 'vocabulary',
    question: "How do you say '你好' in Japanese?",
    options: ['こんにちは', 'さようなら', 'ありがとう', 'すみません'],
    correct_answer: 'こんにちは',
    metadata: { explanation: 'こんにちは 是日语中最常见的问候语，用于白天打招呼' },
    sort_order: 1,
  },
  {
    lessonIndex: 6,
    type: 'listening',
    question: "Listen and choose: 'おはようございます'",
    options: ['おはようございます', 'こんばんは', 'おやすみなさい', 'こんにちは'],
    correct_answer: 'おはようございます',
    metadata: {
      audioUrl: 'https://example.com/audio/ohayou.mp3',
      explanation: 'おはようございます 是日语的早晨问候语（礼貌形式）',
    },
    sort_order: 2,
  },
  // 日语N5 第二课：自己紹介（lessonIndex 7）
  {
    lessonIndex: 7,
    type: 'vocabulary',
    question: "How do you say '名字' in Japanese?",
    options: ['名前', '年齢', '仕事', '住所'],
    correct_answer: '名前',
    metadata: { explanation: '名前（なまえ）表示姓名' },
    sort_order: 1,
  },
  {
    lessonIndex: 7,
    type: 'listening',
    question: "Listen and choose: '私は田中です'",
    options: ['私は田中です', '私は田中じゃない', '田中さんですか', '田中はどこですか'],
    correct_answer: '私は田中です',
    metadata: {
      audioUrl: 'https://example.com/audio/watashi-tanaka.mp3',
      explanation: '自己介绍时常用 私は～です（我是～）',
    },
    sort_order: 2,
  },
  // 日语N4 第一课：買い物对话（lessonIndex 8）
  {
    lessonIndex: 8,
    type: 'vocabulary',
    question: "How do you say '多少钱' in Japanese?",
    options: ['いくら', 'いくつ', '何時', '何日'],
    correct_answer: 'いくら',
    metadata: { explanation: 'いくら 用于询问价格' },
    sort_order: 1,
  },
  {
    lessonIndex: 8,
    type: 'listening',
    question: "Listen and choose: 'これはいくらですか'",
    options: ['これはいくらですか', 'これはいくつですか', 'これは何ですか', 'これはどこですか'],
    correct_answer: 'これはいくらですか',
    metadata: {
      audioUrl: 'https://example.com/audio/ikura-desu-ka.mp3',
      explanation: '店员常问 これはいくらですか（这个多少钱）',
    },
    sort_order: 2,
  },
  // 日语N4 第二课：レストラン注文（lessonIndex 9）
  {
    lessonIndex: 9,
    type: 'vocabulary',
    question: "How do you say '菜单' in Japanese?",
    options: ['メニュー', '注文', '会計', 'チップ'],
    correct_answer: 'メニュー',
    metadata: { explanation: 'メニュー 表示菜单（外来语）' },
    sort_order: 1,
  },
  {
    lessonIndex: 9,
    type: 'listening',
    question: "Listen and choose: 'コーヒーをお願いします'",
    options: ['コーヒーをお願いします', 'お水をお願いします', 'お茶をお願いします', 'ビールをお願いします'],
    correct_answer: 'コーヒーをお願いします',
    metadata: {
      audioUrl: 'https://example.com/audio/coffee-onegai.mp3',
      explanation: '～をお願いします 是点餐的礼貌表达',
    },
    sort_order: 2,
  },
  // 日语N3 第一课：旅行計画（lessonIndex 10）
  {
    lessonIndex: 10,
    type: 'vocabulary',
    question: "Which word means '预订' in Japanese?",
    options: ['予約', 'キャンセル', '遅延', '到着'],
    correct_answer: '予約',
    metadata: { explanation: '予約（よやく）表示预订（酒店/机票等）' },
    sort_order: 1,
  },
  {
    lessonIndex: 10,
    type: 'listening',
    question: "Listen and choose: '来月日本を訪れる予定です'",
    options: ['来月日本を訪れる予定です', '来月日本を出発する予定です', '来月日本で働く予定です', '来月日本で勉強する予定です'],
    correct_answer: '来月日本を訪れる予定です',
    metadata: {
      audioUrl: 'https://example.com/audio/raigetsu-nihon.mp3',
      explanation: '～予定です 表示计划做某事',
    },
    sort_order: 2,
  },
  // 日语N3 第二课：面接（lessonIndex 11）
  {
    lessonIndex: 11,
    type: 'vocabulary',
    question: "Which word means '经验' in Japanese?",
    options: ['経験', '学歴', '給料', '地位'],
    correct_answer: '経験',
    metadata: { explanation: '経験（けいけん）表示工作经验' },
    sort_order: 1,
  },
  {
    lessonIndex: 11,
    type: 'listening',
    question: "Listen and choose: 'なぜこの仕事がしたいですか'",
    options: ['なぜこの仕事がしたいですか', 'いつこの仕事を始めますか', 'どこで働きますか', '給料はいくらですか'],
    correct_answer: 'なぜこの仕事がしたいですか',
    metadata: {
      audioUrl: 'https://example.com/audio/naze-shigoto.mp3',
      explanation: '面试官常问 なぜこの仕事がしたいですか（为什么想做这份工作）',
    },
    sort_order: 2,
  },
  // ===== 韩语练习 =====
  // 韩语TOPIK1 第一课：일상 인사（lessonIndex 12）
  {
    lessonIndex: 12,
    type: 'vocabulary',
    question: "How do you say '你好' in Korean?",
    options: ['안녕하세요', '안녕히 가세요', '감사합니다', '죄송합니다'],
    correct_answer: '안녕하세요',
    metadata: { explanation: '안녕하세요 是韩语中最常见的问候语' },
    sort_order: 1,
  },
  {
    lessonIndex: 12,
    type: 'listening',
    question: "Listen and choose: '좋은 아침이에요'",
    options: ['좋은 아침이에요', '좋은 저녁이에요', '좋은 밤이에요', '좋은 오후에요'],
    correct_answer: '좋은 아침이에요',
    metadata: {
      audioUrl: 'https://example.com/audio/joeun-achim.mp3',
      explanation: '좋은 아침이에요 是韩语的早晨问候语',
    },
    sort_order: 2,
  },
  // 韩语TOPIK1 第二课：자기소개（lessonIndex 13）
  {
    lessonIndex: 13,
    type: 'vocabulary',
    question: "How do you say '名字' in Korean?",
    options: ['이름', '나이', '직업', '주소'],
    correct_answer: '이름',
    metadata: { explanation: '이름 表示姓名' },
    sort_order: 1,
  },
  {
    lessonIndex: 13,
    type: 'listening',
    question: "Listen and choose: '제 이름은 김민수입니다'",
    options: ['제 이름은 김민수입니다', '제 이름은 김민수가 아닙니다', '김민수 씨입니까', '김민수 씨가 어디 있어요'],
    correct_answer: '제 이름은 김민수입니다',
    metadata: {
      audioUrl: 'https://example.com/audio/je-ireum.mp3',
      explanation: '自我介绍时常用 제 이름은 ～입니다（我的名字是～）',
    },
    sort_order: 2,
  },
  // 韩语TOPIK2 第一课：쇼핑 대화（lessonIndex 14）
  {
    lessonIndex: 14,
    type: 'vocabulary',
    question: "How do you say '多少钱' in Korean?",
    options: ['얼마', '몇 개', '몇 시', '며칠'],
    correct_answer: '얼마',
    metadata: { explanation: '얼마 用于询问价格' },
    sort_order: 1,
  },
  {
    lessonIndex: 14,
    type: 'listening',
    question: "Listen and choose: '이것 얼마예요?'",
    options: ['이것 얼마예요?', '이것 몇 개예요?', '이것 뭐예요?', '이것 어디예요?'],
    correct_answer: '이것 얼마예요?',
    metadata: {
      audioUrl: 'https://example.com/audio/igeot-eolma.mp3',
      explanation: '店员常问 이것 얼마예요?（这个多少钱）',
    },
    sort_order: 2,
  },
  // 韩语TOPIK2 第二课：식당 주문（lessonIndex 15）
  {
    lessonIndex: 15,
    type: 'vocabulary',
    question: "How do you say '菜单' in Korean?",
    options: ['메뉴', '주문', '계산', '팁'],
    correct_answer: '메뉴',
    metadata: { explanation: '메뉴 表示菜单（外来语）' },
    sort_order: 1,
  },
  {
    lessonIndex: 15,
    type: 'listening',
    question: "Listen and choose: '김치찌개 주세요'",
    options: ['김치찌개 주세요', '물 주세요', '커피 주세요', '맥주 주세요'],
    correct_answer: '김치찌개 주세요',
    metadata: {
      audioUrl: 'https://example.com/audio/kimchi-jjigae.mp3',
      explanation: '～주세요 是点餐的礼貌表达（请给我～）',
    },
    sort_order: 2,
  },
  // 韩语TOPIK3 第一课：여행 계획（lessonIndex 16）
  {
    lessonIndex: 16,
    type: 'vocabulary',
    question: "Which word means '预订' in Korean?",
    options: ['예약', '취소', '지연', '도착'],
    correct_answer: '예약',
    metadata: { explanation: '예약 表示预订（酒店/机票等）' },
    sort_order: 1,
  },
  {
    lessonIndex: 16,
    type: 'listening',
    question: "Listen and choose: '다음 달에 한국에 갈 예정입니다'",
    options: ['다음 달에 한국에 갈 예정입니다', '다음 달에 한국에서 떠날 예정입니다', '다음 달에 한국에서 일할 예정입니다', '다음 달에 한국에서 공부할 예정입니다'],
    correct_answer: '다음 달에 한국에 갈 예정입니다',
    metadata: {
      audioUrl: 'https://example.com/audio/daum-dal-hanguk.mp3',
      explanation: '～할 예정입니다 表示计划做某事',
    },
    sort_order: 2,
  },
  // 韩语TOPIK3 第二课：면접（lessonIndex 17）
  {
    lessonIndex: 17,
    type: 'vocabulary',
    question: "Which word means '经验' in Korean?",
    options: ['경험', '학력', '월급', '직위'],
    correct_answer: '경험',
    metadata: { explanation: '경험 表示工作经验' },
    sort_order: 1,
  },
  {
    lessonIndex: 17,
    type: 'listening',
    question: "Listen and choose: '이 직업을 왜 원하시나요?'",
    options: ['이 직업을 왜 원하시나요?', '이 직업을 언제 시작하시나요?', '어디서 일하시나요?', '월급이 얼마나 되나요?'],
    correct_answer: '이 직업을 왜 원하시나요?',
    metadata: {
      audioUrl: 'https://example.com/audio/jigeop-wae.mp3',
      explanation: '面试官常问 이 직업을 왜 원하시나요?（为什么想要这份工作）',
    },
    sort_order: 2,
  },
];

// ===== 单词数据（60 个：英语/日语/韩语各 20 个，A1 10 个 + A2 10 个）=====
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
  // ===== 日语单词（A1 10 个 + A2 10 个）=====
  // A1 级别（10 个）
  {
    word: 'こんにちは',
    phonetic: '/koɴniʨiwa/',
    part_of_speech: 'exclamation',
    definition: '你好',
    example_sentence: 'こんにちは、元気ですか？',
    example_translation: '你好，你好吗？',
    level: 'A1',
    language: 'ja',
  },
  {
    word: 'さようなら',
    phonetic: '/sajoːnaɾa/',
    part_of_speech: 'exclamation',
    definition: '再见',
    example_sentence: 'さようなら、また会いましょう。',
    example_translation: '再见，下次再见。',
    level: 'A1',
    language: 'ja',
  },
  {
    word: 'ありがとう',
    phonetic: '/aɾiɡatoː/',
    part_of_speech: 'exclamation',
    definition: '谢谢',
    example_sentence: 'ありがとう、助かりました。',
    example_translation: '谢谢，帮了大忙。',
    level: 'A1',
    language: 'ja',
  },
  {
    word: 'すみません',
    phonetic: '/sumimasen/',
    part_of_speech: 'exclamation',
    definition: '不好意思；对不起',
    example_sentence: 'すみません、駅はどこですか？',
    example_translation: '请问，车站在哪里？',
    level: 'A1',
    language: 'ja',
  },
  {
    word: '名前',
    phonetic: '/namae/',
    part_of_speech: 'noun',
    definition: '名字',
    example_sentence: 'お名前は何ですか？',
    example_translation: '您叫什么名字？',
    level: 'A1',
    language: 'ja',
  },
  {
    word: '水',
    phonetic: '/mizu/',
    part_of_speech: 'noun',
    definition: '水',
    example_sentence: '水を飲みます。',
    example_translation: '喝水。',
    level: 'A1',
    language: 'ja',
  },
  {
    word: '食べる',
    phonetic: '/tabeɾu/',
    part_of_speech: 'verb',
    definition: '吃',
    example_sentence: '朝ごはんを食べます。',
    example_translation: '吃早餐。',
    level: 'A1',
    language: 'ja',
  },
  {
    word: '学校',
    phonetic: '/ɡakkoː/',
    part_of_speech: 'noun',
    definition: '学校',
    example_sentence: '学校へバスで行きます。',
    example_translation: '坐公交车去学校。',
    level: 'A1',
    language: 'ja',
  },
  {
    word: '友達',
    phonetic: '/tomodaʨi/',
    part_of_speech: 'noun',
    definition: '朋友',
    example_sentence: '彼女は私の友達です。',
    example_translation: '她是我的朋友。',
    level: 'A1',
    language: 'ja',
  },
  {
    word: '良い',
    phonetic: '/joi/',
    part_of_speech: 'adjective',
    definition: '好的',
    example_sentence: 'これは良い本です。',
    example_translation: '这是一本好书。',
    level: 'A1',
    language: 'ja',
  },
  // A2 级别（10 个）
  {
    word: '買う',
    phonetic: '/kau/',
    part_of_speech: 'verb',
    definition: '买，购买',
    example_sentence: '車を買いたいです。',
    example_translation: '我想买车。',
    level: 'A2',
    language: 'ja',
  },
  {
    word: '天気',
    phonetic: '/teɴki/',
    part_of_speech: 'noun',
    definition: '天气',
    example_sentence: '今日はいい天気ですね。',
    example_translation: '今天天气真好。',
    level: 'A2',
    language: 'ja',
  },
  {
    word: '勉強する',
    phonetic: '/beɴkjoːsuɾu/',
    part_of_speech: 'verb',
    definition: '学习',
    example_sentence: '毎日日本語を勉強します。',
    example_translation: '每天学习日语。',
    level: 'A2',
    language: 'ja',
  },
  {
    word: '旅行する',
    phonetic: '/ɾjokoːsuɾu/',
    part_of_speech: 'verb',
    definition: '旅行',
    example_sentence: '電車で旅行するのが好きです。',
    example_translation: '我喜欢坐火车旅行。',
    level: 'A2',
    language: 'ja',
  },
  {
    word: '仕事',
    phonetic: '/ɕiɡoto/',
    part_of_speech: 'noun',
    definition: '工作',
    example_sentence: '彼は新しい仕事を持っています。',
    example_translation: '他有一份新工作。',
    level: 'A2',
    language: 'ja',
  },
  {
    word: '好き',
    phonetic: '/suki/',
    part_of_speech: 'na-adjective',
    definition: '喜欢',
    example_sentence: '私は猫が好きです。',
    example_translation: '我喜欢猫。',
    level: 'A2',
    language: 'ja',
  },
  {
    word: '高い',
    phonetic: '/takai/',
    part_of_speech: 'i-adjective',
    definition: '贵的；高的',
    example_sentence: 'この車は高すぎます。',
    example_translation: '这辆车太贵了。',
    level: 'A2',
    language: 'ja',
  },
  {
    word: '会議',
    phonetic: '/kaiɡi/',
    part_of_speech: 'noun',
    definition: '会议',
    example_sentence: '10時に会議があります。',
    example_translation: '10点有个会议。',
    level: 'A2',
    language: 'ja',
  },
  {
    word: '決める',
    phonetic: '/kimeɾu/',
    part_of_speech: 'verb',
    definition: '决定',
    example_sentence: '日本語を勉強すると決めました。',
    example_translation: '我决定学习日语。',
    level: 'A2',
    language: 'ja',
  },
  {
    word: '上手',
    phonetic: '/ʑoːzu/',
    part_of_speech: 'na-adjective',
    definition: '擅长',
    example_sentence: '日本語が上手になりたいです。',
    example_translation: '我想提高日语水平。',
    level: 'A2',
    language: 'ja',
  },
  // ===== 韩语单词（A1 10 个 + A2 10 个）=====
  // A1 级别（10 个）
  {
    word: '안녕하세요',
    phonetic: '/anɲjʌŋɦaje/',
    part_of_speech: 'exclamation',
    definition: '你好',
    example_sentence: '안녕하세요, 잘 지내세요?',
    example_translation: '你好，你好吗？',
    level: 'A1',
    language: 'ko',
  },
  {
    word: '감사합니다',
    phonetic: '/ɡamsahamnida/',
    part_of_speech: 'exclamation',
    definition: '谢谢',
    example_sentence: '감사합니다, 도와주셔서.',
    example_translation: '谢谢您的帮助。',
    level: 'A1',
    language: 'ko',
  },
  {
    word: '미안합니다',
    phonetic: '/mianhamnida/',
    part_of_speech: 'exclamation',
    definition: '对不起',
    example_sentence: '미안합니다, 늦었어요.',
    example_translation: '对不起，我迟到了。',
    level: 'A1',
    language: 'ko',
  },
  {
    word: '네',
    phonetic: '/ne/',
    part_of_speech: 'exclamation',
    definition: '是',
    example_sentence: '네, 맞아요.',
    example_translation: '是的，没错。',
    level: 'A1',
    language: 'ko',
  },
  {
    word: '이름',
    phonetic: '/iɾɯm/',
    part_of_speech: 'noun',
    definition: '名字',
    example_sentence: '이름이 뭐예요?',
    example_translation: '你叫什么名字？',
    level: 'A1',
    language: 'ko',
  },
  {
    word: '물',
    phonetic: '/mul/',
    part_of_speech: 'noun',
    definition: '水',
    example_sentence: '매일 물을 마셔요.',
    example_translation: '每天喝水。',
    level: 'A1',
    language: 'ko',
  },
  {
    word: '먹다',
    phonetic: '/mʌkda/',
    part_of_speech: 'verb',
    definition: '吃',
    example_sentence: '아침을 먹어요.',
    example_translation: '吃早餐。',
    level: 'A1',
    language: 'ko',
  },
  {
    word: '학교',
    phonetic: '/hakɡjo/',
    part_of_speech: 'noun',
    definition: '学校',
    example_sentence: '버스로 학교에 가요.',
    example_translation: '坐公交车去学校。',
    level: 'A1',
    language: 'ko',
  },
  {
    word: '친구',
    phonetic: '/ʨʰinɡu/',
    part_of_speech: 'noun',
    definition: '朋友',
    example_sentence: '그녀는 내 친구예요.',
    example_translation: '她是我的朋友。',
    level: 'A1',
    language: 'ko',
  },
  {
    word: '좋다',
    phonetic: '/ʥot͈a/',
    part_of_speech: 'adjective',
    definition: '好的',
    example_sentence: '이것은 좋은 책이에요.',
    example_translation: '这是一本好书。',
    level: 'A1',
    language: 'ko',
  },
  // A2 级别（10 个）
  {
    word: '사다',
    phonetic: '/sada/',
    part_of_speech: 'verb',
    definition: '买，购买',
    example_sentence: '차를 사고 싶어요.',
    example_translation: '我想买车。',
    level: 'A2',
    language: 'ko',
  },
  {
    word: '날씨',
    phonetic: '/nalɕ͈i/',
    part_of_speech: 'noun',
    definition: '天气',
    example_sentence: '오늘 날씨가 좋네요.',
    example_translation: '今天天气真好。',
    level: 'A2',
    language: 'ko',
  },
  {
    word: '공부하다',
    phonetic: '/koŋbudhada/',
    part_of_speech: 'verb',
    definition: '学习',
    example_sentence: '매일 한국어를 공부해요.',
    example_translation: '每天学习韩语。',
    level: 'A2',
    language: 'ko',
  },
  {
    word: '여행하다',
    phonetic: '/jʌɦɛŋɦada/',
    part_of_speech: 'verb',
    definition: '旅行',
    example_sentence: '기차로 여행하는 것을 좋아해요.',
    example_translation: '我喜欢坐火车旅行。',
    level: 'A2',
    language: 'ko',
  },
  {
    word: '일',
    phonetic: '/il/',
    part_of_speech: 'noun',
    definition: '工作',
    example_sentence: '그는 새 일을 가지고 있어요.',
    example_translation: '他有一份新工作。',
    level: 'A2',
    language: 'ko',
  },
  {
    word: '좋아하다',
    phonetic: '/ʥoahada/',
    part_of_speech: 'verb',
    definition: '喜欢',
    example_sentence: '나는 고양이를 좋아해요.',
    example_translation: '我喜欢猫。',
    level: 'A2',
    language: 'ko',
  },
  {
    word: '비싸다',
    phonetic: '/piss͈ada/',
    part_of_speech: 'adjective',
    definition: '贵的',
    example_sentence: '이 차는 너무 비싸요.',
    example_translation: '这辆车太贵了。',
    level: 'A2',
    language: 'ko',
  },
  {
    word: '회의',
    phonetic: '/hoeɯi/',
    part_of_speech: 'noun',
    definition: '会议',
    example_sentence: '10시에 회의가 있어요.',
    example_translation: '10点有个会议。',
    level: 'A2',
    language: 'ko',
  },
  {
    word: '결정하다',
    phonetic: '/ɡjʌlʥʌŋɦada/',
    part_of_speech: 'verb',
    definition: '决定',
    example_sentence: '한국어를 공부하기로 결정했어요.',
    example_translation: '我决定学习韩语。',
    level: 'A2',
    language: 'ko',
  },
  {
    word: '잘하다',
    phonetic: '/ʥalhada/',
    part_of_speech: 'verb',
    definition: '擅长',
    example_sentence: '한국어를 잘하고 싶어요.',
    example_translation: '我想提高韩语水平。',
    level: 'A2',
    language: 'ko',
  },
];

// ===== 听力素材数据（18 个：英语/日语/韩语各 6 个，每级别 2 个）=====
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
  // ===== 日语听力素材（6 个）=====
  // A1 级别（2 个）
  {
    title: '日常の挨拶（日常问候）',
    audio_url: 'https://example.com/audio/ja-greetings.mp3',
    duration_seconds: 45,
    transcript: 'A: こんにちは！ B: こんにちは、お元気ですか？ A: はい、元気です、ありがとう。',
    level: 'A1',
    language: 'ja',
  },
  {
    title: '自己紹介（自我介绍）',
    audio_url: 'https://example.com/audio/ja-self-introduction.mp3',
    duration_seconds: 60,
    transcript: 'A: こんにちは、私は田中です。 B: 初めまして、田中さん。私は佐藤です。 A: よろしくお願いします。',
    level: 'A1',
    language: 'ja',
  },
  // A2 级别（2 个）
  {
    title: '買い物の会話（购物对话）',
    audio_url: 'https://example.com/audio/ja-shopping.mp3',
    duration_seconds: 90,
    transcript: 'A: いらっしゃいませ。 B: このシャツはいくらですか？ A: 3000円です。 B: じゃあ、これをください。',
    level: 'A2',
    language: 'ja',
  },
  {
    title: 'レストランでの注文（餐厅点餐）',
    audio_url: 'https://example.com/audio/ja-restaurant.mp3',
    duration_seconds: 75,
    transcript: 'A: ご注文はお決まりですか？ B: はい、コーヒーとケーキをお願いします。 A: かしこまりました。他には？ B: いえ、以上です。',
    level: 'A2',
    language: 'ja',
  },
  // B1 级别（2 个）
  {
    title: '旅行計画の相談（旅行计划讨论）',
    audio_url: 'https://example.com/audio/ja-travel-plan.mp3',
    duration_seconds: 120,
    transcript: 'A: 来月日本を訪れる予定です。 B: それはいいですね！どのくらい滞在しますか？ A: 約2週間です。もうフライトを予約しました。',
    level: 'B1',
    language: 'ja',
  },
  {
    title: '面接の会話（面试对话）',
    audio_url: 'https://example.com/audio/ja-job-interview.mp3',
    duration_seconds: 150,
    transcript: 'A: なぜこの仕事がしたいですか？ B: このポジションに興味があり、自分のスキルを活かしたいからです。 A: どんな経験がありますか？ B: この分野で3年間働いてきました。',
    level: 'B1',
    language: 'ja',
  },
  // ===== 韩语听力素材（6 个）=====
  // A1 级别（2 个）
  {
    title: '일상 인사（日常问候）',
    audio_url: 'https://example.com/audio/ko-greetings.mp3',
    duration_seconds: 45,
    transcript: 'A: 안녕하세요! B: 안녕하세요, 잘 지내세요? A: 네, 잘 지내요, 감사합니다.',
    level: 'A1',
    language: 'ko',
  },
  {
    title: '자기소개（自我介绍）',
    audio_url: 'https://example.com/audio/ko-self-introduction.mp3',
    duration_seconds: 60,
    transcript: 'A: 안녕하세요, 저는 김민수입니다. B: 만나서 반갑습니다, 김민수 씨. 저는 이영희입니다. A: 잘 부탁드립니다.',
    level: 'A1',
    language: 'ko',
  },
  // A2 级别（2 个）
  {
    title: '쇼핑 대화（购物对话）',
    audio_url: 'https://example.com/audio/ko-shopping.mp3',
    duration_seconds: 90,
    transcript: "A: 어서 오세요. B: 이 셔츠 얼마예요? A: 3만 원이에요. B: 그럼 이걸 주세요.",
    level: 'A2',
    language: 'ko',
  },
  {
    title: '식당 주문（餐厅点餐）',
    audio_url: 'https://example.com/audio/ko-restaurant.mp3',
    duration_seconds: 75,
    transcript: 'A: 주문하시겠어요? B: 네, 김치찌개와 밥 주세요. A: 알겠습니다. 더 드릴까요? B: 아니요, 그만이에요.',
    level: 'A2',
    language: 'ko',
  },
  // B1 级别（2 个）
  {
    title: '여행 계획 논의（旅行计划讨论）',
    audio_url: 'https://example.com/audio/ko-travel-plan.mp3',
    duration_seconds: 120,
    transcript: 'A: 다음 달에 한국에 갈 예정입니다. B: 정말 좋네요! 얼마나 머물 예정이에요? A: 약 2주일이요. 이미 비행기를 예약했어요.',
    level: 'B1',
    language: 'ko',
  },
  {
    title: '면접 대화（面试对话）',
    audio_url: 'https://example.com/audio/ko-job-interview.mp3',
    duration_seconds: 150,
    transcript: 'A: 이 직업을 왜 원하시나요? B: 이 직무에 관심이 있고 제 기술을 활용하고 싶어서요. A: 어떤 경험이 있으세요? B: 이 분야에서 3년 일했습니다.',
    level: 'B1',
    language: 'ko',
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
