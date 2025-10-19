"use client";

import { useEffect, useState } from "react";
import { VerticalTimeline, VerticalTimelineElement } from "react-vertical-timeline-component";
import "react-vertical-timeline-component/style.min.css";
import { useTheme, Paragraph, ScrollView, XStack, Text, Input, YStack, Label } from "@my/ui";
import { ArchiveRestore, CheckCircle, Clock, Pencil } from "@tamagui/lucide-icons";
import { Tinted } from "protolib/components/Tinted";
import { InteractiveIcon } from "protolib/components/InteractiveIcon";
import { useBoardVersions } from "./utils/versions";
import { useBoardVersion } from "./store/boardStore";
import { AlertDialog } from "protolib/components/AlertDialog";
import { setVersionMeta } from "./utils/versions";

export function VersionTimeline({ boardId }: { boardId: string }) {
  const { goToVersion, versions, refresh } = useBoardVersions(boardId);
  const theme = useTheme();
  const [boardVersion] = useBoardVersion();
  const current = boardVersion;

  const [openDialog, setOpenDialog] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<any>(null);
  const [tag, setTag] = useState("");
  const [comment, setComment] = useState("");

  const fmt = (ts: number | string) => {
    const d = new Date(Number(ts));
    return isNaN(d.getTime())
      ? "Fecha no válida"
      : d.toLocaleString("es-ES", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
  };

  const handleEdit = (v: any) => {
    setSelectedVersion(v);
    setTag(v.tag ?? "");
    setComment(v.comment ?? "");
    setOpenDialog(true);
  };

  const handleSaveMeta = async () => {
    if (!selectedVersion) return;
    await setVersionMeta(boardId, selectedVersion.version, { tag, comment });
    await refresh();
  };

  return (
    <ScrollView flex={1} width="100%" height="100%" overflow="auto">
      <Tinted>
        <VerticalTimeline animate={false} lineColor={"var(--gray6)"}>
          {[...versions].reverse().map((v) => (
            <VerticalTimelineElement
              key={v.version}
              date={fmt(v.savedAt)}
              icon={current === v.version ? <CheckCircle /> : <Clock />}
              iconStyle={{
                background: current === v.version ? "var(--color6)" : "var(--gray6)",
                color: "var(--color8)",
                boxShadow: "none",
              }}
              contentStyle={{
                background: "var(--bgContent)",
                color: current === v.version ? "var(--color8)" : "var(--color)",
                borderRadius: 12,
                boxShadow: "0 4px 18px rgba(0,0,0,.15)",
                padding: "14px 16px",
              }}
              contentArrowStyle={{ borderRightColor: "var(--bgContent)" }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <XStack ai="center" space="$2">
                  <h3 style={{ margin: 0, fontWeight: 700 }}>Version {v.version}</h3>
                  <InteractiveIcon Icon={Pencil} size={20} onPress={() => handleEdit(v)} />
                </XStack>

                {current !== v.version ? (
                  <InteractiveIcon
                    Icon={ArchiveRestore}
                    size={24}
                    onPress={async () => {
                      try {
                        console.log("GOING TO VERSION", v.version);
                        await goToVersion(v.version);
                      } catch (e) {
                        console.error(e);
                      }
                    }}
                  />
                ) : null}
              </div>

              <Paragraph size="$3" mt={8} mb={0} color={current === v.version ? "var(--color8)" : "var(--color)"}>
                {v.tag && (
                  <XStack> <Text>🏷️ Tag: {v.tag}</Text> </XStack>
                )}
                <XStack>
                  <Text>Total cards: {v.cards.length}</Text>
                </XStack>
                <XStack>
                  <Text>Changes: {`${v.change.type} card ${v.change.card}`}</Text>
                </XStack>
                {v.comment && (
                  <XStack> <Text>💬 {v.comment}</Text> </XStack>
                )}
              </Paragraph>
            </VerticalTimelineElement>
          ))}

        </VerticalTimeline>
      </Tinted>

      {/* 💬 AlertDialog para editar tag/comment */}
      <AlertDialog
        open={openDialog}
        setOpen={setOpenDialog}
        showCancel
        acceptCaption="Save"
        acceptTint="green"
        cancelTint="gray"
        title={`Version ${selectedVersion?.version}`}
        description={`Cards: ${selectedVersion?.cards?.length ?? 0} | Change: ${selectedVersion?.change?.type ?? "N/A"} ${selectedVersion?.change?.card ?? ""}`}
        onAccept={async () => {
          await handleSaveMeta();
          return false;
        }}
      >
        <YStack space="$3" width="100%">
          <Label>Tag</Label>
          <Input value={tag} onChangeText={setTag} placeholder="e.g. stable, milestone, beta" />

          <Label>Comment</Label>
          <Input
            multiline
            value={comment}
            onChangeText={setComment}
            placeholder="Describe what changed or why this version matters"
          />
        </YStack>
      </AlertDialog>
    </ScrollView>
  );
}
