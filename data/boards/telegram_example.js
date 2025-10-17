const { boardConnect } = require('protonode')
const { Protofy } = require('protobase')

const run = Protofy("code", async ({ context, states, board }) => {
  board.onChange({
    name: "Telegram last received message",
    changed: async (value) => {
      if (value.content.startsWith("/files")) {
        const fileName = value.content.split(" ")[1];
        await board.execute_action({
          name: "files_read",
          params: {
            path: "data/public",
          },
        });
        const files = states["files_read"];
        if (files.includes(fileName)) {
          await board.execute_action({
            name: "Telegram send file",
            params: {
              chat_id: value.chat_id,
              path: `data/public/${fileName}`,
            },
          });
        } else {
          await board.execute_action({
            name: "Telegram send message",
            params: {
              chat_id: value.chat_id,
              message: "File does not exist.",
            },
          });
        }
      }
      await board.execute_action({
        name: "files_read",
        params: {
          path: "data/public",
        },
      });
    },
  });

})

boardConnect(run)