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

    async def send_payment_success_email(
        self,
        to_email: str,
        user_name: Optional[str],
        amount: float,
        currency: str,
        plan_name: str,
    ) -> bool:
        """
        Send payment success / subscription activated email.
        """
        try:
            subject = f"Payment received – {plan_name} plan activated"

            formatted_amount = f"{amount:,.2f} {currency.upper()}"

            html_body = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <style>
                    body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #111827; background-color: #0B1020; }}
                    .container {{ max-width: 640px; margin: 0 auto; padding: 24px; }}
                    .card {{ border-radius: 16px; overflow: hidden; background: #020617; border: 1px solid rgba(148, 163, 184, 0.35); box-shadow: 0 24px 60px rgba(15,23,42,0.45); }}
                    .header {{ padding: 28px 28px 20px; background: radial-gradient(circle at top left, #4F8EF7, #7C3AED); color: #E5E7EB; }}
                    .badge {{ display: inline-flex; align-items: center; padding: 4px 10px; border-radius: 999px; font-size: 11px; letter-spacing: .08em; text-transform: uppercase; background: rgba(15,23,42,0.35); border: 1px solid rgba(209,213,219,0.25); }}
                    .title {{ font-size: 22px; font-weight: 600; margin: 12px 0 2px; }}
                    .subtitle {{ font-size: 13px; color: rgba(229,231,235,0.85); }}
                    .content {{ padding: 24px 28px 22px; background: radial-gradient(circle at top left, rgba(15,118,110,0.18), transparent 60%), #020617; }}
                    .pill {{ display: inline-block; padding: 4px 10px; border-radius: 999px; font-size: 11px; background: rgba(15,23,42,0.9); color: #E5E7EB; border: 1px solid rgba(148,163,184,0.45); margin-bottom: 14px; }}
                    .amount {{ font-size: 18px; font-weight: 600; color: #E5E7EB; }}
                    .meta {{ font-size: 12px; color: #9CA3AF; margin-top: 4px; }}
                    .button {{ display: inline-block; padding: 10px 18px; margin-top: 18px; border-radius: 999px; background: linear-gradient(135deg, #4F8EF7, #7C3AED); color: #F9FAFB; text-decoration: none; font-size: 13px; font-weight: 500; }}
                    .footer {{ padding: 16px 28px 22px; font-size: 11px; color: #6B7280; background: #020617; border-top: 1px solid rgba(31,41,55,0.9); }}
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="card">
                        <div class="header">
                            <div class="badge">Billing · AcmeDesk Assist</div>
                            <div class="title">Payment received</div>
                            <div class="subtitle">Your {plan_name} plan is now active and ready.</div>
                        </div>
                        <div class="content">
                            <p style="margin: 0 0 10px; font-size: 13px; color: #E5E7EB;">
                                Hello{(' ' + user_name) if user_name else ''},
                            </p>
                            <p style="margin: 0 0 16px; font-size: 13px; color: #D1D5DB;">
                                Thank you for choosing AcmeDesk Assist. Your subscription is now active and your account has been updated.
                            </p>
                            <div class="pill">{plan_name} Plan</div>
                            <div class="amount">{formatted_amount}</div>
                            <div class="meta">Charged via Stripe · Subscription now active</div>
                            <a href="{self.frontend_url}/dashboard" class="button">Go to your dashboard</a>
                        </div>
                        <div class="footer">
                            You can view invoices and manage billing from Settings → Billing inside your NexaChat dashboard.
                        </div>
                    </div>
                </div>
            </body>
            </html>
            """

            text_body = f"""
            Payment received – {plan_name} plan activated

            Hello{(' ' + user_name) if user_name else ''},

            Thank you for choosing AcmeDesk Assist. Your subscription for the {plan_name} plan is now active.
            Amount charged: {formatted_amount}

            You can access your dashboard here: {self.frontend_url}/dashboard

            You can view invoices and manage billing from Settings → Billing inside your NexaChat dashboard.

            ---
            This is an automated message from AcmeDesk Assist. Please do not reply to this email.
            """

            return await self._send_email(to_email, subject, text_body, html_body)
        except Exception as e:  # noqa: BLE001
            logger.error(f"Failed to send payment success email to {to_email}: {str(e)}")
            return False

    async def send_payment_failed_email(
        self,
        to_email: str,
        user_name: Optional[str],
        amount: float,
        currency: str,
    ) -> bool:
        """
        Send payment failure notification email.
        """
        try:
            subject = "Action needed: billing issue with your AcmeDesk Assist subscription"

            formatted_amount = f"{amount:,.2f} {currency.upper()}"

            html_body = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <style>
                    body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #111827; background-color: #0B1020; }}
                    .container {{ max-width: 640px; margin: 0 auto; padding: 24px; }}
                    .card {{ border-radius: 16px; overflow: hidden; background: #020617; border: 1px solid rgba(248,113,113,0.4); box-shadow: 0 24px 60px rgba(127,29,29,0.55); }}
                    .header {{ padding: 26px 28px 18px; background: radial-gradient(circle at top left, #DC2626, #7F1D1D); color: #FEE2E2; }}
                    .badge {{ display: inline-flex; align-items: center; padding: 4px 10px; border-radius: 999px; font-size: 11px; letter-spacing: .08em; text-transform: uppercase; background: rgba(127,29,29,0.65); border: 1px solid rgba(248,250,252,0.25); }}
                    .title {{ font-size: 20px; font-weight: 600; margin: 12px 0 2px; }}
                    .subtitle {{ font-size: 13px; color: rgba(254,242,242,0.9); }}
                    .content {{ padding: 22px 28px 20px; background: #020617; }}
                    .amount {{ font-size: 14px; font-weight: 600; color: #FCA5A5; }}
                    .meta {{ font-size: 12px; color: #9CA3AF; margin-top: 4px; }}
                    .warning {{ margin-top: 14px; padding: 10px 12px; border-radius: 10px; background: rgba(248,113,113,0.09); border: 1px solid rgba(248,113,113,0.5); font-size: 12px; color: #FECACA; }}
                    .button {{ display: inline-block; padding: 9px 18px; margin-top: 18px; border-radius: 999px; background: linear-gradient(135deg, #F97316, #DC2626); color: #F9FAFB; text-decoration: none; font-size: 13px; font-weight: 500; }}
                    .footer {{ padding: 16px 28px 22px; font-size: 11px; color: #6B7280; background: #020617; border-top: 1px solid rgba(31,41,55,0.9); }}
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="card">
                        <div class="header">
                            <div class="badge">Billing alert</div>
                            <div class="title">We couldn't process your latest payment</div>
                            <div class="subtitle">Please update your payment method to keep your account active.</div>
                        </div>
                        <div class="content">
                            <p style="margin: 0 0 10px; font-size: 13px; color: #E5E7EB;">
                                Hello{(' ' + user_name) if user_name else ''},
                            </p>
                            <p style="margin: 0 0 12px; font-size: 13px; color: #D1D5DB;">
                                Your latest payment of <strong>{formatted_amount}</strong> could not be processed by Stripe.
                            </p>
                            <div class="warning">
                                To avoid any interruption to your NexaChat service, please update your payment details as soon as possible.
                            </div>
                            <p style="margin: 14px 0 0; font-size: 12px; color: #9CA3AF;">
                                You will continue to have access while we retry the payment over the next few days.
                            </p>
                            <a href="{self.frontend_url}/dashboard/billing" class="button">Review billing details</a>
                        </div>
                        <div class="footer">
                            If you've already updated your payment method, you can safely ignore this message.
                        </div>
                    </div>
                </div>
            </body>
            </html>
            """

            text_body = f"""
            We couldn't process your latest payment

            Hello{(' ' + user_name) if user_name else ''},

            Your latest payment of {formatted_amount} could not be processed by Stripe.

            To avoid any interruption to your NexaChat service, please update your payment method as soon as possible.

            You can review your billing details here: {self.frontend_url}/dashboard/billing

            If you've already updated your payment method, you can safely ignore this message.

            ---
            This is an automated message from AcmeDesk Assist. Please do not reply to this email.
            """

            return await self._send_email(to_email, subject, text_body, html_body)
        except Exception as e:  # noqa: BLE001
            logger.error(f"Failed to send payment failed email to {to_email}: {str(e)}")
            return False

    async def send_escalation_alert_email(
        self,
        to_emails: list,
        conversation_id: str,
        last_message: str,
        contact_name: Optional[str] = None,
        contact_email: Optional[str] = None,
        contact_phone: Optional[str] = None,
    ) -> bool:
        """
        Send escalation alert to business owner(s) when a user asks to speak to someone.
        """
        if not to_emails:
            logger.warning("No escalation email addresses configured")
            return False
        try:
            subject = "Escalation: A visitor requested to speak with your team"
            contact_line = []
            if contact_name:
                contact_line.append(f"Name: {contact_name}")
            if contact_email:
                contact_line.append(f"Email: {contact_email}")
            if contact_phone:
                contact_line.append(f"Phone: {contact_phone}")
            contact_block = "\n".join(contact_line) if contact_line else "Not yet provided"

            text_body = f"""
A chat visitor has requested to speak with your team.

Conversation ID: {conversation_id}
Last message: {last_message}

Contact details (if provided):
{contact_block}

Please follow up with this visitor. You can view the full conversation in your AcmeDesk dashboard.

---
This is an automated message from AcmeDesk Assist.
"""
            html_body = f"""
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <h2>Escalation: Visitor requested to speak with your team</h2>
  <p><strong>Conversation ID:</strong> {conversation_id}</p>
  <p><strong>Last message:</strong> {last_message}</p>
  <p><strong>Contact details (if provided):</strong></p>
  <pre style="background: #f5f5f5; padding: 12px; border-radius: 6px;">{contact_block}</pre>
  <p>Please follow up with this visitor via your AcmeDesk dashboard.</p>
  <p style="color: #6b7280; font-size: 12px;">This is an automated message from AcmeDesk Assist.</p>
</body>
</html>
"""
            sent = True
            for to_email in to_emails:
                if not to_email or not isinstance(to_email, str):
                    continue
                if not await self._send_email(to_email.strip(), subject, text_body, html_body):
                    sent = False
            return sent
        except Exception as e:
            logger.error(f"Failed to send escalation alert: {str(e)}")
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


async def send_payment_success_email(
    to_email: str,
    user_name: Optional[str],
    amount: float,
    currency: str,
    plan_name: str,
) -> bool:
    """
    Convenience wrapper for sending payment success email.
    """
    return await email_service.send_payment_success_email(
        to_email=to_email,
        user_name=user_name,
        amount=amount,
        currency=currency,
        plan_name=plan_name,
    )


async def send_payment_failed_email(
    to_email: str,
    user_name: Optional[str],
    amount: float,
    currency: str,
) -> bool:
    """
    Convenience wrapper for sending payment failure email.
    """
    return await email_service.send_payment_failed_email(
        to_email=to_email,
        user_name=user_name,
        amount=amount,
        currency=currency,
    )


async def send_escalation_alert_email(
    to_emails: list,
    conversation_id: str,
    last_message: str,
    contact_name: Optional[str] = None,
    contact_email: Optional[str] = None,
    contact_phone: Optional[str] = None,
) -> bool:
    """
    Send escalation alert to business owner(s).
    """
    return await email_service.send_escalation_alert_email(
        to_emails=to_emails,
        conversation_id=conversation_id,
        last_message=last_message,
        contact_name=contact_name,
        contact_email=contact_email,
        contact_phone=contact_phone,
    )
