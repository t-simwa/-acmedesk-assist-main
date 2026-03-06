import type { WidgetConfig, ChatMessage, ConversationContext } from './types';

class NexaChatWidget {
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
  /** Configurable delay (ms) before showing the launcher. Default 2000 (2 seconds). */
  private launcherDelayMs = 2000;
  /** Configurable delay (ms) before showing "Hi! Need help?" tooltip. Default 10000 (10 seconds). */
  private tooltipDelayMs = 10000;
  /** Inactivity timeout (5 minutes) before showing feedback prompt. */
  private readonly inactivityMs = 5 * 60 * 1000;
  private launcherTimerId: ReturnType<typeof setTimeout> | null = null;
  private tooltipTimerId: ReturnType<typeof setTimeout> | null = null;
  private inactivityTimerId: ReturnType<typeof setTimeout> | null = null;
  private streamingMessageId: string | null = null;
  
  constructor() {
    this.sessionId = this.generateSessionId();
    this.context = {
      sessionId: this.sessionId,
      messageCount: 0,
      leadCaptureTriggered: false,
      escalated: false
    };
    
    this.widgetContainer = document.createElement('div');
    this.widgetContainer.id = 'nexachat-widget-container';
    this.widgetContainer.style.cssText = `position: fixed; z-index: ${this.Z_INDEX};`;
    
    this.shadowRoot = this.widgetContainer.attachShadow({ mode: 'open' });
    document.body.appendChild(this.widgetContainer);
    
    this.init();
  }
  
  private generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }
  
  private getConfigNumber(attr: string, defaultVal: number): number {
    const scripts = document.getElementsByTagName('script');
    for (let i = 0; i < scripts.length; i++) {
      const script = scripts[i];
      if (script.src && script.src.includes('widget.js')) {
        const val = script.getAttribute(attr);
        if (val != null) {
          const n = parseInt(val, 10);
          if (!isNaN(n) && n >= 0) return n;
        }
        break;
      }
    }
    return defaultVal;
  }

  private async init() {
    const chatbotId = this.getChatbotId();
    if (!chatbotId) {
      console.error('NexaChat Widget: No chatbot ID found');
      return;
    }
    this.launcherDelayMs = this.getConfigNumber('data-launcher-delay', 2000);
    this.tooltipDelayMs = this.getConfigNumber('data-tooltip-delay', 10000);

    try {
      await this.loadConfig(chatbotId);
      this.render();
      this.bindEvents();
      this.scheduleLauncherAndTooltip();
      this.loadSession();
      this.resetInactivityTimer();
    } catch (error) {
      console.error('NexaChat Widget: Failed to initialize', error);
    }
  }

  private scheduleLauncherAndTooltip() {
    if (!this.launcher) return;
    this.launcher.style.opacity = '0';
    this.launcher.style.pointerEvents = 'none';
    this.launcherTimerId = setTimeout(() => {
      this.launcherTimerId = null;
      if (this.launcher) {
        this.launcher.style.opacity = '1';
        this.launcher.style.pointerEvents = 'auto';
      }
      this.tooltipTimerId = setTimeout(() => this.showTooltip(), this.tooltipDelayMs);
    }, this.launcherDelayMs);
  }

  private showTooltip() {
    this.tooltipTimerId = null;
    const tooltip = this.shadowRoot.getElementById('nexachat-tooltip');
    if (tooltip && !this.isOpen) {
      (tooltip as HTMLElement).style.display = 'block';
    }
  }

  private hideTooltip() {
    if (this.tooltipTimerId != null) {
      clearTimeout(this.tooltipTimerId);
      this.tooltipTimerId = null;
    }
    const tooltip = this.shadowRoot.getElementById('nexachat-tooltip');
    if (tooltip) (tooltip as HTMLElement).style.display = 'none';
  }

  private resetInactivityTimer() {
    if (this.inactivityTimerId != null) clearTimeout(this.inactivityTimerId);
    this.inactivityTimerId = setTimeout(() => this.onInactivityTimeout(), this.inactivityMs);
  }

  private onInactivityTimeout() {
    this.inactivityTimerId = null;
    if (this.context.feedbackSubmitted || !this.context.conversationId) return;
    if (this.messages.some(m => m.role === 'user')) {
      this.showFeedbackPrompt();
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
    
    this.launcher = this.shadowRoot.getElementById('nexachat-launcher');
    this.chatPanel = this.shadowRoot.getElementById('nexachat-panel');
    this.messagesContainer = this.shadowRoot.getElementById('nexachat-messages');
    this.messageInput = this.shadowRoot.getElementById('nexachat-input') as HTMLTextAreaElement;
    this.sendButton = this.shadowRoot.getElementById('nexachat-send') as HTMLButtonElement;
    this.typingIndicator = this.shadowRoot.getElementById('nexachat-typing');
    
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
      
      .tooltip-bubble {
        position: absolute;
        bottom: 100%;
        margin-bottom: 12px;
        right: 0;
        padding: 10px 14px;
        background: #1F2937;
        color: #F9FAFB;
        border-radius: 12px;
        font-size: 13px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        display: none;
        white-space: nowrap;
        pointer-events: none;
      }
      .widget-container.bottom_right .tooltip-bubble { right: 0; left: auto; }
      .widget-container.bottom_left .tooltip-bubble { left: 0; right: auto; }
      .widget-container.top_right .tooltip-bubble { bottom: auto; top: 100%; margin-top: 12px; margin-bottom: 0; right: 0; left: auto; }
      .widget-container.top_left .tooltip-bubble { bottom: auto; top: 100%; margin-top: 12px; margin-bottom: 0; left: 0; right: auto; }
      
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
      .feedback-label { font-size: 13px; color: #F9FAFB; }
      .feedback-buttons { display: flex; gap: 8px; }
      
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
        <div class="panel" id="nexachat-panel">
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
              <button class="header-btn" id="nexachat-minimize" title="Minimize">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
              </button>
            </div>
          </div>
          
          <div class="messages" id="nexachat-messages"></div>
          
          <div class="suggested-questions" id="nexachat-suggestions" ${suggestedQuestions.length === 0 ? 'style="display: none;"' : ''}>
            ${suggestedQuestions.map(q => `<button class="suggested-chip" data-question="${q}">${q}</button>`).join('')}
          </div>
          
          <div class="typing-indicator" id="nexachat-typing" style="display: none;">
            <span class="typing-dot"></span>
            <span class="typing-dot"></span>
            <span class="typing-dot"></span>
          </div>
          
          <div class="input-area" id="nexachat-input-area">
            <div class="input-wrapper">
              <textarea 
                class="message-input" 
                id="nexachat-input" 
                placeholder="Type a message..."
                rows="1"
              ></textarea>
            </div>
            <button class="send-btn" id="nexachat-send" disabled>
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"></path>
              </svg>
            </button>
          </div>
          
          ${showPoweredBy ? `
          <div class="powered-by">
            Powered by <a href="#" target="_blank">NexaChat</a>
          </div>
          ` : ''}
        </div>
        
        <div class="tooltip-bubble" id="nexachat-tooltip">Hi! Need help?</div>
        <button class="launcher" id="nexachat-launcher">
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
          <span class="unread-badge" id="nexachat-unread" style="display: none;">0</span>
        </button>
      </div>
    `;
  }
  
  private bindEvents() {
    this.launcher?.addEventListener('click', () => this.togglePanel());
    
    const minimizeBtn = this.shadowRoot.getElementById('nexachat-minimize');
    minimizeBtn?.addEventListener('click', () => this.requestClose());
    
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
    this.hideTooltip();
    this.isOpen = true;
    this.launcher?.classList.add('open');
    this.chatPanel?.classList.add('open');
    this.clearUnread();
    this.messageInput?.focus();
    this.scrollToBottom();
  }

  private requestClose() {
    if (!this.context.feedbackSubmitted && this.context.conversationId && this.messages.some(m => m.role === 'user')) {
      this.showFeedbackPrompt();
      return;
    }
    this.doClosePanel();
  }

  private doClosePanel() {
    this.isOpen = false;
    this.launcher?.classList.remove('open');
    this.chatPanel?.classList.remove('open');
  }
  
  private closePanel() {
    this.requestClose();
  }
  
  private showFeedbackPrompt() {
    if (this.context.feedbackSubmitted) return;
    const existing = this.shadowRoot.getElementById('nexachat-feedback-prompt');
    if (existing) return;
    const primaryColor = this.config?.brandColor || '#4F8EF7';
    const html = `
      <div class="feedback-prompt" id="nexachat-feedback-prompt">
        <span class="feedback-label">Was this conversation helpful?</span>
        <div class="feedback-buttons">
          <button class="feedback-btn positive" id="nexachat-feedback-yes" title="Yes">👍</button>
          <button class="feedback-btn negative" id="nexachat-feedback-no" title="No">👎</button>
        </div>
      </div>
    `;
    const inputArea = this.shadowRoot.getElementById('nexachat-input-area');
    inputArea?.insertAdjacentHTML('beforebegin', html);
    this.shadowRoot.getElementById('nexachat-feedback-yes')?.addEventListener('click', () => this.handleFeedback(true));
    this.shadowRoot.getElementById('nexachat-feedback-no')?.addEventListener('click', () => this.handleFeedback(false));
    this.scrollToBottom();
  }

  private async handleFeedback(positive: boolean) {
    const promptEl = this.shadowRoot.getElementById('nexachat-feedback-prompt');
    promptEl?.remove();
    this.context.feedbackSubmitted = true;
    const rating = positive ? 'positive' : 'negative';
    const apiUrl = this.getApiUrl();
    if (this.context.conversationId) {
      try {
        await fetch(`${apiUrl}/api/chat/widget/feedback`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ conversation_id: this.context.conversationId, rating }),
        });
      } catch (e) {
        console.error('Failed to submit feedback:', e);
      }
    }
    if (positive) {
      this.addMessage({
        id: 'feedback-thanks',
        role: 'assistant',
        content: 'Great! Thanks for the feedback.',
        timestamp: new Date(),
      });
      setTimeout(() => this.doClosePanel(), 1000);
    } else {
      this.addMessage({
        id: 'feedback-escalation',
        role: 'assistant',
        content: "Sorry to hear that! Would you like someone from our team to help instead?",
        timestamp: new Date(),
      });
      this.context.escalated = true;
      this.showLeadCaptureFormSequential('prompt');
    }
  }

  private clearUnread() {
    this.hasNewMessage = false;
    const unreadBadge = this.shadowRoot.getElementById('nexachat-unread');
    if (unreadBadge) {
      unreadBadge.style.display = 'none';
    }
  }
  
  private showUnread(count: number) {
    this.hasNewMessage = true;
    const unreadBadge = this.shadowRoot.getElementById('nexachat-unread');
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
    this.resetInactivityTimer();

    const suggestionsEl = this.shadowRoot.getElementById('nexachat-suggestions');
    if (suggestionsEl) suggestionsEl.style.display = 'none';

    this.showTyping(true);

    try {
      const result = await this.sendToAPIStream(content);
      this.showTyping(false);

      if (result.conversation_id) {
        this.context.conversationId = result.conversation_id;
      }

      if (result.metadata?.escalation_triggered || result.metadata?.low_confidence) {
        this.showLeadCaptureFormSequential('prompt');
      } else {
        this.checkLeadCaptureTrigger();
      }
    } catch (error: any) {
      this.showTyping(false);
      this.showError(error.message || 'Failed to send message. Please try again.');
    }
  }

  private async sendToAPIStream(message: string): Promise<{
    answer: string;
    sources: any[];
    conversation_id: string;
    metadata: { low_confidence?: boolean; escalation_triggered?: boolean };
  }> {
    const apiUrl = this.getApiUrl();
    const payload = {
      message,
      session_id: this.sessionId,
      conversation_id: this.context.conversationId || undefined,
      history: this.getMessageHistory(),
      lead_data: this.context.leadData || undefined,
    };

    const response = await fetch(`${apiUrl}/api/chat/widget/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || 'API request failed');
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    if (!reader) throw new Error('No response body');

    let buffer = '';
    let fullAnswer = '';
    let sources: any[] = [];
    let conversationId = this.context.conversationId || '';
    let metadata: any = {};
    this.streamingMessageId = `msg-${Date.now()}`;
    const assistantMsg: ChatMessage = {
      id: this.streamingMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
    };
    this.addMessage(assistantMsg);
    this.context.messageCount++;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n\n');
      buffer = lines.pop() || '';
      for (const block of lines) {
        const eventMatch = block.match(/event:\s*(\w+)/);
        const dataMatch = block.match(/data:\s*(.+)/);
        const event = eventMatch?.[1];
        const dataStr = dataMatch?.[1]?.trim();
        if (event === 'chunk' && dataStr) {
          try {
            const { text } = JSON.parse(dataStr);
            if (text) {
              fullAnswer += text;
              const idx = this.messages.findIndex(m => m.id === this.streamingMessageId);
              if (idx >= 0) {
                this.messages[idx] = { ...this.messages[idx], content: fullAnswer };
                this.renderMessages();
                this.scrollToBottom();
              }
            }
          } catch (_) {}
        } else if (event === 'message' && dataStr) {
          try {
            const data = JSON.parse(dataStr);
            fullAnswer = data.answer || '';
            conversationId = data.conversation_id || conversationId;
            metadata = data.metadata || {};
            const idx = this.messages.findIndex(m => m.id === this.streamingMessageId);
            if (idx >= 0) {
              this.messages[idx] = { ...this.messages[idx], content: fullAnswer };
              this.renderMessages();
            }
          } catch (_) {}
        } else if (event === 'done' && dataStr) {
          try {
            const data = JSON.parse(dataStr);
            fullAnswer = data.answer ?? fullAnswer;
            sources = data.sources || [];
            conversationId = data.conversation_id || conversationId;
            metadata = data.metadata || {};
            const idx = this.messages.findIndex(m => m.id === this.streamingMessageId);
            if (idx >= 0) {
              this.messages[idx] = {
                ...this.messages[idx],
                content: fullAnswer,
                ...(sources.length ? {
                  citations: sources.map((s: any) => ({
                    filename: s.filename || 'Unknown',
                    pageNumber: s.page_number,
                    excerpt: s.excerpt || '',
                  })),
                } : {}),
              };
              this.renderMessages();
            }
          } catch (_) {}
        } else if (event === 'error' && dataStr) {
          try {
            const data = JSON.parse(dataStr);
            throw new Error(data.detail || 'Stream error');
          } catch (e: any) {
            if (e.message) throw e;
          }
        }
      }
    }
    this.streamingMessageId = null;
    return {
      answer: fullAnswer,
      sources,
      conversation_id: conversationId,
      metadata,
    };
  }
  
  private getMessageHistory() {
    return this.messages.slice(-10).map(m => ({
      role: m.role,
      content: m.content
    }));
  }
  
  private checkLeadCaptureTrigger() {
    const triggerAfter = 3;
    if (
      this.context.leadCaptureTriggered ||
      this.context.messageCount < triggerAfter ||
      this.context.leadData?.email
    ) return;
    this.addMessage({
      id: 'lead-prompt',
      role: 'assistant',
      content: "Before I continue, would you like someone from our team to follow up with you directly? If so, I can take your details.",
      timestamp: new Date(),
    });
    this.context.messageCount++;
    this.showLeadCaptureFormSequential('prompt');
  }

  private showLeadCaptureFormSequential(step: 'prompt' | 'name' | 'email' | 'done') {
    const container = this.shadowRoot.getElementById('nexachat-lead-capture');
    if (container) container.remove();
    const inputArea = this.shadowRoot.getElementById('nexachat-input-area');
    if (!inputArea) return;

    const wrap = document.createElement('div');
    wrap.id = 'nexachat-lead-capture';

    if (step === 'prompt') {
      wrap.innerHTML = `
        <div class="lead-capture-form">
          <div class="lead-actions" style="justify-content: center; gap: 12px;">
            <button class="lead-submit" id="nexachat-lead-yes">Yes please</button>
            <button class="lead-skip" id="nexachat-lead-no">No thanks</button>
          </div>
        </div>
      `;
      inputArea.insertAdjacentElement('beforebegin', wrap);
      this.shadowRoot.getElementById('nexachat-lead-yes')?.addEventListener('click', () => {
        this.context.leadCaptureStep = 'name';
        this.addMessage({ id: 'lead-name-q', role: 'assistant', content: "Great! What's your name?", timestamp: new Date() });
        this.context.messageCount++;
        this.showLeadCaptureFormSequential('name');
      });
      this.shadowRoot.getElementById('nexachat-lead-no')?.addEventListener('click', () => {
        this.context.leadCaptureTriggered = true;
        wrap.remove();
      });
    } else if (step === 'name') {
      wrap.innerHTML = `
        <div class="lead-capture-form">
          <input type="text" class="lead-input" id="nexachat-lead-name" placeholder="Your name">
          <button class="lead-submit" id="nexachat-lead-name-submit">Submit</button>
        </div>
      `;
      inputArea.insertAdjacentElement('beforebegin', wrap);
      this.shadowRoot.getElementById('nexachat-lead-name-submit')?.addEventListener('click', () => {
        const name = (this.shadowRoot.getElementById('nexachat-lead-name') as HTMLInputElement)?.value?.trim();
        if (!name) return;
        this.context.leadData = { ...this.context.leadData, name };
        wrap.remove();
        this.addMessage({ id: 'lead-email-q', role: 'assistant', content: "And your email address?", timestamp: new Date() });
        this.context.messageCount++;
        this.showLeadCaptureFormSequential('email');
      });
    } else if (step === 'email') {
      wrap.innerHTML = `
        <div class="lead-capture-form">
          <input type="email" class="lead-input" id="nexachat-lead-email" placeholder="Email address">
          <button class="lead-submit" id="nexachat-lead-email-submit">Submit</button>
        </div>
      `;
      inputArea.insertAdjacentElement('beforebegin', wrap);
      this.shadowRoot.getElementById('nexachat-lead-email-submit')?.addEventListener('click', async () => {
        const email = (this.shadowRoot.getElementById('nexachat-lead-email') as HTMLInputElement)?.value?.trim();
        if (!email) return;
        this.context.leadData = { ...this.context.leadData, email };
        wrap.remove();
        try {
          await this.saveLeadData();
        } catch (e) {
          console.error('Failed to save lead:', e);
        }
        const name = this.context.leadData?.name || 'there';
        this.addMessage({
          id: 'lead-thanks',
          role: 'assistant',
          content: `Perfect, ${name}! Someone will reach out to you at ${email} within 24 hours. Now, what else can I help you with?`,
          timestamp: new Date(),
        });
        this.context.messageCount++;
        this.context.leadCaptureStep = 'done';
        this.context.leadCaptureTriggered = true;
      });
    }
    this.scrollToBottom();
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
      const currentUnread = parseInt((this.shadowRoot.getElementById('nexachat-unread')?.textContent || '0'));
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
      const stored = sessionStorage.getItem(`nexachat_session_${this.sessionId}`);
      if (stored) {
        const data = JSON.parse(stored);
        this.context = { ...this.context, ...data };
      }
    } catch (e) {
      // Ignore session storage errors
    }
    
    sessionStorage.setItem(`nexachat_session_${this.sessionId}`, JSON.stringify(this.context));
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
    NexaChatWidget: typeof NexaChatWidget;
    nexachatWidget: NexaChatWidget;
  }
}

window.NexaChatWidget = NexaChatWidget;
window.nexachatWidget = new NexaChatWidget();

export default NexaChatWidget;
