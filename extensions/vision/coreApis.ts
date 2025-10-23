import { getServiceToken } from "protonode";
import APIContext from "app/bundles/coreContext";
import { Application } from "express";
import axios from "axios";
import { addAction } from "@extensions/actions/coreContext/addAction";
import { addCard } from "@extensions/cards/coreContext/addCard";
import { getChatGPTApiKey } from '@extensions/chatgpt/coreContext';
import fs from "fs";
import path from "path";

async function getImageBase64(url) {
    const response = await axios.get(url, { responseType: 'arraybuffer' });

    const textData = Buffer.from(response.data).toString("utf8");

    // in case the url is already a base64 image
    if (textData.startsWith("data:image")) {
        return textData.split(",")[1];
    }

    return Buffer.from(response.data, 'binary').toString('base64');
}

async function sendPromptWithImage(prompt, imageUrl) {
    const token = await getChatGPTApiKey();
    if (!token) throw new Error("OpenAI API key not found");
    const imageBase64 = await getImageBase64(imageUrl);

    const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
            temperature: 1,
            model: 'gpt-4o', // o 'gpt-4-vision-preview'
            messages: [
                {
                    role: "user",
                    content: [
                        {
                            type: "image_url",
                            image_url: {
                                url: `data:image/jpeg;base64,${imageBase64}`,
                            },
                        },
                        { type: "text", text: prompt }
                    ],
                },
            ],
            max_tokens: 1024,
        },
        {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        }
    );

    return {response: response.data.choices[0].message.content, stats: {usage: response.data.usage}};
}

async function sendPromptWithImageLmStudio(prompt, imageUrl) {
    const imageBase64 = await getImageBase64(imageUrl);

    // Enviar el prompt y la imagen en base64 a LM Studio
    const lmStudioResponse = await axios.post('http://localhost:1234/api/v0/chat/completions', {
        messages: [
            {
                role: "user",
                content: [
                    {
                        type: "image_url",
                        image_url: {
                            url: `data:image/jpeg;base64,${imageBase64}`,
                        },
                    },
                    { type: "text", text: prompt }
                ],
            },
        ],
    });

    // Mostrar respuesta
    return {response: lmStudioResponse.data.choices[0].message.content, stats: {stats: lmStudioResponse.data.stats, usage: lmStudioResponse.data.usage}};
}

const locks = {
    "detect": false,
    "categorize": false,
    "count": false
}

let frames = {}

export default async (app: Application, context: typeof APIContext) => {

    addCard({
        group: 'vision',
        tag: 'inputs',
        id: 'camera',
        templateName: 'IP Camera',
        name: 'vision_camera',
        defaults: {
            width: 3,
            height: 16,
            type: "action",
            icon: 'camera',
            name: 'camera',
            description: fs.readFileSync(path.resolve(__dirname, 'IPCamera.md'), 'utf-8'),
            displayResponse: true,
            displayButton: true,
            buttonLabel: "Open camera",
            html: "//@card/react\n\n\n\nfunction Widget(card) {\n  const value = card.value;\n  const [loading, setLoading] = React.useState(true);\n  const [error, setError] = React.useState(false);\n  const [streamPath, setStreamPath] = React.useState(value?.streamPath?? \"\")\n\n  React.useEffect(() => {\n    console.log(\"card widget: ReactUseEffect\")\n    setStreamPath(value?.streamPath ?? \"\");\n    setLoading(true);\n    setError(false);\n  }, [value?.streamPath]);\n\n  console.log(\"card widget: \", card);\n\n  const content = (\n    <YStack f={1} mt={\"20px\"} ai=\"center\" jc=\"center\" width=\"100%\">\n      {loading && !error && <p>Searching for camera...</p>}\n      {error && <p style={{ color: \"red\" }}>Error getting camera stream</p>}\n      <img\n        style={{\n          width: \"100%\",\n          display: loading || error ? \"none\" : \"block\",\n        }}\n        src={streamPath}\n        onLoad={() => setLoading(false)}\n        onError={() => {\n          setLoading(false);\n          setError(true);\n        }}\n        alt=\"Camera stream\"\n      />\n    </YStack>\n  );\n\n  return (\n    <Tinted>\n      <ProtoThemeProvider forcedTheme={window.TamaguiTheme}>\n        <ActionCard data={card}>\n          {card.displayButton !== false ? (\n            <ParamsForm data={card}>{content}</ParamsForm>\n          ) : (\n            card.displayResponse !== false && content\n          )}\n        </ActionCard>\n      </ProtoThemeProvider>\n    </Tinted>\n  );\n}",
            rulesCode: "return {\n  imageUrl: `${params.cameraProtocol}${params.cameraAddr}:${params.cameraPort}${params.stillPath}`,\n  streamPath: `${params.cameraProtocol}${params.cameraAddr}:${\n    params.cameraPort\n  }${params.streamPath}?k=${\n    Math.floor(Math.random() * (9999 - 1000 + 1)) + 1000\n  }`,\n};\n",
            params: {
                cameraAddr: "Ip camera address",
                cameraPort: "Ip camera port",
                streamPath: '/video',
                stillPath: '/photo.jpg',
                cameraProtocol: 'http://'
            },
            configParams: {
                "cameraAddr": {
                    "visible": true,
                    "description": "IP Camera address",
                    "defaultValue": "192.168.10.131",
                    "type": "string"
                },
                "cameraPort": {
                    "visible": true,
                    "description": "IP Camera port",
                    "defaultValue": "8080",
                    "type": "string"
                },
                "streamPath": {
                    "visible": false,
                    "description": "Path to the video stream",
                    "defaultValue": "/video",
                    "type": "string"
                },
                "stillPath": {
                    "visible": false,
                    "description": "Path to get a still image",
                    "defaultValue": "/photo.jpg",
                    "type": "string"
                },
                "cameraProtocol": {
                    "visible": false,
                    "description": "Camera protocol",
                    "defaultValue": "http://",
                    "type": "string"
                }
            }

        },
        // emitEvent: true,
    })

    app.get('/api/core/v1/vision/detect', async (req, res) => {
        if (locks["detect"]) return res.send({ error: "Another detection is in progress" });
        locks["detect"] = true;
        console.log('init')
        try {
            const params = req.query;
            const preprompt = `
            Answer only with a number between 0.0 and 1.0. 0.0 being zero confidence and 1.0 being maximum confidence.
            Check the image provided and answer with the confidence of whether the image contains a:
            
                    `
            const url = params.url;
            let response;
            if(params.llmProvider === 'lmstudio') {
                response = await sendPromptWithImageLmStudio(preprompt + params.prompt, url);
            } else {
                response = await sendPromptWithImage(preprompt + params.prompt, url);
            }
            console.log('CONFIDENCE:', response);
            res.json(response);
        } catch (e) {
            console.error(e);
            res.send({ error: e.message });
        } finally {
            locks["detect"] = false;
        }
    })

    app.post('/api/core/v1/vision/frame/set', async (req, res) => {
        const { image } = req.body;
        const { id } = req.body;
        if(!id) {
            return res.status(400).send({ error: "ID is required" });
        }
        // if has more than 20 frames, delete the oldest one
        if(Object.keys(frames).length >= 20) {
            const oldestKey = Object.keys(frames)[0];
            delete frames[oldestKey];
        }
        frames[id as string] = image;
        res.send('/api/core/v1/vision/frame/get?id=' + id);
    })

    addAction({
        group: 'vision',
        name: 'set',
        url: "/api/core/v1/vision/frame/set",
        tag: 'frame',
        description: "set a frame to be used later",
        params: {
            id: "frame id",
            image: "base64 image"
        },
        method: 'post',
        emitEvent: true
    })

    app.get('/api/core/v1/vision/frame/get', async (req, res) => {
        const { id } = req.query;
        if(frames[id as string]) {
            return res.send(frames[id as string]);
        }
        return res.status(404).send({ error: "Frame not found" });
    })

    addAction({
        group: 'vision',
        name: 'get',
        url: "/api/core/v1/vision/frame/get",
        tag: 'frame',
        description: "get a previously set frame",
        params: {
            id: "frame id"
        },
        emitEvent: true
    })

    addAction({
        group: 'vision',
        name: 'detect',
        url: "/api/core/v1/vision/detect",
        tag: 'basic',
        description: "basic object detection, give an object description and get a confidence",
        params: {
            url: "image url",
            prompt: "what to detect in the image",
            llmProvider: "llm provider to use (openai or lmstudio)",
        },
        emitEvent: true
    })

    addCard({
        group: 'vision',
        tag: 'actions',
        id: 'detect',
        templateName: 'Detect objects using AI',
        name: 'vision_detect',
        defaults: {
            width: 2,
            height: 10,
            type: "action",
            icon: 'camera',
            name: 'detect',
            description: 'Detect objects in the camera stream. returns a confidence value between 0 and 1. It just returns the confidence as a number, without a wrapping object.',
            params: {
                url: "camera stream url",
                prompt: "what to detect in the image",
                llmProvider: "llm provider to use (openai or lmstudio)",
            },
            configParams: {
                url: {
                    visible: true,
                    defaultValue: "",
                    type: "string"
                },
                prompt: {
                    visible: true,
                    defaultValue: "",
                    type: "string"
                },
                llmProvider: {
                    visible: false,
                    defaultValue: "",
                    type: "string"
                }
            },
            rulesCode: `return await execute_action("/api/core/v1/vision/detect", userParams)`,
            html: "//@card/react\n\nfunction Widget(card) {\n  const value = card?.value?.response;\n  const readme = `\n  ### 🔑 How to get your OpenAI API key?\n  1. Go to [OpenAI's API Keys page](https://platform.openai.com/account/api-keys).\n  2. Log in and click **\"Create new secret key\"**.\n  3. Copy and save your key securely, it won't be shown again.\n  > ⚠️ **Keep it secret!** Your API key is private and usage-based.\n  `;\n  \n  const content = <YStack f={1}  mt={\"20px\"} ai=\"center\" jc=\"center\" width=\"100%\">\n      {card.icon && card.displayIcon !== false && (\n          <Icon name={card.icon} size={48} color={card.color}/>\n      )}\n      {card.displayResponse !== false && (\n          <CardValue mode={card.markdownDisplay ? 'markdown' : 'normal'} value={value ?? \"N/A\"} />\n      )}\n  </YStack>\n\n  return (\n      <Tinted>\n        <ProtoThemeProvider forcedTheme={window.TamaguiTheme}>\n          <KeyGate requiredKeys={['OPENAI_API_KEY']} readme={readme}>\n            <ActionCard data={card}>\n              {card.displayButton !== false ? <ParamsForm data={card}>{content}</ParamsForm> : card.displayResponse !== false && content}\n            </ActionCard>\n          </KeyGate>\n        </ProtoThemeProvider>\n      </Tinted>\n  );\n}\n",
            displayResponse: true
        },
        emitEvent: true,
    })

    app.get('/api/core/v1/vision/describe', async (req, res) => {
        if (locks["describe"]) return res.send({ error: "Another detection is in progress" });
        locks["describe"] = true;
        console.log('init')
        try {
            const params = req.query;
            const preprompt = `    `
            const url = params.url;
            let response;
            if(params.llmProvider === 'lmstudio') {
                response = await sendPromptWithImageLmStudio(preprompt + params.prompt, url);
            } else {
                response = await sendPromptWithImage(preprompt + params.prompt, url);
            }
            console.log('DESCRIPTION:', response, typeof response);
            res.json(response);
        } catch (e) {
            console.error(e);
            res.send({ error: e.message });
        } finally {
            locks["describe"] = false;
        }
    })

    addAction({
        group: 'vision',
        name: 'describe',
        url: "/api/core/v1/vision/describe",
        tag: 'basic',
        description: "image description using AI",
        params: {
            url: "image url",
            prompt: "promt for the image model",
            stateName: "state name to store the result",
            llmProvider: "llm provider to use (openai or lmstudio)",
        },
        emitEvent: true
    })

    addCard({
        group: 'vision',
        tag: 'actions',
        id: 'describe',
        templateName: 'describe image using AI',
        name: 'vision_describe',
        defaults: {
            width: 3,
            height: 14,
            type: "action",
            icon: 'camera',
            name: 'describe',
            description: 'describe image using AI',
            params: {
                url: "image url",
                prompt: "prompt for the image model",
                llmProvider: "llm provider to use (openai or lmstudio)",
            },
            configParams: {
                url: {
                    visible: true,
                    defaultValue: "",
                    type: "string"
                },
                prompt: {
                    visible: true,
                    defaultValue: "",
                    type: "string"
                },
                llmProvider: {
                    visible: false,
                    defaultValue: "",
                    type: "string"
                }
            },
            rulesCode: `return await execute_action("/api/core/v1/vision/describe", userParams)`,
            html: "//@card/react\n\nfunction Widget(card) {\n  const value = card?.value?.response;\n  const readme = `\n  ### 🔑 How to get your OpenAI API key?\n  1. Go to [OpenAI's API Keys page](https://platform.openai.com/account/api-keys).\n  2. Log in and click **\"Create new secret key\"**.\n  3. Copy and save your key securely, it won't be shown again.\n  > ⚠️ **Keep it secret!** Your API key is private and usage-based.\n  `;\n  \n  const content = <YStack f={1}  mt={\"20px\"} ai=\"center\" jc=\"center\" width=\"100%\">\n      {card.icon && card.displayIcon !== false && (\n          <Icon name={card.icon} size={48} color={card.color}/>\n      )}\n      {card.displayResponse !== false && (\n          <CardValue mode={card.markdownDisplay ? 'markdown' : 'normal'} value={value ?? \"N/A\"} />\n      )}\n  </YStack>\n\n  return (\n      <Tinted>\n        <ProtoThemeProvider forcedTheme={window.TamaguiTheme}>\n          <KeyGate requiredKeys={['OPENAI_API_KEY']} readme={readme}>\n            <ActionCard data={card}>\n              {card.displayButton !== false ? <ParamsForm data={card}>{content}</ParamsForm> : card.displayResponse !== false && content}\n            </ActionCard>\n          </KeyGate>\n        </ProtoThemeProvider>\n      </Tinted>\n  );\n}\n",
            displayResponse: true
        },
        emitEvent: true,
    })

    addCard({
        group: 'vision',
        tag: 'inputs',
        id: 'vision_web_camera',
        templateName: 'Webcam',
        name: 'web_camera',
        defaults: {
            "width": 3,
            "height": 12,
            "icon": "webcam",
            "html": "//@card/react\nfunction Widget(props) {\n    return (\n        <Tinted>\n            <CameraCard params={props.configParams} onPicture={async (picture64) => {\n              const url = document.location.origin + (await execute_action('/api/core/v1/vision/frame/set', {id: 'frame', image: picture64}))\n              execute_action(props.name, {picture: url})\n            }}/>\n        </Tinted>\n    );\n  }\n",
            "name": "webcam",
            "description": "Display a React component",
            "type": "action",
            "method": "post",
            "displayButton": true,
            "rulesCode": "return {\r\n    frame: params.picture,\r\n    type: \"frame\",\r\n    key: Math.random()\r\n}",
            "params": {
                "mode": "manual or auto (auto is experimental)",
                "fps": "fps to capture"
            },
            "configParams": {
                "mode": {
                    "visible": false,
                    "defaultValue": "manual"
                },
                "fps": {
                    "visible": false,
                    "defaultValue": "0.5"
                }
            },
        },
        emitEvent: true,
    })
}

