import { SettingModel } from '.'
import { DataView } from 'protolib/components/DataView'
import { AdminPage } from 'protolib/components/AdminPage'
import { Key } from '@tamagui/lucide-icons';
import { usePrompt } from 'protolib/context/PromptAtom'
import { PaginatedData } from 'protolib/lib/SSR';
import { DataTable2 } from 'protolib/components/DataTable2'
import { SiteConfig } from '@my/config/dist/AppConfig'
import {
  TooltipGroup,
  XGroup,
  XStack,
  YStack,
  Paragraph
} from '@my/ui'
import { ThemeToggle } from 'protolib/components/ThemeToggle'
import { ColorToggleButton } from 'protolib/components/ColorToggleButton'
import { Icon } from 'protolib/components/board/ActionCard'
import { SizableText } from 'protolib/components/datepickers/dateParts';

const sourceUrl = '/api/core/v1/settings'
const tooltipDelay = { open: 500, close: 150 }

const configPanels = [
  { name: 'Users', href: '/workspace/users', icon: "users" },
  { name: 'Keys', href: '/workspace/keys', icon: "key" },
  { name: 'Services', href: '/workspace/services', icon: "server" },
  { name: 'Databases', href: '/workspace/databases', icon: "database" },
  { name: 'Files', href: '/workspace/files?path=/', icon: "folder" },
  { name: 'Settings', href: '/workspace/settings', icon: "cog" },
  { name: 'Themes', href: '/workspace/themes', icon: "palette" }
]

export default {
  'settings': {
    component: ({ pageState, initialItems, pageSession, extraData }: any) => {
      usePrompt(() => `` + (
        initialItems?.isLoaded ? 'Currently the system returned the following information: ' + JSON.stringify(initialItems.data) : ''
      ))

      const settingsTintSwitcher = SiteConfig.ui?.tintSwitcher
      const settingsThemeSwitcher = SiteConfig.ui?.themeSwitcher
      const settingsTintSwitcherEnabled = settingsTintSwitcher === undefined ? true : settingsTintSwitcher
      const settingsThemeSwitcherEnabled = settingsTintSwitcher === undefined ? true : settingsThemeSwitcher

      return (<AdminPage title="Keys" pageSession={pageSession}>
        <DataView
          enableAddToInitialData
          disableViews={["grid"]}
          defaultView={'list'}
          sourceUrl={sourceUrl}
          initialItems={initialItems}
          numColumnsForm={1}
          name="settings"
          model={SettingModel}
          columns={DataTable2.columns(
            DataTable2.column("name", row => row.name, "name", undefined, true, '400px'),
            DataTable2.column("value", row => typeof row.value === "string" ? row.value : JSON.stringify(row.value), "value", undefined, true),
          )}
        />
      </AdminPage>)
    },
    getServerSideProps: PaginatedData(sourceUrl, ['admin'])
  },
  'config': {
    component: ({ pageState, initialItems, pageSession, extraData }: any) => {
      return (
        <AdminPage title="Config" pageSession={pageSession}>
          <XStack
            f={1}
            m="$4"
            flexWrap="wrap"
            gap="$6"          // separación horizontal
            rowGap="$6"       // separación vertical entre filas (explícita)
            justifyContent="flex-start"
            alignItems="flex-start"
            alignContent="flex-start" // evita el “estirado” entre filas
          >
            {configPanels.map((panel, index) => (
              <a
                key={index}
                href={panel.href}
                // que el anchor no crezca ni rompa el layout
                style={{ textDecoration: 'none', display: 'inline-flex', flex: '0 0 auto' }}
              >
                <YStack
                  ai="center"
                  jc="center"
                  br="$6"
                  width={150}
                  height={150}
                  bg="$bgPanel"
                  // NO crecer:
                  f={0}
                  flexShrink={0}
                  // usa gap interno para icono/texto si quieres
                  gap="$2"
                >
                  <Icon
                    color="var(--color)"
                    name={panel.icon}
                    size={40}
                    style={{ opacity: 0.8 }}
                  />
                  <Paragraph size="$4" textAlign="center">
                    {panel.name}
                  </Paragraph>
                </YStack>
              </a>
            ))}
          </XStack>
        </AdminPage>
      )
    }
  }
}