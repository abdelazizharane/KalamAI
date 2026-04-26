import asyncio
import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from datetime import datetime

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


def _fmt_dt(iso: str) -> str:
    try:
        dt = datetime.fromisoformat(iso.replace("Z", "+00:00"))
        days = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"]
        months = ["janvier", "février", "mars", "avril", "mai", "juin",
                  "juillet", "août", "septembre", "octobre", "novembre", "décembre"]
        return f"{days[dt.weekday()]} {dt.day} {months[dt.month - 1]} {dt.year} à {dt.strftime('%H:%M')}"
    except Exception:
        return iso


def _build_html(host_name: str, meeting_title: str, description: str,
                scheduled_at: str, room_code: str, join_url: str) -> str:
    formatted = _fmt_dt(scheduled_at)
    desc_block = f'<p style="color:#64748b;margin:0 0 16px 0;">{description}</p>' if description else ""
    return f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:20px;background:#f1f5fb;font-family:Inter,sans-serif;">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <div style="background:linear-gradient(135deg,#7c3aed,#4f46e5);padding:28px 32px;">
      <div style="display:flex;align-items:center;gap:10px;">
        <span style="font-size:24px;">🌍</span>
        <span style="font-size:20px;font-weight:700;color:#fff;letter-spacing:-0.5px;">KalamAI</span>
      </div>
      <p style="color:rgba(255,255,255,0.8);margin:8px 0 0 0;font-size:14px;">Plateforme multilingue de vidéoconférence</p>
    </div>
    <div style="padding:32px;">
      <h2 style="color:#0f172a;margin:0 0 6px 0;font-size:20px;">Vous êtes invité(e) à une réunion</h2>
      <p style="color:#64748b;margin:0 0 24px 0;font-size:14px;">
        <strong style="color:#374151;">{host_name}</strong> vous invite à rejoindre une réunion en ligne avec traduction simultanée par IA.
      </p>
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:20px;margin-bottom:24px;">
        <h3 style="color:#1e293b;margin:0 0 12px 0;font-size:16px;">📅 {meeting_title}</h3>
        {desc_block}
        <p style="color:#374151;margin:0 0 6px 0;font-size:14px;">⏰ <strong>{formatted}</strong></p>
        <p style="color:#64748b;margin:0;font-size:13px;">Code : <code style="background:#e2e8f0;padding:2px 6px;border-radius:4px;">{room_code}</code></p>
      </div>
      <a href="{join_url}"
         style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#4f46e5);color:#fff;text-decoration:none;padding:14px 28px;border-radius:10px;font-weight:700;font-size:15px;">
        Rejoindre la réunion →
      </a>
      <p style="color:#94a3b8;font-size:12px;margin-top:20px;">
        Ou copiez ce lien dans votre navigateur :<br>
        <span style="color:#6366f1;">{join_url}</span>
      </p>
    </div>
    <div style="border-top:1px solid #f1f5f9;padding:16px 32px;text-align:center;">
      <p style="color:#94a3b8;font-size:11px;margin:0;">KalamAI — Réunions sans frontières linguistiques · Chiffré · Souverain</p>
    </div>
  </div>
</body>
</html>"""


async def _send_via_resend(to_email: str, subject: str, html: str, from_addr: str) -> None:
    """Send via Resend API (https://resend.com — free tier: 3 000 emails/month)."""
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.post(
            "https://api.resend.com/emails",
            headers={"Authorization": f"Bearer {settings.resend_api_key}", "Content-Type": "application/json"},
            json={"from": from_addr, "to": [to_email], "subject": subject, "html": html},
        )
        resp.raise_for_status()


def _send_via_smtp(to_email: str, subject: str, html: str) -> None:
    """Synchronous SMTP send — run via executor."""
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = settings.smtp_from
    msg["To"] = to_email
    msg.attach(MIMEText(html, "html", "utf-8"))
    with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=10) as s:
        s.ehlo()
        s.starttls()
        if settings.smtp_user:
            s.login(settings.smtp_user, settings.smtp_password)
        s.sendmail(settings.smtp_from, to_email, msg.as_string())


async def send_meeting_invitation(
    to_email: str,
    host_name: str,
    meeting_title: str,
    description: str,
    scheduled_at: str,
    room_code: str,
) -> None:
    join_url = f"{settings.app_url}/room/{room_code}"
    subject = f"Invitation : {meeting_title} — KalamAI"
    html = _build_html(host_name, meeting_title, description, scheduled_at, room_code, join_url)

    # Priority 1: Resend API (simplest — just set RESEND_API_KEY)
    if settings.resend_api_key:
        try:
            from_addr = f"KalamAI <{settings.smtp_from}>"
            await _send_via_resend(to_email, subject, html, from_addr)
            logger.info("✉️  [Resend] Email envoyé à %s — %s", to_email, meeting_title)
        except Exception as exc:
            logger.error("✉️  [Resend] Échec envoi à %s : %s", to_email, exc)
        return

    # Priority 2: SMTP (Gmail / any SMTP server)
    if settings.smtp_host:
        try:
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(None, _send_via_smtp, to_email, subject, html)
            logger.info("✉️  [SMTP] Email envoyé à %s — %s", to_email, meeting_title)
        except Exception as exc:
            logger.error("✉️  [SMTP] Échec envoi à %s : %s", to_email, exc)
        return

    # Fallback: log the invite link (no email sent)
    logger.info(
        "✉️  [EMAIL NON CONFIGURÉ] To: %s | %s | Lien: %s\n"
        "   → Pour activer les emails : RESEND_API_KEY=re_xxx  OU  SMTP_HOST=smtp.gmail.com",
        to_email, meeting_title, join_url,
    )
