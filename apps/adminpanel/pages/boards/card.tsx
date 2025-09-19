// pages/boards/[card].tsx
import BoardsPage from '@extensions/boards/adminPages'
import { useRouter } from 'next/router'

export default function Page(props: any) {
    const router = useRouter()
    const { board, card, mode } = router.query

    if (!board || typeof board !== 'string') return <></>
    return <BoardsPage.card.component board={board} card={card} mode={mode} />
}