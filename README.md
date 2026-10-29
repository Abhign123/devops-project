# Scrum Workflow Automation Using SOAP Web Services

## Folder and file order
```text
Scrum_Workflow_Automation_SOAP/
├── server.js
├── wsdl/
│   └── scrum.wsdl
├── public/
│   ├── index.html
│   ├── css/
│   │   └── style.css
│   └── js/
│       └── app.js
└── README.md
```

## Requirements
- Node.js (LTS version recommended)
- Chrome, Edge, or Firefox
- Visual Studio Code (optional)

## Run on Windows
1. Extract the ZIP.
2. Open the `Scrum_Workflow_Automation_SOAP` folder in VS Code.
3. Open Terminal → New Terminal.
4. Run `node -v` to confirm Node.js is installed.
5. Run `node server.js`.
6. Open `http://localhost:3000` in your browser.
7. The WSDL file is available at `http://localhost:3000/soap?wsdl`.

No `npm install` is needed; this sample uses Node.js built-in modules only.

## What it does
- Shows a Scrum Kanban board with To Do, In Progress, In Review, and Done columns.
- Creates tasks through a SOAP XML request.
- Updates task status through a SOAP XML request.
- Deletes tasks through a SOAP XML request.
- Lists tasks through a SOAP XML request.
- Displays the most recent SOAP XML response in the SOAP Web Service tab.

## SOAP operations
- `GetTasks`
- `CreateTask`
- `UpdateTaskStatus`
- `DeleteTask`

## How it works
The browser sends a SOAP 1.1 XML envelope to `POST /soap`. The Node.js HTTP server processes the operation and returns a SOAP XML envelope. The WSDL describes the service endpoint and operations.

## Limitations
This is an educational demonstration, not a production Scrum service. Task records are kept in server memory and reset when the server restarts. It does not connect to Jira or a database, and it has no authentication. Use the local server rather than opening the HTML file directly; the SOAP endpoint needs `node server.js` running.
