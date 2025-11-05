import BoardsPage from '@extensions/network/pages'
import Head from 'next/head'
import { SiteConfig } from 'app/conf'

export default function Page(props:any) {
  const projectName = SiteConfig.projectName

  return (
    <>
      <Head>
        <title>{projectName + " - Network"}</title>
      </Head>
      <BoardsPage.boards.component {...props} />
    </>
  )
}