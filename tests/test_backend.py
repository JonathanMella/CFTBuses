import json
import secrets
import tempfile
import threading
import unittest
from unittest.mock import patch
from http.server import ThreadingHTTPServer
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import Request, urlopen

import backend


class BackendAPITests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp = tempfile.TemporaryDirectory()
        backend.DB_PATH = Path(cls.temp.name) / "test.sqlite3"
        backend.initialize()
        cls.server = ThreadingHTTPServer(("127.0.0.1", 0), backend.Handler)
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        cls.base = f"http://127.0.0.1:{cls.server.server_port}"

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join(timeout=2)
        cls.temp.cleanup()

    def request(self, path, method="GET", body=None, token=None):
        headers = {"Content-Type": "application/json"}
        if token:
            headers["Authorization"] = f"Bearer {token}"
        payload = json.dumps(body).encode() if body is not None else None
        req = Request(self.base + path, data=payload, headers=headers, method=method)
        try:
            with urlopen(req) as response:
                return response.status, json.loads(response.read())
        except HTTPError as error:
            status, body = error.code, json.loads(error.read())
            error.close()
            return status, body

    def create_verified_user(self, teacher=False):
        local = ("docente." if teacher else "alumno") + secrets.token_hex(5)
        email = f"{local}@cftla.cl"
        with patch("backend.send_verification_email") as send_email:
            status, pending = self.request("/api/register", "POST", {"name": "Cuenta De Prueba", "email": email, "password": "clave-segura-2026"})
        self.assertIn(status, (200, 201))
        code = send_email.call_args.args[1]
        status, verified = self.request("/api/verify-email", "POST", {"email": email, "code": code})
        self.assertEqual(status, 200)
        return email, verified["token"]

    def test_health_and_login_validation(self):
        self.assertEqual(self.request("/api/health")[0], 200)
        status, body = self.request("/api/login", "POST", {"email": "inexistente@cftla.cl", "password": "incorrecta"})
        self.assertEqual(status, 401)
        self.assertIn("error", body)

    def test_complaints_require_session_and_persist(self):
        status, _ = self.request("/api/complaints", "POST", {})
        self.assertEqual(status, 401)
        _, token = self.create_verified_user()
        payload = {"plate": "BCDF-12", "line": "Línea A", "category": "No se detuvo en paradero", "reason": "El bus no se detuvo en el paradero indicado."}
        status, result = self.request("/api/complaints", "POST", payload, token)
        self.assertEqual(status, 201)
        self.assertRegex(result["complaint"]["id"], r"^DEN-\d{4}-\d{4}$")
        _, listing = self.request("/api/complaints", token=token)
        self.assertEqual(listing["complaints"][0]["plate"], "BCDF-12")

    def test_invalid_complaint_is_rejected(self):
        _, token = self.create_verified_user(teacher=True)
        status, result = self.request("/api/complaints", "POST", {"plate": "bad", "line": "Línea A", "category": "Test", "reason": "Suficiente texto para el motivo."}, token)
        self.assertEqual(status, 400)
        self.assertIn("patente", result["error"])

    def test_registration_assigns_role_from_cftla_email(self):
        cases = [
            ("berodriguez@cftla.cl", "student", "Beatriz Rodríguez"),
            ("patricia.albornoz@cftla.cl", "teacher", "Patricia Albornoz"),
        ]
        for email, expected_role, name in cases:
            with patch("backend.send_verification_email") as send_email:
                status, result = self.request("/api/register", "POST", {"name": name, "email": email, "password": "clave-segura-2026"})
            self.assertTrue(send_email.called)
            self.assertIn(status, (200, 201))
            self.assertTrue(result["verification_required"])
            self.assertEqual(result["email"], email)
            login_status, _ = self.request("/api/login", "POST", {"email": email, "password": "clave-segura-2026"})
            self.assertEqual(login_status, 403)
            code = send_email.call_args.args[1]
            verify_status, verified = self.request("/api/verify-email", "POST", {"email": email, "code": code})
            self.assertEqual(verify_status, 200)
            self.assertEqual(verified["user"]["role"], expected_role)
            self.assertEqual(verified["user"]["name"], name)
            me_status, current = self.request("/api/me", token=verified["token"])
            self.assertEqual(me_status, 200)
            self.assertEqual(current["user"]["email"], email)

    def test_registration_rejects_other_domains_and_extra_dots(self):
        for email in ("beatriz@otro.cl", "nombre.apellido.segundo@cftla.cl"):
            status, result = self.request("/api/register", "POST", {"name": "Beatriz Rodríguez", "email": email, "password": "clave-segura-2026"})
            self.assertEqual(status, 400)
            self.assertIn("@cftla.cl", result["error"])


if __name__ == "__main__":
    unittest.main()
