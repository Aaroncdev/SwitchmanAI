#!/usr/bin/env python3
import json
import socket
import ssl
import uuid
from dataclasses import dataclass
from http.cookies import SimpleCookie
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib import error, request

ROOT = Path(__file__).resolve().parent


@dataclass
class ArubaSession:
    host: str
    port: int
    scheme: str
    api_version: str
    cookie: str
    insecure: bool

    @property
    def base(self) -> str:
        return f"{self.scheme}://{self.host}:{self.port}/rest/{self.api_version}"


SESSIONS: dict[str, ArubaSession] = {}


class AppHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def _send_json(self, payload: dict, status: int = 200):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _json_body(self) -> dict:
        length = int(self.headers.get("Content-Length", "0"))
        raw = self.rfile.read(length) if length else b"{}"
        return json.loads(raw.decode("utf-8") or "{}")

    def do_POST(self):
        if self.path == "/api/connect":
            return self.handle_connect()
        if self.path == "/api/apply":
            return self.handle_apply()
        return super().do_POST()

    def do_GET(self):
        if self.path.startswith("/api/discovery"):
            return self.handle_discovery()
        return super().do_GET()

    def _switch_request(self, session: ArubaSession, method: str, endpoint: str, payload: dict | None = None):
        data = json.dumps(payload).encode("utf-8") if payload is not None else None
        req = request.Request(
            f"{session.base}/{endpoint.lstrip('/')}",
            data=data,
            method=method,
            headers={
                "Content-Type": "application/json",
                "Cookie": session.cookie,
            },
        )
        ctx = ssl._create_unverified_context() if session.insecure else ssl.create_default_context()
        with request.urlopen(req, context=ctx, timeout=20) as resp:
            body = resp.read().decode("utf-8")
            return json.loads(body) if body else {}

    def _session_from_token(self):
        token = self.headers.get("X-Session-Token", "")
        session = SESSIONS.get(token)
        if not session:
            self._send_json({"error": "Not connected. Connect first."}, status=401)
            return None
        return session

    def handle_connect(self):
        body = self._json_body()
        host = body.get("host", "").strip().replace("https://", "").replace("http://", "")
        host = host.split("/")[0].split(":")[0]
        username = body.get("username", "").strip()
        password = body.get("password", "")
        api_version = body.get("apiVersion", "v10.13")
        insecure = bool(body.get("insecure", True))
        protocol = body.get("protocol", "https").lower()
        port = int(body.get("port", 443) or 443)

        if not host or not username or not password:
            return self._send_json({"error": "host, username, and password are required."}, status=400)

        if protocol != "https":
            return self._send_json(
                {
                    "error": "SSH connectivity is not implemented in this build. Use HTTPS (REST API) for connect/pull/push.",
                    "detail": "Set Protocol to HTTPS (REST) and use switch REST credentials.",
                },
                status=400,
            )

        try:
            socket.create_connection((host, port), timeout=5).close()
        except OSError as exc:
            return self._send_json(
                {
                    "error": f"Cannot reach switch TCP endpoint {host}:{port}.",
                    "detail": str(exc),
                },
                status=502,
            )

        payload = {"userName": username, "password": password}
        req = request.Request(
            f"https://{host}:{port}/rest/{api_version}/login-sessions",
            data=json.dumps(payload).encode("utf-8"),
            method="POST",
            headers={"Content-Type": "application/json"},
        )
        ctx = ssl._create_unverified_context() if insecure else ssl.create_default_context()

        try:
            with request.urlopen(req, context=ctx, timeout=20) as resp:
                set_cookie = resp.headers.get("Set-Cookie", "")
        except error.HTTPError as exc:
            detail = exc.read().decode("utf-8")
            return self._send_json({"error": f"Switch authentication failed ({exc.code}).", "detail": detail}, status=502)
        except Exception as exc:
            return self._send_json({"error": f"Switch connection failed: {exc}"}, status=502)

        parsed_cookie = SimpleCookie()
        parsed_cookie.load(set_cookie)
        if "sessionId" not in parsed_cookie:
            return self._send_json({"error": "No sessionId cookie returned by switch."}, status=502)

        cookie_header = f"sessionId={parsed_cookie['sessionId'].value}"
        token = uuid.uuid4().hex
        SESSIONS[token] = ArubaSession(
            host=host,
            port=port,
            scheme="https",
            api_version=api_version,
            cookie=cookie_header,
            insecure=insecure,
        )
        return self._send_json({"ok": True, "token": token})

    def handle_discovery(self):
        session = self._session_from_token()
        if not session:
            return

        data = {}
        endpoints = {
            "system": "system",
            "vlans": "system/vlans?depth=2",
            "interfaces": "system/interfaces?depth=2",
            "lags": "system/ports/lag?depth=2",
        }

        for key, endpoint in endpoints.items():
            try:
                data[key] = self._switch_request(session, "GET", endpoint)
            except Exception as exc:
                data[key] = {"error": str(exc)}

        return self._send_json({"ok": True, "data": data})

    def handle_apply(self):
        session = self._session_from_token()
        if not session:
            return

        body = self._json_body()
        commands = body.get("cli", [])
        dry_run = bool(body.get("dryRun", True))

        if dry_run:
            return self._send_json({"ok": True, "dryRun": True, "commands": commands})

        results = []
        for cmd in commands:
            if not cmd.strip() or cmd.startswith("#") or cmd == "!":
                continue
            try:
                response = self._switch_request(session, "POST", "cli", {"cmd": cmd})
                results.append({"command": cmd, "status": "ok", "response": response})
            except Exception as exc:
                results.append({"command": cmd, "status": "error", "error": str(exc)})

        return self._send_json({"ok": True, "results": results})


def main():
    server = ThreadingHTTPServer(("0.0.0.0", 8000), AppHandler)
    print("Serving Aruba GUI + API bridge at http://0.0.0.0:8000")
    server.serve_forever()


if __name__ == "__main__":
    main()
