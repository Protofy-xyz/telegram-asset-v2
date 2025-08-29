import { getLogger } from "protobase";
import { getServiceToken } from '@extensions/apis/coreContext';
import { getKey } from "@extensions/keys/coreContext";
import OpenAI from 'openai';
import axios from "axios";
import * as fs from "fs";
import { getRoot } from "protonode";

const logger = getLogger()

export const getChatGPTApiKey = async(options?: {
    done?: (result) => {},
    error?: (err) => {}
}) => {
    const { done = (apiKey) => apiKey, error = () => {} } = options ?? {};
    let apiKey = ""
    try {
        apiKey = await getKey({ key: "OPENAI_API_KEY", token: getServiceToken() });
        return done(apiKey);
    } catch (err) {
        const errorMessage = "Error fetching key: " + err;
        console.error(errorMessage);
        error(errorMessage);
    }
}

async function uploadFileToOpenAI(filePath: string): Promise<string> {
    let apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        try {
            apiKey = await getKey({ key: "OPENAI_API_KEY", token: getServiceToken() });
        } catch (err) {
            console.error("Error fetching key:", err);
        }
    }
    if (!apiKey) {
        throw new Error("No API Key provided");
    }

    const client = new OpenAI({ apiKey });
    const file = await client.files.create({
        file: fs.createReadStream(filePath),
        purpose: "assistants"
    });
    return file.id;
}

export const chatGPTSession = async ({
  apiKey = undefined,
  done = (response, message) => {},
  chunk = (chunk: any) => {},
  error = (err) => {},
  model = "gpt-4o",
  max_tokens = 4096,
  ...props
}: ChatGPTRequest) => {
  try {
    if (!apiKey) apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      try { apiKey = await getKey({ key: "OPENAI_API_KEY", token: getServiceToken() }); }
      catch (err) { console.error("Error fetching key:", err); }
    }
    if (!apiKey) {
      const errObj = { message: "No API Key provided", code: "invalid_api_key" };
      error(errObj.message);
      return { isError: true, data: { error: errObj } };
    }

    const client = new OpenAI({ apiKey });

    // --- Detecta si Responses API está disponible ---
    const hasResponsesAPI = !!(client as any).responses?.create;

    // Si NO hay Responses, avisar y caer a chat.completions (sin files):
    if (!hasResponsesAPI) {
      // Aviso claro:
      const msg = "OpenAI SDK too old for Responses API. Falling back to chat.completions (files will be ignored).";
      console.warn(msg);
      // Llamada legacy:
      //@ts-ignore
      const stream = await client.chat.completions.create({
        ...(props as any),
        model,
        max_tokens,
        stream: true,
      });

      let fullResponse: string[] | undefined;
      for await (const currentChunk of stream) {
        if (!fullResponse) {
          fullResponse = Array.from({ length: currentChunk.choices.length }).map(() => "");
        }
        currentChunk.choices.forEach((choice, index) => {
          if (choice.delta?.content) fullResponse![index] += choice.delta.content;
        });
        await chunk(currentChunk);
      }
      const out = fullResponse ?? [""];
      done({ choices: out }, out[0]);
      return out;
    }

    // --- Camino Responses API (con files) ---
    type Part =
      | string
      | { type: "text"; text: string }
      | { type: "image_url"; image_url: string | { url: string } }
      | { type: "file"; file: { file_id: string } };

    const messages = (props as any).messages as Array<{
      role: "system" | "user" | "assistant" | "function";
      content: Part[] | string;
      name?: string;
    }>;

    const attachments: Array<{ file_id: string; tools: Array<{ type: "file_search" }> }> = [];
    const input: Array<{
      role: "user" | "assistant" | "system" | "function";
      content: Array<
        | { type: "input_text"; text: string }
        | { type: "input_image"; image_url: { url: string; detail?: "auto" | "low" | "high" } }
      >;
    }> = [];

    const toText = (s: any) => (typeof s === "string" ? s : String(s ?? ""));

    for (const msg of messages || []) {
      const parts: Part[] = Array.isArray(msg.content) ? (msg.content as Part[]) : [toText(msg.content)];
      const converted: any[] = [];
      for (const p of parts) {
        if (typeof p === "string") { if (p.trim()) converted.push({ type: "input_text", text: p }); continue; }
        if ((p as any).type === "text") {
          const t = (p as any).text ?? "";
          if (t.trim()) converted.push({ type: "input_text", text: t });
          continue;
        }
        if ((p as any).type === "image_url") {
          const raw = (p as any).image_url;
          const url = typeof raw === "string" ? raw : raw?.url;
          if (url && url.trim()) converted.push({ type: "input_image", image_url: { url } });
          continue;
        }
        if ((p as any).type === "file" && (p as any).file?.file_id) {
          attachments.push({ file_id: (p as any).file.file_id, tools: [{ type: "file_search" }] });
          continue; // files van en attachments, no en content
        }
      }
      input.push({ role: msg.role, content: converted.length ? converted : [{ type: "input_text", text: "" }] });
    }

    const request: any = {
      model,
      input,
      max_output_tokens: typeof max_tokens === "number" ? max_tokens : undefined,
      temperature: (props as any).temperature,
      top_p: (props as any).top_p,
    };

    if (attachments.length > 0) {
      request.tools = [{ type: "file_search" }];
      request.attachments = attachments;
    }
    if ((props as any).response_format) {
      request.response_format = (props as any).response_format;
    }

    const res = await (client as any).responses.create(request);

    const text =
      (res as any).output_text ??
      (() => {
        try {
          const chunks = ((res as any).output ?? [])
            .flatMap((o: any) => o.content ?? [])
            .filter((c: any) => c.type === "output_text")
            .map((c: any) => c?.text ?? "");
          return chunks.join("");
        } catch { return ""; }
      })();

    const out = [text];
    done({ choices: out }, out[0]);
    return out;

  } catch (e: any) {
    logger.error({ error: e?.message || e, stack: e?.stack }, "Error in chatGPTSession");
    if (error) error(e);
    return null;
  }
};

export const chatGPTPrompt = async ({
    message,
    images = [],
    files = [],
    conversation = [],
    ...props
}: any & { message: string }) => {

    console.log('************************************************************************ Sending prompt to ChatGPT:', {
        message,
        images,
        files,
        conversation
    });
    const content: any[] = [
        ...conversation,
        { type: "text", text: message }
    ];

    for (const file of files) {
        const file_id = await uploadFileToOpenAI(file);
        content.push({
            type: "file",
            file: { file_id }  // <- ¡CORRECTO!
        });
    }

    if (images.length > 0) {
        console.log('Chatgpt: there are images in the request')
        const imageContent = await Promise.all(
            images.map(async (url) => {
                try {
                    const response = await axios.get(url, {
                        responseType: "text", // Ya es base64 como texto plano
                    });

                    const base64 = response.data?.trim?.();
                    if (!base64) return null;

                    return {
                        type: "image_url",
                        image_url: {
                            url: base64
                        }
                    };
                } catch (err) {
                    console.warn(`Error fetching image from ${url}:`, err);
                    return null;
                }
            })
        );

        const validImages = imageContent.filter(Boolean);
        content.push(...validImages);
    }

    console.log('###################################### Final chatgpt content: ', content)

    const response = await chatGPTSession({
        messages: [
            {
                role: "user",
                content
            }
        ],
        ...props,
        done: (response) => {
            let msg = "";
            if (response.choices && response.choices.length) {
                msg = response.choices[0];
            }
            if (props.done) props.done(response, msg);
        },
        error: (err) => {
            if (props.error) {
                props.error(err.message);
            }
        }
    });

    return response;
};

type ChatGPTRequest = {
    apiKey?: string;
    done?: any;
    chunk?: (chunk: any) => any;
    error?: (error: any) => any;
} & GPT4VCompletionRequest

type GPT4VCompletionRequest = {
    model: "gpt-4-vision-preview" | "gpt-4-1106-preview" | "gpt-4-turbo" | "gpt-4-32k" | "gpt-4-0613" | "gpt-4-32k-0613" | "gpt-4-0314" | "gpt-4-32k-0314" | "gpt-4" | "gpt-4o"; // https://platform.openai.com/docs/models/overview
    messages: Message[];
    functions?: any[] | undefined;
    function_call?: any | undefined;
    stream?: boolean | undefined;
    temperature?: number | undefined;
    top_p?: number | undefined;
    max_tokens?: number | undefined;
    n?: number | undefined;
    best_of?: number | undefined;
    frequency_penalty?: number | undefined;
    presence_penalty?: number | undefined;
    logit_bias?:
    | {
        [x: string]: number;
    }
    | undefined;
    stop?: (string[] | string) | undefined;
};

type Message = {
    role: "system" | "user" | "assistant" | "function";
    content: MessageContent;
    name?: string | undefined;
}

type MessageContent =
    | string // String prompt
    | (string | { type: "image_url"; image_url: string })[]; // Image asset 



export const singlePrompt = async(options: {
    message: string,
    images?: any[],
    files?: any[],
    conversation?: any[],
    done?: (result) => {},
    error?: (err) => {}
}) => {
    const { 
        message, 
        images = [], 
        files = [], 
        conversation = [], 
        done = () => {}, 
        error = () => {} 
    } = options;

    const response = await chatGPTPrompt({
        images: images || [],
        files: (files || []).map(file => getRoot() + file),
        message: message, done: (response, msg) => {
            done(response);
        }, error: (err) => {
            error(err);
        },
        conversation
    })
    return response && Array.isArray(response) ? response[0] : response;
}

export default {
    chatGPTSession,
    chatGPTPrompt,
    singlePrompt,
    getChatGPTApiKey
}