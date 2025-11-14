import React from 'react'
import Head from 'next/head'
import { SiteConfig } from 'app/conf'
import dynamic from 'next/dynamic'
import { YStack } from '@my/ui'
import { useRouter } from 'next/router'
import { KeyGate } from 'protolib/components/KeyGate'

export default function Page(props: any) {
    const { query } = useRouter()
    const agent = query.agent as string
    const boardName = typeof window !== 'undefined' && (window as any).parent?.board?.name
    const apiUrl = '/api/v1/chatbots/board?agent=' + encodeURIComponent(agent || '') + "&board=" + encodeURIComponent(boardName || '')
    const Chatbot = dynamic(() => import('protolib/components/chatbot'), { ssr: false })
    const projectName = SiteConfig.projectName
    const readme = `
### ✨ AI chatbots require an OpenAI API Key



#### 🔑 How to get your OpenAI API key?
1. Go to [OpenAI's API Keys page](https://platform.openai.com/account/api-keys).
2. Log in and click **"Create new secret key"**.
3. Copy and save your key securely, it won't be shown again.
> ⚠️ **Keep it secret!** Your API key is private and usage-based.
`
    return (
        <>
            <Head>
                <title>{projectName + " - Chat with " + agent}</title>
            </Head>
            <YStack backgroundColor="$bgContent" f={1}>
                <KeyGate requiredKeys={["OPENAI_API_KEY"]} readme={readme}>
                    <Chatbot apiUrl={apiUrl} />
                </KeyGate>
            </YStack>
        </>
    )
}
