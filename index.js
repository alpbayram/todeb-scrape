import { Client, Functions } from "node-appwrite";

const APPWRITE_ENDPOINT =
    process.env.APPWRITE_ENDPOINT ||
    process.env.APPWRITE_FUNCTION_API_ENDPOINT;

const APPWRITE_PROJECT_ID =
    process.env.APPWRITE_PROJECT_ID ||
    process.env.APPWRITE_FUNCTION_PROJECT_ID;

const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY;
const WORKER_FUNCTION_ID = process.env.WORKER_FUNCTION_ID;

function required(name, value) {
    if (!value) {
        throw new Error(`Eksik environment variable: ${name}`);
    }

    return value;
}

function serializeBody(rawBody) {
    if (typeof rawBody === "string") {
        const body = rawBody.trim();
        if (!body) throw new Error("Request body bos.");

        JSON.parse(body);
        return body;
    }

    if (!rawBody || typeof rawBody !== "object") {
        throw new Error("Request body gecerli bir JSON olmali.");
    }

    if (Object.keys(rawBody).length === 0) {
        throw new Error("Request body bos.");
    }

    return JSON.stringify(rawBody);
}

export default async ({ req, res, log, error }) => {
    try {
        const method = String(req.method || "POST").toUpperCase();

        if (method !== "POST") {
            return res.json(
                { ok: false, error: "Yalnizca POST destekleniyor." },
                405
            );
        }

        const body = serializeBody(req.body);
        const payloadSize = Buffer.byteLength(body, "utf8");
        const payload = JSON.parse(body);
        const distillId = payload?.id || "unknown";

        const dynamicApiKey =
            req.headers?.["x-appwrite-key"] ||
            req.headers?.["X-Appwrite-Key"];

        const client = new Client()
            .setEndpoint(required("APPWRITE_ENDPOINT", APPWRITE_ENDPOINT))
            .setProject(required("APPWRITE_PROJECT_ID", APPWRITE_PROJECT_ID))
            .setKey(
                required(
                    "APPWRITE_API_KEY veya x-appwrite-key",
                    APPWRITE_API_KEY || dynamicApiKey
                )
            );

        log(
            `Receiver started. payloadSize=${payloadSize}, distillId=${distillId}`
        );
        log(
            `WORKER_FUNCTION_ID length=${WORKER_FUNCTION_ID?.length ?? 0}, trimmedLength=${WORKER_FUNCTION_ID?.trim().length ?? 0}`
        );

        const functions = new Functions(client);
        const execution = await functions.createExecution({
            functionId: required(
                "WORKER_FUNCTION_ID",
                WORKER_FUNCTION_ID
            ),
            body,
            async: true,
        });

        log(`Worker queued. executionId=${execution.$id}`);

        return res.json(
            {
                ok: true,
                accepted: true,
                executionId: execution.$id,
            },
            202
        );
    } catch (err) {
        if (error) error(err);

        return res.json(
            {
                ok: false,
                accepted: false,
                error: err?.message || String(err),
            },
            500
        );
    }
};
