type ChatProps = {
    agent: string;
  };
  
  export const Chat = ({ agent }: ChatProps) => {
    return (
      <iframe
        src={"/workspace/chatbot?agent=" + encodeURIComponent(agent)}
        width="100%"
        height="100%"
        style={{ border: "none" }}
        title="Chat Widget"
      />
    );
  };