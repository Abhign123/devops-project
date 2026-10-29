// Scrum Workflow Automation using SOAP Web Services
// Runs with Node.js only; no npm packages are required.
const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const PORT = process.env.PORT || 3000;

let tasks = [
  { id: 1, title: "Design Scrum dashboard", assignee: "Developer", priority: "High", status: "To Do" },
  { id: 2, title: "Create SOAP task service", assignee: "Developer", priority: "High", status: "In Progress" },
  { id: 3, title: "Test workflow updates", assignee: "Team Member", priority: "Medium", status: "Done" }
];
let nextId = 4;

const wsdl = fs.readFileSync(path.join(ROOT, "wsdl", "scrum.wsdl"), "utf8");
const mime = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".wsdl": "text/xml; charset=utf-8"
};

function xmlEscape(value) {
  return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}
function getTag(xml, tag) {
  const safe = tag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = xml.match(new RegExp("<(?:[\\w.-]+:)?" + safe + "(?:\\s[^>]*)?>([\\s\\S]*?)</(?:[\\w.-]+:)?" + safe + "\\s*>", "i"));
  return match ? match[1].replace(/<[^>]+>/g, "").trim() : "";
}
function envelope(body) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
 <soap:Body>${body}</soap:Body>
</soap:Envelope>`;
}
function taskXml(task) {
  return `<task><id>${task.id}</id><title>${xmlEscape(task.title)}</title><assignee>${xmlEscape(task.assignee)}</assignee><priority>${xmlEscape(task.priority)}</priority><status>${xmlEscape(task.status)}</status></task>`;
}
function send(res, status, contentType, body) {
  res.writeHead(status, { "Content-Type": contentType, "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type, SOAPAction", "Access-Control-Allow-Methods": "GET, POST, OPTIONS" });
  res.end(body);
}
function soapFault(message) {
  return envelope(`<soap:Fault><faultcode>soap:Client</faultcode><faultstring>${xmlEscape(message)}</faultstring></soap:Fault>`);
}
function handleSoap(xml) {
  const body = xml.match(/<(?:\w+:)?Body[^>]*>([\s\S]*?)<\/(?:\w+:)?Body>/i);
  if (!body) return soapFault("SOAP Body was not found.");
  const methodMatch = body[1].match(/<(?:\w+:)?(GetTasks|CreateTask|UpdateTaskStatus|DeleteTask)\b/i);
  if (!methodMatch) return soapFault("Unsupported SOAP operation.");
  const method = methodMatch[1];
  if (method === "GetTasks") {
    return envelope(`<GetTasksResponse xmlns="http://example.com/scrum"><tasks>${tasks.map(taskXml).join("")}</tasks></GetTasksResponse>`);
  }
  if (method === "CreateTask") {
    const title = getTag(body[1], "title");
    const assignee = getTag(body[1], "assignee") || "Unassigned";
    const priority = getTag(body[1], "priority") || "Medium";
    if (!title) return soapFault("Task title is required.");
    const task = { id: nextId++, title, assignee, priority, status: "To Do" };
    tasks.push(task);
    return envelope(`<CreateTaskResponse xmlns="http://example.com/scrum">${taskXml(task)}</CreateTaskResponse>`);
  }
  if (method === "UpdateTaskStatus") {
    const id = Number(getTag(body[1], "id"));
    const status = getTag(body[1], "status");
    const allowed = ["To Do", "In Progress", "In Review", "Done"];
    const task = tasks.find(item => item.id === id);
    if (!task) return soapFault("Task ID was not found.");
    if (!allowed.includes(status)) return soapFault("Invalid task status.");
    task.status = status;
    return envelope(`<UpdateTaskStatusResponse xmlns="http://example.com/scrum">${taskXml(task)}</UpdateTaskStatusResponse>`);
  }
  if (method === "DeleteTask") {
    const id = Number(getTag(body[1], "id"));
    const before = tasks.length;
    tasks = tasks.filter(task => task.id !== id);
    if (tasks.length === before) return soapFault("Task ID was not found.");
    return envelope(`<DeleteTaskResponse xmlns="http://example.com/scrum"><success>true</success><id>${id}</id></DeleteTaskResponse>`);
  }
}

const server = http.createServer((req, res) => {
  if (req.method === "OPTIONS") return send(res, 204, "text/plain", "");
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);

  if (url.pathname === "/soap" && req.method === "GET" && url.searchParams.has("wsdl")) {
    return send(res, 200, "text/xml; charset=utf-8", wsdl);
  }
  if (url.pathname === "/soap" && req.method === "POST") {
    let body = "";
    req.setEncoding("utf8");
    req.on("data", chunk => { body += chunk; if (body.length > 1_000_000) req.destroy(); });
    req.on("end", () => {
      try { send(res, 200, "text/xml; charset=utf-8", handleSoap(body)); }
      catch (err) { send(res, 500, "text/xml; charset=utf-8", soapFault("Server error: " + err.message)); }
    });
    return;
  }
  if (req.method !== "GET" && req.method !== "HEAD") return send(res, 405, "text/plain", "Method not allowed");
  let pathname = decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname);
  const filePath = path.resolve(ROOT, "public", "." + pathname);
  if (!filePath.startsWith(path.resolve(ROOT, "public") + path.sep)) return send(res, 403, "text/plain", "Forbidden");
  fs.readFile(filePath, (err, data) => {
    if (err) return send(res, 404, "text/plain; charset=utf-8", "File not found");
    send(res, 200, mime[path.extname(filePath)] || "application/octet-stream", req.method === "HEAD" ? "" : data);
  });
});

server.listen(PORT, () => {
  console.log(`Scrum Workflow Automation is running at http://localhost:${PORT}`);
  console.log(`SOAP WSDL: http://localhost:${PORT}/soap?wsdl`);
});
