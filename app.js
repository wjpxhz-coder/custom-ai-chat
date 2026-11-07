// app.js - Custom AI Chat 核心逻辑 (v2.0 优化版)

// ==========================================
// 1. 常量定义与默认数据
// ==========================================

const PROVIDER_PRESETS = {
  chatanywhere: {
    name: 'ChatAnywhere (国内直连优化)',
    endpoint: 'https://api.chatanywhere.tech/v1',
    defaultModel: 'gpt-4o-mini'
  },
  deepseek: {
    name: 'DeepSeek 官方 API',
    endpoint: 'https://api.deepseek.com/v1',
    defaultModel: 'deepseek-chat'
  },
  openai: {
    name: 'OpenAI 官方 API',
    endpoint: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini'
  },
  siliconflow: {
    name: '硅基流动 (SiliconFlow)',
    endpoint: 'https://api.siliconflow.cn/v1',
    defaultModel: 'deepseek-ai/DeepSeek-V3'
  },
  moonshot: {
    name: '月之暗面 (Moonshot / Kimi)',
    endpoint: 'https://api.moonshot.cn/v1',
    defaultModel: 'moonshot-v1-8k'
  },
  ollama: {
    name: 'Ollama 本地大模型',
    endpoint: 'http://localhost:11434/v1',
    defaultModel: 'llama3'
  },
  custom: {
    name: '自定义 Base URL',
    endpoint: '',
    defaultModel: ''
  }
};

const DEFAULT_PERSONAS = [
  {
    id: 'p-default-helper',
    name: '通用助手',
    systemPrompt: '你是一个乐于助人、诚实且知识渊博的 AI 助手。请用清晰、条理分明且符合逻辑的语言回答用户的问题。在适当时可以使用清晰的 Markdown 排版、表格或代码块。',
    emoji: '🤖',
    model: 'gpt-4o-mini',
    temperature: 0.7
  },
  {
    id: 'p-default-coder',
    name: '全栈架构师',
    systemPrompt: '你是一个拥有多年高并发系统架构与全栈开发经验的高级软件工程师。请为用户提供结构清晰、健壮、安全并带有关键注释的代码实现。直接说明核心原理与实现逻辑，避免无意义的客套寒暄。',
    emoji: '💻',
    model: 'gpt-4o-mini',
    temperature: 0.2
  },
  {
    id: 'p-default-reasoner',
    name: '深度思考者',
    systemPrompt: '你是一个擅长深度分析、批判性思维与复杂逻辑推演的专家。在解决复杂问题时，请展示清晰缜密的思维推导链条，分步骤剖析问题实质。',
    emoji: '🧠',
    model: 'deepseek-reasoner',
    temperature: 0.6
  },
  {
    id: 'p-default-translator',
    name: '中英同传翻译官',
    systemPrompt: '你是一个资深的双语同声传译。当用户输入中文时，将其翻译为纯正流畅的英语；当用户输入英文或其它语言时，将其翻译为自然地道的中文。同时在翻译下方提供 1-2 句核心词汇和高阶语法的精炼解析，无需进行多余的客套寒暄。',
    emoji: '🔤',
    model: 'gpt-4o-mini',
    temperature: 0.3
  }
];

// 防御性解析本地存储
function safeLoadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed !== null ? parsed : fallback;
  } catch (err) {
    console.warn(`加载本地缓存 [${key}] 异常，已恢复默认:`, err);
    return fallback;
  }
}

// 全局响应式状态
const state = {
  apiKey: localStorage.getItem('chat_api_key') || '',
  apiProvider: localStorage.getItem('chat_api_provider') || 'chatanywhere',
  apiEndpoint: localStorage.getItem('chat_api_endpoint') || 'https://api.chatanywhere.tech/v1',
  contextLimit: parseInt(localStorage.getItem('chat_context_limit') ?? '6', 10),
  personas: safeLoadJSON('chat_personas', DEFAULT_PERSONAS),
  conversations: safeLoadJSON('chat_conversations', []),
  currentConversationId: localStorage.getItem('chat_current_conv_id') || '',
  currentPersonaId: localStorage.getItem('chat_current_persona_id') || 'p-default-helper',
  editingPersonaId: null,
  searchKeyword: '',
  isGenerating: false,
  abortController: null,
  userScrolledUp: false
};

// 确保默认人设完整
if (!Array.isArray(state.personas) || state.personas.length === 0) {
  state.personas = [...DEFAULT_PERSONAS];
}

// ==========================================
// 2. DOM 元素缓存
// ==========================================

const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebar-overlay');
const sidebarToggleBtn = document.getElementById('sidebar-toggle-btn');
const themeToggleBtn = document.getElementById('theme-toggle-btn');
const sidebarThemeToggleBtn = document.getElementById('sidebar-theme-toggle-btn');

const apiProviderSelect = document.getElementById('api-provider-select');
const apiEndpointInput = document.getElementById('api-endpoint-input');
const apiKeyInput = document.getElementById('api-key-input');
const toggleKeyVisibilityBtn = document.getElementById('toggle-key-visibility-btn');
const contextLimitSelect = document.getElementById('context-limit-select');
const saveApiKeyBtn = document.getElementById('save-api-key-btn');
const apiStatusBadge = document.getElementById('api-status-badge');

const personasList = document.getElementById('personas-list');
const newPersonaBtn = document.querySelector('[data-testid="new-persona-btn"]');
const personaModal = document.getElementById('persona-modal');
const cancelPersonaBtn = document.getElementById('cancel-persona');
const savePersonaBtn = document.querySelector('[data-testid="save-persona"]');
const personaModelSelect = document.getElementById('persona-model-select');
const personaCustomModelInput = document.getElementById('persona-custom-model');
const personaTempSlider = document.getElementById('persona-temp-slider');
const tempValDisplay = document.getElementById('temp-val-display');

const conversationSearchInput = document.getElementById('conversation-search-input');
const conversationsList = document.getElementById('conversations-list');
const newChatBtn = document.querySelector('[data-testid="new-chat-btn"]');
const headerNewChatBtn = document.getElementById('header-new-chat-btn');
const exportMdBtn = document.getElementById('export-md-btn');
const exportJsonBtn = document.getElementById('export-json-btn');
const importJsonTriggerBtn = document.getElementById('import-json-trigger-btn');
const importJsonFile = document.getElementById('import-json-file');

const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const sendBtn = document.getElementById('send-btn');
const typingIndicator = document.getElementById('typing-indicator');
const scrollBottomBtn = document.getElementById('scroll-bottom-btn');

const headerPersonaEmoji = document.getElementById('header-persona-emoji');
const headerPersonaName = document.getElementById('header-persona-name');
const headerPersonaModel = document.getElementById('header-persona-model');
const headerConversationTitle = document.getElementById('header-conversation-title');
const headerProviderBadge = document.getElementById('header-provider-badge');

// ==========================================
// 3. Markdown / 代码高亮 / 数学公式解析
// ==========================================

// 初始化 Marked 解析器
if (typeof marked !== 'undefined') {
  const renderer = new marked.Renderer();

  // 自定义代码块渲染器（集成 Highlight.js 与一键复制按钮）
  renderer.code = function(code, lang) {
    const language = (lang || '').trim();
    let highlightedCode = '';
    
    if (typeof hljs !== 'undefined' && language && hljs.getLanguage(language)) {
      try {
        highlightedCode = hljs.highlight(code, { language }).value;
      } catch (e) {
        highlightedCode = escapeHTML(code);
      }
    } else if (typeof hljs !== 'undefined') {
      try {
        highlightedCode = hljs.highlightAuto(code).value;
      } catch (e) {
        highlightedCode = escapeHTML(code);
      }
    } else {
      highlightedCode = escapeHTML(code);
    }

    const encodedCode = encodeURIComponent(code);

    return `
      <div class="code-block-wrapper my-3 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-900 shadow-sm text-xs">
        <div class="flex items-center justify-between px-3.5 py-1.5 bg-slate-800/90 text-slate-300 font-mono border-b border-slate-700/60 select-none">
          <span class="flex items-center gap-1.5">
            <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span class="text-[11px] uppercase tracking-wider text-slate-400">${language || 'code'}</span>
          </span>
          <button type="button" class="btn-copy-code px-2 py-0.5 rounded text-[11px] bg-slate-700 hover:bg-slate-600 text-slate-200 active:scale-95 transition-all flex items-center gap-1" data-code="${encodedCode}" title="复制代码">
            <i data-lucide="copy" class="w-3 h-3 pointer-events-none"></i>
            <span>复制</span>
          </button>
        </div>
        <pre class="p-3.5 text-xs font-mono overflow-x-auto text-slate-100 leading-relaxed bg-[#1e1e2e]"><code>${highlightedCode}</code></pre>
      </div>
    `;
  };

  marked.setOptions({
    renderer: renderer,
    gfm: true,
    breaks: true,
    mangle: false,
    headerIds: false
  });
}

// HTML 安全转义
function escapeHTML(str) {
  if (!str) return '';
  return str.replace(/[&<>'"]/g, tag => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  }[tag] || tag));
}

// 统一的 Markdown 解析函数
function parseMarkdown(text) {
  if (!text) return '';

  try {
    if (typeof marked !== 'undefined') {
      const rawHtml = marked.parse(text);
      if (typeof DOMPurify !== 'undefined') {
        return DOMPurify.sanitize(rawHtml, {
          ADD_TAGS: ['iframe', 'button', 'span', 'i', 'code', 'pre'],
          ADD_ATTR: ['target', 'data-code', 'class', 'title', 'data-lucide', 'type']
        });
      }
      return rawHtml;
    }
  } catch (err) {
    console.error('Marked 解析异常:', err);
  }

  // 极简降级方案
  return escapeHTML(text).replace(/\n/g, '<br>');
}

// 对指定 DOM 节点渲染数学公式 (KaTeX)
function renderMathInNode(node) {
  if (typeof renderMathInElement !== 'undefined' && node) {
    try {
      renderMathInElement(node, {
        delimiters: [
          { left: '$$', right: '$$', display: true },
          { left: '$', right: '$', display: false },
          { left: '\\[', right: '\\]', display: true },
          { left: '\\(', right: '\\)', display: false }
        ],
        throwOnError: false
      });
    } catch (e) {
      console.warn('KaTeX 公式渲染异常:', e);
    }
  }
}

// ==========================================
// 4. 页面初始化与事件绑定
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
  // 1. 刷新 Lucide 图标
  refreshIcons();

  // 2. 初始化 API 配置项与 UI
  initSettingsUI();

  // 3. 初始化并渲染主题
  renderThemeIcon();

  // 4. 渲染人设列表
  renderPersonas();

  // 5. 渲染历史会话列表
  renderConversations();

  // 6. 初始化活跃会话
  initActiveChat();

  // 7. 绑定输入与发送控制
  chatInput.addEventListener('input', autoResizeInput);
  chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendOrStop();
    }
  });

  // 8. 绑定所有按钮与交互
  bindUIEvents();

  // 9. 智能滚动监听
  chatMessages.addEventListener('scroll', handleChatScroll);
  scrollBottomBtn.addEventListener('click', scrollToBottomSmooth);
});

function refreshIcons() {
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
}

function initSettingsUI() {
  // API Key
  if (state.apiKey) {
    apiKeyInput.value = state.apiKey;
    apiStatusBadge.innerText = '已配置密钥';
    apiStatusBadge.className = 'text-[10px] px-2 py-0.5 rounded-full font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400';
  } else {
    apiStatusBadge.innerText = '未配置密钥';
    apiStatusBadge.className = 'text-[10px] px-2 py-0.5 rounded-full font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400';
  }

  // Provider
  if (state.apiProvider && PROVIDER_PRESETS[state.apiProvider]) {
    apiProviderSelect.value = state.apiProvider;
  } else {
    apiProviderSelect.value = 'custom';
  }

  // Endpoint
  apiEndpointInput.value = state.apiEndpoint || 'https://api.chatanywhere.tech/v1';

  // Context Limit
  contextLimitSelect.value = state.contextLimit.toString();

  // 更新 Header 上的 Provider 徽章
  updateProviderBadge();
}

function updateProviderBadge() {
  const p = PROVIDER_PRESETS[state.apiProvider];
  if (p) {
    headerProviderBadge.innerText = p.name.split(' ')[0];
  } else {
    headerProviderBadge.innerText = '自定义接口';
  }
}

function bindUIEvents() {
  // 侧边栏展开折叠
  sidebarToggleBtn.addEventListener('click', openSidebar);
  sidebarOverlay.addEventListener('click', closeSidebar);

  // 主题切换
  themeToggleBtn.addEventListener('click', toggleTheme);
  sidebarThemeToggleBtn.addEventListener('click', toggleTheme);

  // 接口预设切换
  apiProviderSelect.addEventListener('change', handleProviderChange);

  // API 密钥显隐切换
  toggleKeyVisibilityBtn.addEventListener('click', () => {
    const isPassword = apiKeyInput.type === 'password';
    apiKeyInput.type = isPassword ? 'text' : 'password';
    toggleKeyVisibilityBtn.innerHTML = isPassword 
      ? `<i data-lucide="eye-off" class="w-3.5 h-3.5"></i>` 
      : `<i data-lucide="eye" class="w-3.5 h-3.5"></i>`;
    refreshIcons();
  });

  // 保存设置按钮
  saveApiKeyBtn.addEventListener('click', saveSettings);

  // 人设模态框
  newPersonaBtn.addEventListener('click', () => openPersonaModal());
  cancelPersonaBtn.addEventListener('click', closePersonaModal);
  savePersonaBtn.addEventListener('click', savePersona);
  personaModelSelect.addEventListener('change', handleModelSelectChange);
  personaTempSlider.addEventListener('input', (e) => {
    tempValDisplay.innerText = e.target.value;
  });

  // 会话搜索输入过滤
  conversationSearchInput.addEventListener('input', (e) => {
    state.searchKeyword = e.target.value.trim().toLowerCase();
    renderConversations();
  });

  // 新建会话按钮
  newChatBtn.addEventListener('click', createNewChat);
  headerNewChatBtn.addEventListener('click', createNewChat);

  // 发送 / 停止按钮
  sendBtn.addEventListener('click', handleSendOrStop);

  // 导出与导入
  exportMdBtn.addEventListener('click', exportActiveChatAsMarkdown);
  exportJsonBtn.addEventListener('click', exportAllDataAsJSON);
  importJsonTriggerBtn.addEventListener('click', () => importJsonFile.click());
  importJsonFile.addEventListener('change', handleImportJSON);

  // 全局事件代理（用于气泡复制、重新生成、会话删除/编辑等）
  document.addEventListener('click', handleGlobalClicks);
}

// ==========================================
// 5. 主题与界面外观
// ==========================================

function renderThemeIcon() {
  const isDark = document.documentElement.classList.contains('dark');
  const iconMarkup = isDark 
    ? `<i data-lucide="sun" class="w-4 h-4 text-amber-400"></i>` 
    : `<i data-lucide="moon" class="w-4 h-4 text-slate-700"></i>`;
  themeToggleBtn.innerHTML = iconMarkup;
  sidebarThemeToggleBtn.innerHTML = iconMarkup;
  refreshIcons();
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
};

function autoResizeInput() {
  chatInput.style.height = 'auto';
  chatInput.style.height = Math.min(chatInput.scrollHeight, 160) + 'px';
}

function showToast(message, isError = false) {
  const existing = document.getElementById('global-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = 'global-toast';
  toast.className = `fixed top-6 left-1/2 -translate-x-1/2 px-4 py-2.5 rounded-xl text-xs text-white shadow-xl z-50 transition-all duration-300 transform -translate-y-4 opacity-0 flex items-center gap-2 ${
    isError ? 'bg-rose-600 shadow-rose-600/20' : 'bg-slate-900 dark:bg-slate-800 border border-slate-700 shadow-black/30'
  }`;
  
  toast.innerHTML = `
    <i data-lucide="${isError ? 'alert-circle' : 'check-circle-2'}" class="w-4 h-4 text-white"></i>
    <span>${escapeHTML(message)}</span>
  `;
  document.body.appendChild(toast);
  refreshIcons();

  requestAnimationFrame(() => {
    toast.classList.remove('-translate-y-4', 'opacity-0');
  });

  setTimeout(() => {
    toast.classList.add('-translate-y-4', 'opacity-0');
    setTimeout(() => toast.remove(), 300);
  }, 2400);
}

// ==========================================
// 6. 配置项管理与保存
// ==========================================

function handleProviderChange() {
  const providerKey = apiProviderSelect.value;
  const preset = PROVIDER_PRESETS[providerKey];
  if (preset && preset.endpoint) {
    apiEndpointInput.value = preset.endpoint;
  }
}

function saveSettings() {
  const key = apiKeyInput.value.trim();
  const provider = apiProviderSelect.value;
  let endpoint = apiEndpointInput.value.trim();

  if (!endpoint) {
    endpoint = 'https://api.chatanywhere.tech/v1';
    apiEndpointInput.value = endpoint;
  }

  // 去除末尾斜杠
  endpoint = endpoint.replace(/\/+$/, '');

  const contextLimit = parseInt(contextLimitSelect.value, 10);

  state.apiKey = key;
  state.apiProvider = provider;
  state.apiEndpoint = endpoint;
  state.contextLimit = isNaN(contextLimit) ? 6 : contextLimit;

  localStorage.setItem('chat_api_key', key);
  localStorage.setItem('chat_api_provider', provider);
  localStorage.setItem('chat_api_endpoint', endpoint);
  localStorage.setItem('chat_context_limit', state.contextLimit.toString());

  initSettingsUI();
  showToast('配置保存成功！');
}

// ==========================================
// 7. 人设管理 (CRUD)
// ==========================================

function renderPersonas() {
  personasList.innerHTML = '';

  state.personas.forEach(p => {
    const isSelected = p.id === state.currentPersonaId;
    const item = document.createElement('div');
    item.className = `group flex items-center justify-between p-2 rounded-xl text-xs transition-all duration-150 cursor-pointer ${
      isSelected 
        ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-medium border border-indigo-200/60 dark:border-indigo-800/60' 
        : 'hover:bg-slate-100 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300 border border-transparent'
    }`;
    item.setAttribute('data-persona-id', p.id);

    item.innerHTML = `
      <div class="flex items-center space-x-2.5 min-w-0 flex-1 btn-select-persona">
        <span class="text-base flex-shrink-0">${p.emoji || '🤖'}</span>
        <div class="min-w-0 flex-1">
          <p class="truncate leading-tight font-medium">${escapeHTML(p.name)}</p>
          <p class="text-[10px] text-slate-400 dark:text-slate-500 truncate mt-0.5 font-mono">${escapeHTML(p.model || 'gpt-4o-mini')}</p>
        </div>
      </div>
      <div class="opacity-0 group-hover:opacity-100 flex items-center space-x-1 flex-shrink-0 transition-opacity">
        <button type="button" class="btn-edit-persona p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200" title="编辑人设">
          <i data-lucide="edit-3" class="w-3.5 h-3.5 pointer-events-none"></i>
        </button>
        ${!p.id.startsWith('p-default-') ? `
          <button type="button" class="btn-delete-persona p-1 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg text-slate-400 hover:text-rose-500" title="删除人设">
            <i data-lucide="trash-2" class="w-3.5 h-3.5 pointer-events-none"></i>
          </button>
        ` : ''}
      </div>
    `;

    personasList.appendChild(item);
  });

  refreshIcons();
}

function handleModelSelectChange() {
  const val = personaModelSelect.value;
  if (val === 'custom') {
    personaCustomModelInput.value = '';
    personaCustomModelInput.focus();
  } else {
    personaCustomModelInput.value = val;
  }
}

function openPersonaModal(personaId = null) {
  state.editingPersonaId = personaId;
  const modalTitle = document.getElementById('modal-title');
  const nameInp = document.querySelector('[data-testid="persona-name"]');
  const promptInp = document.querySelector('[data-testid="persona-prompt"]');
  const emojiInp = document.querySelector('[data-testid="persona-emoji"]');

  if (personaId) {
    const p = state.personas.find(item => item.id === personaId);
    if (p) {
      modalTitle.innerText = '编辑 AI 人设';
      nameInp.value = p.name;
      promptInp.value = p.systemPrompt;
      emojiInp.value = p.emoji || '🤖';
      
      const optionExists = Array.from(personaModelSelect.options).some(o => o.value === p.model);
      if (optionExists) {
        personaModelSelect.value = p.model;
      } else {
        personaModelSelect.value = 'custom';
      }
      personaCustomModelInput.value = p.model || 'gpt-4o-mini';

      const temp = p.temperature !== undefined ? p.temperature : 0.7;
      personaTempSlider.value = temp;
      tempValDisplay.innerText = temp;
    }
  } else {
    modalTitle.innerText = '创建 AI 人设';
    nameInp.value = '';
    promptInp.value = '';
    emojiInp.value = '🤖';
    personaModelSelect.value = 'gpt-4o-mini';
    personaCustomModelInput.value = 'gpt-4o-mini';
    personaTempSlider.value = '0.7';
    tempValDisplay.innerText = '0.7';
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
  
  let model = personaCustomModelInput.value.trim();
  if (!model) {
    model = personaModelSelect.value !== 'custom' ? personaModelSelect.value : 'gpt-4o-mini';
  }

  const temp = parseFloat(personaTempSlider.value) || 0.7;

  if (!name) {
    showToast('请输入人设名称', true);
    return;
  }
  if (!prompt) {
    showToast('请输入系统提示词 (Prompt)', true);
    return;
  }

  if (state.editingPersonaId) {
    state.personas = state.personas.map(p => {
      if (p.id === state.editingPersonaId) {
        return { ...p, name, systemPrompt: prompt, emoji, model, temperature: temp };
      }
      return p;
    });
    showToast('人设更新成功');
  } else {
    const newPersona = {
      id: 'p-custom-' + Date.now(),
      name,
      systemPrompt: prompt,
      emoji,
      model,
      temperature: temp
    };
    state.personas.push(newPersona);
    state.currentPersonaId = newPersona.id;
    showToast('人设创建成功');
  }

  localStorage.setItem('chat_personas', JSON.stringify(state.personas));
  localStorage.setItem('chat_current_persona_id', state.currentPersonaId);

  const active = state.personas.find(p => p.id === state.currentPersonaId);
  if (active) updateHeader(active);

  renderPersonas();
  closePersonaModal();
}

function deletePersona(id) {
  if (id.startsWith('p-default-')) {
    showToast('系统默认人设不可删除', true);
    return;
  }

  state.personas = state.personas.filter(p => p.id !== id);
  localStorage.setItem('chat_personas', JSON.stringify(state.personas));

  if (state.currentPersonaId === id) {
    state.currentPersonaId = state.personas[0].id;
    localStorage.setItem('chat_current_persona_id', state.currentPersonaId);
    updateHeader(state.personas[0]);
  }

  renderPersonas();
  showToast('人设已删除');
}

// ==========================================
// 8. 会话历史管理
// ==========================================

function initActiveChat() {
  if (state.currentConversationId && state.conversations.some(c => c.id === state.currentConversationId)) {
    selectConversation(state.currentConversationId);
  } else {
    const persona = state.personas.find(p => p.id === state.currentPersonaId) || state.personas[0];
    updateHeader(persona);
    renderMessages([]);
  }
}

function renderConversations() {
  conversationsList.innerHTML = '';

  let list = state.conversations;
  if (state.searchKeyword) {
    list = list.filter(c => (c.title || '').toLowerCase().includes(state.searchKeyword));
  }

  if (list.length === 0) {
    conversationsList.innerHTML = `
      <div class="py-8 text-center text-xs text-slate-400 dark:text-slate-600">
        ${state.searchKeyword ? '未匹配到相关会话' : '暂无历史会话记录'}
      </div>
    `;
    return;
  }

  list.forEach(c => {
    const isSelected = c.id === state.currentConversationId;
    const item = document.createElement('div');
    item.className = `group flex items-center justify-between p-2 rounded-xl text-xs transition-all duration-150 cursor-pointer ${
      isSelected 
        ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium border-l-2 border-indigo-600' 
        : 'hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-600 dark:text-slate-400'
    }`;
    item.setAttribute('data-conversation-id', c.id);

    const persona = state.personas.find(p => p.id === c.personaId) || DEFAULT_PERSONAS[0];

    item.innerHTML = `
      <div class="flex items-center space-x-2 min-w-0 flex-1 btn-select-conversation">
        <span class="text-xs flex-shrink-0">${persona.emoji || '🤖'}</span>
        <span class="truncate flex-1 conv-title-text" title="${escapeHTML(c.title)}">${escapeHTML(c.title)}</span>
      </div>
      <div class="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button type="button" class="btn-rename-conversation p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200" title="重命名">
          <i data-lucide="pencil" class="w-3 h-3 pointer-events-none"></i>
        </button>
        <button type="button" class="btn-delete-conversation p-1 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded text-slate-400 hover:text-rose-500" title="删除会话">
          <i data-lucide="trash-2" class="w-3 h-3 pointer-events-none"></i>
        </button>
      </div>
    `;

    conversationsList.appendChild(item);
  });

  refreshIcons();
}

function createNewChat() {
  if (state.isGenerating) {
    showToast('正在生成中，请先停止', true);
    return;
  }

  const activePersona = state.personas.find(p => p.id === state.currentPersonaId) || state.personas[0];
  const newChat = {
    id: 'c-' + Date.now(),
    title: `与 ${activePersona.name} 的对话`,
    personaId: activePersona.id,
    messages: []
  };

  state.conversations.unshift(newChat);
  state.currentConversationId = newChat.id;

  localStorage.setItem('chat_conversations', JSON.stringify(state.conversations));
  localStorage.setItem('chat_current_conv_id', state.currentConversationId);

  renderConversations();
  selectConversation(newChat.id);

  if (window.innerWidth < 768) {
    closeSidebar();
  }
}

function selectConversation(id) {
  state.currentConversationId = id;
  localStorage.setItem('chat_current_conv_id', id);

  const conv = state.conversations.find(c => c.id === id);
  if (conv) {
    state.currentPersonaId = conv.personaId;
    localStorage.setItem('chat_current_persona_id', conv.personaId);

    const persona = state.personas.find(p => p.id === conv.personaId) || state.personas[0];
    updateHeader(persona, conv.title);
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
      const persona = state.personas.find(p => p.id === state.currentPersonaId) || state.personas[0];
      updateHeader(persona);
    }
  }

  renderConversations();
  showToast('会话已删除');
}

function renameConversation(id) {
  const conv = state.conversations.find(c => c.id === id);
  if (!conv) return;

  const newTitle = prompt('请输入新的会话标题：', conv.title);
  if (newTitle && newTitle.trim()) {
    conv.title = newTitle.trim();
    localStorage.setItem('chat_conversations', JSON.stringify(state.conversations));
    renderConversations();
    if (state.currentConversationId === id) {
      headerConversationTitle.innerText = '· ' + conv.title;
    }
    showToast('标题已更新');
  }
}

function updateHeader(persona, convTitle = '') {
  headerPersonaEmoji.innerText = persona.emoji || '🤖';
  headerPersonaName.innerText = persona.name;
  headerPersonaModel.innerText = persona.model;

  if (convTitle) {
    headerConversationTitle.innerText = '· ' + convTitle;
  } else {
    headerConversationTitle.innerText = '';
  }

  updateProviderBadge();
}

// 清空重置全部数据
window.clearAllData = function() {
  if (confirm('确定要清除所有数据吗？这将清空 API Key、自定义人设和所有历史对话。此操作无法撤销！')) {
    localStorage.clear();
    state.apiKey = '';
    state.apiProvider = 'chatanywhere';
    state.apiEndpoint = 'https://api.chatanywhere.tech/v1';
    state.contextLimit = 6;
    state.personas = [...DEFAULT_PERSONAS];
    state.conversations = [];
    state.currentConversationId = '';
    state.currentPersonaId = 'p-default-helper';

    initSettingsUI();
    renderPersonas();
    renderConversations();
    updateHeader(state.personas[0]);
    renderMessages([]);
    showToast('系统已全部重置并恢复默认');
  }
};

// ==========================================
// 9. 消息渲染与气泡 DOM
// ==========================================

function renderMessages(messages) {
  chatMessages.innerHTML = '';
  chatMessages.appendChild(typingIndicator);

  if (!messages || messages.length === 0) {
    renderEmptyState();
    return;
  }

  messages.forEach((msg, idx) => {
    appendMessageDOM(msg.role, msg.content, msg.reasoning, idx);
  });

  scrollToBottom();
}

function renderEmptyState() {
  const activePersona = state.personas.find(p => p.id === state.currentPersonaId) || state.personas[0];
  
  const welcome = document.createElement('div');
  welcome.id = 'chat-empty-state';
  welcome.className = 'flex flex-col items-center justify-center text-center py-12 md:py-20 px-4 space-y-6 max-w-2xl mx-auto';
  
  welcome.innerHTML = `
    <div class="relative">
      <div class="w-16 h-16 md:w-20 md:h-20 rounded-3xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-800/60 flex items-center justify-center text-4xl md:text-5xl shadow-sm">
        ${activePersona.emoji || '🤖'}
      </div>
      <div class="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900"></div>
    </div>

    <div class="space-y-2">
      <h2 class="text-xl md:text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">我是 ${escapeHTML(activePersona.name)}</h2>
      <p class="text-xs md:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
        ${escapeHTML(activePersona.systemPrompt)}
      </p>
    </div>

    <!-- Quick Prompts Pills -->
    <div class="w-full pt-4 space-y-2">
      <p class="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">快捷提问体验</p>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
        <button type="button" class="quick-prompt-btn p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-500 dark:hover:border-indigo-500/80 bg-white dark:bg-slate-900/60 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs text-slate-700 dark:text-slate-300 transition-all flex items-start gap-2.5 group">
          <span class="text-base">💡</span>
          <span class="leading-relaxed flex-1">编写一段优雅高效的 Python 异步并发请求代码</span>
        </button>
        <button type="button" class="quick-prompt-btn p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-500 dark:hover:border-indigo-500/80 bg-white dark:bg-slate-900/60 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs text-slate-700 dark:text-slate-300 transition-all flex items-start gap-2.5 group">
          <span class="text-base">🎨</span>
          <span class="leading-relaxed flex-1">设计一个极简扁平风格的现代化卡片组件</span>
        </button>
        <button type="button" class="quick-prompt-btn p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-500 dark:hover:border-indigo-500/80 bg-white dark:bg-slate-900/60 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs text-slate-700 dark:text-slate-300 transition-all flex items-start gap-2.5 group">
          <span class="text-base">📝</span>
          <span class="leading-relaxed flex-1">将我的技术笔记润色为通俗易懂的教程分享</span>
        </button>
        <button type="button" class="quick-prompt-btn p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-500 dark:hover:border-indigo-500/80 bg-white dark:bg-slate-900/60 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs text-slate-700 dark:text-slate-300 transition-all flex items-start gap-2.5 group">
          <span class="text-base">🧠</span>
          <span class="leading-relaxed flex-1">用直观的类比剖析大语言模型的注意力机制</span>
        </button>
      </div>
    </div>
  `;

  chatMessages.insertBefore(welcome, typingIndicator);
}

function appendMessageDOM(role, content, reasoning = '', msgIndex = null) {
  const isUser = role === 'user';
  const wrapper = document.createElement('div');
  wrapper.className = `flex ${isUser ? 'justify-end' : 'justify-start'} w-full group msg-bubble-row`;
  if (msgIndex !== null) {
    wrapper.setAttribute('data-msg-index', msgIndex);
  }

  let htmlContent = '';

  if (isUser) {
    htmlContent = `
      <div class="flex flex-col items-end max-w-[85%] md:max-w-[75%] space-y-1">
        <div class="bg-indigo-600 text-white rounded-2xl rounded-tr-sm px-4 py-2.5 shadow-sm text-sm break-words whitespace-pre-wrap leading-relaxed select-text">
          ${escapeHTML(content)}
        </div>
        <div class="flex items-center space-x-2 text-[10px] text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
          <button type="button" class="btn-copy-raw hover:text-slate-600 dark:hover:text-slate-200 flex items-center gap-1" data-text="${encodeURIComponent(content)}" title="复制内容">
            <i data-lucide="copy" class="w-3 h-3 pointer-events-none"></i> 复制
          </button>
          <button type="button" class="btn-delete-msg hover:text-rose-500 flex items-center gap-1" title="删除此条">
            <i data-lucide="trash-2" class="w-3 h-3 pointer-events-none"></i>
          </button>
        </div>
      </div>
    `;
  } else {
    // Assistant 回复
    let reasoningHtml = '';
    if (reasoning) {
      reasoningHtml = `
        <div class="reasoning-block mb-3 border border-indigo-200/70 dark:border-indigo-900/40 rounded-xl bg-indigo-50/40 dark:bg-indigo-950/20 overflow-hidden text-xs">
          <button type="button" class="reasoning-toggle flex items-center justify-between w-full px-3 py-2 text-indigo-700 dark:text-indigo-300 font-medium hover:bg-indigo-100/50 dark:hover:bg-indigo-900/30 transition-colors">
            <span class="flex items-center gap-1.5">
              <i data-lucide="brain" class="w-3.5 h-3.5 text-indigo-500"></i>
              <span>已深度思考推演</span>
            </span>
            <i data-lucide="chevron-down" class="w-3.5 h-3.5 transition-transform duration-200"></i>
          </button>
          <div class="reasoning-content px-3.5 py-2.5 text-slate-600 dark:text-slate-400 border-t border-indigo-100 dark:border-indigo-900/30 leading-relaxed font-sans text-xs select-text">
            ${parseMarkdown(reasoning)}
          </div>
        </div>
      `;
    }

    htmlContent = `
      <div class="flex flex-col items-start max-w-[92%] md:max-w-[85%] space-y-1.5">
        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm text-sm break-words leading-relaxed select-text transition-colors">
          ${reasoningHtml}
          <div class="prose prose-slate dark:prose-invert max-w-none message-content-node">
            ${parseMarkdown(content)}
          </div>
        </div>
        <div class="flex items-center space-x-2 text-[10px] text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity pl-1">
          <button type="button" class="btn-copy-raw hover:text-slate-600 dark:hover:text-slate-200 flex items-center gap-1" data-text="${encodeURIComponent(content)}" title="复制回答">
            <i data-lucide="copy" class="w-3 h-3 pointer-events-none"></i> 复制全文
          </button>
          <button type="button" class="btn-regenerate hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1" title="以此处为基础重新生成">
            <i data-lucide="rotate-cw" class="w-3 h-3 pointer-events-none"></i> 重新生成
          </button>
          <button type="button" class="btn-delete-msg hover:text-rose-500 flex items-center gap-1" title="删除此条">
            <i data-lucide="trash-2" class="w-3 h-3 pointer-events-none"></i>
          </button>
        </div>
      </div>
    `;
  }

  wrapper.innerHTML = htmlContent;
  chatMessages.insertBefore(wrapper, typingIndicator);

  // 渲染数学公式与图标
  renderMathInNode(wrapper);
  refreshIcons();

  if (!state.userScrolledUp) {
    scrollToBottom();
  }
}

// 滚动控制
function handleChatScroll() {
  const threshold = 120;
  const isNearBottom = chatMessages.scrollHeight - chatMessages.scrollTop - chatMessages.clientHeight <= threshold;
  state.userScrolledUp = !isNearBottom;

  if (state.userScrolledUp) {
    scrollBottomBtn.classList.remove('hidden');
  } else {
    scrollBottomBtn.classList.add('hidden');
  }
}

function scrollToBottom() {
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function scrollToBottomSmooth() {
  chatMessages.scrollTo({
    top: chatMessages.scrollHeight,
    behavior: 'smooth'
  });
  state.userScrolledUp = false;
  scrollBottomBtn.classList.add('hidden');
}

// ==========================================
// 10. API 对话流式交互 (Fetch + SSE)
// ==========================================

function handleSendOrStop() {
  if (state.isGenerating) {
    stopGenerating();
  } else {
    sendMessage();
  }
}

function stopGenerating() {
  if (state.abortController) {
    state.abortController.abort();
    state.abortController = null;
  }
  setGeneratingUI(false);
  showToast('已停止生成');
}

function setGeneratingUI(generating) {
  state.isGenerating = generating;
  if (generating) {
    sendBtn.innerHTML = `<i data-lucide="square" class="w-4 h-4 text-white fill-white"></i>`;
    sendBtn.classList.remove('bg-indigo-600', 'hover:bg-indigo-700');
    sendBtn.classList.add('bg-rose-600', 'hover:bg-rose-700');
    sendBtn.title = '点击停止生成';
  } else {
    sendBtn.innerHTML = `<i data-lucide="send" class="w-4 h-4"></i>`;
    sendBtn.classList.remove('bg-rose-600', 'hover:bg-rose-700');
    sendBtn.classList.add('bg-indigo-600', 'hover:bg-indigo-700');
    sendBtn.title = '发送 (Enter)';
    typingIndicator.classList.remove('flex');
    typingIndicator.classList.add('hidden');
  }
  refreshIcons();
}

async function sendMessage(overrideText = null) {
  const content = overrideText || chatInput.value.trim();
  if (!content) return;

  // 检查 API Key
  if (!state.apiKey) {
    showToast('请在侧边栏先配置您的 API Key', true);
    openSidebar();
    apiKeyInput.focus();
    return;
  }

  // 若无会话则自动创建
  if (!state.currentConversationId) {
    createNewChat();
  }

  const conv = state.conversations.find(c => c.id === state.currentConversationId);
  if (!conv) return;

  // 清空初始欢迎状态
  const emptyState = document.getElementById('chat-empty-state');
  if (emptyState) emptyState.remove();

  // 推送用户消息
  const userMsg = { role: 'user', content };
  conv.messages.push(userMsg);

  // 若为第一条消息，则重设标题
  if (conv.messages.filter(m => m.role === 'user').length === 1) {
    conv.title = content.length > 20 ? content.substring(0, 20) + '...' : content;
    headerConversationTitle.innerText = '· ' + conv.title;
  }

  localStorage.setItem('chat_conversations', JSON.stringify(state.conversations));
  renderConversations();

  // 渲染用户气泡
  appendMessageDOM('user', content, '', conv.messages.length - 1);

  // 清空输入框
  if (!overrideText) {
    chatInput.value = '';
    autoResizeInput();
  }

  // 开启打字动效与停止按钮
  setGeneratingUI(true);
  typingIndicator.classList.remove('hidden');
  typingIndicator.classList.add('flex');
  scrollToBottom();

  const activePersona = state.personas.find(p => p.id === state.currentPersonaId) || state.personas[0];

  // 组装对话上下文 (根据 contextLimit 截取历史)
  let historyMessages = [...conv.messages];
  if (state.contextLimit > 0 && state.contextLimit < 999) {
    const keepCount = state.contextLimit * 2;
    historyMessages = historyMessages.slice(-keepCount);
  } else if (state.contextLimit === 0) {
    historyMessages = [userMsg];
  }

  const requestMessages = [
    { role: 'system', content: activePersona.systemPrompt },
    ...historyMessages.map(m => ({ role: m.role, content: m.content }))
  ];

  // 规范化 API Endpoint
  let endpoint = (state.apiEndpoint || 'https://api.chatanywhere.tech/v1').replace(/\/+$/, '');
  const url = `${endpoint}/chat/completions`;

  state.abortController = new AbortController();

  // 动态创建 AI 消息容器
  let responseWrapper = null;
  let textNode = null;
  let reasoningContainer = null;
  let reasoningContentNode = null;
  let assistantReply = '';
  let assistantReasoning = '';

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${state.apiKey}`
      },
      body: JSON.stringify({
        model: activePersona.model || 'gpt-4o-mini',
        messages: requestMessages,
        temperature: activePersona.temperature !== undefined ? activePersona.temperature : 0.7,
        stream: true
      }),
      signal: state.abortController.signal
    });

    if (!response.ok) {
      let errText = await response.text();
      try {
        const errJson = JSON.parse(errText);
        errText = errJson.error?.message || errText;
      } catch (e) {}
      throw new Error(`[${response.status}] ${errText}`);
    }

    typingIndicator.classList.remove('flex');
    typingIndicator.classList.add('hidden');

    // 建立新气泡
    responseWrapper = document.createElement('div');
    responseWrapper.className = 'flex justify-start w-full group msg-bubble-row';
    responseWrapper.innerHTML = `
      <div class="flex flex-col items-start max-w-[92%] md:max-w-[85%] space-y-1.5">
        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm text-sm break-words leading-relaxed select-text transition-colors">
          <div class="reasoning-slot"></div>
          <div class="prose prose-slate dark:prose-invert max-w-none message-content-node">
            <span class="text-slate-400 italic text-xs animate-pulse">正在输出...</span>
          </div>
        </div>
      </div>
    `;
    chatMessages.insertBefore(responseWrapper, typingIndicator);
    textNode = responseWrapper.querySelector('.message-content-node');
    const reasoningSlot = responseWrapper.querySelector('.reasoning-slot');

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      buffer += chunk;

      const lines = buffer.split('\n');
      buffer = lines.pop();

      for (let line of lines) {
        line = line.trim();
        if (!line || line === 'data: [DONE]') continue;

        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            const delta = data.choices[0]?.delta || {};

            // 处理推理思考内容 (DeepSeek 或其他思考模型格式)
            if (delta.reasoning_content) {
              assistantReasoning += delta.reasoning_content;
              if (!reasoningContainer) {
                reasoningContainer = document.createElement('div');
                reasoningContainer.className = 'reasoning-block mb-3 border border-indigo-200/70 dark:border-indigo-900/40 rounded-xl bg-indigo-50/40 dark:bg-indigo-950/20 overflow-hidden text-xs';
                reasoningContainer.innerHTML = `
                  <div class="flex items-center gap-1.5 px-3 py-2 text-indigo-700 dark:text-indigo-300 font-medium bg-indigo-100/50 dark:bg-indigo-900/30">
                    <i data-lucide="brain" class="w-3.5 h-3.5 text-indigo-500 animate-pulse"></i>
                    <span>深度思考中...</span>
                  </div>
                  <div class="reasoning-content px-3.5 py-2.5 text-slate-600 dark:text-slate-400 border-t border-indigo-100 dark:border-indigo-900/30 leading-relaxed font-sans text-xs"></div>
                `;
                reasoningSlot.appendChild(reasoningContainer);
                reasoningContentNode = reasoningContainer.querySelector('.reasoning-content');
                refreshIcons();
              }
              if (reasoningContentNode) {
                reasoningContentNode.innerHTML = parseMarkdown(assistantReasoning);
              }
            }

            // 处理正文内容
            if (delta.content) {
              assistantReply += delta.content;
              
              // 兼容正文内嵌 <think>...</think> 格式
              let displayContent = assistantReply;
              if (displayContent.includes('<think>') && !reasoningContainer) {
                const thinkMatch = displayContent.match(/<think>([\s\S]*?)(?:<\/think>|$)/);
                if (thinkMatch) {
                  assistantReasoning = thinkMatch[1];
                  displayContent = displayContent.replace(/<think>[\s\S]*?<\/think>/, '').trim();
                }
              }

              textNode.innerHTML = parseMarkdown(displayContent);
            }

            if (!state.userScrolledUp) {
              scrollToBottom();
            }
          } catch (e) {
            // 控制行非 JSON 忽略
          }
        }
      }
    }

    // 处理残余 buffer
    if (buffer && buffer.startsWith('data: ') && buffer !== 'data: [DONE]') {
      try {
        const data = JSON.parse(buffer.slice(6));
        const delta = data.choices[0]?.delta || {};
        if (delta.content) {
          assistantReply += delta.content;
          textNode.innerHTML = parseMarkdown(assistantReply);
        }
      } catch (e) {}
    }

    // 格式化思考过程为可折叠状态
    if (reasoningContainer) {
      reasoningContainer.innerHTML = `
        <button type="button" class="reasoning-toggle flex items-center justify-between w-full px-3 py-2 text-indigo-700 dark:text-indigo-300 font-medium hover:bg-indigo-100/50 dark:hover:bg-indigo-900/30 transition-colors">
          <span class="flex items-center gap-1.5">
            <i data-lucide="brain" class="w-3.5 h-3.5 text-indigo-500"></i>
            <span>已深度思考推演</span>
          </span>
          <i data-lucide="chevron-down" class="w-3.5 h-3.5 transition-transform duration-200"></i>
        </button>
        <div class="reasoning-content px-3.5 py-2.5 text-slate-600 dark:text-slate-400 border-t border-indigo-100 dark:border-indigo-900/30 leading-relaxed font-sans text-xs select-text">
          ${parseMarkdown(assistantReasoning)}
        </div>
      `;
    }

    // 保存至当前会话记录
    const finalMsg = { 
      role: 'assistant', 
      content: assistantReply,
      reasoning: assistantReasoning 
    };
    conv.messages.push(finalMsg);
    localStorage.setItem('chat_conversations', JSON.stringify(state.conversations));

    // 添加操作工具栏 (复制全文 / 重新生成 / 删除)
    const bubbleCol = responseWrapper.querySelector('.flex.flex-col');
    if (bubbleCol) {
      const toolBar = document.createElement('div');
      toolBar.className = 'flex items-center space-x-2 text-[10px] text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity pl-1';
      toolBar.innerHTML = `
        <button type="button" class="btn-copy-raw hover:text-slate-600 dark:hover:text-slate-200 flex items-center gap-1" data-text="${encodeURIComponent(assistantReply)}" title="复制回答">
          <i data-lucide="copy" class="w-3 h-3 pointer-events-none"></i> 复制全文
        </button>
        <button type="button" class="btn-regenerate hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1" title="以此处为基础重新生成">
          <i data-lucide="rotate-cw" class="w-3 h-3 pointer-events-none"></i> 重新生成
        </button>
        <button type="button" class="btn-delete-msg hover:text-rose-500 flex items-center gap-1" title="删除此条">
          <i data-lucide="trash-2" class="w-3 h-3 pointer-events-none"></i>
        </button>
      `;
      bubbleCol.appendChild(toolBar);
    }

    renderMathInNode(responseWrapper);
    refreshIcons();

  } catch (err) {
    if (err.name === 'AbortError') {
      // 用户主动取消，保存已有生成内容
      if (assistantReply) {
        conv.messages.push({ role: 'assistant', content: assistantReply + ' *(生成已手动中止)*', reasoning: assistantReasoning });
        localStorage.setItem('chat_conversations', JSON.stringify(state.conversations));
      }
    } else {
      console.error('发送消息请求失败：', err);
      typingIndicator.classList.remove('flex');
      typingIndicator.classList.add('hidden');

      const errWrapper = document.createElement('div');
      errWrapper.className = 'flex justify-start w-full';
      errWrapper.innerHTML = `
        <div class="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 rounded-2xl rounded-tl-sm px-4 py-3 max-w-[85%] shadow-sm text-xs leading-relaxed space-y-1">
          <div class="flex items-center gap-1.5 font-semibold text-rose-800 dark:text-rose-200">
            <i data-lucide="alert-octagon" class="w-4 h-4 text-rose-500"></i> 请求未成功
          </div>
          <p>${escapeHTML(err.message || '网络连接异常或接口未响应')}</p>
          <p class="text-[10px] text-slate-400 dark:text-slate-500 pt-1">提示：请检查侧边栏的 API Key、API Base URL 是否正确，或网络是否支持该接口代理。</p>
        </div>
      `;
      chatMessages.insertBefore(errWrapper, typingIndicator);
      refreshIcons();
    }
  } finally {
    setGeneratingUI(false);
    state.abortController = null;
    if (!state.userScrolledUp) {
      scrollToBottom();
    }
  }
}

// ==========================================
// 11. 数据导出、备份与恢复
// ==========================================

function exportActiveChatAsMarkdown() {
  const conv = state.conversations.find(c => c.id === state.currentConversationId);
  if (!conv || !conv.messages || conv.messages.length === 0) {
    showToast('当前会话暂无内容可导出', true);
    return;
  }

  const persona = state.personas.find(p => p.id === conv.personaId) || DEFAULT_PERSONAS[0];
  let md = `# ${conv.title}\n\n`;
  md += `> **AI 人设**：${persona.emoji} ${persona.name} (${persona.model})\n`;
  md += `> **导出时间**：${new Date().toLocaleString()}\n\n---\n\n`;

  conv.messages.forEach(msg => {
    if (msg.role === 'user') {
      md += `### 👤 User:\n\n${msg.content}\n\n`;
    } else {
      if (msg.reasoning) {
        md += `> **🧠 思考过程**:\n> ${msg.reasoning.replace(/\n/g, '\n> ')}\n\n`;
      }
      md += `### 🤖 Assistant:\n\n${msg.content}\n\n`;
    }
    md += `---\n\n`;
  });

  downloadBlob(md, `${conv.title.replace(/[\\/:*?"<>|]/g, '_')}.md`, 'text/markdown;charset=utf-8');
  showToast('会话已导出为 Markdown');
}

function exportAllDataAsJSON() {
  const exportPayload = {
    version: '2.0',
    exportDate: new Date().toISOString(),
    settings: {
      apiProvider: state.apiProvider,
      apiEndpoint: state.apiEndpoint,
      contextLimit: state.contextLimit
    },
    personas: state.personas,
    conversations: state.conversations
  };

  const jsonStr = JSON.stringify(exportPayload, null, 2);
  const fileName = `custom-ai-chat-backup-${new Date().toISOString().slice(0, 10)}.json`;
  downloadBlob(jsonStr, fileName, 'application/json;charset=utf-8');
  showToast('全量数据已备份下载');
}

function handleImportJSON(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(evt) {
    try {
      const data = JSON.parse(evt.target.result);
      if (!data || !Array.isArray(data.conversations)) {
        throw new Error('无效的备份文件结构');
      }

      if (confirm(`检测到备份包含 ${data.conversations.length} 个历史会话与 ${data.personas?.length || 0} 个人设。确定恢复并合并数据吗？`)) {
        if (Array.isArray(data.personas) && data.personas.length > 0) {
          // 合并人设，避免重复 id
          const existingIds = new Set(state.personas.map(p => p.id));
          data.personas.forEach(p => {
            if (!existingIds.has(p.id)) state.personas.push(p);
          });
          localStorage.setItem('chat_personas', JSON.stringify(state.personas));
        }

        const existingConvIds = new Set(state.conversations.map(c => c.id));
        data.conversations.forEach(c => {
          if (!existingConvIds.has(c.id)) state.conversations.unshift(c);
        });
        localStorage.setItem('chat_conversations', JSON.stringify(state.conversations));

        renderPersonas();
        renderConversations();
        if (state.conversations.length > 0) {
          selectConversation(state.conversations[0].id);
        }
        showToast('数据恢复成功！');
      }
    } catch (err) {
      console.error('导入失败：', err);
      showToast('恢复失败：备份文件格式不正确', true);
    } finally {
      importJsonFile.value = '';
    }
  };
  reader.readAsText(file);
}

function downloadBlob(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ==========================================
// 12. 全局点击代理与事件交互
// ==========================================

function handleGlobalClicks(e) {
  const target = e.target;

  // 1. 快捷 Prompt 胶囊点击
  const quickBtn = target.closest('.quick-prompt-btn');
  if (quickBtn) {
    const textSpan = quickBtn.querySelector('span:last-child');
    if (textSpan) {
      sendMessage(textSpan.innerText.trim());
    }
    return;
  }

  // 2. 人设选择
  const personaSelectNode = target.closest('.btn-select-persona');
  if (personaSelectNode) {
    const personaId = personaSelectNode.closest('[data-persona-id]').getAttribute('data-persona-id');
    state.currentPersonaId = personaId;
    localStorage.setItem('chat_current_persona_id', personaId);

    const persona = state.personas.find(p => p.id === personaId);
    if (persona) updateHeader(persona);

    if (!state.currentConversationId) {
      renderMessages([]);
    }

    renderPersonas();
    return;
  }

  // 3. 编辑人设
  const personaEditNode = target.closest('.btn-edit-persona');
  if (personaEditNode) {
    const personaId = personaEditNode.closest('[data-persona-id]').getAttribute('data-persona-id');
    openPersonaModal(personaId);
    return;
  }

  // 4. 删除人设
  const personaDeleteNode = target.closest('.btn-delete-persona');
  if (personaDeleteNode) {
    const personaId = personaDeleteNode.closest('[data-persona-id]').getAttribute('data-persona-id');
    if (confirm('确定要删除此人设吗？')) {
      deletePersona(personaId);
    }
    return;
  }

  // 5. 选中会话
  const convSelectNode = target.closest('.btn-select-conversation');
  if (convSelectNode) {
    const convId = convSelectNode.closest('[data-conversation-id]').getAttribute('data-conversation-id');
    selectConversation(convId);
    if (window.innerWidth < 768) closeSidebar();
    return;
  }

  // 6. 重命名会话
  const convRenameNode = target.closest('.btn-rename-conversation');
  if (convRenameNode) {
    const convId = convRenameNode.closest('[data-conversation-id]').getAttribute('data-conversation-id');
    renameConversation(convId);
    return;
  }

  // 7. 删除会话
  const convDeleteNode = target.closest('.btn-delete-conversation');
  if (convDeleteNode) {
    const convId = convDeleteNode.closest('[data-conversation-id]').getAttribute('data-conversation-id');
    if (confirm('确认删除此会话记录吗？')) {
      deleteConversation(convId);
    }
    return;
  }

  // 8. 复制代码块代码
  const copyCodeBtn = target.closest('.btn-copy-code');
  if (copyCodeBtn) {
    const rawCode = decodeURIComponent(copyCodeBtn.getAttribute('data-code') || '');
    navigator.clipboard.writeText(rawCode).then(() => {
      copyCodeBtn.innerHTML = `<i data-lucide="check" class="w-3 h-3 text-emerald-400"></i> 已复制`;
      refreshIcons();
      setTimeout(() => {
        copyCodeBtn.innerHTML = `<i data-lucide="copy" class="w-3 h-3"></i> 复制`;
        refreshIcons();
      }, 2000);
    }).catch(() => showToast('复制失败，请手动选取', true));
    return;
  }

  // 9. 复制整条消息
  const copyRawBtn = target.closest('.btn-copy-raw');
  if (copyRawBtn) {
    const rawText = decodeURIComponent(copyRawBtn.getAttribute('data-text') || '');
    navigator.clipboard.writeText(rawText).then(() => {
      showToast('消息全文已复制');
    }).catch(() => showToast('复制失败', true));
    return;
  }

  // 10. 重新生成回答
  const regenBtn = target.closest('.btn-regenerate');
  if (regenBtn) {
    if (state.isGenerating) {
      showToast('正在生成中，请先停止', true);
      return;
    }
    const conv = state.conversations.find(c => c.id === state.currentConversationId);
    if (!conv || conv.messages.length === 0) return;

    // 找到最后一条用户消息
    let lastUserIndex = -1;
    for (let i = conv.messages.length - 1; i >= 0; i--) {
      if (conv.messages[i].role === 'user') {
        lastUserIndex = i;
        break;
      }
    }

    if (lastUserIndex !== -1) {
      const userText = conv.messages[lastUserIndex].content;
      // 移除最后一条用户消息及后续所有内容
      conv.messages = conv.messages.slice(0, lastUserIndex);
      localStorage.setItem('chat_conversations', JSON.stringify(state.conversations));
      renderMessages(conv.messages);
      sendMessage(userText);
    }
    return;
  }

  // 11. 删除单条消息
  const deleteMsgBtn = target.closest('.btn-delete-msg');
  if (deleteMsgBtn) {
    const row = deleteMsgBtn.closest('.msg-bubble-row');
    if (!row) return;
    const msgIndex = parseInt(row.getAttribute('data-msg-index'), 10);
    const conv = state.conversations.find(c => c.id === state.currentConversationId);
    if (conv && !isNaN(msgIndex) && conv.messages[msgIndex]) {
      conv.messages.splice(msgIndex, 1);
      localStorage.setItem('chat_conversations', JSON.stringify(state.conversations));
      renderMessages(conv.messages);
      showToast('消息已删除');
    }
    return;
  }

  // 12. 思考推演折叠展开
  const reasoningToggle = target.closest('.reasoning-toggle');
  if (reasoningToggle) {
    const block = reasoningToggle.closest('.reasoning-block');
    const contentNode = block.querySelector('.reasoning-content');
    const icon = reasoningToggle.querySelector('[data-lucide="chevron-down"]');
    
    if (contentNode.style.display === 'none') {
      contentNode.style.display = 'block';
      if (icon) icon.style.transform = 'rotate(0deg)';
    } else {
      contentNode.style.display = 'none';
      if (icon) icon.style.transform = 'rotate(-90deg)';
    }
    return;
  }
}
