import { useState, useEffect } from "react";
import { Sparkles, X, Maximize, Minimize, MessageSquare, Bot } from "@tamagui/lucide-icons";
import { Tinted } from "./Tinted";
import { Chat } from "./Chat";
import { YStack, Button, XStack, Paragraph, Spinner } from "@my/ui";
import { API } from 'protobase'


type Agent = {
  name: string;
  target: string;
};

export const BubbleChat = () => {
  const [isChatVisible, setIsChatVisible] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isChatLoaded, setIsChatLoaded] = useState(false);
  const [selectedBot, setSelectedBot] = useState<Agent | null>(null);
  const [bots, setBots] = useState<Agent[]>([]);
  const [loadingBots, setLoadingBots] = useState(true);


  useEffect(() => {
    const fetchBots = async () => {
      try {
        const response = await API.get("/api/agents/v1/");
        if (response.isLoaded) {
          const parsed = Object.values(response.data).map((entry: any) => ({
            name: entry.llm_agent?.name ?? entry.name,
            target: entry.llm_agent?.target ?? entry.target,
          }));
          setBots(parsed);
          setSelectedBot(parsed[0] || null);
        } else if (response.isError) {
          throw new Error(response.error);
        }
      } catch (err) {
        console.error("Error fetching bots:", err);
      } finally {
        setLoadingBots(false);
      }
    };

    fetchBots();
  }, []);

  const toggleChat = () => {
    if (isChatVisible) {
      setIsChatVisible(false);
      setIsExpanded(false);
    } else {
      if (!isChatLoaded) setIsChatLoaded(true);
      setIsChatVisible(true);
      setIsExpanded(false);
    }
  };

  const toggleExpand = () => setIsExpanded(!isExpanded);

  const showMenu = true
  console.log({ isChatLoaded, selectedBot })
  return (
    <>
      {/* FAB principal */}
      <Tinted>
        <Button
          position="absolute"
          bottom={30}
          right={30}
          size="$5"
          circular
          icon={isChatVisible ? <X size="30px" color="white" /> : <Sparkles size="30px" color="white" />}
          onPress={toggleChat}
          zIndex={isExpanded ? 100002 : 10002}
          elevation="$5"
          backgroundColor="$color7"
          hoverStyle={{ backgroundColor: "$color7" }}
        />
      </Tinted>

      {isChatVisible && (
        <Button
          position="absolute"
          bottom={30}
          right={90}
          size="$4"
          circular
          icon={isExpanded ? <Minimize color="white" size="$2" /> : <Maximize color="white" size="$2" />}
          onPress={toggleExpand}
          zIndex={isExpanded ? 100002 : 10002}
          elevation="$5"
          backgroundColor="$color7"
          hoverStyle={{ backgroundColor: "$color7" }}
        />
      )}

      <XStack
        width={isExpanded ? "100vw" : 700}
        height={isExpanded ? "calc(100vh - 0px)" : "calc(100vh - 200px)"}
        maxHeight={isExpanded ? "100vh" : 800}
        position="absolute"
        bottom={isExpanded ? 0 : 110}
        right={isExpanded ? 0 : 30}
        backgroundColor="$bgContent"
        borderRadius={isExpanded ? 0 : "$4"}
        elevation="$6"
        zIndex={100000}
        overflow="hidden"
        display={isChatVisible ? "flex" : "none"}
      >

        {showMenu && (
          <YStack
            width={220}
            backgroundColor="var(--bgPanel)"
            borderRightWidth={1}
            borderRightColor="$gray6"
            gap="$2"
            overflow="auto"
            p="$3"
          >
            <Paragraph mb="$4" color="$color11" fontWeight="700">
              Chatbots
            </Paragraph>
            {loadingBots ? (
              <YStack f={1} ai="center" jc="center" mt="$5">
                <Spinner size="large" color="$color8" />
              </YStack>
            ) : (
              bots && bots.length > 0
                ? <>
                  {bots.map((bot, index) => {
                    const isActive = selectedBot?.name === bot.name;
                    return (
                      <Tinted key={bot.name}>
                        <Button
                          f={1}
                          mih="$4"
                          mah="$4"
                          overflow="hidden"
                          icon={<Bot size={"$1"} color={isActive && "$color10"} />}
                          jc="flex-start"
                          bc={!isActive ? "transparent" : "$color2"}
                          onPress={() => setSelectedBot(bot)}
                        >{bot.name}</Button>
                      </Tinted>
                    );
                  })
                  }
                </>
                : <Paragraph textAlign="center" size="$4" color="$color11">No chatbots available</Paragraph>
            )}
          </YStack>
        )}

        {/* Área del chat */}
        <YStack flex={1} position="relative">
          {
            isChatLoaded && selectedBot
            && <Chat agent={selectedBot.name} />
          }
          {
            !selectedBot
            && <YStack flex={1} ai="center" jc="center" gap="$4">
              <Bot size="$6" color="$color11" />
              <Paragraph maw="300px" textAlign="center" size="$4" color="$color11" ml="$2">
                {
                  !loadingBots && (!bots || bots.length <= 0)
                    ? "To get started, create an AI agent board using one of the available templates"
                    : "Select a chatbot to get started."
                }
              </Paragraph>
            </YStack>
          }
        </YStack>
      </XStack >
    </ >
  );
};

export default BubbleChat;
