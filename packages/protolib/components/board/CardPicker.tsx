import { useState, useEffect, useMemo } from "react";
import {
    XStack,
    YStack,
    Text,
    Input,
    Button,
    Checkbox,
    ScrollView,
    Dialog,
} from "@my/ui";
import { Check, Eye, Plus, Rocket, X as XIcon } from "@tamagui/lucide-icons";
import { Tinted } from "../Tinted";

type CardPickerProps = {
    // optional filter: only show cards of this type ("action" | "value" | ...)
    type?: string;
    // current selected card names
    value?: string[];
    // notify parent with full array of selected names
    onChange: (names: string[]) => void;
};

export const CardPicker = ({ type, value, onChange }: CardPickerProps) => {
    // --- data sources ---
    const [allCards, setAllCards] = useState<{ name: string; type?: string }[]>(
        []
    );

    // --- ui state ---
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");
    const [modalSelection, setModalSelection] = useState<string[]>([]);

    // --- selected from props ---
    const selected = Array.isArray(value) ? value : [];

    // Load cards from global window.board (kept up-to-date by the Board)
    useEffect(() => {
        const b = (window as any)?.board;
        if (!b?.cards) return;

        const filtered = type ? b.cards.filter((c) => c.type === type) : b.cards;
        setAllCards(
            filtered.map((c: any) => ({
                name: String(c.name ?? ""),
                type: c.type,
            }))
        );
    }, [type]);

    // Memoized filtering by search
    const filteredCards = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return allCards;
        return allCards.filter((c) => c.name.toLowerCase().includes(q));
    }, [allCards, search]);

    // Toggle one in the external value (chips remove)
    const toggleDirect = (name: string) => {
        onChange(
            selected.includes(name)
                ? selected.filter((n) => n !== name)
                : [...selected, name]
        );
    };

    // Toggle inside the modal temp selection
    const toggleModalSelect = (arr: string[], name: string) =>
        arr.includes(name) ? arr.filter((n) => n !== name) : [...arr, name];

    // --- chips ---
    const chips = selected.map((name) => (
        <XStack
            key={name}
            ai="center"
            br="$4"
            px="$2.5"
            py="$1"
            bg="$color3"
            mr="$2"
            mb="$2"
            hoverStyle={{ bg: "$color4" }}
        >
            <Text mr="$1">{name}</Text>
            <Button
                size="$1"
                circular
                bg="transparent"
                onPress={() => toggleDirect(name)}
                icon={XIcon}
                scaleIcon={0.8}
            />
        </XStack>
    ));

    return (
        <>
            {/* Everything tinted EXCEPT the Dialog */}
            <Tinted>
                <YStack>
                    <Text fos="$5" mb="$2">
                        Select cards{type ? ` (${type})` : ""}
                    </Text>

                    {/* Chips row + "+" */}
                    <XStack flexWrap="wrap" ai="center">
                        {chips}

                        <Button
                            size="$2"
                            circular
                            icon={Plus}
                            onPress={() => {
                                setModalSelection(selected);
                                setOpen(true);
                            }}
                            bc="$color5"
                            bg="$color3"
                            hoverStyle={{ bg: "$color4" }}
                            mr="$2"
                            mb="$2"
                            aria-label="Add cards"
                        />
                    </XStack>
                </YStack>
            </Tinted>


            <Dialog modal open={open} onOpenChange={setOpen}>
                <Dialog.Portal>
                    <Dialog.Overlay bg="rgba(0,0,0,0.5)" animation="quick" />
                    <Dialog.Content
                        elevate
                        bordered
                        br="$6"
                        p="$4"
                        mx="auto"
                        my="10%"
                        maxWidth={480}
                        bg="$bgContent" // default dialog surface
                    >
                        <Tinted>
                            <Text fos="$7" mb="$3" fow="600">
                                Add cards
                            </Text>

                            {/* Search */}
                            <Input
                                value={search}
                                onChangeText={setSearch}
                                placeholder="Search cards..."
                                mb="$3"
                            />

                            {/* List */}
                            <ScrollView maxHeight={320}>
                                {filteredCards.map((card) => {
                                    const checked = modalSelection.includes(card.name);

                                    // Pick icon based on card.type
                                    const IconComp =
                                        card.type === "action" ? Rocket :
                                            card.type === "value" ? Eye :
                                                null; // fallback: no icon

                                    return (
                                        <XStack
                                            key={card.name}
                                            ai="center"
                                            jc="space-between"
                                            py="$2"
                                            px="$2"
                                            hoverStyle={{ backgroundColor: "$gray2" }}
                                        >
                                            {/* Clickable row (except checkbox) */}
                                            <XStack
                                                flex={1}
                                                ai="center"
                                                gap="$3"
                                                onPress={() =>
                                                    setModalSelection((prev) => toggleModalSelect(prev, card.name))
                                                }
                                            >
                                                {/* Icon */}
                                                {IconComp && (
                                                    <IconComp
                                                        size={20}
                                                        color="var(--color10)"
                                                        style={{ opacity: 0.7 }}
                                                    />
                                                )}

                                                {/* Name */}
                                                <Text fos="$5">{card.name}</Text>
                                            </XStack>

                                            {/* Checkbox */}
                                            <Checkbox
                                                pointerEvents="auto"
                                                w="$2"
                                                h="$2"
                                                focusStyle={{ outlineWidth: 0 }}
                                                checked={checked}
                                                onCheckedChange={() =>
                                                    setModalSelection((prev) => toggleModalSelect(prev, card.name))
                                                }
                                                className="no-drag"
                                                borderColor="$gray6"
                                                backgroundColor="$background"
                                            >
                                                <Checkbox.Indicator>
                                                    <Check color="var(--color8)" size={16} />
                                                </Checkbox.Indicator>
                                            </Checkbox>
                                        </XStack>
                                    );
                                })}

                            </ScrollView>

                            {/* Actions */}
                            <XStack mt="$4" jc="flex-end" gap="$3">
                                <Button
                                    onPress={() => setOpen(false)}
                                    bg="$gray3"
                                    hoverStyle={{ bg: "$gray4" }}
                                >
                                    Cancel
                                </Button>

                                <Button
                                    bc="$color7"
                                    color="white"
                                    hoverStyle={{ bc: "$color9" }}
                                    onPress={() => {
                                        onChange(modalSelection);
                                        setOpen(false);
                                    }}
                                >
                                    Add selected
                                </Button>
                            </XStack>
                        </Tinted>
                    </Dialog.Content>
                </Dialog.Portal>
            </Dialog>
        </>
    );
};
