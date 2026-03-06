export interface WidgetConfig {
  chatbotId: string;
  apiUrl: string;
  name: string;
  avatarUrl?: string;
  brandColor: string;
  secondaryColor: string;
  greetingMessage: string;
  fallbackMessage: string;
  escalationMessage: string;
  offlineMessage?: string;
  responseTone: 'professional' | 'friendly' | 'casual' | 'formal';
  responseLength: 'short' | 'medium' | 'long';
  showCitations: boolean;
  showTyping: boolean;
  showPoweredBy: boolean;
  position: 'bottom_right' | 'bottom_left' | 'top_right' | 'top_left';
  suggestedQuestions: string[];
  businessHours?: BusinessHoursConfig;
  contactInfo?: ContactInfo;
}

export interface BusinessHoursConfig {
  enabled: boolean;
  timezone: string;
  schedule: DaySchedule[];
  outsideHoursBehavior: 'continue_with_notice' | 'offline_form_only' | 'show_message';
  holidayHours?: HolidayHours[];
}

export interface DaySchedule {
  day: string;
  enabled: boolean;
  openTime: string;
  closeTime: string;
}

export interface HolidayHours {
  date: string;
  openTime: string;
  closeTime: string;
  name: string;
}

export interface ContactInfo {
  email?: string;
  phone?: string;
  website?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  citations?: Citation[];
}

export interface Citation {
  filename: string;
  pageNumber?: number;
  excerpt: string;
}

export interface LeadCaptureData {
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
}

export type LeadCaptureStep = 'prompt' | 'name' | 'email' | 'done';

export interface ConversationContext {
  sessionId: string;
  conversationId?: string;
  messageCount: number;
  leadCaptureTriggered: boolean;
  leadData?: LeadCaptureData;
  escalated: boolean;
  /** After 3rd message: prompt (Yes/No) -> name -> email -> done */
  leadCaptureStep?: LeadCaptureStep;
  feedbackSubmitted?: boolean;
}

export interface WidgetOptions {
  apiUrl?: string;
  position?: 'bottom_right' | 'bottom_left' | 'top_right' | 'top_left';
  theme?: {
    primaryColor?: string;
    secondaryColor?: string;
  };
}
