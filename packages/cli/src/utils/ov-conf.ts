// @ts-nocheck
const GITIGNORE_ENTRY = ".maw/openviking/";
const GRAPH_ROOT = ".maw/graphs";
const PACKAGE_JSON = "package.json";
const PROJECT_DIRS = [GRAPH_ROOT] as const;
const OV_HOST = "127.0.0.1";
const OV_PORT = 1933;
const OV_URL = `http://localhost:${OV_PORT}`;
const OPENAI_BASE = "https://api.openai.com/v1";
const OPENAI_KEY = "${OPENAI_API_KEY}";
const EMBED_MODEL = "text-embedding-3-large";
const EMBED_DIM = 3072;
const EMBED_MAX = 10;
const VLM_MODEL = "gpt-4o";
const VLM_MAX = 100;

const OV_CFG = {
    storage: {
        workspace: "./.maw/openviking",
    },
    server: {
        host: OV_HOST,
        port: OV_PORT,
    },
    embedding: {
        dense: {
            provider: "openai",
            api_base: OPENAI_BASE,
            api_key: OPENAI_KEY,
            model: EMBED_MODEL,
            dimension: EMBED_DIM,
        },
        max_concurrent: EMBED_MAX,
    },
    vlm: {
        provider: "openai",
        api_base: OPENAI_BASE,
        api_key: OPENAI_KEY,
        model: VLM_MODEL,
        max_concurrent: VLM_MAX,
    },
} as const;

const OVCLI_CFG = {
    url: OV_URL,
} as const;
