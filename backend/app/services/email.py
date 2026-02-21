"""
Email service for sending emails (password reset, verification, etc.).
"""

import logging
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional
from pathlib import Path

from ..config import settings

logger = logging.getLogger(__name__)


class EmailService:
    """Service for sending emails via SMTP."""
    
    def __init__(self):
        """Initialize email service with settings."""
        self.smtp_host = getattr(settings, 'smtp_host', 'localhost')
        self.smtp_port = getattr(settings, 'smtp_port', 587)
        self.smtp_username = getattr(settings, 'smtp_username', None)
        self.smtp_password = getattr(settings, 'smtp_password', None)
        self.smtp_use_tls = getattr(settings, 'smtp_use_tls', True)
        self.from_email = getattr(settings, 'smtp_from_email', 'noreply@acmedesk.com')
        self.from_name = getattr(settings, 'smtp_from_name', 'AcmeDesk Assist')
        self.frontend_url = str(settings.frontend_origin)
    
    async def send_password_reset_email(
        self,
        to_email: str,
        reset_token: str,
        user_name: Optional[str] = None
    ) -> bool:
        """
        Send password reset email.
        
        Args:
            to_email: Recipient email address
            reset_token: Password reset token
            user_name: Optional user name for personalization
            
        Returns:
            True if email sent successfully, False otherwise
        """
        try:
            # Create reset link
            reset_url = f"{self.frontend_url}/reset-password?token={reset_token}"
            
            # Email subject
            subject = "Reset Your AcmeDesk Assist Password"
            
            # Email body (HTML)
            html_body = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <style>
                    body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                    .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                    .header {{ background-color: #4F46E5; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }}
                    .content {{ background-color: #f9fafb; padding: 30px; border-radius: 0 0 5px 5px; }}
                    .button {{ display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }}
                    .footer {{ text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }}
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Password Reset Request</h1>
                    </div>
                    <div class="content">
                        <p>Hello{(' ' + user_name) if user_name else ''},</p>
                        <p>We received a request to reset your password for your AcmeDesk Assist account.</p>
                        <p>Click the button below to reset your password:</p>
                        <p style="text-align: center;">
                            <a href="{reset_url}" class="button">Reset Password</a>
                        </p>
                        <p>Or copy and paste this link into your browser:</p>
                        <p style="word-break: break-all; color: #4F46E5;">{reset_url}</p>
                        <p><strong>This link will expire in 1 hour.</strong></p>
                        <p>If you didn't request a password reset, please ignore this email. Your password will remain unchanged.</p>
                    </div>
                    <div class="footer">
                        <p>This is an automated message from AcmeDesk Assist. Please do not reply to this email.</p>
                    </div>
                </div>
            </body>
            </html>
            """
            
            # Plain text version
            text_body = f"""
            Password Reset Request
            
            Hello{(' ' + user_name) if user_name else ''},
            
            We received a request to reset your password for your AcmeDesk Assist account.
            
            Click the link below to reset your password:
            {reset_url}
            
            This link will expire in 1 hour.
            
            If you didn't request a password reset, please ignore this email. Your password will remain unchanged.
            
            ---
            This is an automated message from AcmeDesk Assist. Please do not reply to this email.
            """
            
            return await self._send_email(to_email, subject, text_body, html_body)
            
        except Exception as e:
            logger.error(f"Failed to send password reset email to {to_email}: {str(e)}")
            return False
    
    async def _send_email(
        self,
        to_email: str,
        subject: str,
        text_body: str,
        html_body: Optional[str] = None
    ) -> bool:
        """
        Send an email via SMTP.
        
        Args:
            to_email: Recipient email address
            subject: Email subject
            text_body: Plain text email body
            html_body: Optional HTML email body
            
        Returns:
            True if email sent successfully, False otherwise
        """
        try:
            # Create message
            msg = MIMEMultipart('alternative')
            msg['From'] = f"{self.from_name} <{self.from_email}>"
            msg['To'] = to_email
            msg['Subject'] = subject
            
            # Add text and HTML parts
            part1 = MIMEText(text_body, 'plain')
            msg.attach(part1)
            
            if html_body:
                part2 = MIMEText(html_body, 'html')
                msg.attach(part2)
            
            # Send email via SMTP
            with smtplib.SMTP(self.smtp_host, self.smtp_port) as server:
                if self.smtp_use_tls:
                    server.starttls()
                
                if self.smtp_username and self.smtp_password:
                    server.login(self.smtp_username, self.smtp_password)
                
                server.send_message(msg)
            
            logger.info(f"Password reset email sent successfully to {to_email}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {str(e)}")
            # In development, log the email content instead of failing
            if settings.environment == "development":
                logger.info(f"DEVELOPMENT MODE: Would send email to {to_email}")
                logger.info(f"Subject: {subject}")
                logger.info(f"Body: {text_body}")
                if html_body:
                    logger.info(f"HTML Body: {html_body}")
                return True  # Return True in dev mode to allow testing
            return False


# Global email service instance
email_service = EmailService()
