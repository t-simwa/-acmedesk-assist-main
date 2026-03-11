import pytest

from app.services.crypto_key_rotation import _fernet_from_key


def test_fernet_from_key_derivation():
    key = "mysecretpassphrase"
    f = _fernet_from_key(key)
    assert f is not None
