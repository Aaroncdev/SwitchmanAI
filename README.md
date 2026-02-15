# Aruba 6300 GUI Management Interface

This project provides a clean, GUI-based interface for Aruba 6300 switch operations with:

- Broad feature coverage across core switch management domains.
- Input fields/options for configuration variables.
- Explanatory tooltips for every management tool.
- REST payload and CLI preview generation before execution.
- Simulated execution log for safe workflow testing.

## Run

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000>.

## Current execution mode

The **Execute** action is a simulated dry-run so the UI can be safely tested without touching production switches. Integrate your preferred Aruba API/SSH backend in `app.js` to perform live operations.
