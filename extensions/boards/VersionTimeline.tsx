import { useEffect, useState } from 'react'
import { YStack, XStack, Text, View, Paragraph, Spinner } from 'tamagui'
import { Calendar } from '@tamagui/lucide-icons'

type VersionInfo = { version: number; savedAt: number | string }

// Layout (tweakea a tu gusto)
const RAIL = 72              // carril izquierdo
const DOT = 12               // diámetro del punto
const LINE_W = 3             // grosor del conector (más grueso)
const ITEM_TOP_PAD = 18      // distancia desde la parte superior de la tarjeta al centro del punto
const SPACER = 28            // separación entre tarjetas

export function VersionTimeline({ boardId }: { boardId: string }) {
  const [versions, setVersions] = useState<VersionInfo[] | null>(null)

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/core/v1/boards/${boardId}/history`)
        const data = await res.json()
        setVersions(
          data
            .map((v: VersionInfo) => ({ ...v, savedAt: Number(v.savedAt) }))
            .sort((a: VersionInfo, b: VersionInfo) => b.version - a.version)
        )
      } catch {
        setVersions([])
      }
    })()
  }, [boardId])

  if (versions === null)
    return <YStack ai="center" jc="center" h={160}><Spinner size="large" /></YStack>

  if (versions.length === 0)
    return <YStack ai="center" jc="center" p="$4"><Text color="$color10">No hay versiones guardadas</Text></YStack>

  return (
    <YStack pt="$3" pb="$3">
      {versions.map((v, i) => {
        const isLast = i === versions.length - 1
        const d = new Date(Number(v.savedAt))
        const formatted = isNaN(d.getTime())
          ? 'Fecha no válida'
          : d.toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric',
                                        hour: '2-digit', minute: '2-digit', second: '2-digit' })

        const railCenter = RAIL / 2
        const dotLeft = railCenter - DOT / 2
        const lineLeft = railCenter - LINE_W / 2

        return (
          // CONTENEDOR DEL ITEM + SU ESPACIO INFERIOR (sin usar gap)
          <YStack key={v.version} position="relative" pb={isLast ? 0 : SPACER}>
            {/* Punto */}
            <View
              position="absolute"
              left={dotLeft}
              top={ITEM_TOP_PAD}
              width={DOT}
              height={DOT}
              borderRadius={9999}
              backgroundColor="$color9"
              borderWidth={2}
              borderColor="$color10"
              zIndex={2}
              shadowColor="$shadowColor"
              shadowOpacity={0.25}
              shadowRadius={6}
            />

            {/* Conector hacia abajo (hasta el centro del siguiente punto) */}
            {!isLast && (
              <View
                position="absolute"
                left={lineLeft}
                top={ITEM_TOP_PAD + DOT / 2}
                // llega: fin tarjeta + spacer + ITEM_TOP_PAD del siguiente
                // como no conocemos la altura de la tarjeta (variable), extendemos
                // hasta el fondo del contenedor (que incluye el spacer) y añadimos ITEM_TOP_PAD.
                // Nota: Tamagui en web admite valores calc()
                height={`calc(100% - ${ITEM_TOP_PAD + DOT / 2}px + ${ITEM_TOP_PAD}px)`}
                width={LINE_W}
                backgroundColor="$color7"
                opacity={0.6}
              />
            )}

            {/* Tarjeta */}
            <XStack>
              <YStack
                ml={RAIL}
                px="$5"
                py="$4"
                backgroundColor="$color2"
                borderRadius="$8"
                shadowColor="$shadowColor"
                shadowOpacity={0.12}
                shadowRadius={10}
                width="min(92%, 720px)"
              >
                <Text fontWeight="800" color="$color12" fontSize="$6">
                  Versión {v.version}
                </Text>
                <XStack ai="center" gap="$2" mt="$2">
                  <Calendar size={14} color="$color10" />
                  <Paragraph color="$color10" size="$3">{formatted}</Paragraph>
                </XStack>
              </YStack>
            </XStack>
          </YStack>
        )
      })}
    </YStack>
  )
}
