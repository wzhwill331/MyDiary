export interface DiaryTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  title: string;
  content: string;
  tags?: string[];
  mood?: string;
  estimatedMinutes?: number;
}

export interface TemplateCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  templates: DiaryTemplate[];
}

export const TEMPLATE_CATEGORIES: TemplateCategory[] = [
  {
    id: 'daily',
    name: '日常记录',
    description: '留住普通日子里的细节',
    icon: 'edit-note',
    color: '#6F8F7A',
    templates: [
      {
        id: 'free',
        name: '自由日记',
        description: '从空白开始，写下此刻最想说的话',
        icon: 'edit',
        color: '#6F8F7A',
        title: '',
        content: '',
        estimatedMinutes: 5,
      },
      {
        id: 'daily-review',
        name: '今日回顾',
        description: '用五个问题快速整理一天',
        icon: 'today',
        color: '#7D9A87',
        title: '今天的片刻',
        content: `今天发生了什么？


最值得记住的一个细节：


我今天的情绪从哪里来？


做得不错的一件事：


明天醒来后，我想先做什么？`,
        tags: ['日常', '今日回顾'],
        estimatedMinutes: 8,
      },
      {
        id: 'gratitude',
        name: '感恩日记',
        description: '记录值得感谢的人、事与微小瞬间',
        icon: 'favorite',
        color: '#D07A72',
        title: '今天值得感谢的事',
        content: `今天我感谢的三件事：

1. ________
2. ________
3. ________

其中最触动我的一件事：


我想把这份感谢送给谁？


此刻身体和内心的感受：`,
        tags: ['感恩', '生活'],
        mood: '🥰',
        estimatedMinutes: 6,
      },
      {
        id: 'mood-checkin',
        name: '情绪觉察',
        description: '不评判情绪，只看见它正在发生',
        icon: 'self-improvement',
        color: '#B58A72',
        title: '此刻的心情',
        content: `此刻最明显的情绪是：


如果给它 0–10 分，它有多强烈？


是什么事情触发了它？


身体哪里最有感觉？


这个情绪可能在提醒我：


现在，我可以怎样照顾自己？`,
        tags: ['情绪', '觉察'],
        estimatedMinutes: 8,
      },
    ],
  },
  {
    id: 'growth',
    name: '成长复盘',
    description: '从经历中提炼经验和方向',
    icon: 'trending-up',
    color: '#A2845E',
    templates: [
      {
        id: 'weekly-review',
        name: '一周复盘',
        description: '回顾成果、阻碍与下周重点',
        icon: 'date-range',
        color: '#A2845E',
        title: '本周复盘',
        content: `本周关键词：


本周完成的三件重要事情：

1. ________
2. ________
3. ________

最满意的一个进展：


没有按计划完成的事情，以及原因：


本周学到的经验：


下周最重要的一件事：


需要停止、继续、开始的事情：

停止：
继续：
开始：`,
        tags: ['周总结', '复盘'],
        estimatedMinutes: 15,
      },
      {
        id: 'decision',
        name: '重要决定',
        description: '把复杂选择摊开来看清楚',
        icon: 'alt-route',
        color: '#9C7A68',
        title: '关于一个决定',
        content: `我要做的决定是：


为什么现在需要决定？


选项 A：
好处：
代价：

选项 B：
好处：
代价：

我真正担心的是什么？


如果不考虑别人的期待，我会选择：


下一步最小行动：`,
        tags: ['决定', '思考'],
        mood: '🤔',
        estimatedMinutes: 12,
      },
      {
        id: 'goal-progress',
        name: '目标进度',
        description: '检查方向，而不只是检查完成度',
        icon: 'flag',
        color: '#7F8FA4',
        title: '目标进度记录',
        content: `我的目标：


目前进度：


最近完成的关键行动：


正在阻碍我的事情：


这个目标还值得继续吗？为什么？


下一阶段的衡量标准：


未来 24 小时内可以完成的一步：`,
        tags: ['目标', '成长'],
        estimatedMinutes: 10,
      },
    ],
  },
  {
    id: 'study',
    name: '阅读学习',
    description: '把输入转化为自己的理解',
    icon: 'school',
    color: '#4F9A73',
    templates: [
      {
        id: 'reading',
        name: '读书笔记',
        description: '记录观点、摘录与个人连接',
        icon: 'menu-book',
        color: '#4F9A73',
        title: '《书名》读书笔记',
        content: `书名：
作者：
阅读章节：

一句话概括这一部分：


重要观点：

1. ________
2. ________
3. ________

触动我的原文：

“”

它让我联想到：


我不同意或仍有疑问的地方：


可以立刻实践的一件事：`,
        tags: ['阅读', '笔记'],
        estimatedMinutes: 15,
      },
      {
        id: 'course-note',
        name: '课程笔记',
        description: '按概念、例子和疑问整理知识',
        icon: 'cast-for-education',
        color: '#428F70',
        title: '课程学习记录',
        content: `课程 / 主题：


今天的核心概念：


用自己的话解释：


关键例子：


我还没理解的地方：


它与已有知识的联系：


课后要完成的行动：`,
        tags: ['学习', '课程'],
        estimatedMinutes: 12,
      },
      {
        id: 'inspiration',
        name: '灵感捕捉',
        description: '先保存火花，再慢慢把它变完整',
        icon: 'lightbulb',
        color: '#D5A441',
        title: '一个新灵感',
        content: `灵感是什么？


它是被什么触发的？


这个想法可能解决什么问题？


最有趣的部分：


如果把它做出来，会是什么样子？


下一步先验证什么？`,
        tags: ['灵感', '想法'],
        mood: '🤩',
        estimatedMinutes: 5,
      },
    ],
  },
  {
    id: 'work',
    name: '工作效率',
    description: '清晰记录进展、会议和问题',
    icon: 'work',
    color: '#6867A8',
    templates: [
      {
        id: 'worklog',
        name: '工作日志',
        description: '收拢今天的成果和明日重点',
        icon: 'assignment',
        color: '#6867A8',
        title: '今日工作记录',
        content: `今日最重要的目标：


已完成：

- ________
- ________
- ________

推进中的事项：


遇到的问题：


需要协助或确认：


明天优先处理：

1. ________
2. ________
3. `,
        tags: ['工作', '日志'],
        estimatedMinutes: 8,
      },
      {
        id: 'meeting',
        name: '会议记录',
        description: '重点保留结论、责任人与截止时间',
        icon: 'groups',
        color: '#D18A42',
        title: '会议记录',
        content: `会议主题：
时间：
参与人：

会议目标：


讨论要点：

1. ________
2. ________
3. ________

最终结论：


待办事项：

- [ ] 事项 / 负责人 / 截止时间
- [ ] 事项 / 负责人 / 截止时间

仍待确认：
`,
        tags: ['会议', '工作'],
        estimatedMinutes: 10,
      },
      {
        id: 'problem-solving',
        name: '问题分析',
        description: '从现象、原因到验证方案',
        icon: 'troubleshoot',
        color: '#8B6F8F',
        title: '问题分析记录',
        content: `问题现象：


影响范围：


已知事实：


可能原因：

1. ________
2. ________
3. ________

已经尝试过：


验证结果：


下一步方案：


最终结论与经验：`,
        tags: ['问题', '分析'],
        mood: '🤔',
        estimatedMinutes: 12,
      },
    ],
  },
  {
    id: 'life',
    name: '生活收藏',
    description: '记录旅程、人物和生活体验',
    icon: 'home',
    color: '#C27C56',
    templates: [
      {
        id: 'travel',
        name: '旅行日记',
        description: '保存路线、见闻和旅途感受',
        icon: 'flight',
        color: '#C27C56',
        title: '旅途中的一天',
        content: `地点：
同行的人：
天气：

今天的路线：


第一眼看到的景象：


最喜欢的一个瞬间：


意料之外的事情：


尝到的味道 / 听到的声音：


想带回家的记忆：`,
        tags: ['旅行', '生活'],
        mood: '🥳',
        estimatedMinutes: 12,
      },
      {
        id: 'food',
        name: '美食记录',
        description: '记住一道菜背后的味道和场景',
        icon: 'restaurant',
        color: '#D07A72',
        title: '今天吃到的味道',
        content: `菜名 / 店名：
地点：
和谁一起：

第一印象：


味道与口感：


最喜欢的细节：


推荐指数：__/5

还会再来吗？为什么？
`,
        tags: ['美食', '生活'],
        mood: '😊',
        estimatedMinutes: 6,
      },
      {
        id: 'person',
        name: '人物印象',
        description: '记录一个人带给你的真实感受',
        icon: 'person-heart',
        color: '#B87979',
        title: '关于一个人',
        content: `我想记录的人：


我们是怎样认识的？


最能代表他 / 她的一个细节：


让我印象深刻的一句话：

“”

这段关系带给我的感受：


我想对他 / 她说：
`,
        tags: ['人物', '关系'],
        mood: '🥰',
        estimatedMinutes: 10,
      },
      {
        id: 'dream',
        name: '梦境记录',
        description: '在醒来后尽快保存梦里的碎片',
        icon: 'bedtime',
        color: '#7773A8',
        title: '昨夜的梦',
        content: `醒来时的情绪：


梦里出现的人：


发生的地点：


我记得最清楚的画面：


梦里的故事：


反复出现的颜色、声音或物件：


它让我联想到现实中的：
`,
        tags: ['梦境', '潜意识'],
        estimatedMinutes: 7,
      },
    ],
  },
];

export const ALL_TEMPLATES = TEMPLATE_CATEGORIES.flatMap((category) => category.templates);
