export interface DiaryTemplate {
  id: string;
  name: string;
  icon: string;
  color: string;
  title: string;
  content: string;
}

export interface TemplateCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  templates: DiaryTemplate[];
}

export const TEMPLATE_CATEGORIES: TemplateCategory[] = [
  {
    id: 'daily',
    name: '日常',
    icon: 'edit-note',
    color: '#007AFF',
    templates: [
      {
        id: 'free',
        name: '自由日记',
        icon: 'edit',
        color: '#007AFF',
        title: '',
        content: '',
      },
      {
        id: 'gratitude',
        name: '感恩日记',
        icon: 'favorite',
        color: '#FF6B6B',
        title: '',
        content: `今天我感恩的三件事：

1. 
2. 
3. 

今天最开心的事：
`,
      },
      {
        id: 'mood',
        name: '心情日记',
        icon: 'mood',
        color: '#FF2D55',
        title: '',
        content: `😊 今日心情：

🌤️ 今天发生了什么：

💭 我的想法：

🌟 明天的期望：
`,
      },
    ],
  },
  {
    id: 'study',
    name: '学习',
    icon: 'school',
    color: '#34C759',
    templates: [
      {
        id: 'reading',
        name: '读书笔记',
        icon: 'menu-book',
        color: '#34C759',
        title: '',
        content: `📖 《》

👤 作者：

📝 摘录：


💡 感想：
`,
      },
      {
        id: 'weekly',
        name: '周总结',
        icon: 'date-range',
        color: '#A2845E',
        title: '',
        content: `📅 本周总结（//）

🎯 本周目标完成情况：

✨ 本周高光时刻：

📊 下周计划：
`,
      },
    ],
  },
  {
    id: 'work',
    name: '工作',
    icon: 'work',
    color: '#5856D6',
    templates: [
      {
        id: 'worklog',
        name: '工作日志',
        icon: 'assignment',
        color: '#5856D6',
        title: '',
        content: `✅ 今日完成：

📋 明日计划：

⚠️ 遇到的问题：

💡 解决方案：
`,
      },
      {
        id: 'meeting',
        name: '会议记录',
        icon: 'groups',
        color: '#FF9500',
        title: '',
        content: `📋 会议主题：

👥 参会人员：

📝 会议内容：

✅ 待办事项：
`,
      },
    ],
  },
  {
    id: 'life',
    name: '生活',
    icon: 'home',
    color: '#FF9500',
    templates: [
      {
        id: 'travel',
        name: '旅行日记',
        icon: 'flight',
        color: '#FF9500',
        title: '',
        content: `📍 地点：

🗓️ 日期：

🚶 行程：


💭 感受：
`,
      },
      {
        id: 'recipe',
        name: '美食记录',
        icon: 'restaurant',
        color: '#FF6B6B',
        title: '',
        content: `🍽️ 菜名：

📍 餐厅/做法：

⭐ 推荐指数：/5

📝 评价：
`,
      },
    ],
  },
];

// Flat list of all templates
export const ALL_TEMPLATES = TEMPLATE_CATEGORIES.flatMap((c) => c.templates);
