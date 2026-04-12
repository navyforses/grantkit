"""
Authentication utilities for GrantKit.

Security fix: Replaced MD5 password hashing with bcrypt.
MD5 is cryptographically broken and vulnerable to rainbow-table and brute-force
attacks. bcrypt is a purpose-built, slow hashing algorithm with a built-in salt,
making it the industry standard for storing passwords securely.
"""

import bcrypt


def hash_password(password: str) -> bytes:
    """Hash a plaintext password using bcrypt.

    bcrypt automatically generates a unique salt for each hash, so the same
    password produces a different hash every time — preventing rainbow-table
    attacks.

    Args:
        password: The plaintext password to hash.

    Returns:
        A bcrypt hash as bytes, which includes the salt and work factor.
    """
    # Use bcrypt instead of the insecure MD5 algorithm.
    # MD5: hashlib.md5(password.encode()).hexdigest()  # INSECURE — do not use
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt)


def verify_password(password: str, hashed: bytes) -> bool:
    """Verify a plaintext password against a stored bcrypt hash.

    Args:
        password: The plaintext password to verify.
        hashed:   The stored bcrypt hash to compare against.

    Returns:
        True if the password matches the hash, False otherwise.
    """
    return bcrypt.checkpw(password.encode("utf-8"), hashed)
