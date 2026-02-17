# Aruba 6300 GUI Management Interface

This project is now wired to a local Python API bridge so the GUI can talk to a real Aruba 6300 switch.

## What it can do now

- Connect to a live switch using Aruba REST login session (`/rest/<version>/login-sessions`).
- Pull live inventory details (system, VLANs, interfaces, and LAG data).
- Generate CLI config from the GUI fields.
- Execute generated CLI commands through the Aruba REST `cli` endpoint.

## 1) Prerequisites on your Aruba 6300

Enable API/HTTPS and ensure your management host can reach the switch.

Typical checks in CLI:

```text
show running-config | include https-server
show running-config | include rest
show ip interface brief vrf mgmt
```

## 2) Run this app

```bash
python3 server.py
```

Open: <http://localhost:8000>

## 3) Connect to your test switch

In the **Switch Connection** panel fill:

- Host/IP (example `10.0.0.50`)
- Username / Password
- API Version (default `v10.13`, adjust to your firmware)
- Optional: leave **Ignore TLS cert errors** checked for self-signed lab certs

Click **Connect**.

## 4) Pull current switch state

Click **Pull Live Details**. The execution console will display discovered JSON from your live switch.

## 5) Push changes

1. Fill in GUI fields for the configuration you want.
2. Click **Generate Preview**.
3. Click **Execute** to push CLI commands via REST.

## Safety notes

- Use a **test switch** first.
- Start with low-risk commands (description/VLAN naming) before access/security changes.
- Some Aruba firmware versions differ in REST endpoint behavior; if your switch uses a different API version/path, change the **API Version** field.


## Troubleshooting connection errors

If log shows **Connection failed: Failed to fetch**:

- Make sure you started this app with `python3 server.py` (not `python3 -m http.server` and not opening `index.html` directly).
- Open exactly `http://localhost:8000`.
- Verify Protocol is **HTTPS (REST)** for now. SSH mode is not implemented in this build yet.
- Verify switch REST port (usually `443`) and API version path (example `v10.13`).
- If your cert is self-signed in lab, keep **Ignore TLS cert errors** enabled.

The backend now returns detailed errors for unreachable TCP port, unsupported protocol selection, and authentication failures.

