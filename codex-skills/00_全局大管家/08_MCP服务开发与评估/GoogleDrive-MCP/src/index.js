#!/usr/bin/env node
import { authenticate } from "@google-cloud/local-auth";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListResourcesRequestSchema, ListToolsRequestSchema, ReadResourceRequestSchema, } from "@modelcontextprotocol/sdk/types.js";
import fs from "fs";
import { google } from "googleapis";
import path from "path";
import { fileURLToPath } from "url";
const drive = google.drive("v3");
const server = new Server({
    name: "example-servers/gdrive",
    version: "0.1.0",
}, {
    capabilities: {
        resources: {},
        tools: {},
    },
});
server.setRequestHandler(ListResourcesRequestSchema, async (request) => {
    const pageSize = 10;
    const params = {
        pageSize,
        fields: "nextPageToken, files(id, name, mimeType)",
    };
    if (request.params?.cursor) {
        params.pageToken = request.params.cursor;
    }
    const res = await drive.files.list(params);
    const files = res.data.files;
    return {
        resources: files.map((file) => ({
            uri: `gdrive:///${file.id}`,
            mimeType: file.mimeType,
            name: file.name,
        })),
        nextCursor: res.data.nextPageToken,
    };
});
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const fileId = request.params.uri.replace("gdrive:///", "");
    // First get file metadata to check mime type
    const file = await drive.files.get({
        fileId,
        fields: "mimeType",
    });
    // For Google Docs/Sheets/etc we need to export
    if (file.data.mimeType?.startsWith("application/vnd.google-apps")) {
        let exportMimeType;
        switch (file.data.mimeType) {
            case "application/vnd.google-apps.document":
                exportMimeType = "text/markdown";
                break;
            case "application/vnd.google-apps.spreadsheet":
                exportMimeType = "text/csv";
                break;
            case "application/vnd.google-apps.presentation":
                exportMimeType = "text/plain";
                break;
            case "application/vnd.google-apps.drawing":
                exportMimeType = "image/png";
                break;
            default:
                exportMimeType = "text/plain";
        }
        const res = await drive.files.export({ fileId, mimeType: exportMimeType }, { responseType: "text" });
        return {
            contents: [
                {
                    uri: request.params.uri,
                    mimeType: exportMimeType,
                    text: res.data,
                },
            ],
        };
    }
    // For regular files download content
    const res = await drive.files.get({ fileId, alt: "media" }, { responseType: "arraybuffer" });
    const mimeType = file.data.mimeType || "application/octet-stream";
    if (mimeType.startsWith("text/") || mimeType === "application/json") {
        return {
            contents: [
                {
                    uri: request.params.uri,
                    mimeType: mimeType,
                    text: Buffer.from(res.data).toString("utf-8"),
                },
            ],
        };
    }
    else {
        return {
            contents: [
                {
                    uri: request.params.uri,
                    mimeType: mimeType,
                    blob: Buffer.from(res.data).toString("base64"),
                },
            ],
        };
    }
});
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: "search",
                description: "Search for files in Google Drive",
                inputSchema: {
                    type: "object",
                    properties: {
                        query: {
                            type: "string",
                            description: "Search query",
                        },
                    },
                    required: ["query"],
                },
            },
            {
                name: "upload_file",
                description: "Upload a local file to Google Drive",
                inputSchema: {
                    type: "object",
                    properties: {
                        local_path: { type: "string", description: "Absolute path of the local file" },
                        file_name: { type: "string", description: "Name of the file in Google Drive" },
                    },
                    required: ["local_path", "file_name"],
                },
            },
            {
                name: "download_file",
                description: "Download a file from Google Drive to local disk",
                inputSchema: {
                    type: "object",
                    properties: {
                        file_id: { type: "string", description: "Google Drive File ID" },
                        local_path: { type: "string", description: "Absolute path to save the file locally" },
                    },
                    required: ["file_id", "local_path"],
                },
            },
            {
                name: "update_file",
                description: "Update an existing file in Google Drive (create a new revision)",
                inputSchema: {
                    type: "object",
                    properties: {
                        file_id: { type: "string", description: "Google Drive File ID" },
                        local_path: { type: "string", description: "Absolute path of the local file to upload" },
                    },
                    required: ["file_id", "local_path"],
                },
            },
        ],
    };
});
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    if (request.params.name === "search") {
        const userQuery = request.params.arguments?.query;
        const escapedQuery = userQuery.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
        const formattedQuery = `fullText contains '${escapedQuery}'`;
        const res = await drive.files.list({
            q: formattedQuery,
            pageSize: 10,
            fields: "files(id, name, mimeType, modifiedTime, size)",
        });
        const fileList = res.data.files
            ?.map((file) => `${file.name} (ID: ${file.id}, ${file.mimeType})`)
            .join("\n");
        return {
            content: [
                {
                    type: "text",
                    text: `Found ${res.data.files?.length ?? 0} files:\n${fileList}`,
                },
            ],
            isError: false,
        };
    }
    if (request.params.name === "upload_file") {
        const localPath = request.params.arguments?.local_path;
        const fileName = request.params.arguments?.file_name;
        if (!fs.existsSync(localPath)) throw new Error("Local file not found: " + localPath);
        const res = await drive.files.create({
            requestBody: { name: fileName },
            media: { body: fs.createReadStream(localPath) },
        });
        return {
            content: [{ type: "text", text: `Successfully uploaded file: ${res.data.name} (ID: ${res.data.id})` }],
            isError: false,
        };
    }
    if (request.params.name === "download_file") {
        const fileId = request.params.arguments?.file_id;
        const localPath = request.params.arguments?.local_path;
        const res = await drive.files.get({ fileId, alt: "media" }, { responseType: "stream" });
        await new Promise((resolve, reject) => {
            const dest = fs.createWriteStream(localPath);
            res.data.on("end", resolve);
            res.data.on("error", reject);
            res.data.pipe(dest);
        });
        return {
            content: [{ type: "text", text: `Successfully downloaded file to ${localPath}` }],
            isError: false,
        };
    }
    if (request.params.name === "update_file") {
        const fileId = request.params.arguments?.file_id;
        const localPath = request.params.arguments?.local_path;
        if (!fs.existsSync(localPath)) throw new Error("Local file not found: " + localPath);
        const res = await drive.files.update({
            fileId: fileId,
            media: { body: fs.createReadStream(localPath) },
        });
        return {
            content: [{ type: "text", text: `Successfully updated file (New Revision): ${res.data.name ?? fileId} (ID: ${res.data.id ?? fileId})` }],
            isError: false,
        };
    }
    throw new Error("Tool not found");
});
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const credentialsPath = process.env.GDRIVE_CREDENTIALS_PATH || path.join(__dirname, "./.gdrive-server-credentials.json");
async function authenticateAndSaveCredentials() {
    console.log("Launching auth flow…");
    const auth = await authenticate({
        keyfilePath: process.env.GDRIVE_OAUTH_PATH || path.join(__dirname, "./gcp-oauth.keys.json"),
        scopes: ["https://www.googleapis.com/auth/drive"],
    });
    fs.writeFileSync(credentialsPath, JSON.stringify(auth.credentials));
    console.log("Credentials saved. You can now run the server.");
}
async function loadCredentialsAndRunServer() {
    if (!fs.existsSync(credentialsPath)) {
        console.error("Credentials not found. Please run with 'auth' argument first.");
        process.exit(1);
    }
    const credentials = JSON.parse(fs.readFileSync(credentialsPath, "utf-8"));
    const auth = new google.auth.OAuth2();
    auth.setCredentials(credentials);
    google.options({ auth });
    console.error("Credentials loaded. Starting server.");
    const transport = new StdioServerTransport();
    await server.connect(transport);
}
if (process.argv[2] === "auth") {
    authenticateAndSaveCredentials().catch(console.error);
}
else {
    loadCredentialsAndRunServer().catch(console.error);
}
