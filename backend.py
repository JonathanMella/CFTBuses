"""API and static server for BusCFTLA. Uses only the Python standard library."""
from __future__ import annotations

import hashlib
import hmac
import json
import os
import re
import secrets
import sqlite3
import smtplib
import ssl
from contextlib import contextmanager
from datetime import datetime, timedelta, timezone
from email.message import EmailMessage
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parent
DB_PATH = Path(os.environ.get("BUSCFTLA_DB", ROOT / "data" / "buscftla.sqlite3"))
PORT = int(os.environ.get("PORT", "8080"))
ITERATIONS = 240_000
PROFILE_DEFAULTS = {
    "student": {"module": "CFTLA", "metrics": {"routes": 4, "trips": 0, "alerts": 0}},
    "teacher": {"module": "Departamento Académico", "metrics": {"routes": 4, "trips": 0, "alerts": 0}},
}


class EmailNotConfigured(Exception):
    pass


def smtp_settings():
    user = os.environ.get("BUSCFTLA_SMTP_USER", "").strip()
    password = os.environ.get("BUSCFTLA_SMTP_PASSWORD", "").replace(" ", "").strip()
    if not user or not password:
        raise EmailNotConfigured("Falta configurar Gmail SMTP en el servidor.")
    return user, password, os.environ.get("BUSCFTLA_SMTP_FROM", user).strip()


def send_verification_email(recipient: str, code: str):
    user, password, sender = smtp_settings()
    message = EmailMessage()
    message["Subject"] = "Código para activar tu cuenta BusCFTLA"
    message["From"] = f"BusCFTLA <{sender}>"
    message["To"] = recipient
    message.set_content(
        f"Hola,\n\nTu código para comprobar el correo y activar tu cuenta BusCFTLA es: {code}\n\n"
        "El código vence en 10 minutos. Si no solicitaste esta cuenta, ignora este mensaje.\n"
    )
    host = os.environ.get("BUSCFTLA_SMTP_HOST", "smtp.gmail.com")
    port = int(os.environ.get("BUSCFTLA_SMTP_PORT", "465"))
    use_ssl = os.environ.get("BUSCFTLA_SMTP_SSL", "1").strip().lower() in {"1", "true", "yes", "on"}
    if use_ssl:
        connection = smtplib.SMTP_SSL(host, port, timeout=20, context=ssl.create_default_context())
    else:
        connection = smtplib.SMTP(host, port, timeout=20)
    with connection as server:
        server.ehlo()
        if not use_ssl:
            server.starttls(context=ssl.create_default_context())
            server.ehlo()
        server.login(user, password)
        server.send_message(message)


def issue_verification_code(db, user_id: str, email: str, now: datetime | None = None):
    now = now or datetime.now(timezone.utc)
    verification_code = f"{secrets.randbelow(1_000_000):06d}"
    code_salt = secrets.token_bytes(16)
    code_hash = hmac.new(code_salt, verification_code.encode(), hashlib.sha256).digest()
    expires_at = (now.replace(microsecond=0) + timedelta(minutes=10)).isoformat()
    db.execute("INSERT OR REPLACE INTO email_verifications(user_id,code_salt,code_hash,expires_at,created_at,attempts) VALUES(?,?,?,?,?,0)", (user_id, code_salt, code_hash, expires_at, now.isoformat()))
    send_verification_email(email, verification_code)


def connect():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    db = sqlite3.connect(DB_PATH, timeout=10)
    db.row_factory = sqlite3.Row
    db.execute("PRAGMA foreign_keys=ON")
    return db


@contextmanager
def database():
    db = connect()
    try:
        with db:
            yield db
    finally:
        db.close()


def hash_password(password: str, salt: bytes | None = None) -> tuple[bytes, bytes]:
    salt = salt or secrets.token_bytes(16)
    return salt, hashlib.pbkdf2_hmac("sha256", password.encode(), salt, ITERATIONS)


def initialize():
    with database() as db:
        db.executescript("""
        CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, role TEXT NOT NULL, salt BLOB NOT NULL, password_hash BLOB NOT NULL, display_name TEXT NOT NULL DEFAULT '', code TEXT NOT NULL DEFAULT '', email_verified INTEGER NOT NULL DEFAULT 1);
        CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, created_at TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS complaints (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, created_at TEXT NOT NULL, plate TEXT NOT NULL, line TEXT NOT NULL, category TEXT NOT NULL, reason TEXT NOT NULL, status TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS email_verifications (user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, code_salt BLOB NOT NULL, code_hash BLOB NOT NULL, expires_at TEXT NOT NULL, created_at TEXT NOT NULL, attempts INTEGER NOT NULL DEFAULT 0);
        """)
        user_columns = {row["name"] for row in db.execute("PRAGMA table_info(users)")}
        if "display_name" not in user_columns:
            db.execute("ALTER TABLE users ADD COLUMN display_name TEXT NOT NULL DEFAULT ''")
        if "code" not in user_columns:
            db.execute("ALTER TABLE users ADD COLUMN code TEXT NOT NULL DEFAULT ''")
        if "email_verified" not in user_columns:
            db.execute("ALTER TABLE users ADD COLUMN email_verified INTEGER NOT NULL DEFAULT 1")


class APIError(Exception):
    def __init__(self, status, message):
        self.status, self.message = status, message


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def log_message(self, fmt, *args):
        print(f"[{self.log_date_time_string()}] {self.address_string()} {fmt % args}")

    def send_json(self, status, value):
        body = json.dumps(value, ensure_ascii=False).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Authorization, Content-Type")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.end_headers()
        self.wfile.write(body)

    def read_json(self):
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if length < 2 or length > 16_384:
                raise ValueError()
            return json.loads(self.rfile.read(length))
        except (ValueError, json.JSONDecodeError):
            raise APIError(400, "El cuerpo debe ser JSON válido y no superar 16 KB.")

    def require_user(self, db):
        token = self.headers.get("Authorization", "").removeprefix("Bearer ")
        if not token:
            raise APIError(401, "Inicia sesión para continuar.")
        row = db.execute("SELECT users.id, users.role, users.email, users.display_name, users.code FROM sessions JOIN users ON users.id=sessions.user_id WHERE sessions.token=?", (token,)).fetchone()
        if not row:
            raise APIError(401, "La sesión no es válida.")
        return row, token

    def do_GET(self):
        path = urlparse(self.path).path
        if not path.startswith("/api/"):
            return super().do_GET()
        try:
            with database() as db:
                if path == "/api/health":
                    return self.send_json(200, {"ok": True, "service": "BusCFTLA API"})
                user, _ = self.require_user(db)
                if path == "/api/me":
                    return self.send_json(200, {"user": self.profile(user)})
                if path == "/api/complaints":
                    rows = db.execute("SELECT id,created_at,plate,line,category,reason,status FROM complaints WHERE user_id=? ORDER BY created_at DESC", (user["id"],)).fetchall()
                    return self.send_json(200, {"complaints": [self.complaint(row) for row in rows]})
                raise APIError(404, "Endpoint no encontrado.")
        except APIError as e:
            self.send_json(e.status, {"error": e.message})

    def do_POST(self):
        path = urlparse(self.path).path
        try:
            payload = self.read_json()
            with database() as db:
                if path == "/api/register":
                    email = str(payload.get("email", "")).strip().lower()
                    name = " ".join(str(payload.get("name", "")).split())
                    password = str(payload.get("password", ""))
                    match = re.fullmatch(r"([a-z0-9]+(?:\.[a-z0-9]+)?)@cftla\.cl", email)
                    if not match:
                        raise APIError(400, "Usa un correo @cftla.cl: nombre@cftla.cl para estudiante o nombre.apellido@cftla.cl para profesor.")
                    local_part = match.group(1)
                    role = "teacher" if "." in local_part else "student"
                    if not 2 <= len(name) <= 100:
                        raise APIError(400, "Ingresa tu nombre completo (máximo 100 caracteres).")
                    if not 8 <= len(password) <= 128:
                        raise APIError(400, "La contraseña debe tener entre 8 y 128 caracteres.")
                    existing = db.execute("SELECT id,email_verified FROM users WHERE email=?", (email,)).fetchone()
                    if existing:
                        if existing["email_verified"]:
                            raise APIError(409, "Ese correo ya tiene una cuenta comprobada. Inicia sesión.")
                        salt, digest = hash_password(password)
                        db.execute("UPDATE users SET display_name=?, salt=?, password_hash=? WHERE id=?", (name, salt, digest, existing["id"]))
                        pending = db.execute("SELECT created_at FROM email_verifications WHERE user_id=?", (existing["id"],)).fetchone()
                        now = datetime.now(timezone.utc)
                        if not pending or (now - datetime.fromisoformat(pending["created_at"])).total_seconds() >= 60:
                            issue_verification_code(db, existing["id"], email, now)
                        return self.send_json(200, {"verification_required": True, "email": email})
                    user_id = secrets.token_hex(16)
                    prefix = "DOC-" if role == "teacher" else "ALU-"
                    while True:
                        code = prefix + str(secrets.randbelow(9000) + 1000)
                        if not db.execute("SELECT 1 FROM users WHERE code=?", (code,)).fetchone():
                            break
                    salt, digest = hash_password(password)
                    db.execute("INSERT INTO users(id,email,role,salt,password_hash,display_name,code,email_verified) VALUES(?,?,?,?,?,?,?,0)", (user_id, email, role, salt, digest, name, code))
                    now = datetime.now(timezone.utc)
                    issue_verification_code(db, user_id, email, now)
                    return self.send_json(201, {"verification_required": True, "email": email})
                if path == "/api/verify-email":
                    email = str(payload.get("email", "")).strip().lower()
                    code = str(payload.get("code", "")).strip()
                    row = db.execute("SELECT users.*, email_verifications.code_salt, email_verifications.code_hash, email_verifications.expires_at, email_verifications.attempts FROM users JOIN email_verifications ON users.id=email_verifications.user_id WHERE users.email=? AND users.email_verified=0", (email,)).fetchone()
                    if not row:
                        return self.send_json(400, {"error": "No hay una cuenta pendiente de comprobación para ese correo."})
                    if datetime.fromisoformat(row["expires_at"]) <= datetime.now(timezone.utc):
                        db.execute("DELETE FROM email_verifications WHERE user_id=?", (row["id"],))
                        return self.send_json(410, {"error": "El código venció. Solicita uno nuevo para continuar."})
                    if row["attempts"] >= 5:
                        return self.send_json(429, {"error": "Superaste los intentos. Solicita un código nuevo."})
                    expected = hmac.new(row["code_salt"], code.encode(), hashlib.sha256).digest()
                    if len(code) != 6 or not code.isdigit() or not hmac.compare_digest(expected, row["code_hash"]):
                        db.execute("UPDATE email_verifications SET attempts=attempts+1 WHERE user_id=?", (row["id"],))
                        return self.send_json(400, {"error": "El código no es correcto. Revisa el correo e inténtalo otra vez."})
                    db.execute("UPDATE users SET email_verified=1 WHERE id=?", (row["id"],))
                    db.execute("DELETE FROM email_verifications WHERE user_id=?", (row["id"],))
                    token = secrets.token_urlsafe(32)
                    db.execute("INSERT INTO sessions(token,user_id,created_at) VALUES(?,?,?)", (token, row["id"], datetime.now(timezone.utc).isoformat()))
                    user = db.execute("SELECT id,email,role,display_name,code FROM users WHERE id=?", (row["id"],)).fetchone()
                    return self.send_json(200, {"token": token, "user": self.profile(user)})
                if path == "/api/resend-verification":
                    email = str(payload.get("email", "")).strip().lower()
                    user = db.execute("SELECT id,email_verified FROM users WHERE email=?", (email,)).fetchone()
                    if not user or user["email_verified"]:
                        return self.send_json(200, {"ok": True, "message": "Si existe una cuenta pendiente, enviaremos un nuevo código."})
                    old = db.execute("SELECT created_at FROM email_verifications WHERE user_id=?", (user["id"],)).fetchone()
                    now = datetime.now(timezone.utc)
                    if old and (now - datetime.fromisoformat(old["created_at"])).total_seconds() < 60:
                        return self.send_json(429, {"error": "Espera un minuto antes de solicitar otro código."})
                    issue_verification_code(db, user["id"], email, now)
                    return self.send_json(200, {"ok": True, "message": "Te enviamos otro código."})
                if path == "/api/login":
                    email = str(payload.get("email", "")).strip().lower()
                    password = str(payload.get("password", ""))
                    row = db.execute("SELECT * FROM users WHERE email=?", (email,)).fetchone()
                    if row and not row["email_verified"]:
                        raise APIError(403, "Primero comprueba tu correo con el código que te enviamos al registrarte.")
                    if not row or not hmac.compare_digest(hashlib.pbkdf2_hmac("sha256", password.encode(), row["salt"], ITERATIONS), row["password_hash"]):
                        raise APIError(401, "Correo o contraseña institucional incorrectos.")
                    token = secrets.token_urlsafe(32)
                    db.execute("INSERT INTO sessions(token,user_id,created_at) VALUES(?,?,?)", (token, row["id"], datetime.now(timezone.utc).isoformat()))
                    return self.send_json(200, {"token": token, "user": self.profile(row)})
                if path == "/api/logout":
                    _, token = self.require_user(db)
                    db.execute("DELETE FROM sessions WHERE token=?", (token,))
                    return self.send_json(200, {"ok": True})
                if path == "/api/complaints":
                    user, _ = self.require_user(db)
                    plate = str(payload.get("plate", "")).strip().upper()
                    line = str(payload.get("line", "")).strip()
                    category = str(payload.get("category", "")).strip()
                    reason = str(payload.get("reason", "")).strip()
                    if not re.fullmatch(r"[A-Z0-9]{3,6}-[A-Z0-9]{2,4}", plate):
                        raise APIError(400, "La patente debe tener formato válido, por ejemplo BCDF-12.")
                    if line not in {"Línea A", "Línea B", "Línea C", "Línea D"} or not category or len(category) > 100:
                        raise APIError(400, "La línea o categoría no es válida.")
                    if not 10 <= len(reason) <= 500:
                        raise APIError(400, "El motivo debe tener entre 10 y 500 caracteres.")
                    now = datetime.now(timezone.utc)
                    ticket = f"DEN-{now.year}-{secrets.randbelow(9000)+1000}"
                    db.execute("INSERT INTO complaints VALUES(?,?,?,?,?,?,?,?)", (ticket, user["id"], now.isoformat(), plate, line, category, reason, "En revisión"))
                    row = db.execute("SELECT id,created_at,plate,line,category,reason,status FROM complaints WHERE id=?", (ticket,)).fetchone()
                    return self.send_json(201, {"complaint": self.complaint(row)})
                raise APIError(404, "Endpoint no encontrado.")
        except EmailNotConfigured:
            self.send_json(503, {"error": "El correo todavía no está configurado. Para envío gratis, configura una cuenta Gmail y su contraseña de aplicación en este equipo."})
        except (smtplib.SMTPException, OSError, ValueError) as e:
            print(f"Email delivery error: {e}")
            self.send_json(503, {"error": "No se pudo enviar el correo. Revisa la configuración SMTP de Gmail en el servidor e inténtalo otra vez."})
        except APIError as e:
            self.send_json(e.status, {"error": e.message})

    @staticmethod
    def profile(user):
        data = PROFILE_DEFAULTS.get(user["role"], {})
        role = user["role"]
        name = user["display_name"] if "display_name" in user.keys() and user["display_name"] else "Usuario BusCFTLA"
        code = user["code"] if "code" in user.keys() and user["code"] else ""
        metrics = data.get("metrics", {"routes": 4, "trips": 0, "alerts": 0})
        return {"id": user["id"], "role": role, "roleLabel": "Docente" if role == "teacher" else "Estudiante", "roleKey": role, "name": name, "email": user["email"], "code": code, "module": data.get("module", "Departamento Académico" if role == "teacher" else "CFTLA"), "institution": "CFTLA — Lota Arauco", "avatarInitial": "".join(part[0] for part in name.split()[:2]).upper(), "metrics": metrics}

    @staticmethod
    def complaint(row):
        dt = datetime.fromisoformat(row["created_at"])
        return {"id": row["id"], "date": dt.astimezone().strftime("%d/%m/%Y %H:%M"), "plate": row["plate"], "line": row["line"], "category": row["category"], "reason": row["reason"], "status": row["status"]}

    def do_HEAD(self):
        if urlparse(self.path).path.startswith("/api/"):
            return self.send_json(404, {"error": "Endpoint no encontrado."})
        return super().do_HEAD()

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Authorization, Content-Type")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Content-Length", "0")
        self.end_headers()


if __name__ == "__main__":
    initialize()
    server = ThreadingHTTPServer(("0.0.0.0", PORT), Handler)
    print(f"BusCFTLA: http://127.0.0.1:{PORT}/  |  API: http://127.0.0.1:{PORT}/api/health")
    print(f"Base SQLite: {DB_PATH}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nServidor detenido.")
    finally:
        server.server_close()
