const functionDefinitions = [
  {
    key: "hostname",
    title: "System Identity",
    help: "Set switch hostname, location, and contact details used by management and SNMP systems.",
    fields: [
      { key: "hostname", label: "Hostname", type: "text", placeholder: "core-sw-6300" },
      { key: "location", label: "Location", type: "text", placeholder: "DataCenter-Rack12" },
      { key: "contact", label: "Contact", type: "text", placeholder: "netops@example.com" }
    ],
    build: (v) => ({
      cli: [`hostname ${v.hostname}`, `snmp-server location ${v.location}`, `snmp-server contact ${v.contact}`],
      rest: { system: { hostname: v.hostname, location: v.location, contact: v.contact } }
    })
  },
  {
    key: "vlan",
    title: "VLAN Management",
    help: "Create or modify VLANs and assign a descriptive name for segmentation.",
    fields: [
      { key: "id", label: "VLAN ID", type: "number", placeholder: "10" },
      { key: "name", label: "VLAN Name", type: "text", placeholder: "VOICE" },
      { key: "state", label: "Admin State", type: "select", options: ["up", "down"] }
    ],
    build: (v) => ({
      cli: [`vlan ${v.id}`, `name ${v.name}`, `${v.state === "up" ? "no shutdown" : "shutdown"}`],
      rest: { vlan: { id: Number(v.id), name: v.name, admin_state: v.state } }
    })
  },
  {
    key: "interface",
    title: "Interface Configuration",
    help: "Configure speed, duplex, VLAN access, and description for a physical interface.",
    fields: [
      { key: "port", label: "Port", type: "text", placeholder: "1/1/1" },
      { key: "description", label: "Description", type: "text", placeholder: "Uplink to FW" },
      { key: "mode", label: "Mode", type: "select", options: ["access", "trunk"] },
      { key: "vlan", label: "VLAN/Native VLAN", type: "number", placeholder: "10" }
    ],
    build: (v) => ({
      cli: [`interface ${v.port}`, `description ${v.description}`, `vlan ${v.mode} ${v.vlan}`],
      rest: { interface: { id: v.port, description: v.description, mode: v.mode, vlan: Number(v.vlan) } }
    })
  },
  {
    key: "lag",
    title: "LAG / LACP",
    help: "Create link aggregation groups and choose LACP active or passive negotiation.",
    fields: [
      { key: "lagId", label: "LAG ID", type: "number", placeholder: "1" },
      { key: "members", label: "Member Ports (comma-separated)", type: "text", placeholder: "1/1/49,1/1/50" },
      { key: "lacp", label: "LACP Mode", type: "select", options: ["active", "passive"] }
    ],
    build: (v) => ({
      cli: [`interface lag ${v.lagId}`, `lacp mode ${v.lacp}`, `members ${v.members}`],
      rest: { lag: { id: Number(v.lagId), members: v.members.split(",").map((m) => m.trim()), lacp: v.lacp } }
    })
  },
  {
    key: "stp",
    title: "Spanning Tree (RSTP/MSTP)",
    help: "Manage spanning-tree priority and edge port behavior to prevent loops.",
    fields: [
      { key: "mode", label: "STP Mode", type: "select", options: ["rstp", "mstp"] },
      { key: "priority", label: "Bridge Priority", type: "number", placeholder: "4096" },
      { key: "edgePort", label: "Edge Port Default", type: "select", options: ["enabled", "disabled"] }
    ],
    build: (v) => ({
      cli: [`spanning-tree mode ${v.mode}`, `spanning-tree priority ${v.priority}`, `spanning-tree port-type-admin-edge ${v.edgePort}`],
      rest: { stp: { mode: v.mode, priority: Number(v.priority), edge_default: v.edgePort === "enabled" } }
    })
  },
  {
    key: "acl",
    title: "ACL Policy",
    help: "Create ACL entries that allow or deny traffic by source, destination, protocol, and action.",
    fields: [
      { key: "name", label: "ACL Name", type: "text", placeholder: "BLOCK_GUEST" },
      { key: "src", label: "Source CIDR", type: "text", placeholder: "10.10.10.0/24" },
      { key: "dst", label: "Destination CIDR", type: "text", placeholder: "172.16.0.0/16" },
      { key: "action", label: "Action", type: "select", options: ["permit", "deny"] }
    ],
    build: (v) => ({
      cli: [`access-list ip ${v.name}`, `${v.action} ip ${v.src} ${v.dst}`],
      rest: { acl: { name: v.name, rules: [{ action: v.action, src: v.src, dst: v.dst, protocol: "ip" }] } }
    })
  },
  {
    key: "qos",
    title: "QoS Profile",
    help: "Set DSCP trust and queue profile behavior for latency-sensitive traffic.",
    fields: [
      { key: "port", label: "Port", type: "text", placeholder: "1/1/10" },
      { key: "trust", label: "Trust DSCP", type: "select", options: ["enabled", "disabled"] },
      { key: "queue", label: "Queue Profile", type: "text", placeholder: "strict-priority" }
    ],
    build: (v) => ({
      cli: [`interface ${v.port}`, `qos trust dscp ${v.trust === "enabled" ? "" : "disable"}`.trim(), `qos queue-profile ${v.queue}`],
      rest: { qos: { interface: v.port, trust_dscp: v.trust === "enabled", queue_profile: v.queue } }
    })
  },
  {
    key: "snmp",
    title: "SNMP & Telemetry",
    help: "Configure SNMP community, version, and trap destination for monitoring tools.",
    fields: [
      { key: "version", label: "Version", type: "select", options: ["v2c", "v3"] },
      { key: "community", label: "Community/User", type: "text", placeholder: "public" },
      { key: "trapHost", label: "Trap Host", type: "text", placeholder: "192.168.1.100" }
    ],
    build: (v) => ({
      cli: [`snmp-server ${v.version} ${v.community}`, `snmp-server host ${v.trapHost}`],
      rest: { snmp: { version: v.version, credential: v.community, trap_host: v.trapHost } }
    })
  },
  {
    key: "services",
    title: "NTP / DNS / Syslog",
    help: "Manage core infrastructure services used for time sync, name resolution, and centralized logging.",
    fields: [
      { key: "ntp", label: "NTP Server", type: "text", placeholder: "pool.ntp.org" },
      { key: "dns", label: "DNS Server", type: "text", placeholder: "1.1.1.1" },
      { key: "syslog", label: "Syslog Host", type: "text", placeholder: "192.168.1.200" }
    ],
    build: (v) => ({
      cli: [`ntp server ${v.ntp}`, `ip dns server-address ${v.dns}`, `logging ${v.syslog}`],
      rest: { services: { ntp: v.ntp, dns: v.dns, syslog: v.syslog } }
    })
  },
  {
    key: "routing",
    title: "Routing (Static + OSPF)",
    help: "Define default/static routes and optional OSPF process + area for dynamic routing.",
    fields: [
      { key: "route", label: "Static Route", type: "text", placeholder: "0.0.0.0/0" },
      { key: "nextHop", label: "Next Hop", type: "text", placeholder: "10.0.0.1" },
      { key: "ospfArea", label: "OSPF Area", type: "text", placeholder: "0.0.0.0" }
    ],
    build: (v) => ({
      cli: [`ip route ${v.route} ${v.nextHop}`, `router ospf 1`, `area ${v.ospfArea}`],
      rest: { routing: { static_route: v.route, next_hop: v.nextHop, ospf_area: v.ospfArea } }
    })
  },
  {
    key: "security",
    title: "Security & Access",
    help: "Enable secure services and manage AAA/user account policy for administrative access.",
    fields: [
      { key: "ssh", label: "SSH", type: "select", options: ["enabled", "disabled"] },
      { key: "https", label: "HTTPS API", type: "select", options: ["enabled", "disabled"] },
      { key: "aaa", label: "AAA Method", type: "select", options: ["local", "radius", "tacacs+"] }
    ],
    build: (v) => ({
      cli: [`ssh server vrf default ${v.ssh === "enabled" ? "" : "disable"}`.trim(), `https-server ${v.https === "enabled" ? "" : "disable"}`.trim(), `aaa authentication login default ${v.aaa}`],
      rest: { security: { ssh: v.ssh === "enabled", https_api: v.https === "enabled", aaa: v.aaa } }
    })
  }
];

const values = {};
const functionContainer = document.getElementById("functionContainer");
const template = document.getElementById("toolTemplate");
const commandPreview = document.getElementById("commandPreview");
const activityLog = document.getElementById("activityLog");

functionDefinitions.forEach((def) => {
  values[def.key] = {};
  const node = template.content.cloneNode(true);
  node.querySelector(".tool-title").textContent = def.title;
  node.querySelector(".tooltiptext").textContent = def.help;
  const fieldWrapper = node.querySelector(".tool-fields");

  def.fields.forEach((field) => {
    const label = document.createElement("label");
    label.textContent = field.label;
    let input;

    if (field.type === "select") {
      input = document.createElement("select");
      field.options.forEach((option) => {
        const op = document.createElement("option");
        op.value = option;
        op.textContent = option;
        input.appendChild(op);
      });
    } else {
      input = document.createElement("input");
      input.type = field.type;
      input.placeholder = field.placeholder || "";
    }

    input.addEventListener("input", () => {
      values[def.key][field.key] = input.value;
    });

    if (field.type === "select") {
      values[def.key][field.key] = field.options[0];
    }

    label.appendChild(input);
    fieldWrapper.appendChild(label);
  });

  functionContainer.appendChild(node);
});

function timestamp() {
  return new Date().toLocaleTimeString();
}

function addLog(msg) {
  const item = document.createElement("li");
  item.textContent = `[${timestamp()}] ${msg}`;
  activityLog.prepend(item);
}

document.getElementById("connectBtn").addEventListener("click", () => {
  const host = document.getElementById("host").value.trim();
  const user = document.getElementById("username").value.trim();
  const status = document.getElementById("connectionStatus");

  if (!host || !user) {
    status.textContent = "Connection failed: Host/IP and Username are required.";
    status.classList.remove("connected");
    addLog("Connection check failed. Missing host or username.");
    return;
  }

  status.textContent = `Connected to ${host} as ${user} (simulated).`;
  status.classList.add("connected");
  addLog(`Connection established to ${host} via ${document.getElementById("protocol").value.toUpperCase()}.`);
});

document.getElementById("generateBtn").addEventListener("click", () => {
  const payload = {};
  const cli = [];

  functionDefinitions.forEach((def) => {
    const built = def.build(values[def.key]);
    payload[def.key] = built.rest;
    cli.push(`# ${def.title}`, ...built.cli, "!");
  });

  commandPreview.value = [
    "=== REST Payload Preview ===",
    JSON.stringify(payload, null, 2),
    "",
    "=== CLI Configuration Preview ===",
    cli.join("\n")
  ].join("\n");

  addLog("Generated configuration preview for all modules.");
});

document.getElementById("executeBtn").addEventListener("click", () => {
  if (!commandPreview.value) {
    addLog("Execution blocked: generate preview first.");
    return;
  }

  addLog("Executed configuration transaction (simulated dry-run). No live switch changes sent.");
});

document.getElementById("clearLogBtn").addEventListener("click", () => {
  activityLog.innerHTML = "";
});
