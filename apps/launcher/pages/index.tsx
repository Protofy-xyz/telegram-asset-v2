import { useEffect, useState } from 'react'
import { useSetAtom } from 'jotai'
import { initParticlesAtom } from 'protolib/components/particles/ParticlesEngineAtom'
import { ParticlesView } from 'protolib/components/particles/ParticlesView'
import { Page } from 'protolib/components/Page'
import { basicParticlesMask } from 'protolib/components/particles/particlesMasks/basicParticlesMask'
import { getPendingResult, ProtoModel, z } from 'protobase'
import { DataView } from 'protolib/components/DataView'
import { Button, H2, H3, Paragraph, Popover, Spinner, XStack, YStack, useThemeName } from 'tamagui'
import { useToastController } from '@my/ui'
import { AlertTriangle, Trash2, Bird, Download, MoreVertical, Play, FolderOpen } from '@tamagui/lucide-icons'
import { InteractiveIcon } from 'protolib/components/InteractiveIcon'
import { Tinted } from 'protolib/components/Tinted'
import { useFetch } from 'protolib'
import semver from 'semver'
import rootPkg from '../../../package.json'

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
    <Tinted><Icon color={iconColor ?? "$color8"} size={"$1"} /></Tinted>
    <Paragraph color="$color12">{label}</Paragraph>
  </XStack>
}

function CardMenu({ disabled, options }: { disabled?: boolean, options: CardMenuItemProps[] }) {
  return <Popover allowFlip>
    <Popover.Trigger disabled={disabled}>
      <InteractiveIcon Icon={MoreVertical} />
    </Popover.Trigger>
    <Popover.Content padding={0} space={0} left={"$7"} top={"$2"} bw={1} boc="$borderColor" bc={"$color1"} >
      <Popover.Arrow borderWidth={1} boc="$gray4" />
      <YStack p="$2" bg="$color2" o={0.85} borderRadius={10}>
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

function CardElement({ element }: any) {
  const toast = useToastController()
  const [downloading, setDownloading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [openError, setOpenError] = useState<string | null>(null)

  useEffect(() => {
    setDownloading(element.status === 'downloading');
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
      return;
    } catch (err: any) {
      setDeleteError(err?.message || 'Delete failed');
    } finally {
      setIsDeleting(false);
    }
  };

  const runProject = async () => {
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
  }

  return (
    <YStack borderRadius={10} p="$4" jc="center" cursor="auto" backgroundColor="$color4" o={0.85}>
      <XStack f={1} ai="center">
        <Paragraph f={1} color="$color12" style={{ fontSize: '14px' }}>
          {element.name}
        </Paragraph>
        <CardMenu disabled={isDeleting || element.status !== 'downloaded'} options={[
          { icon: Trash2, iconColor: "$red8", label: "Delete", onPress: handleDelete },
          { icon: FolderOpen, label: "Open Folder", onPress: handleOpenFolder },
        ]} />
      </XStack>
      <Paragraph color="$color12" style={{ fontSize: '10px' }}>
        v: {element.version}
      </Paragraph>
      <XStack h={"$3"} ai="center" jc="flex-end">
        {(element.status == 'downloaded' && !isDeleting)
          && <XStack>
            <InteractiveIcon
              size={20}
              IconColor="$color12"
              Icon={Play}
              onPress={runProject}
            />
          </XStack>
        }
        {element.status == 'pending'
          && <XStack>
            {downloading
              ? <Tinted><Spinner m="$2" color="$color8" /></Tinted>
              : <InteractiveIcon size={20} IconColor="$color12" Icon={Download} onPress={async () => {
                const url = 'app://localhost/api/v1/projects/' + element.name + '/download'
                setDownloading(true)
                const result = await fetch(url)
              }} />}
          </XStack>
        }
        {(element.status === 'downloading' || isDeleting)
          && <Tinted>
            <Paragraph col="$color12">{isDeleting ? 'Deleting…' : 'Downloading…'}</Paragraph>
            <Spinner m="$2" color="$color8" />
          </Tinted>
        }
        {(element.status === 'error' || deleteError || openError)
          && <XStack ai="center" space="$2">
            <AlertTriangle col="$red8" size={16} />
            <Paragraph col="$color12">{openError ?? deleteError ?? "Download failed"}</Paragraph>
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

  useEffect(() => {
    const api = (typeof window !== 'undefined' && (window as any).electronAPI) ? (window as any).electronAPI : null;
    if (!api?.onProjectStatus) return;

    const handler = ({ name, status }: { name: string; status: string }) => {
      // simple approach: any status change triggers a refresh of the list
      if (['downloaded', 'error', 'downloading', 'deleted'].includes(status)) {
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

  console.log('versions', versions)
  return <XStack f={1}>
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
      title={<Paragraph pl="$2" color="$color12" style={{ fontSize: '25px' }}>
        Vento Projects
      </Paragraph>}
      dataTableGridProps={{
        marginTop: '$10',
        getCard: (element: any, width: any) => {
          return <CardElement element={element} />
        },
        emptyMessage: <YStack position="absolute" top={-120} left={0} width={'100vw'} height={'100vh'} flex={1} alignItems="center" justifyContent="center" space="$4" pointerEvents='none'>
          <YStack ai="center" jc="center" space="$2" o={0.4} pointerEvents='none' userSelect='none'>
            <Bird size="$7" />
            <H2>Empty project list</H2>
          </YStack>
          <Tinted><Button pointerEvents='auto' onPress={() => setAddOpened(true)}>Add project</Button></Tinted>
        </YStack>
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
            versions
              .filter((v: any) => v !== "latest")
              .sort((a: any, b: any) => semver.rcompare(semver.coerce(a)!, semver.coerce(b)!))[0])
      }}
    />
  </XStack>
}

export default function Home() {
  const initParticles = useSetAtom(initParticlesAtom)
  const themeName = useThemeName()
  const isDark = typeof themeName === 'string' && themeName.toLowerCase().includes('dark')

  useEffect(() => {
    initParticles()
  }, [initParticles])
  
  const darkGradient =
    'radial-gradient(1200px 700px at 50% 100%, rgba(0, 201, 87, 0.25) 0%, rgba(0, 120, 60, 0.15) 40%, rgba(10, 20, 15, 0.9) 100%), linear-gradient(180deg, #0A2F1D 0%, #0B1A13 100%)'

  const lightGradient =
    'radial-gradient(1200px 700px at 50% 100%, rgba(0, 201, 87, 0.35) 0%, rgba(105, 255, 165, 0.20) 40%, rgba(235, 255, 245, 0.9) 100%), linear-gradient(180deg, #E9FFF3 0%, #F5FFF9 100%)'


  const background = isDark ? darkGradient : lightGradient
  return (
    <Page
      skipSessionManagement={true}
      style={{
        height: '100vh',
        margin: 0,
        padding: 0,
        fontFamily: "'Inter', sans-serif",
        fontSize: '10px',
        overflow: 'auto',
        position: 'relative',
        background,
      }}
    >
      <ParticlesView options={basicParticlesMask({ particleColors: ['rgb(0, 201, 87) ', 'rgb(105, 255, 165) '] })} />
      <MainView />
      <YStack position="absolute" bottom={10} right={10} opacity={0.6} pointerEvents="none">
        <Paragraph color="$color12" style={{ fontSize: '10px' }}>Launcher v{rootPkg.version}</Paragraph>
      </YStack>
    </Page>
  )
}