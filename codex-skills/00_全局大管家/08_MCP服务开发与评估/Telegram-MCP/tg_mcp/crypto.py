from cryptography.fernet import Fernet

_fernet: Fernet | None = None


def init_crypto(encryption_key: str) -> None:
    global _fernet
    _fernet = Fernet(encryption_key.encode())


def _get_fernet() -> Fernet:
    if _fernet is None:
        raise RuntimeError("Crypto not initialized. Call init_crypto(key) at startup.")
    return _fernet


def encrypt_session(session_string: str) -> str:
    return _get_fernet().encrypt(session_string.encode()).decode()


def decrypt_session(encrypted: str) -> str:
    return _get_fernet().decrypt(encrypted.encode()).decode()
