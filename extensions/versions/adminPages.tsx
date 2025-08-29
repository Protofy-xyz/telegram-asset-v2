import { VersionModel } from '.'
import { DataView } from 'protolib/components/DataView'
import { AdminPage } from 'protolib/components/AdminPage'
import { usePrompt } from 'protolib/context/PromptAtom'
import { PaginatedData } from 'protolib/lib/SSR';

const sourceUrl = '/api/core/v1/versions'

export default {
  'versions': {
    component: ({ pageState, initialItems, pageSession, extraData }: any) => {
      usePrompt(() => ``+ (
          initialItems?.isLoaded ? 'Currently the system returned the following information: ' + JSON.stringify(initialItems.data) : ''
        ))

      return (<AdminPage title="Versions" pageSession={pageSession}>
        <DataView
                enableAddToInitialData
                disableViews={["grid"]}
                defaultView={'list'}
                sourceUrl={sourceUrl}
                initialItems={initialItems}
                numColumnsForm={1}
                name="version"
                model={VersionModel}
        />
      </AdminPage>)
    },
    getServerSideProps: PaginatedData(sourceUrl, ['admin'])
  }
}