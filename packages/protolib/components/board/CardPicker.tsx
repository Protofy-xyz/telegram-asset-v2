import { useState, useEffect } from "react";
import {
    XStack, YStack, Text, Input, Button, Checkbox, ScrollView, Dialog, Card
} from "@my/ui";
import { Check, Plus, X as XIcon } from "@tamagui/lucide-icons";

export const CardPicker = ({ type, value, onChange }) => {
    const [allCards, setAllCards] = useState([]);
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");
    const [modalSelection, setModalSelection] = useState([]);

    // ✅ Load cards from global window.board
    useEffect(() => {
        const b = (window as any).board;
        if (!b?.cards) return;

        const filtered = type
            ? b.cards.filter(c => c.type === type)
            : b.cards;

        setAllCards(filtered);
    }, [type]);

    const selected = Array.isArray(value) ? value : [];

    const toggleDirect = (name) =>
        onChange(
            selected.includes(name)
                ? selected.filter(n => n !== name)
                : [...selected, name]
        );

    const toggleModalSelect = (arr, name) =>
        arr.includes(name) ? arr.filter(n => n !== name) : [...arr, name];

    // ✅ Render chips
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

    const filteredCards = allCards.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <YStack>
            <Text fos="$5" mb="$2">
                Select cards{type ? ` (${type})` : ""}
            </Text>

            {/* ✅ Row chips + "+" button */}
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
                />
            </XStack>

            {/* ✅ DIALOG */}
            <Dialog modal open={open} onOpenChange={setOpen}>
                <Dialog.Portal>
                    <Dialog.Overlay
                        bg="rgba(0,0,0,0.5)"
                        animation="quick"
                    />

                    <Dialog.Content
                        elevate
                        bordered
                        br="$6"
                        p="$4"
                        mx="auto"
                        my="10%"
                        maxWidth={450}
                        bg="$bgSurface"
                    >
                        <Text fos="$7" mb="$3" fow="600">
                            Add cards
                        </Text>

                        {/* ✅ Search box */}
                        <Input
                            value={search}
                            onChangeText={setSearch}
                            placeholder="Search cards…"
                            mb="$3"
                        />

                        {/* ✅ List */}
                        <ScrollView maxHeight={300}>
                            {filteredCards.map(card => {
                                const checked = modalSelection.includes(card.name);

                                return (
                                    <XStack
                                        key={card.name}
                                        ai="center"
                                        jc="space-between"
                                        py="$2"
                                        px="$1"
                                        hoverStyle={{ bg: "$gray3" }}
                                        onPress={() =>
                                            setModalSelection(prev =>
                                                toggleModalSelect(prev, card.name)
                                            )
                                        }
                                    >
                                        <Text>{card.name}</Text>

                                        <Checkbox
                                            checked={checked}
                                            onCheckedChange={() =>
                                                setModalSelection(prev =>
                                                    toggleModalSelect(prev, card.name)
                                                )
                                            }
                                        >
                                            <Checkbox.Indicator bg="$color10">
                                                <Check size={12} color="white" />
                                            </Checkbox.Indicator>
                                        </Checkbox>
                                    </XStack>
                                );
                            })}
                        </ScrollView>

                        {/* ✅ Buttons */}
                        <XStack mt="$4" jc="flex-end" gap="$3">
                            <Button
                                onPress={() => setOpen(false)}
                                bg="$gray3"
                                hoverStyle={{ bg: "$gray4" }}
                            >
                                Cancel
                            </Button>

                            <Button
                                bc="$color10"
                                color="white"
                                onPress={() => {
                                    onChange(modalSelection);
                                    setOpen(false);
                                }}
                                hoverStyle={{ bc: "$color9" }}
                            >
                                Add selected
                            </Button>
                        </XStack>
                    </Dialog.Content>
                </Dialog.Portal>
            </Dialog>
        </YStack>
    );
};
