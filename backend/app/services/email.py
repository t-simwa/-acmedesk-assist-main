"""
Email service for sending emails using Resend API.
"""

import logging
from typing import Optional

import resend

from ..config import settings

logger = logging.getLogger(__name__)


class EmailService:
    """Service for sending emails via Resend API."""
    
    def __init__(self):
        """Initialize email service with settings."""
        self.resend_api_key = getattr(settings, 'resend_api_key', None)
        self.from_email = getattr(settings, 'smtp_from_email', 'AcmeDesk Assist <noreply@simca-agencies.com>')
        self.from_name = getattr(settings, 'smtp_from_name', 'AcmeDesk Assist')
        self.frontend_url = str(settings.frontend_origin)
        
        if self.resend_api_key:
            resend.api_key = self.resend_api_key
    
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
            reset_url = f"{self.frontend_url}/reset-password?token={reset_token}"
            
            subject = "Reset Your AcmeDesk Assist Password"
            
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
        Send an email via Resend API.
        
        Args:
            to_email: Recipient email address
            subject: Email subject
            text_body: Plain text email body
            html_body: Optional HTML email body
            
        Returns:
            True if email sent successfully, False otherwise
        """
        try:
            if not self.resend_api_key:
                logger.warning(f"Resend API key not configured. Email would be sent to {to_email}")
                logger.info(f"Email content - Subject: {subject}")
                return True
            
            params: resend.Emails.SendParams = {
                "from": self.from_email,
                "to": [to_email],
                "subject": subject,
                "text": text_body,
            }
            
            if html_body:
                params["html"] = html_body
            
            response = resend.Emails.send(params)
            
            logger.info(f"Email sent successfully to {to_email}: {response}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {str(e)}")
            return False

    async def send_verification_email(
        self,
        to_email: str,
        verification_token: str,
        user_name: Optional[str] = None
    ) -> bool:
        """
        Send email verification email.
        
        Args:
            to_email: Recipient email address
            verification_token: Email verification token
            user_name: Optional user name for personalization
            
        Returns:
            True if email sent successfully, False otherwise
        """
        try:
            verify_url = f"{self.frontend_url}/verify-email?token={verification_token}"
            
            subject = "Verify Your AcmeDesk Assist Email"
            
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
                        <h1>Verify Your Email</h1>
                    </div>
                    <div class="content">
                        <p>Hello{(' ' + user_name) if user_name else ''},</p>
                        <p>Thank you for creating an AcmeDesk Assist account!</p>
                        <p>Please verify your email address by clicking the button below:</p>
                        <p style="text-align: center;">
                            <a href="{verify_url}" class="button">Verify Email</a>
                        </p>
                        <p>Or copy and paste this link into your browser:</p>
                        <p style="word-break: break-all; color: #4F46E5;">{verify_url}</p>
                        <p><strong>This verification link will expire in 24 hours.</strong></p>
                        <p>If you didn't create an account, please ignore this email.</p>
                    </div>
                    <div class="footer">
                        <p>This is an automated message from AcmeDesk Assist. Please do not reply to this email.</p>
                    </div>
                </div>
            </body>
            </html>
            """
            
            text_body = f"""
            Verify Your Email
            
            Hello{(' ' + user_name) if user_name else ''},
            
            Thank you for creating an AcmeDesk Assist account!
            
            Please verify your email address by clicking the link below:
            {verify_url}
            
            This verification link will expire in 24 hours.
            
            If you didn't create an account, please ignore this email.
            
            ---
            This is an automated message from AcmeDesk Assist. Please do not reply to this email.
            """
            
            return await self._send_email(to_email, subject, text_body, html_body)
            
        except Exception as e:
            logger.error(f"Failed to send verification email to {to_email}: {str(e)}")
            return False

    async def send_password_changed_confirmation(
        self,
        to_email: str,
        user_name: Optional[str] = None
    ) -> bool:
        """
        Send password changed confirmation email.
        
        Args:
            to_email: Recipient email address
            user_name: Optional user name for personalization
            
        Returns:
            True if email sent successfully, False otherwise
        """
        try:
            subject = "Your AcmeDesk Password Has Been Changed"
            
            html_body = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <style>
                    body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                    .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                    .header {{ background-color: #10B981; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }}
                    .content {{ background-color: #f9fafb; padding: 30px; border-radius: 0 0 5px 5px; }}
                    .warning {{ background-color: #FEF3C7; padding: 15px; border-radius: 5px; margin-top: 20px; }}
                    .footer {{ text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }}
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Password Changed</h1>
                    </div>
                    <div class="content">
                        <p>Hello{(' ' + user_name) if user_name else ''},</p>
                        <p>Your password for AcmeDesk Assist has been successfully changed.</p>
                        <div class="warning">
                            <p><strong>If you didn't make this change, please contact support immediately.</strong></p>
                        </div>
                    </div>
                    <div class="footer">
                        <p>This is an automated message from AcmeDesk Assist. Please do not reply to this email.</p>
                    </div>
                </div>
            </body>
            </html>
            """
            
            text_body = f"""
            Password Changed
            
            Hello{(' ' + user_name) if user_name else ''},
            
            Your password for AcmeDesk Assist has been successfully changed.
            
            If you didn't make this change, please contact support immediately.
            
            ---
            This is an automated message from AcmeDesk Assist. Please do not reply to this email.
            """
            
            return await self._send_email(to_email, subject, text_body, html_body)
            
        except Exception as e:
            logger.error(f"Failed to send password changed confirmation to {to_email}: {str(e)}")
            return False

    async def send_welcome_email(
        self,
        to_email: str,
        user_name: Optional[str] = None
    ) -> bool:
        """
        Send welcome email to new users.
        
        Args:
            to_email: Recipient email address
            user_name: Optional user name for personalization
            
        Returns:
            True if email sent successfully, False otherwise
        """
        try:
            subject = "Welcome to AcmeDesk Assist!"
            
            html_body = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <style>
                    body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                    .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                    .header {{ background: linear-gradient(135deg, #4F8EF7, #7C3AED); color: white; padding: 30px; text-align: center; border-radius: 5px 5px 0 0; }}
                    .content {{ background-color: #f9fafb; padding: 30px; border-radius: 0 0 5px 5px; }}
                    .button {{ display: inline-block; padding: 12px 24px; background: linear-gradient(135deg, #4F8EF7, #7C3AED); color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }}
                    .features {{ display: flex; gap: 20px; margin: 20px 0; }}
                    .feature {{ flex: 1; padding: 15px; background: white; border-radius: 5px; text-align: center; }}
                    .footer {{ text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }}
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Welcome to AcmeDesk Assist!</h1>
                    </div>
                    <div class="content">
                        <p>Hello{(' ' + user_name) if user_name else ''},</p>
                        <p>Thank you for joining AcmeDesk Assist! We're excited to help you build your AI-powered customer support team.</p>
                        <div class="features">
                            <div class="feature">
                                <h3>⚡</h3>
                                <p>Live in 24 hours</p>
                            </div>
                            <div class="feature">
                                <h3>🎯</h3>
                                <p>No code needed</p>
                            </div>
                            <div class="feature">
                                <h3>🛡️</h3>
                                <p>7-day guarantee</p>
                            </div>
                        </div>
                        <p>Ready to get started? Set up your chatbot in just a few minutes:</p>
                        <a href="#" class="button">Set Up Your Chatbot</a>
                        <p>If you have any questions, reply to this email or visit our help center.</p>
                        <p>Best regards,<br>The AcmeDesk Team</p>
                    </div>
                    <div class="footer">
                        <p>This is an automated message from AcmeDesk Assist. Please do not reply to this email.</p>
                    </div>
                </div>
            </body>
            </html>
            """
            
            text_body = f"""
            Welcome to AcmeDesk Assist!
            
            Hello{(' ' + user_name) if user_name else ''},
            
            Thank you for joining AcmeDesk Assist! We're excited to help you build your AI-powered customer support team.
            
            Here's what you get:
            - Live in 24 hours
            - No code needed
            - 7-day guarantee
            
            Ready to get started? Set up your chatbot in just a few minutes.
            
            If you have any questions, reply to this email or visit our help center.
            
            Best regards,
            The AcmeDesk Team
            
            ---
            This is an automated message from AcmeDesk Assist. Please do not reply to this email.
            """
            
            return await self._send_email(to_email, subject, text_body, html_body)
            
        except Exception as e:
            logger.error(f"Failed to send welcome email to {to_email}: {str(e)}")
            return False


email_service = EmailService()


async def send_verification_email(
    to_email: str,
    verification_token: str,
    user_name: Optional[str] = None
) -> bool:
    """
    Send email verification email.
    
    Args:
        to_email: Recipient email address
        verification_token: Email verification token
        user_name: Optional user name for personalization
        
    Returns:
        True if email sent successfully
    """
    return await email_service.send_verification_email(to_email, verification_token, user_name)


async def send_welcome_email(
    to_email: str,
    user_name: Optional[str] = None
) -> bool:
    """
    Send welcome email to new users.
    
    Args:
        to_email: Recipient email address
        user_name: Optional user name for personalization
        
    Returns:
        True if email sent successfully
    """
    return await email_service.send_welcome_email(to_email, user_name)
