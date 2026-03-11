import pytest
import pytest_asyncio
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app.services.channel_adapters.email_service import EmailProcessor
from app.config import get_settings

class DummyResponse:
    def __init__(self, status_code=200):
        self.status_code = status_code
    def raise_for_status(self):
        pass

@pytest.mark.asyncio
async def test_send_email_direct_resend(monkeypatch, tmp_path):
    # configure settings for resend
    monkeypatch.setenv('EMAIL_PROVIDER', 'resend')
    monkeypatch.setenv('RESEND_API_KEY', 'fake')
    monkeypatch.setenv('RESEND_FROM_EMAIL', 'hi@example.com')
    # clear cached settings so new vars take effect
    from app.config import get_settings
    get_settings.cache_clear()
    settings = get_settings()

    called = {}
    async def fake_post(self, url, **kwargs):
        called['url'] = url
        called['json'] = kwargs.get('json')
        return DummyResponse(202)
    monkeypatch.setattr('httpx.AsyncClient.post', fake_post)

    await EmailProcessor.send_email_direct('user@foo.com', '<p>hi</p>', subject='s')
    assert called['url'] == 'https://api.resend.com/emails'
    assert called['json']['to'][0]['email'] == 'user@foo.com'

@pytest.mark.asyncio
async def test_send_email_direct_sendgrid(monkeypatch):
    monkeypatch.setenv('EMAIL_PROVIDER', 'sendgrid')
    monkeypatch.setenv('SENDGRID_API_KEY', 'sgfake')
    monkeypatch.setenv('SENDGRID_FROM_EMAIL', 'bot@foo.com')
    from app.config import get_settings
    get_settings.cache_clear()
    settings = get_settings()

    called = {}
    async def fake_post(self, url, **kwargs):
        called['url'] = url
        called['json'] = kwargs.get('json')
        return DummyResponse(202)
    monkeypatch.setattr('httpx.AsyncClient.post', fake_post)

    await EmailProcessor.send_email_direct('user@foo.com', '<p>hello</p>', subject='s')
    assert 'sendgrid.com' in called['url']
