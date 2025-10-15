"use client"

import { useEffect, useState } from "react"
import { VerticalTimeline, VerticalTimelineElement } from "react-vertical-timeline-component"
import "react-vertical-timeline-component/style.min.css"
import { useTheme, Paragraph } from "tamagui"
import { Calendar, FileClock } from "@tamagui/lucide-icons"
import { Tinted } from 'protolib/components/Tinted'

type VersionInfo = { version: number; savedAt: number | string }

export function VersionTimeline({ boardId }: { boardId: string }) {
  const [versions, setVersions] = useState<VersionInfo[]>([])
  const theme = useTheme()

  useEffect(() => {
    ; (async () => {
      try {
        const res = await fetch(`/api/core/v1/boards/${boardId}/history`)
        const raw = await res.json()
        const data: VersionInfo[] = (raw ?? [])
          .map((v: VersionInfo) => ({ ...v, savedAt: Number(v.savedAt) }))
          .sort((a, b) => b.version - a.version)
        setVersions(data)
      } catch {
        setVersions([])
      }
    })()
  }, [boardId])

  const fmt = (ts: number | string) => {
    const d = new Date(Number(ts))
    return isNaN(d.getTime())
      ? "Fecha no válida"
      : d.toLocaleString("es-ES", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
  }

  return (
    <Tinted>
      <VerticalTimeline
        //layout="1-column-left" //'1-column-left' or '1-column-right' or '2-columns' (default: '2-columns')
        lineColor={"var(--gray6)"}
      >
        {versions.map((v) => (
          <VerticalTimelineElement
            key={v.version}
            date={fmt(v.savedAt)}
            icon={<FileClock size={16} />}
            iconStyle={{
              background: "var(--gray6)",
              color: "var(--color8)",
              boxShadow: "none",
            }}
            contentStyle={{
              background: "var(--bgContent)",
              color: "var(--color8)",
              borderRadius: 12,
              boxShadow: "0 4px 18px rgba(0,0,0,.15)",
              padding: "14px 16px",
            }}
            contentArrowStyle={{ borderRightColor: "var(--bgContent)" }}
          >
            <h3 style={{ margin: 0  }}>Versión {v.version}</h3>
            <Paragraph theme="alt2" size="$3" mt="$2">
              Guardada: {fmt(v.savedAt)}
            </Paragraph>
          </VerticalTimelineElement>
        ))}
      </VerticalTimeline>
    </Tinted>
  )
}
