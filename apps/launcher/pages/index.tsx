import { useEffect, useState } from 'react'
import { Page } from 'protolib/components/Page'
import { getPendingResult, ProtoModel, z } from 'protobase'
import { DataView } from 'protolib/components/DataView'
import { Button, Paragraph, Popover, Spinner, useThemeName, XStack, YStack } from 'tamagui'
import { useToastController } from '@my/ui'
import { AlertTriangle, Trash2, Bird, Download, MoreVertical, Play, FolderOpen } from '@tamagui/lucide-icons'
import { InteractiveIcon } from 'protolib/components/InteractiveIcon'
import { Tinted } from 'protolib/components/Tinted'
import { ErrorMessage, useFetch } from 'protolib'
import rootPkg from '../../../package.json'
import { useThemeSetting } from '@tamagui/next-theme'

const obj = {
  "name": "project",
  "features": {
    "adminPage": "/objects/view?object=projectModel"
  },
  "id": "projectModel",
  "keys": {
    "name": {
      "type": "string",
      "params": [],
      "modifiers": [
        {
          "name": "id",
          "params": []
        }
      ]
    },
  },
  "apiOptions": {
    "name": "project",
    "prefix": "/api/v1/"
  },
  "filePath": "data/objects/project.ts"
}

type CardMenuItemProps = {
  icon: React.ComponentType<any>,
  label: string,
  onPress: () => void,
  iconColor?: string
}

function CardMenuItem({ icon: Icon, label, onPress, iconColor }: CardMenuItemProps) {
  return <XStack hoverStyle={{ filter: "brightness(1.2)" }} cursor="pointer" p="$2" gap="$2" onPress={onPress}>
    <Tinted><Icon color={iconColor ?? "var(--color8)"} size={"$1"} /></Tinted>
    <Paragraph color="var(--color)">{label}</Paragraph>
  </XStack>
}

function CardMenu({ disabled, options }: { disabled?: boolean, options: CardMenuItemProps[] }) {
  return <Popover allowFlip>
    <Popover.Trigger disabled={disabled}>
      <InteractiveIcon IconColor="var(--color)" Icon={MoreVertical} opacity={disabled ? 0.3 : 1} />
    </Popover.Trigger>
    <Popover.Content left={"$7"} top={"$2"} bw={1} boc={"$borderColor"} bc={"var(--bgContent)"} >
      <Popover.Arrow borderWidth={1} boc="$gray4" />
      <YStack >
        {
          options.map((option: any, index: number) => {
            return <Popover.Close key={index} asChild>
              <CardMenuItem icon={option.icon} iconColor={option.iconColor} label={option.label} onPress={option.onPress} />
            </Popover.Close>
          })
        }
      </YStack>
    </Popover.Content>
  </Popover>
}

function CardElement({ element, onDeleted }: any) {
  const toast = useToastController()
  const [isDeleting, setIsDeleting] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [openError, setOpenError] = useState<string | null>(null)
  const [isRunning, setIsRunning] = useState(false)

  useEffect(() => {
    if (element.status !== 'downloaded') {
      setOpenError(null);
    }
  }, [element.status]);

  const handleOpenFolder = async () => {
    setOpenError(null);
    try {
      const res = await fetch(`app://localhost/api/v1/projects/${element.name}/open-folder`);
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(text || `Open folder failed with status ${res.status}`);
      }
    } catch (err: any) {
      setOpenError(err?.message || 'Unable to open project folder');
    }
  };

  const handleDelete = async () => {
    if (isDeleting) return;
    setDeleteError(null);
    setIsDeleting(true);
    try {
      const res = await fetch(`app://localhost/api/v1/projects/${element.name}/delete`);
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(text || `Delete failed with status ${res.status}`);
      }
      // Force refresh of the list if no status event arrives
      onDeleted?.();
      return;
    } catch (err: any) {
      setDeleteError(err?.message || 'Delete failed');
    } finally {
      setIsDeleting(false);
    }
  };

  const runProject = async () => {
    setIsRunning(true);
    try {
      const url = 'app://localhost/api/v1/projects/' + element.name + '/run'
      const res = await fetch(url)
      if (!res.ok) {
        const text = await res.text().catch(() => '')
        toast.show('Unable to run project', {
          message: text || `Run failed with status ${res.status}`,
          tint: 'red',
          duration: 2000,
        })
      }
    } catch (err: any) {
      toast.show('Unable to run project', {
        message: err?.message || 'Unexpected error',
        tint: 'red',
        duration: 2000,
      })
    }
    setIsRunning(false)
  }

  return (
    <YStack borderRadius={10} p="$4" jc="center" cursor="auto" backgroundColor="$bgContent">
      <XStack f={1} ai="center">
        <Paragraph f={1} style={{ color: 'var(--color)', fontSize: '14px', fontWeight: '600' }} numberOfLines={1} ellipsizeMode="tail">
          {element.name}
        </Paragraph>
        <CardMenu
          disabled={isDeleting || isDownloading || isRunning}
          options={[
            { icon: Trash2, iconColor: "$red8", label: "Delete", onPress: handleDelete },
            ...(element.status === "downloaded" ? [{ icon: FolderOpen, label: "Open Folder", onPress: handleOpenFolder }] : [])
          ]}
        />
      </XStack>
      <Paragraph style={{ color: 'var(--color)', fontSize: '10px' }}>
        v: {element.version}
      </Paragraph>
      <XStack h={"$3"} ai="center" jc="flex-end">
        {(element.status == 'downloaded' && !isDeleting && !isRunning)
          && <XStack>
            <Tinted>
              <InteractiveIcon
                size={20}
                IconColor="var(--color8)"
                Icon={Play}
                onPress={runProject}
              />
            </Tinted>
          </XStack>
        }
        {(element.status == 'pending' && !isDownloading)
          && <Tinted>
            <InteractiveIcon size={20} IconColor="var(--color8)" Icon={Download} onPress={async () => {
              setIsDownloading(true)
              try {
                const url = 'app://localhost/api/v1/projects/' + element.name + '/download'
                await fetch(url)
              } catch (error) { }
              setIsDownloading(false)
            }} />
          </Tinted>
        }
        {(isDownloading || isDeleting || isRunning)
          && <Tinted>
            <Paragraph col="var(--color)">{isDeleting ? 'Deleting…' : isRunning ? 'Running…' : 'Downloading…'}</Paragraph>
            <Spinner m="$2" color="var(--color8)" />
          </Tinted>
        }
        {((element.status === 'error' || deleteError || openError) && !isDeleting)
          && <XStack ai="center" space="$2">
            <AlertTriangle col="$red8" size={16} />
            <Paragraph style={{ color: 'var(--color)' }}>{openError ?? deleteError ?? "Download failed"}</Paragraph>
            <InteractiveIcon size={20} IconColor="var(--color8)" Icon={Download} onPress={async () => {
              const url = 'app://localhost/api/v1/projects/' + element.name + '/download'
              const result = await fetch(url)
            }} />
          </XStack>
        }
      </XStack>
    </YStack>
  )
}

const objModel = ProtoModel.getClassFromDefinition(obj)

const MainView = () => {
  const [reload, setReload] = useState(0)
  const [addOpened, setAddOpened] = useState(false)
  const [result, loading, error] = useFetch('https://api.github.com/repos/Protofy-xyz/Vento/releases', null, true)
  const { resolvedTheme } = useThemeSetting()
  const darkMode = resolvedTheme === 'dark'


  useEffect(() => {
    const api = (typeof window !== 'undefined' && (window as any).electronAPI) ? (window as any).electronAPI : null;
    if (!api?.onProjectStatus) return;

    const handler = ({ name, status }: { name: string; status: string }) => {
      // simple approach: any status change triggers a refresh of the list
      if (['downloaded', 'error', 'deleted'].includes(status)) {
        setReload((r) => r + 1);
      }
    };

    api.onProjectStatus(handler);
    return () => {
      api.offProjectStatus?.(handler);
    };
  }, []);

  let parsedResult = JSON.parse(result ?? '[]')
  const versions = parsedResult && parsedResult.map ? parsedResult.map((item) => {
    return "" + item.tag_name.replace('v', '')
  }) : []

  const logoStyle = {
    width: '200px',
    paddingLeft: '6px',
    filter: darkMode
      ? 'invert(1)'
      : 'invert(0)',
    animation: 'float 6s ease-in-out infinite',
  }

  console.log('versions', versions)
  return <YStack f={1}>
    <DataView
      addOpened={addOpened}
      setAddOpened={setAddOpened}
      key={reload}
      disableViewSelector={true}
      defaultView='grid'
      hidePagination={true}
      hideDeleteAll={true}
      hideSearch={true}
      sourceUrl={'app://localhost/api/v1/projects'}
      numColumnsForm={1}
      name={'Vento Projects'}
      model={objModel}
      disableNotifications={true}
      onSelectItem={(item) => {
        return false
      }}
      disableItemSelection={true}
      title={<img src="/public/vento-logo.png" alt="Vento logo" style={logoStyle} />}
      dataTableGridProps={{
        marginTop: '$10',
        getCard: (element: any, width: any) => {
          return <CardElement element={element} onDeleted={() => setReload((r) => r + 1)} />
        },
        emptyMessage: <ErrorMessage
          icon={Bird}
          msg={`Empty project list`}
          containerProps={{ mt: '15vh', o: 0.5 }}
          iconProps={{}}
        >
          <Tinted><Button pointerEvents='auto' onPress={() => setAddOpened(true)}>Add project</Button></Tinted>
        </ErrorMessage>,
      }}
      createElement={async (data) => {
        if (typeof window !== 'undefined' && (window as any).electronAPI) {
          const api = (window as any).electronAPI
          return new Promise((resolve) => {
            api.createProject(data);
            api.onProjectCreated((result: any) => {
              if (result?.success === true) {
                setReload((prev) => prev + 1);
                resolve(getPendingResult('loaded', { created: true }));
              } else {
                resolve(getPendingResult('error', null, "\n" + result?.error));
              }
            });
          })
        }
      }}
      extraFieldsFormsAdd={{
        version: z.union(versions.map((v: any) => z.literal(v)))
          .label("version")
          .after('name')
          .defaultValue(
            "latest")
        // versions
        //   .filter((v: any) => v !== "latest")
        //   .sort((a: any, b: any) => semver.rcompare(semver.coerce(a)!, semver.coerce(b)!))[0]) // highest version
      }}
    />
  </YStack>
}

export default function Home() {
  const themeName = useThemeName()
  const isDark = typeof themeName === 'string' && themeName.toLowerCase().includes('dark')


  return (
    <Page
      skipSessionManagement={true}
      style={{
        height: '100vh',
        margin: 0,
        padding: 0,
        fontFamily: "'Inter', sans-serif",
        color: 'var(--color)',
        fontSize: '10px',
        backgroundColor: 'var(--bgPanel)',
        overflow: 'auto',
        position: 'relative',
      }}
    >
      <MainView />
      <YStack position="fixed" bottom={10} right={10} opacity={0.6} pointerEvents="none">
        <Paragraph style={{ color: 'var(--color)', fontSize: '10px' }}>Launcher v{rootPkg.version}</Paragraph>
      </YStack>
    </Page>
  )
}