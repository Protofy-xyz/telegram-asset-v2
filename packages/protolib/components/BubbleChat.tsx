import { useState, useEffect } from "react";
import { Sparkles, X, Maximize, Minimize, MessageSquare } from "@tamagui/lucide-icons";
import { Tinted } from "./Tinted";
import { Chat } from "./Chat";
import { YStack, Button, XStack, Paragraph, ScrollView, Separator, Spinner } from "@my/ui";
import { API } from 'protobase'

type BubbleChatProps = {
  apiUrl: string;
};

type Agent = {
  name: string;
  target: string;
};

export const BubbleChat = ({ apiUrl }: BubbleChatProps) => {
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

  const showMenu = false

  return (
    <YStack>
      {/* FAB principal */}
      <Tinted>
        <Button
          position="absolute"
          bottom={50}
          right={50}
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
          bottom={50}
          right={110}
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
        bottom={isExpanded ? 0 : 130}
        right={isExpanded ? 0 : 50}
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
            p="$3"
            space="$2"
          >
            <Paragraph color="$color11" fontWeight="700" mb="$2">
              Chatbots
            </Paragraph>

            {loadingBots ? (
              <YStack ai="center" jc="center" mt="$5">
                <Spinner size="large" color="$color8" />
              </YStack>
            ) : (
              <ScrollView>
                {bots.map((bot, index) => {
                  const isActive = selectedBot?.name === bot.name;
                  return (
                    <Tinted key={bot.name}>
                      <YStack>
                        <XStack
                          ai="center"
                          p="$2.5"
                          borderRadius="$3"
                          hoverStyle={{ backgroundColor: "$color1" }}
                          backgroundColor={isActive ? "$color3" : "transparent"}
                          onPress={() => setSelectedBot(bot)}
                          cursor="pointer"
                          space="$3"
                        >
                          <MessageSquare
                            size={18}
                            color={isActive ? "var(--color8)" : "var(--gray11)"}
                          />
                          <Paragraph color={isActive ? "$color12" : "$gray11"}>
                            {bot.name}
                          </Paragraph>
                        </XStack>
                        {index < bots.length - 1 && <Separator borderColor="$gray6" mt="$1" mb="$1" />}
                      </YStack>
                    </Tinted>
                  );
                })}
              </ScrollView>
            )}
          </YStack>
        )}

        {/* Área del chat */}
        <YStack flex={1} position="relative">
          {/* Loading */}
          <YStack
            position="absolute"
            height="100%"
            width="100%"
            ai="center"
            jc="center"
            top={0}
            right={0}
            zIndex={-2}
          >
            <Tinted>
              <Spinner color="$color6" size={100} mb="$6" />
            </Tinted>
            <Paragraph size="$5">Loading chat...</Paragraph>
          </YStack>

          {/* Chat iframe */}
          {isChatLoaded && selectedBot && <Chat apiUrl={apiUrl} />}
        </YStack>
      </XStack>
    </YStack>
  );
};

export default BubbleChat;
