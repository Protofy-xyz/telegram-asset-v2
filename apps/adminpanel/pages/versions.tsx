import VersionsPage from '@extensions/versions/adminPages'
import Head from 'next/head'
import { SiteConfig } from 'app/conf'

export default function Page(props:any) {
  const projectName = SiteConfig.projectName

  return (
    <>
      <Head>
        <title>{projectName + " - Versions"}</title>
      </Head>
      <VersionsPage.versions.component {...props} />
    </>
  )
}