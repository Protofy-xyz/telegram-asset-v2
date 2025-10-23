const { boardConnect } = require('protonode')
const { Protofy } = require('protobase')

const run = Protofy("code", async ({ context, states, board }) => {
board.onChange({
  name: 'user_request',
  changed: async (value) => {
    if (!value || !value.id) return;

    board.execute_action({
      name: "agent_core", params: {
        requestId: value?.id ?? "",
        prompt: value?.params?.prompt ?? ""
      }
    })
  },
});
})

boardConnect(run)
