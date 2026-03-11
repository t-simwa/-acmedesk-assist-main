from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import List, Dict, Optional

# Channel formatting rules as defined in spec
CHANNEL_FORMAT_RULES: Dict[str, Dict] = {
    "web": {
        "max_response_chars": None,
        "supports_markdown": True,
        "supports_streaming": True,
        "supports_citations": True,
        "supports_buttons": True,
        "supports_rich_media": True,
        "bold_syntax": "**text**",
        "list_syntax": "- item",
        "line_break": "\n",
    },
    "whatsapp": {
        "max_response_chars": 4096,
        "supports_markdown": False,
        "supports_streaming": False,
        "supports_citations": False,
        "supports_buttons": True,
        "supports_rich_media": True,
        "bold_syntax": "*text*",
        "italic_syntax": "_text_",
        "list_syntax": "• item",
        "line_break": "\n",
        "split_long_responses": True,
        "split_delay_ms": 800,
    },
    "instagram": {
        "max_response_chars": 1000,
        "supports_markdown": False,
        "supports_streaming": False,
        "supports_citations": False,
        "supports_buttons": True,
        "supports_rich_media": False,
        "bold_syntax": None,
        "list_syntax": "• item",
        "line_break": "\n",
        "split_long_responses": True,
        "split_delay_ms": 600,
    },
    "facebook": {
        "max_response_chars": 2000,
        "supports_markdown": False,
        "supports_streaming": False,
        "supports_citations": False,
        "supports_buttons": True,
        "supports_rich_media": True,
        "bold_syntax": None,
        "list_syntax": "• item",
        "line_break": "\n",
        "split_long_responses": True,
        "split_delay_ms": 700,
    },
    "email": {
        "max_response_chars": None,
        "supports_markdown": False,
        "supports_streaming": False,
        "supports_citations": True,
        "supports_buttons": True,
        "supports_rich_media": True,
        "html_wrapper": True,
        "confidence_modes": {
            "auto_send": 0.85,
            "draft": 0.60,
            "escalate": 0.0,
        },
    },
    "sms": {
        "max_response_chars": 320,
        "supports_markdown": False,
        "supports_streaming": False,
        "supports_citations": False,
        "supports_buttons": False,
        "supports_rich_media": False,
        "use_numbered_choices": True,
        "always_offer_agent": True,
        "short_url_service": True,
        "line_break": " ",
    },
}


@dataclass
class FormattedResponse:
    message_type: str
    parts: List[str]
    buttons: List[Dict] = field(default_factory=list)
    html: Optional[str] = None
    split_delay_ms: int = 0
    quick_replies: List[str] = field(default_factory=list)


class ChannelFormatter:
    @classmethod
    def format_response(
        cls,
        raw_text: str,
        channel: str,
        options: Optional[List[str]] = None,
        short_url_service=None,
    ) -> FormattedResponse:
        rules = CHANNEL_FORMAT_RULES.get(channel, {})
        if channel == "web":
            # keep markdown; options rendered as chips by frontend
            parts = [raw_text]
            return FormattedResponse(message_type="text", parts=parts)

        if channel == "whatsapp":
            text = cls._convert_whatsapp(raw_text)
            parts = cls._split_long(text, 1000) if rules.get("split_long_responses") else [text]
            resp = FormattedResponse(message_type="text", parts=parts)
            resp.split_delay_ms = rules.get("split_delay_ms", 0)
            if options:
                # WhatsApp interactive buttons/list if options exist
                if len(options) <= 3:
                    resp.message_type = "interactive_buttons"
                    resp.buttons = [{"title": opt, "payload": opt} for opt in options]
                elif len(options) <= 10:
                    resp.message_type = "interactive_list"
                    resp.buttons = [{"title": opt, "payload": opt} for opt in options]
            return resp

        if channel == "instagram":
            text = cls._strip_formatting(raw_text)
            return FormattedResponse(message_type="text", parts=[text])

        if channel == "facebook":
            text = cls._strip_formatting(raw_text)
            if len(text) > 2000:
                text = text[:1997] + "..."
            resp = FormattedResponse(message_type="text", parts=[text])
            resp.split_delay_ms = rules.get("split_delay_ms", 0)
            return resp

        if channel == "email":
            html = cls._markdown_to_html(raw_text)
            return FormattedResponse(message_type="html", parts=[html], html=html)

        if channel == "sms":
            text = cls._strip_markdown_chars(raw_text)
            if short_url_service:
                text = cls._shorten_urls(text, short_url_service)
            if options:
                opts = " ".join(f"{i+1}) {o}" for i, o in enumerate(options))
                text = f"{text}\n{opts}"
                if rules.get("always_offer_agent"):
                    text += "\n0) Speak to a person"
            if len(text) > 315:
                text = text[:312] + "..."
            return FormattedResponse(message_type="text", parts=[text])

        # default fallback
        return FormattedResponse(message_type="text", parts=[raw_text])

    @staticmethod
    def _convert_whatsapp(text: str) -> str:
        # **bold** -> *bold*, __italic__ -> _italic_, headers to bold, bullets
        t = re.sub(r"\*\*(.*?)\*\*", r"*\1*", text)
        t = re.sub(r"__(.*?)__", r"_\1_", t)
        t = re.sub(r"^#{1,3}\s(.+)$", r"*\1*", t, flags=re.MULTILINE)
        t = re.sub(r"^[-*]\s", "• ", t, flags=re.MULTILINE)
        return t

    @staticmethod
    def _strip_formatting(text: str) -> str:
        # remove markdown symbols
        return re.sub(r"[\*\_\`\~]", "", text)

    @staticmethod
    def _strip_markdown_chars(text: str) -> str:
        return re.sub(r"[\*\_\#\`\~]", "", text)

    @staticmethod
    def _split_long(text: str, limit: int) -> List[str]:
        if len(text) <= limit:
            return [text]
        paragraphs = text.split("\n\n")
        parts = []
        current = ""
        for para in paragraphs:
            if len(current) + len(para) + 2 < limit:
                current = f"{current}\n\n{para}" if current else para
            else:
                if current:
                    parts.append(current)
                current = para
        if current:
            parts.append(current)
        return parts

    @staticmethod
    def _markdown_to_html(markdown: str) -> str:
        # very simple conversion; for production use a library like markdown2
        html = markdown
        # basic replacements
        html = re.sub(r"\*\*(.*?)\*\*", r"<strong>\1</strong>", html)
        html = re.sub(r"_(.*?)_", r"<em>\1</em>", html)
        html = re.sub(r"`([^`]+)`", r"<code>\1</code>", html)
        html = re.sub(r"\n", r"<br/>", html)
        return html

    @staticmethod
    def _shorten_urls(text: str, short_url_service) -> str:
        urls = re.findall(r'https?://\S+', text)
        for url in urls:
            try:
                short = short_url_service.shorten(url)
                text = text.replace(url, short)
            except Exception:
                pass
        return text
