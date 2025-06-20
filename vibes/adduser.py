#!/usr/bin/env python3
import sqlite3
import sys
import getpass
import hashlib
import secrets

def hash_password(password: str, salt: str = None):
    if not salt:
        salt = secrets.token_hex(16)
    hashed = hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), 100_000)
    return f"{salt}${hashed.hex()}"


def main():
    if len(sys.argv) < 3:
        print("Usage: adduser.py <username> <password>")
        sys.exit(1)
    username = sys.argv[1]
    password = sys.argv[2] #getpass.getpass(f"Password for {username}: ")
    hashed = hash_password(password)
    conn = sqlite3.connect('users.db')
    cur = conn.cursor()
    cur.execute("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE NOT NULL, password TEXT NOT NULL)")
    try:
        cur.execute("INSERT INTO users (username, password) VALUES (?, ?)", (username, hashed))
        conn.commit()
        print(f"User '{username}' added.")
    except sqlite3.IntegrityError:
        print(f"User '{username}' already exists.")
    finally:
        conn.close()

if __name__ == "__main__":
    main()
