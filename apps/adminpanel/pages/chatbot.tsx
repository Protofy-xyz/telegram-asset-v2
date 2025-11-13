import React, { useEffect, useState } from 'react'
import Head from 'next/head'
import { SiteConfig } from 'app/conf'
import dynamic from 'next/dynamic'
import { YStack } from '@my/ui'
import { useRouter } from 'next/router'

export default function Page(props: any) {
    const { query } = useRouter()
    const agent = query.agent as string
    const boardName = typeof window !== 'undefined'&& (window as any).parent?.board?.name
    const apiUrl ='/api/v1/chatbots/board?agent=' + encodeURIComponent(agent || '') + "&board=" + encodeURIComponent(boardName || '')
    const Chatbot = dynamic(() => import('protolib/components/chatbot'), { ssr: false })
    const projectName = SiteConfig.projectName

    return (
        <>
            <Head>
                <title>{projectName + " - Chat with " + agent}</title>
            </Head>
            <YStack backgroundColor="$bgContent" f={1}>
                <Chatbot apiUrl={apiUrl} />
            </YStack>
        </>
    )
}
