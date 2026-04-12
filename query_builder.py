"""
SQL query-builder utilities for GrantKit.

Security fix: Replaced string concatenation with parameterised queries throughout.
Building SQL strings by concatenating user-supplied values allows an attacker to
inject arbitrary SQL (e.g. ``'; DROP TABLE users; --``).  Parameterised queries
pass values out-of-band so the database driver escapes them correctly, making
injection impossible regardless of the input.
"""

from typing import Any


def get_user_by_id(cursor: Any, user_id: int) -> Any:
    """Return the user row whose primary key matches *user_id*.

    Args:
        cursor:  A DB-API 2.0 compatible database cursor.
        user_id: The integer primary key to look up.

    Returns:
        A single row dict/tuple as returned by the cursor, or None.
    """
    # Parameterised query — the %s placeholder is substituted by the driver,
    # not by Python string formatting, preventing SQL injection.
    #
    # INSECURE (do not use):
    #   query = "SELECT * FROM users WHERE id = " + str(user_id)
    #   cursor.execute(query)
    query = "SELECT * FROM users WHERE id = %s"
    cursor.execute(query, (user_id,))
    return cursor.fetchone()


def get_users_by_email(cursor: Any, email: str) -> list:
    """Return all user rows whose email matches *email* (case-insensitive).

    Args:
        cursor: A DB-API 2.0 compatible database cursor.
        email:  The e-mail address to search for.

    Returns:
        A list of matching rows.
    """
    # Parameterised query prevents injection even when *email* contains
    # SQL meta-characters such as quotes or semicolons.
    query = "SELECT * FROM users WHERE LOWER(email) = LOWER(%s)"
    cursor.execute(query, (email,))
    return cursor.fetchall()


def search_grants(cursor: Any, keyword: str, category: str | None = None) -> list:
    """Search grants by keyword and an optional category filter.

    Args:
        cursor:   A DB-API 2.0 compatible database cursor.
        keyword:  Full-text search term.
        category: Optional category slug to narrow results.

    Returns:
        A list of matching grant rows.
    """
    if category:
        # Both placeholders are supplied as a tuple — never via f-strings or +.
        query = (
            "SELECT * FROM grants "
            "WHERE title LIKE %s AND category = %s AND is_active = 1"
        )
        cursor.execute(query, (f"%{keyword}%", category))
    else:
        query = "SELECT * FROM grants WHERE title LIKE %s AND is_active = 1"
        cursor.execute(query, (f"%{keyword}%",))

    return cursor.fetchall()
