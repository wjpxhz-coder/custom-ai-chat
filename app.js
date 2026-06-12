// app.js - 个人 AI 对话网站的核心业务逻辑

// ==========================================
// 1. 初始化与数据结构
// ==========================================
const DEFAULT_PERSONAS = [
  {
    id: 'p-default-helper',
    name: '通用助手',
    systemPrompt: '你是一个乐于助人、诚实且知识渊博的AI助手。请用清晰、条理分明且符合逻辑的语言回答用户的问题。',
    emoji: '🤖',
    model: 'gpt-4o-mini',
    temperature: 0.7
  },
  {
    id: 'p-default-coder',
    name: '代码专家',
    systemPrompt: '你是一个拥有多年架构设计和编码经验的高级软件工程师。请为用户提供结构清晰、健壮、安全并带有关键注释的代码实现。回答时要直接说明核心原理和实现逻辑，避免无意义的寒暄。',
    emoji: '💻',
    model: 'gpt-4o-mini',
    temperature: 0.2
  },
  {
    id: 'p-default-translator',
    name: '中英翻译官',
    systemPrompt: '你是一个资深的双语同声传译。当用户输入中文时，将其翻译为纯正流畅的英语；当用户输入英文或其它语言时，将其翻译为自然地道的中文。同时在翻译下方提供1-2句核心词汇和语法的精炼解析，无需进行多余的对话。',
    emoji: '🔤',
    model: 'gpt-4o-mini',
    temperature: 0.3
  }
];

let state = {
  apiKey: localStorage.getItem('chat_api_key') || '',
  personas: JSON.parse(localStorage.getItem('chat_personas')) || [...DEFAULT_PERSONAS],
  conversations: JSON.parse(localStorage.getItem('chat_conversations')) || [],
  currentConversationId: localStorage.getItem('chat_current_conv_id') || '',
  currentPersonaId: localStorage.getItem('chat_current_persona_id') || 'p-default-helper',
  editingPersonaId: null // 标识当前正在编辑的人设，如果为 null 则为新建
};

// ==========================================
// 2. DOM 元素获取
// ==========================================
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebar-overlay');
const sidebarToggleBtn = document.getElementById('sidebar-toggle-btn');
const themeToggleBtn = document.getElementById('theme-toggle-btn');

const apiKeyInput = document.querySelector('[data-testid="api-key-input"]');
const saveApiKeyBtn = document.querySelector('[data-testid="save-api-key"]');

const personasList = document.getElementById('personas-list');
const newPersonaBtn = document.querySelector('[data-testid="new-persona-btn"]');
const personaModal = document.getElementById('persona-modal');
const cancelPersonaBtn = document.getElementById('cancel-persona');
const savePersonaBtn = document.querySelector('[data-testid="save-persona"]');

const conversationsList = document.getElementById('conversations-list');
const newChatBtn = document.querySelector('[data-testid="new-chat-btn"]');

const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const sendBtn = document.getElementById('send-btn');
const typingIndicator = document.getElementById('typing-indicator');

const headerPersonaEmoji = document.getElementById('header-persona-emoji');
const headerPersonaName = document.getElementById('header-persona-name');
const headerPersonaModel = document.getElementById('header-persona-model');

// ==========================================
// 3. 页面初始化
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  // 1. 初始化 Lucide 图标
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }

  // 2. 初始化 API Key
  if (state.apiKey) {
    apiKeyInput.value = state.apiKey;
  }

  // 3. 初始化并渲染主题按钮
  renderThemeIcon();

  // 4. 渲染人设列表
  renderPersonas();

  // 5. 渲染历史会话列表
  renderConversations();

  // 6. 如果有当前会话，则加载并展示，否则选择默认人设并清除对话区
  if (state.currentConversationId && state.conversations.some(c => c.id === state.currentConversationId)) {
    selectConversation(state.currentConversationId);
  } else {
    // 默认展示当前人设的配置
    const persona = state.personas.find(p => p.id === state.currentPersonaId) || state.personas[0];
    updateHeader(persona);
    renderMessages([]);
  }

  // 7. 绑定输入框自动拉伸
  chatInput.addEventListener('input', autoResizeInput);

  // 8. 绑定按键事件
  chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  // 9. 绑定各种按钮点击事件
  sidebarToggleBtn.addEventListener('click', openSidebar);
  sidebarOverlay.addEventListener('click', closeSidebar);
  themeToggleBtn.addEventListener('click', toggleTheme);
  saveApiKeyBtn.addEventListener('click', saveApiKey);
  newPersonaBtn.addEventListener('click', () => openPersonaModal());
  cancelPersonaBtn.addEventListener('click', closePersonaModal);
  savePersonaBtn.addEventListener('click', savePersona);
  newChatBtn.addEventListener('click', createNewChat);
  sendBtn.addEventListener('click', sendMessage);

  // 10. 全局事件代理：用于删除/编辑人设、会话及复制代码
  document.addEventListener('click', handleGlobalClicks);
});

// ==========================================
// 4. 主题切换与 UI 控制
// ==========================================
function renderThemeIcon() {
  const isDark = document.documentElement.classList.contains('dark');
  themeToggleBtn.innerHTML = isDark 
    ? `<i data-lucide="sun" class="w-5 h-5 text-amber-500"></i>` 
    : `<i data-lucide="moon" class="w-5 h-5 text-slate-700"></i>`;
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
}

function toggleTheme() {
  const doc = document.documentElement;
  if (doc.classList.contains('dark')) {
    doc.classList.remove('dark');
    localStorage.setItem('theme', 'light');
  } else {
    doc.classList.add('dark');
    localStorage.setItem('theme', 'dark');
  }
  renderThemeIcon();
}

function openSidebar() {
  sidebar.classList.remove('-translate-x-full');
  sidebarOverlay.classList.remove('opacity-0', 'pointer-events-none');
  sidebarOverlay.classList.add('opacity-100');
}

window.closeSidebar = function() {
  sidebar.classList.add('-translate-x-full');
  sidebarOverlay.classList.remove('opacity-100');
  sidebarOverlay.classList.add('opacity-0', 'pointer-events-none');
}

function autoResizeInput() {
  chatInput.style.height = 'auto';
  chatInput.style.height = (chatInput.scrollHeight) + 'px';
}

// ==========================================
// 5. API 密钥与设置
// ==========================================
function saveApiKey() {
  const key = apiKeyInput.value.trim();
  state.apiKey = key;
  localStorage.setItem('chat_api_key', key);
  showToast('API Key 保存成功');
}

// 辅助轻量 Toast 提醒
function showToast(message, isError = false) {
  const toast = document.createElement('div');
  toast.className = `fixed bottom-20 left-1/2 transform -translate-x-1/2 px-4 py-2 rounded-lg text-sm text-white shadow-lg z-50 transition-all duration-300 transform translate-y-2 opacity-0 ${isError ? 'bg-rose-600' : 'bg-slate-800 dark:bg-slate-700'}`;
  toast.innerText = message;
  document.body.appendChild(toast);
  
  // 触发动画
  setTimeout(() => {
    toast.classList.remove('translate-y-2', 'opacity-0');
  }, 10);

  // 销毁
  setTimeout(() => {
    toast.classList.add('translate-y-2', 'opacity-0');
    setTimeout(() => toast.remove(), 300);
  }, 2000);
}

// ==========================================
// 6. 人设管理 (CRUD)
// ==========================================
function renderPersonas() {
  personasList.innerHTML = '';
  state.personas.forEach(p => {
    const isSelected = p.id === state.currentPersonaId;
    const item = document.createElement('div');
    item.className = `group flex items-center justify-between p-2 rounded-lg text-sm transition-all duration-200 cursor-pointer ${
      isSelected 
        ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 font-medium' 
        : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
    }`;
    item.setAttribute('data-persona-id', p.id);

    // 人设内容区
    item.innerHTML = `
      <div class="flex items-center space-x-2.5 min-w-0 flex-1 btn-select-persona">
        <span class="text-base flex-shrink-0">${p.emoji || '🤖'}</span>
        <div class="min-w-0 flex-1">
          <p class="truncate leading-tight text-xs">${p.name}</p>
          <p class="text-[9px] text-slate-400 dark:text-slate-500 truncate mt-0.5">${p.model}</p>
        </div>
      </div>
      <div class="opacity-0 group-hover:opacity-100 flex items-center space-x-1 flex-shrink-0 transition-opacity">
        <button class="btn-edit-persona p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200" title="编辑人设">
          <i data-lucide="edit-3" class="w-3 h-3 pointer-events-none"></i>
        </button>
        ${!p.id.startsWith('p-default-') ? `
          <button class="btn-delete-persona p-1 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded text-slate-400 hover:text-rose-600" title="删除人设">
            <i data-lucide="trash-2" class="w-3 h-3 pointer-events-none"></i>
          </button>
        ` : ''}
      </div>
    `;

    personasList.appendChild(item);
  });

  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
}

function openPersonaModal(personaId = null) {
  state.editingPersonaId = personaId;
  const modalTitle = document.getElementById('modal-title');
  const nameInp = document.querySelector('[data-testid="persona-name"]');
  const promptInp = document.querySelector('[data-testid="persona-prompt"]');
  const emojiInp = document.querySelector('[data-testid="persona-emoji"]');
  const modelSel = document.querySelector('[data-testid="persona-model"]');
  const tempInp = document.querySelector('[data-testid="persona-temp"]');

  if (personaId) {
    // 编辑现有人设
    const p = state.personas.find(item => item.id === personaId);
    if (p) {
      modalTitle.innerText = '编辑 AI 人设';
      nameInp.value = p.name;
      promptInp.value = p.systemPrompt;
      emojiInp.value = p.emoji || '🤖';
      modelSel.value = p.model || 'gpt-4o-mini';
      tempInp.value = p.temperature !== undefined ? p.temperature : 0.7;
    }
  } else {
    // 创建新人设
    modalTitle.innerText = '创建 AI 人设';
    nameInp.value = '';
    promptInp.value = '';
    emojiInp.value = '🤖';
    modelSel.value = 'gpt-4o-mini';
    tempInp.value = '0.7';
  }

  personaModal.classList.remove('hidden');
  personaModal.classList.add('flex');
}

function closePersonaModal() {
  personaModal.classList.remove('flex');
  personaModal.classList.add('hidden');
  state.editingPersonaId = null;
}

function savePersona() {
  const name = document.querySelector('[data-testid="persona-name"]').value.trim();
  const prompt = document.querySelector('[data-testid="persona-prompt"]').value.trim();
  const emoji = document.querySelector('[data-testid="persona-emoji"]').value.trim() || '🤖';
  const model = document.querySelector('[data-testid="persona-model"]').value;
  const temp = parseFloat(document.querySelector('[data-testid="persona-temp"]').value) || 0.7;

  if (!name) {
    showToast('人设名称不能为空', true);
    return;
  }
  if (!prompt) {
    showToast('系统提示词不能为空', true);
    return;
  }

  if (state.editingPersonaId) {
    // 修改
    state.personas = state.personas.map(p => {
      if (p.id === state.editingPersonaId) {
        return { ...p, name, systemPrompt: prompt, emoji, model, temperature: temp };
      }
      return p;
    });
    showToast('人设修改成功');
  } else {
    // 新增
    const newPersona = {
      id: 'p-custom-' + Date.now(),
      name,
      systemPrompt: prompt,
      emoji,
      model,
      temperature: temp
    };
    state.personas.push(newPersona);
    state.currentPersonaId = newPersona.id; // 自动选中新创建的人设
    showToast('人设创建成功');
  }

  localStorage.setItem('chat_personas', JSON.stringify(state.personas));
  localStorage.setItem('chat_current_persona_id', state.currentPersonaId);
  
  // 更新主界面的 header
  const currentPersona = state.personas.find(p => p.id === state.currentPersonaId);
  if (currentPersona) {
    updateHeader(currentPersona);
  }

  renderPersonas();
  closePersonaModal();
}

function deletePersona(id) {
  // 默认人设不能删除
  if (id.startsWith('p-default-')) return;

  state.personas = state.personas.filter(p => p.id !== id);
  localStorage.setItem('chat_personas', JSON.stringify(state.personas));

  // 如果被删除的是当前选中人设，切换为第一个人设
  if (state.currentPersonaId === id) {
    state.currentPersonaId = state.personas[0].id;
    localStorage.setItem('chat_current_persona_id', state.currentPersonaId);
    updateHeader(state.personas[0]);
  }

  renderPersonas();
  showToast('人设已删除');
}

// ==========================================
// 7. 会话管理
// ==========================================
function renderConversations() {
  conversationsList.innerHTML = '';
  
  if (state.conversations.length === 0) {
    conversationsList.innerHTML = `<p class="text-xs text-slate-400 dark:text-slate-600 text-center py-4">无历史会话记录</p>`;
    return;
  }

  state.conversations.forEach(c => {
    const isSelected = c.id === state.currentConversationId;
    const item = document.createElement('div');
    item.className = `group flex items-center justify-between p-2 rounded-lg text-sm transition-all duration-200 cursor-pointer ${
      isSelected 
        ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium border-l-2 border-indigo-600' 
        : 'hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-600 dark:text-slate-400'
    }`;
    item.setAttribute('data-conversation-id', c.id);

    // 查找人设
    const persona = state.personas.find(p => p.id === c.personaId) || DEFAULT_PERSONAS[0];

    item.innerHTML = `
      <div class="flex items-center space-x-2 min-w-0 flex-1 btn-select-conversation">
        <span class="text-xs flex-shrink-0">${persona.emoji || '🤖'}</span>
        <span class="truncate text-xs flex-1">${c.title}</span>
      </div>
      <button class="btn-delete-conversation opacity-0 group-hover:opacity-100 p-1 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded text-slate-400 hover:text-rose-600 transition-opacity" title="删除会话">
        <i data-lucide="trash-2" class="w-3 h-3 pointer-events-none"></i>
      </button>
    `;

    conversationsList.appendChild(item);
  });

  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
}

function createNewChat() {
  // 查找当前人设信息
  const activePersona = state.personas.find(p => p.id === state.currentPersonaId) || state.personas[0];
  const newChat = {
    id: 'c-' + Date.now(),
    title: `与${activePersona.name}的对话`,
    personaId: activePersona.id,
    messages: []
  };

  state.conversations.unshift(newChat);
  state.currentConversationId = newChat.id;

  localStorage.setItem('chat_conversations', JSON.stringify(state.conversations));
  localStorage.setItem('chat_current_conv_id', state.currentConversationId);

  renderConversations();
  selectConversation(newChat.id);
  
  // 手机端自动折叠侧边栏
  if (window.innerWidth < 768) {
    closeSidebar();
  }
}

function selectConversation(id) {
  state.currentConversationId = id;
  localStorage.setItem('chat_current_conv_id', id);

  const conv = state.conversations.find(c => c.id === id);
  if (conv) {
    // 自动切换为人设相匹配的状态
    state.currentPersonaId = conv.personaId;
    localStorage.setItem('chat_current_persona_id', conv.personaId);
    
    const persona = state.personas.find(p => p.id === conv.personaId) || state.personas[0];
    updateHeader(persona);
    renderMessages(conv.messages);
  }

  renderPersonas();
  renderConversations();
}

function deleteConversation(id) {
  state.conversations = state.conversations.filter(c => c.id !== id);
  localStorage.setItem('chat_conversations', JSON.stringify(state.conversations));

  if (state.currentConversationId === id) {
    if (state.conversations.length > 0) {
      state.currentConversationId = state.conversations[0].id;
      localStorage.setItem('chat_current_conv_id', state.currentConversationId);
      selectConversation(state.currentConversationId);
    } else {
      state.currentConversationId = '';
      localStorage.removeItem('chat_current_conv_id');
      renderMessages([]);
      // 恢复展示当前选择的人设头部
      const persona = state.personas.find(p => p.id === state.currentPersonaId) || state.personas[0];
      updateHeader(persona);
    }
  }

  renderConversations();
  showToast('会话已删除');
}

function updateHeader(persona) {
  headerPersonaEmoji.innerText = persona.emoji || '🤖';
  headerPersonaName.innerText = persona.name;
  headerPersonaModel.innerText = persona.model;
}

window.clearAllData = function() {
  if (confirm('确定要清除所有数据吗？这将清空 API Key、自定义人设和所有会话记录。')) {
    localStorage.clear();
    state.apiKey = '';
    state.personas = [...DEFAULT_PERSONAS];
    state.conversations = [];
    state.currentConversationId = '';
    state.currentPersonaId = 'p-default-helper';

    apiKeyInput.value = '';
    renderPersonas();
    renderConversations();
    updateHeader(state.personas[0]);
    renderMessages([]);
    showToast('系统数据已全部重置');
  }
}

// ==========================================
// 8. 消息绘制与 Markdown 解析
// ==========================================
function renderMessages(messages) {
  // 先把原有消息流清空，同时保持 typing-indicator 的结构
  const indicator = typingIndicator.cloneNode(true);
  chatMessages.innerHTML = '';
  chatMessages.appendChild(indicator);

  if (messages.length === 0) {
    // 显示空状态欢迎语
    const activePersona = state.personas.find(p => p.id === state.currentPersonaId) || state.personas[0];
    const welcome = document.createElement('div');
    welcome.className = 'flex flex-col items-center justify-center text-center py-20 px-4 space-y-4';
    welcome.innerHTML = `
      <span class="text-5xl animate-bounce duration-1000">${activePersona.emoji || '🤖'}</span>
      <h2 class="text-xl font-bold text-slate-800 dark:text-slate-100">我是你的 ${activePersona.name}</h2>
      <p class="text-sm text-slate-500 dark:text-slate-400 max-w-md">“ ${activePersona.systemPrompt} ”</p>
      <p class="text-xs text-slate-400 dark:text-slate-600">在底部输入框输入消息以开始新对话。</p>
    `;
    chatMessages.insertBefore(welcome, indicator);
    return;
  }

  messages.forEach(msg => {
    appendMessageDOM(msg.role, msg.content);
  });
}

function appendMessageDOM(role, content) {
  const isUser = role === 'user';
  const messageWrapper = document.createElement('div');
  messageWrapper.className = `flex ${isUser ? 'justify-end' : 'justify-start'} w-full`;

  const innerHTML = isUser 
    ? `
      <div class="bg-indigo-600 text-white rounded-2xl rounded-tr-none px-4 py-2.5 max-w-[85%] md:max-w-[70%] shadow-sm text-sm break-words whitespace-pre-wrap">
        ${escapeHTML(content)}
      </div>
    `
    : `
      <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 text-slate-800 dark:text-slate-100 rounded-2xl rounded-tl-none px-4 py-3 max-w-[85%] md:max-w-[75%] shadow-sm text-sm break-words leading-relaxed transition-colors duration-200">
        <div class="prose prose-slate dark:prose-invert max-w-none">
          ${parseMarkdown(content)}
        </div>
      </div>
    `;

  messageWrapper.innerHTML = innerHTML;
  // 插入在 typing-indicator 之前
  chatMessages.insertBefore(messageWrapper, typingIndicator);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// 轻量级 HTML 转义
function escapeHTML(str) {
  return str.replace(/[&<>'"]/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
}

// 高保真自定义轻量级 Markdown 解析引擎
function parseMarkdown(text) {
  let html = text;

  // 1. 转义普通的 HTML 标签防注入（但要保留我们后面解析出的标签）
  html = escapeHTML(html);

  // 2. 解析多行代码块 ```language ... ```
  // 匹配：```[lang]\n[code]```
  const codeBlockRegex = /```([a-zA-Z0-9+#-]+)?\n([\s\S]+?)\n```/g;
  html = html.replace(codeBlockRegex, (match, lang, code) => {
    const language = lang ? lang.trim() : 'code';
    // 还原被转义的代码文本以供复制
    const rawCode = code.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'").replace(/&quot;/g, '"');
    
    return `
      <div class="relative group my-3">
        <div class="flex items-center justify-between px-4 py-1.5 bg-slate-100 dark:bg-slate-800/80 border border-b-0 border-slate-200 dark:border-slate-800 rounded-t-lg text-[10px] font-mono text-slate-500 dark:text-slate-400 transition-colors">
          <span>${language}</span>
          <button class="btn-copy-code px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 active:scale-95 transition-all" data-code="${encodeURIComponent(rawCode)}">
            复制
          </button>
        </div>
        <pre class="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 p-4 rounded-b-lg font-mono text-xs overflow-x-auto text-slate-800 dark:text-slate-200"><code class="language-${language}">${code}</code></pre>
      </div>
    `;
  });

  // 3. 解析行内代码 `code`
  html = html.replace(/`([^`]+)`/g, '<code class="bg-slate-100 dark:bg-slate-800/80 px-1 py-0.5 rounded font-mono text-xs text-indigo-600 dark:text-indigo-400">$1</code>');

  // 4. 解析加粗 **bold**
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-bold text-slate-900 dark:text-slate-50 font-semibold">$1</strong>');

  // 5. 解析列表
  // 匹配无序列表 - item
  html = html.replace(/^\s*-\s+(.+)$/gm, '<li class="list-disc list-inside ml-2 py-0.5">$1</li>');
  // 匹配有序列表 1. item
  html = html.replace(/^\s*(\d+)\.\s+(.+)$/gm, '<li class="list-decimal list-inside ml-2 py-0.5">$2</li>');

  // 6. 处理换行符 \n -> <br>（只对不在 <pre> 块内的内容生效）
  // 简单方案：先按 <pre> 分隔，再对非 <pre> 的块替换 \n 为 <br>
  const parts = html.split(/(<div[\s\S]+?<\/div>)/g);
  html = parts.map(part => {
    if (part.startsWith('<div')) return part;
    return part.replace(/\n/g, '<br>');
  }).join('');

  return html;
}

// ==========================================
// 9. API 请求与对话发送
// ==========================================
async function sendMessage() {
  const content = chatInput.value.trim();
  if (!content) return;

  // 检查 API Key
  if (!state.apiKey) {
    showToast('请在侧边栏先配置 API Key', true);
    // 聚焦到 API Key 输入框
    apiKeyInput.focus();
    // 晃动设置面板提示用户
    apiKeyInput.classList.add('animate-bounce');
    setTimeout(() => apiKeyInput.classList.remove('animate-bounce'), 1000);
    return;
  }

  // 1. 如果没有当前会话，则在发送第一条消息时自动创建
  if (!state.currentConversationId) {
    createNewChat();
  }

  // 获取当前活跃的会话
  const convIndex = state.conversations.findIndex(c => c.id === state.currentConversationId);
  if (convIndex === -1) return;
  const conv = state.conversations[convIndex];

  // 2. 推送用户消息
  const userMsg = { role: 'user', content };
  conv.messages.push(userMsg);
  
  // 更新历史会话的标题为用户发的第一条消息的简短版本
  if (conv.messages.filter(m => m.role === 'user').length === 1) {
    conv.title = content.length > 15 ? content.substring(0, 15) + '...' : content;
  }

  // 更新存储与渲染
  localStorage.setItem('chat_conversations', JSON.stringify(state.conversations));
  renderConversations();
  appendMessageDOM('user', content);

  // 清理输入框
  chatInput.value = '';
  autoResizeInput();

  // 3. 显示打字输入状态
  typingIndicator.classList.remove('hidden');
  typingIndicator.classList.add('flex');
  chatMessages.scrollTop = chatMessages.scrollHeight;

  // 4. 获取当前选中的人设信息
  const activePersona = state.personas.find(p => p.id === state.currentPersonaId) || state.personas[0];

  // 组装 API 参数
  // 必须首条带上 system prompt
  const requestMessages = [
    { role: 'system', content: activePersona.systemPrompt },
    ...conv.messages
  ];

  try {
    const response = await fetch('https://api.chatanywhere.tech/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${state.apiKey}`
      },
      body: JSON.stringify({
        model: activePersona.model || 'gpt-4o-mini',
        messages: requestMessages,
        temperature: activePersona.temperature,
        stream: true
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`API 响应错误 (${response.status}): ${errText}`);
    }

    // 隐藏打字提示
    typingIndicator.classList.remove('flex');
    typingIndicator.classList.add('hidden');

    // 5. 创建接收流数据的新 DOM 气泡
    const responseWrapper = document.createElement('div');
    responseWrapper.className = 'flex justify-start w-full';
    responseWrapper.innerHTML = `
      <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 text-slate-800 dark:text-slate-100 rounded-2xl rounded-tl-none px-4 py-3 max-w-[85%] md:max-w-[75%] shadow-sm text-sm break-words leading-relaxed transition-colors duration-200">
        <div class="prose prose-slate dark:prose-invert max-w-none message-content-node">
          <!-- 动态文字流写入处 -->
        </div>
      </div>
    `;
    chatMessages.insertBefore(responseWrapper, typingIndicator);
    const textNode = responseWrapper.querySelector('.message-content-node');

    // 6. 流式接收数据
    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let assistantReply = '';
    let buffer = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      buffer += chunk;

      const lines = buffer.split('\n');
      buffer = lines.pop(); // 保留最后一个不完整的行在 buffer 中

      for (let line of lines) {
        line = line.trim();
        if (!line) continue;
        if (line === 'data: [DONE]') continue;

        if (line.startsWith('data: ')) {
          try {
            const parsed = JSON.parse(line.slice(6));
            const content = parsed.choices[0]?.delta?.content || '';
            assistantReply += content;
            // 实时将当前接收的完整文本进行 Markdown 渲染
            textNode.innerHTML = parseMarkdown(assistantReply);
            chatMessages.scrollTop = chatMessages.scrollHeight;
          } catch (e) {
            // 解析失败时可能是一行 SSE 的控制字符，忽略
          }
        }
      }
    }

    // 处理最后 buffer 里的数据
    if (buffer && buffer.startsWith('data: ')) {
      try {
        const parsed = JSON.parse(buffer.slice(6));
        const content = parsed.choices[0]?.delta?.content || '';
        assistantReply += content;
        textNode.innerHTML = parseMarkdown(assistantReply);
      } catch(e) {}
    }

    // 7. 写入本地历史记录
    conv.messages.push({ role: 'assistant', content: assistantReply });
    localStorage.setItem('chat_conversations', JSON.stringify(state.conversations));

  } catch (err) {
    console.error('发送消息请求失败：', err);
    // 隐藏打字提示
    typingIndicator.classList.remove('flex');
    typingIndicator.classList.add('hidden');

    // 显示出错气泡
    const errWrapper = document.createElement('div');
    errWrapper.className = 'flex justify-start w-full';
    errWrapper.innerHTML = `
      <div class="bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-400 rounded-2xl rounded-tl-none px-4 py-2.5 max-w-[85%] shadow-sm text-xs transition-colors duration-200">
        <strong>请求失败：</strong> ${err.message || '网络或接口连接异常'}
      </div>
    `;
    chatMessages.insertBefore(errWrapper, typingIndicator);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }
}

// ==========================================
// 10. 事件代理与全局操作
// ==========================================
function handleGlobalClicks(e) {
  const target = e.target;

  // 1. 人设卡片选择
  const personaSelectNode = target.closest('.btn-select-persona');
  if (personaSelectNode) {
    const personaId = personaSelectNode.closest('[data-persona-id]').getAttribute('data-persona-id');
    state.currentPersonaId = personaId;
    localStorage.setItem('chat_current_persona_id', personaId);
    
    // 更新主界面的 Header 显示
    const persona = state.personas.find(p => p.id === personaId);
    if (persona) {
      updateHeader(persona);
    }
    
    // 如果没有正在进行的会话，直接刷新空欢迎信息；若有，点击后不影响当前会话，仅表明“当前选用人设”。
    // 用户如需开启新对话，可以点击新对话按钮。
    if (!state.currentConversationId) {
      renderMessages([]);
    }

    renderPersonas();
    return;
  }

  // 2. 编辑人设
  const personaEditNode = target.closest('.btn-edit-persona');
  if (personaEditNode) {
    const personaId = personaEditNode.closest('[data-persona-id]').getAttribute('data-persona-id');
    openPersonaModal(personaId);
    return;
  }

  // 3. 删除人设
  const personaDeleteNode = target.closest('.btn-delete-persona');
  if (personaDeleteNode) {
    if (confirm('确定要删除这个人设吗？')) {
      const personaId = personaDeleteNode.closest('[data-persona-id]').getAttribute('data-persona-id');
      deletePersona(personaId);
    }
    return;
  }

  // 4. 会话选择
  const convSelectNode = target.closest('.btn-select-conversation');
  if (convSelectNode) {
    const convId = convSelectNode.closest('[data-conversation-id]').getAttribute('data-conversation-id');
    selectConversation(convId);
    
    // 手机端自动折叠侧边栏
    if (window.innerWidth < 768) {
      closeSidebar();
    }
    return;
  }

  // 5. 删除会话
  const convDeleteNode = target.closest('.btn-delete-conversation');
  if (convDeleteNode) {
    if (confirm('确认删除此会话记录吗？')) {
      const convId = convDeleteNode.closest('[data-conversation-id]').getAttribute('data-conversation-id');
      deleteConversation(convId);
    }
    return;
  }

  // 6. 复制 Markdown 代码块代码
  const copyCodeNode = target.closest('.btn-copy-code');
  if (copyCodeNode) {
    const rawCode = decodeURIComponent(copyCodeNode.getAttribute('data-code'));
    navigator.clipboard.writeText(rawCode)
      .then(() => {
        copyCodeNode.innerText = '已复制';
        copyCodeNode.classList.add('bg-emerald-500', 'text-white', 'border-emerald-600');
        copyCodeNode.classList.remove('bg-white', 'dark:bg-slate-700');
        
        setTimeout(() => {
          copyCodeNode.innerText = '复制';
          copyCodeNode.classList.remove('bg-emerald-500', 'text-white', 'border-emerald-600');
          copyCodeNode.classList.add('bg-white', 'dark:bg-slate-700');
        }, 2000);
      })
      .catch(err => {
        console.error('复制代码失败：', err);
        showToast('复制失败，请手动选择复制', true);
      });
    return;
  }
}
