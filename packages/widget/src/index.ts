import type { WidgetConfig, ChatMessage, ConversationContext } from './types';

class AcmeDeskWidget {
  private config: WidgetConfig | null = null;
  private shadowRoot: ShadowRoot;
  private widgetContainer: HTMLElement;
  private launcher: HTMLElement | null = null;
  private chatPanel: HTMLElement | null = null;
  private messagesContainer: HTMLElement | null = null;
  private messageInput: HTMLTextAreaElement | null = null;
  private sendButton: HTMLButtonElement | null = null;
  private typingIndicator: HTMLElement | null = null;
  
  private isOpen: boolean = false;
  private messages: ChatMessage[] = [];
  private context: ConversationContext;
  private isTyping: boolean = false;
  private hasNewMessage: boolean = false;
  private sessionId: string;
  
  private readonly LAUNCHER_SIZE = 56;
  private readonly PANEL_WIDTH = 380;
  private readonly PANEL_HEIGHT = 580;
  private readonly Z_INDEX = 2147483647;
  
  constructor() {
    this.sessionId = this.generateSessionId();
    this.context = {
      sessionId: this.sessionId,
      messageCount: 0,
      leadCaptureTriggered: false,
      escalated: false
    };
    
    this.widgetContainer = document.createElement('div');
    this.widgetContainer.id = 'acmedesk-widget-container';
    this.widgetContainer.style.cssText = `position: fixed; z-index: ${this.Z_INDEX};`;
    
    this.shadowRoot = this.widgetContainer.attachShadow({ mode: 'open' });
    document.body.appendChild(this.widgetContainer);
    
    this.init();
  }
  
  private generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }
  
  private async init() {
    const chatbotId = this.getChatbotId();
    if (!chatbotId) {
      console.error('AcmeDesk Widget: No chatbot ID found');
      return;
    }
    
    try {
      await this.loadConfig(chatbotId);
      this.render();
      this.bindEvents();
      this.loadSession();
    } catch (error) {
      console.error('AcmeDesk Widget: Failed to initialize', error);
    }
  }
  
  private getChatbotId(): string | null {
    const scripts = document.getElementsByTagName('script');
    for (let i = 0; i < scripts.length; i++) {
      const script = scripts[i];
      if (script.src && script.src.includes('widget.js')) {
        return script.getAttribute('data-chatbot-id');
      }
    }
    return document.currentScript?.getAttribute('data-chatbot-id') || null;
  }
  
  private async loadConfig(chatbotId: string) {
    const apiUrl = this.getApiUrl();
    const response = await fetch(`${apiUrl}/api/chat/config/${chatbotId}`, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || 'Failed to load widget configuration');
    }
    
    this.config = await response.json();
    
    if (this.config?.greetingMessage) {
      this.addMessage({
        id: 'welcome',
        role: 'assistant',
        content: this.config.greetingMessage,
        timestamp: new Date()
      });
    }
  }
  
  private getApiUrl(): string {
    const scripts = document.getElementsByTagName('script');
    for (let i = 0; i < scripts.length; i++) {
      const script = scripts[i];
      if (script.src && script.src.includes('widget.js')) {
        const apiUrl = script.getAttribute('data-api-url');
        if (apiUrl) return apiUrl;
      }
    }
    return window.location.origin;
  }
  
  private render() {
    if (!this.config) return;
    
    const styles = this.getStyles();
    const html = this.getHTML();
    
    this.shadowRoot.innerHTML = `<style>${styles}</style>${html}`;
    
    this.launcher = this.shadowRoot.getElementById('acmedesk-launcher');
    this.chatPanel = this.shadowRoot.getElementById('acmedesk-panel');
    this.messagesContainer = this.shadowRoot.getElementById('acmedesk-messages');
    this.messageInput = this.shadowRoot.getElementById('acmedesk-input') as HTMLTextAreaElement;
    this.sendButton = this.shadowRoot.getElementById('acmedesk-send') as HTMLButtonElement;
    this.typingIndicator = this.shadowRoot.getElementById('acmedesk-typing');
    
    this.updatePosition();
    this.renderMessages();
    this.setupSuggestedQuestions();
  }
  
  private getStyles(): string {
    const primaryColor = this.config?.brandColor || '#4F8EF7';
    const secondaryColor = this.config?.secondaryColor || '#7C3AED';
    
    return `
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      
      .widget-container {
        position: fixed;
        ${this.getPositionStyles()}
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
        font-size: 14px;
        line-height: 1.5;
        color: #F9FAFB;
      }
      
      .launcher {
        width: ${this.LAUNCHER_SIZE}px;
        height: ${this.LAUNCHER_SIZE}px;
        border-radius: 50%;
        background: linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%);
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: transform 0.2s ease, box-shadow 0.2s ease;
        border: none;
        outline: none;
      }
      
      .launcher:hover {
        transform: scale(1.05);
        box-shadow: 0 6px 24px rgba(0, 0, 0, 0.4);
      }
      
      .launcher svg {
        width: 28px;
        height: 28px;
        fill: white;
      }
      
      .launcher .close-icon {
        display: none;
      }
      
      .launcher.open .chat-icon {
        display: none;
      }
      
      .launcher.open .close-icon {
        display: block;
      }
      
      .unread-badge {
        position: absolute;
        top: -4px;
        right: -4px;
        background: #EF4444;
        color: white;
        font-size: 11px;
        font-weight: 600;
        min-width: 20px;
        height: 20px;
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0 6px;
        animation: pulse 2s infinite;
      }
      
      @keyframes pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.1); }
      }
      
      .panel {
        position: absolute;
        width: ${this.PANEL_WIDTH}px;
        height: ${this.PANEL_HEIGHT}px;
        background: #0D1117;
        border-radius: 24px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        opacity: 0;
        transform: translateY(10px) scale(0.95);
        transition: opacity 0.3s ease, transform 0.3s ease;
        pointer-events: none;
        border: 1px solid rgba(255, 255, 255, 0.08);
      }
      
      .panel.open {
        opacity: 1;
        transform: translateY(0) scale(1);
        pointer-events: auto;
      }
      
      .panel-header {
        padding: 16px;
        background: linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%);
        display: flex;
        align-items: center;
        gap: 12px;
      }
      
      .avatar {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.2);
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
        flex-shrink: 0;
      }
      
      .avatar img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      
      .avatar-placeholder {
        font-size: 18px;
        font-weight: 600;
        color: white;
      }
      
      .header-info {
        flex: 1;
      }
      
      .chatbot-name {
        font-weight: 600;
        font-size: 16px;
        color: white;
      }
      
      .status {
        font-size: 12px;
        color: rgba(255, 255, 255, 0.8);
        display: flex;
        align-items: center;
        gap: 4px;
      }
      
      .status-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #10B981;
      }
      
      .header-actions {
        display: flex;
        gap: 8px;
      }
      
      .header-btn {
        background: rgba(255, 255, 255, 0.2);
        border: none;
        border-radius: 8px;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        color: white;
        transition: background 0.2s;
      }
      
      .header-btn:hover {
        background: rgba(255, 255, 255, 0.3);
      }
      
      .header-btn svg {
        width: 18px;
        height: 18px;
      }
      
      .messages {
        flex: 1;
        overflow-y: auto;
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      
      .message {
        max-width: 85%;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      
      .message.user {
        align-self: flex-end;
      }
      
      .message.assistant {
        align-self: flex-start;
      }
      
      .message-bubble {
        padding: 12px 16px;
        border-radius: 18px;
        word-wrap: break-word;
      }
      
      .message.user .message-bubble {
        background: linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%);
        color: white;
        border-bottom-right-radius: 4px;
      }
      
      .message.assistant .message-bubble {
        background: #1F2937;
        color: #F9FAFB;
        border-bottom-left-radius: 4px;
      }
      
      .message-time {
        font-size: 10px;
        color: #6B7280;
        display: none;
      }
      
      .message:hover .message-time {
        display: block;
      }
      
      .message.assistant .message-time {
        text-align: left;
      }
      
      .message.user .message-time {
        text-align: right;
      }
      
      .citations {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin-top: 8px;
      }
      
      .citation {
        font-size: 11px;
        padding: 4px 8px;
        background: rgba(79, 142, 247, 0.15);
        color: ${primaryColor};
        border-radius: 12px;
        cursor: pointer;
        transition: background 0.2s;
      }
      
      .citation:hover {
        background: rgba(79, 142, 247, 0.25);
      }
      
      .typing-indicator {
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 12px 16px;
        background: #1F2937;
        border-radius: 18px;
        border-bottom-left-radius: 4px;
        width: fit-content;
      }
      
      .typing-dot {
        width: 8px;
        height: 8px;
        background: #6B7280;
        border-radius: 50%;
        animation: typing 1.4s infinite;
      }
      
      .typing-dot:nth-child(2) {
        animation-delay: 0.2s;
      }
      
      .typing-dot:nth-child(3) {
        animation-delay: 0.4s;
      }
      
      @keyframes typing {
        0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
        30% { transform: translateY(-4px); opacity: 1; }
      }
      
      .suggested-questions {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        padding: 0 16px 12px;
      }
      
      .suggested-chip {
        padding: 8px 14px;
        background: rgba(79, 142, 247, 0.15);
        color: ${primaryColor};
        border: none;
        border-radius: 16px;
        font-size: 13px;
        cursor: pointer;
        transition: all 0.2s;
      }
      
      .suggested-chip:hover {
        background: rgba(79, 142, 247, 0.25);
        transform: translateY(-1px);
      }
      
      .input-area {
        padding: 12px 16px;
        background: #111827;
        border-top: 1px solid rgba(255, 255, 255, 0.08);
        display: flex;
        gap: 8px;
        align-items: flex-end;
      }
      
      .input-wrapper {
        flex: 1;
        display: flex;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 20px;
        padding: 8px 14px;
        transition: border-color 0.2s;
      }
      
      .input-wrapper:focus-within {
        border-color: ${primaryColor};
      }
      
      .message-input {
        flex: 1;
        background: transparent;
        border: none;
        outline: none;
        color: #F9FAFB;
        font-size: 14px;
        font-family: inherit;
        resize: none;
        max-height: 100px;
        line-height: 1.4;
      }
      
      .message-input::placeholder {
        color: #6B7280;
      }
      
      .send-btn {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        background: linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%);
        border: none;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: transform 0.2s, opacity 0.2s;
        flex-shrink: 0;
      }
      
      .send-btn:hover:not(:disabled) {
        transform: scale(1.05);
      }
      
      .send-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      
      .send-btn svg {
        width: 18px;
        height: 18px;
        fill: white;
      }
      
      .powered-by {
        text-align: center;
        padding: 8px;
        font-size: 11px;
        color: #6B7280;
      }
      
      .powered-by a {
        color: ${primaryColor};
        text-decoration: none;
      }
      
      .error-message {
        padding: 12px 16px;
        background: rgba(239, 68, 68, 0.15);
        border: 1px solid rgba(239, 68, 68, 0.3);
        border-radius: 12px;
        color: #EF4444;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      
      .retry-btn {
        margin-left: auto;
        padding: 6px 12px;
        background: #EF4444;
        color: white;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        font-size: 13px;
      }
      
      .lead-capture-form {
        padding: 16px;
        background: #1F2937;
        border-radius: 16px;
        margin: 0 16px 12px;
      }
      
      .lead-capture-title {
        font-weight: 600;
        margin-bottom: 12px;
        color: #F9FAFB;
      }
      
      .lead-input {
        width: 100%;
        padding: 10px 14px;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 10px;
        color: #F9FAFB;
        font-size: 14px;
        margin-bottom: 10px;
        outline: none;
        transition: border-color 0.2s;
      }
      
      .lead-input:focus {
        border-color: ${primaryColor};
      }
      
      .lead-input::placeholder {
        color: #6B7280;
      }
      
      .lead-actions {
        display: flex;
        gap: 8px;
        margin-top: 12px;
      }
      
      .lead-submit {
        flex: 1;
        padding: 10px;
        background: linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%);
        border: none;
        border-radius: 10px;
        color: white;
        font-weight: 600;
        cursor: pointer;
        transition: opacity 0.2s;
      }
      
      .lead-submit:hover {
        opacity: 0.9;
      }
      
      .lead-skip {
        padding: 10px 16px;
        background: transparent;
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 10px;
        color: #9CA3AF;
        cursor: pointer;
        transition: all 0.2s;
      }
      
      .lead-skip:hover {
        background: rgba(255, 255, 255, 0.05);
        color: #F9FAFB;
      }
      
      .feedback-prompt {
        padding: 12px 16px;
        background: #1F2937;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 12px;
        margin: 8px 16px;
      }
      
      .feedback-btn {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        border: none;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 18px;
        transition: transform 0.2s;
      }
      
      .feedback-btn:hover {
        transform: scale(1.1);
      }
      
      .feedback-btn.positive {
        background: rgba(16, 185, 129, 0.2);
        color: #10B981;
      }
      
      .feedback-btn.negative {
        background: rgba(239, 68, 68, 0.2);
        color: #EF4444;
      }
      
      .feedback-thanks {
        color: #10B981;
        font-weight: 500;
      }
      
      .date-separator {
        text-align: center;
        color: #6B7280;
        font-size: 12px;
        padding: 8px 0;
      }
      
      /* Mobile Styles */
      @media (max-width: 480px) {
        .panel {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          width: 100%;
          height: 100%;
          border-radius: 0;
        }
        
        .launcher {
          position: fixed;
          bottom: 20px;
          right: 20px;
        }
      }
    `;
  }
  
  private getPositionStyles(): string {
    const position = this.config?.position || 'bottom_right';
    const bottom = 20;
    const right = 20;
    const left = 20;
    const top = 20;
    
    switch (position) {
      case 'bottom_right':
        return `bottom: ${bottom}px; right: ${right}px;`;
      case 'bottom_left':
        return `bottom: ${bottom}px; left: ${left}px;`;
      case 'top_right':
        return `top: ${top}px; right: ${right}px;`;
      case 'top_left':
        return `top: ${top}px; left: ${left}px;`;
      default:
        return `bottom: ${bottom}px; right: ${right}px;`;
    }
  }
  
  private getPositionClass(): string {
    const position = this.config?.position || 'bottom_right';
    return position;
  }
  
  private getHTML(): string {
    const name = this.config?.name || 'AI Assistant';
    const avatarInitial = name.charAt(0).toUpperCase();
    const showPoweredBy = this.config?.showPoweredBy !== false;
    const suggestedQuestions = this.config?.suggestedQuestions || [];
    
    return `
      <div class="widget-container ${this.getPositionClass()}">
        <div class="panel" id="acmedesk-panel">
          <div class="panel-header">
            <div class="avatar">
              ${this.config?.avatarUrl 
                ? `<img src="${this.config.avatarUrl}" alt="${name}">` 
                : `<span class="avatar-placeholder">${avatarInitial}</span>`}
            </div>
            <div class="header-info">
              <div class="chatbot-name">${name}</div>
              <div class="status">
                <span class="status-dot"></span>
                Online
              </div>
            </div>
            <div class="header-actions">
              <button class="header-btn" id="acmedesk-minimize" title="Minimize">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
              </button>
            </div>
          </div>
          
          <div class="messages" id="acmedesk-messages"></div>
          
          <div class="suggested-questions" id="acmedesk-suggestions" ${suggestedQuestions.length === 0 ? 'style="display: none;"' : ''}>
            ${suggestedQuestions.map(q => `<button class="suggested-chip" data-question="${q}">${q}</button>`).join('')}
          </div>
          
          <div class="typing-indicator" id="acmedesk-typing" style="display: none;">
            <span class="typing-dot"></span>
            <span class="typing-dot"></span>
            <span class="typing-dot"></span>
          </div>
          
          <div class="input-area" id="acmedesk-input-area">
            <div class="input-wrapper">
              <textarea 
                class="message-input" 
                id="acmedesk-input" 
                placeholder="Type a message..."
                rows="1"
              ></textarea>
            </div>
            <button class="send-btn" id="acmedesk-send" disabled>
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"></path>
              </svg>
            </button>
          </div>
          
          ${showPoweredBy ? `
          <div class="powered-by">
            Powered by <a href="#" target="_blank">AcmeDesk</a>
          </div>
          ` : ''}
        </div>
        
        <button class="launcher" id="acmedesk-launcher">
          <span class="chat-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
          </span>
          <span class="close-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </span>
          <span class="unread-badge" id="acmedesk-unread" style="display: none;">0</span>
        </button>
      </div>
    `;
  }
  
  private bindEvents() {
    this.launcher?.addEventListener('click', () => this.togglePanel());
    
    const minimizeBtn = this.shadowRoot.getElementById('acmedesk-minimize');
    minimizeBtn?.addEventListener('click', () => this.closePanel());
    
    this.sendButton?.addEventListener('click', () => this.sendMessage());
    
    this.messageInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });
    
    this.messageInput?.addEventListener('input', () => {
      this.autoResizeInput();
      this.updateSendButton();
    });
    
    const suggestions = this.shadowRoot.querySelectorAll('.suggested-chip');
    suggestions.forEach(chip => {
      chip.addEventListener('click', () => {
        const question = chip.getAttribute('data-question');
        if (question) {
          this.messageInput!.value = question;
          this.sendMessage();
        }
      });
    });
    
    this.messagesContainer?.addEventListener('scroll', () => this.handleScroll());
  }
  
  private autoResizeInput() {
    if (!this.messageInput) return;
    this.messageInput.style.height = 'auto';
    this.messageInput.style.height = Math.min(this.messageInput.scrollHeight, 100) + 'px';
  }
  
  private updateSendButton() {
    if (!this.sendButton || !this.messageInput) return;
    this.sendButton.disabled = !this.messageInput.value.trim();
  }
  
  private togglePanel() {
    this.isOpen = !this.isOpen;
    
    if (this.isOpen) {
      this.openPanel();
    } else {
      this.closePanel();
    }
  }
  
  private openPanel() {
    this.isOpen = true;
    this.launcher?.classList.add('open');
    this.chatPanel?.classList.add('open');
    this.clearUnread();
    this.messageInput?.focus();
    this.scrollToBottom();
  }
  
  private closePanel() {
    this.isOpen = false;
    this.launcher?.classList.remove('open');
    this.chatPanel?.classList.remove('open');
  }
  
  private clearUnread() {
    this.hasNewMessage = false;
    const unreadBadge = this.shadowRoot.getElementById('acmedesk-unread');
    if (unreadBadge) {
      unreadBadge.style.display = 'none';
    }
  }
  
  private showUnread(count: number) {
    this.hasNewMessage = true;
    const unreadBadge = this.shadowRoot.getElementById('acmedesk-unread');
    if (unreadBadge) {
      unreadBadge.textContent = count.toString();
      unreadBadge.style.display = 'flex';
    }
  }
  
  private updatePosition() {
    if (!this.config) return;
    
    const container = this.shadowRoot.querySelector('.widget-container') as HTMLElement;
    if (!container) return;
    
    const position = this.config.position || 'bottom_right';
    container.className = `widget-container ${position}`;
    container.style.cssText = `position: fixed; z-index: ${this.Z_INDEX}; ${this.getPositionStyles()}`;
  }
  
  private async sendMessage() {
    const content = this.messageInput?.value.trim();
    if (!content || !this.config) return;
    
    this.messageInput!.value = '';
    this.autoResizeInput();
    this.updateSendButton();
    
    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date()
    };
    
    this.addMessage(userMessage);
    this.context.messageCount++;
    
    const suggestionsEl = this.shadowRoot.getElementById('acmedesk-suggestions');
    if (suggestionsEl) {
      suggestionsEl.style.display = 'none';
    }
    
    this.showTyping(true);
    
    try {
      const response = await this.sendToAPI(content);
      this.showTyping(false);
      
      const assistantMessage: ChatMessage = {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: response.answer,
        timestamp: new Date(),
        citations: response.sources?.map((s: any) => ({
          filename: s.filename || 'Unknown',
          pageNumber: s.page_number,
          excerpt: s.excerpt || ''
        }))
      };
      
      this.addMessage(assistantMessage);
      this.context.messageCount++;
      
      if (this.context.conversationId && !this.context.conversationId.includes('new')) {
        this.context.conversationId = response.conversation_id;
      } else if (!this.context.conversationId) {
        this.context.conversationId = response.conversation_id;
      }
      
      this.checkLeadCaptureTrigger();
      
    } catch (error: any) {
      this.showTyping(false);
      this.showError(error.message || 'Failed to send message. Please try again.');
    }
  }
  
  private async sendToAPI(message: string) {
    const apiUrl = this.getApiUrl();
    
    const payload = {
      message,
      session_id: this.sessionId,
      conversation_id: this.context.conversationId,
      history: this.getMessageHistory(),
      lead_data: this.context.leadData
    };
    
    const response = await fetch(`${apiUrl}/api/chat/widget/message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || 'API request failed');
    }
    
    return response.json();
  }
  
  private getMessageHistory() {
    return this.messages.slice(-10).map(m => ({
      role: m.role,
      content: m.content
    }));
  }
  
  private checkLeadCaptureTrigger() {
    const triggerAfter = 3;
    
    if (!this.context.leadCaptureTriggered && 
        this.context.messageCount >= triggerAfter && 
        !this.context.leadData) {
      this.showLeadCaptureForm();
    }
  }
  
  private showLeadCaptureForm() {
    this.context.leadCaptureTriggered = true;
    
    const formHtml = `
      <div class="lead-capture-form" id="lead-capture-form">
        <div class="lead-capture-title">Before you continue, may we contact you?</div>
        <input type="text" class="lead-input" id="lead-name" placeholder="Your name (optional)">
        <input type="email" class="lead-input" id="lead-email" placeholder="Email address (optional)">
        <input type="tel" class="lead-input" id="lead-phone" placeholder="Phone number (optional)">
        <div class="lead-actions">
          <button class="lead-submit" id="lead-submit">Continue</button>
          <button class="lead-skip" id="lead-skip">Maybe later</button>
        </div>
      </div>
    `;
    
    const inputArea = this.shadowRoot.getElementById('acmedesk-input-area');
    inputArea?.insertAdjacentHTML('beforebegin', formHtml);
    
    const submitBtn = this.shadowRoot.getElementById('lead-submit');
    const skipBtn = this.shadowRoot.getElementById('lead-skip');
    
    submitBtn?.addEventListener('click', () => this.submitLeadCapture());
    skipBtn?.addEventListener('click', () => this.skipLeadCapture());
  }
  
  private async submitLeadCapture() {
    const nameInput = this.shadowRoot.getElementById('lead-name') as HTMLInputElement;
    const emailInput = this.shadowRoot.getElementById('lead-email') as HTMLInputElement;
    const phoneInput = this.shadowRoot.getElementById('lead-phone') as HTMLInputElement;
    
    this.context.leadData = {
      name: nameInput?.value || undefined,
      email: emailInput?.value || undefined,
      phone: phoneInput?.value || undefined
    };
    
    const form = this.shadowRoot.getElementById('lead-capture-form');
    form?.remove();
    
    try {
      await this.saveLeadData();
    } catch (error) {
      console.error('Failed to save lead data:', error);
    }
  }
  
  private skipLeadCapture() {
    const form = this.shadowRoot.getElementById('lead-capture-form');
    form?.remove();
  }
  
  private async saveLeadData() {
    if (!this.context.conversationId || !this.context.leadData) return;
    
    const apiUrl = this.getApiUrl();
    await fetch(`${apiUrl}/api/chat/widget/lead`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversation_id: this.context.conversationId,
        lead_data: this.context.leadData
      })
    });
  }
  
  private showTyping(show: boolean) {
    this.isTyping = show;
    if (this.typingIndicator) {
      this.typingIndicator.style.display = show ? 'flex' : 'none';
      if (show) {
        this.scrollToBottom();
      }
    }
  }
  
  private showError(message: string) {
    const errorHtml = `
      <div class="message assistant">
        <div class="message-bubble error-message">
          ${message}
          <button class="retry-btn" id="retry-btn">Retry</button>
        </div>
      </div>
    `;
    
    this.messagesContainer?.insertAdjacentHTML('beforeend', errorHtml);
    
    const retryBtn = this.shadowRoot.getElementById('retry-btn');
    retryBtn?.addEventListener('click', () => {
      const errorMsg = retryBtn.closest('.message');
      errorMsg?.remove();
    });
    
    this.scrollToBottom();
  }
  
  private addMessage(message: ChatMessage) {
    this.messages.push(message);
    this.renderMessage(message);
    this.scrollToBottom();
    
    if (!this.isOpen && message.role === 'assistant') {
      const currentUnread = parseInt((this.shadowRoot.getElementById('acmedesk-unread')?.textContent || '0'));
      this.showUnread(currentUnread + 1);
    }
  }
  
  private renderMessage(message: ChatMessage) {
    if (!this.messagesContainer) return;
    
    const time = message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    let html = `
      <div class="message ${message.role}">
        <div class="message-bubble">${this.escapeHtml(message.content)}</div>
        <span class="message-time">${time}</span>
    `;
    
    if (message.role === 'assistant' && message.citations && message.citations.length > 0) {
      html += `
        <div class="citations">
          ${message.citations.map(c => `
            <span class="citation" title="${this.escapeHtml(c.excerpt)}">${this.escapeHtml(c.filename)}</span>
          `).join('')}
        </div>
      `;
    }
    
    html += '</div>';
    this.messagesContainer.insertAdjacentHTML('beforeend', html);
  }
  
  private renderMessages() {
    if (!this.messagesContainer) return;
    this.messagesContainer.innerHTML = '';
    this.messages.forEach(msg => this.renderMessage(msg));
  }
  
  private setupSuggestedQuestions() {
    const suggestions = this.shadowRoot.querySelectorAll('.suggested-chip');
    suggestions.forEach(chip => {
      chip.addEventListener('click', () => {
        const question = chip.getAttribute('data-question');
        if (question) {
          this.messageInput!.value = question;
          this.sendMessage();
        }
      });
    });
  }
  
  private scrollToBottom() {
    setTimeout(() => {
      this.messagesContainer?.scrollTo({
        top: this.messagesContainer.scrollHeight,
        behavior: 'smooth'
      });
    }, 50);
  }
  
  private handleScroll() {
    // Could implement "load more" here
  }
  
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  private loadSession() {
    try {
      const stored = sessionStorage.getItem(`acmedesk_session_${this.sessionId}`);
      if (stored) {
        const data = JSON.parse(stored);
        this.context = { ...this.context, ...data };
      }
    } catch (e) {
      // Ignore session storage errors
    }
    
    sessionStorage.setItem(`acmedesk_session_${this.sessionId}`, JSON.stringify(this.context));
  }
  
  public open() {
    this.openPanel();
  }
  
  public close() {
    this.closePanel();
  }
  
  public destroy() {
    this.widgetContainer.remove();
  }
}

declare global {
  interface Window {
    AcmeDeskWidget: typeof AcmeDeskWidget;
    acmedeskWidget: AcmeDeskWidget;
  }
}

window.AcmeDeskWidget = AcmeDeskWidget;
window.acmedeskWidget = new AcmeDeskWidget();

export default AcmeDeskWidget;
