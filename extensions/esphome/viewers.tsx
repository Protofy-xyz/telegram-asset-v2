import { MonacoViewer } from '@extensions/files/intents'
import { loadEsphomeHelpers } from './utils'

export default ({ ...props }: any) => {
    return <MonacoViewer {...props} onLoad={loadEsphomeHelpers} defaultLanguage="esphome" />
}