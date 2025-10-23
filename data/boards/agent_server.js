const { boardConnect } = require('protonode')
const { Protofy } = require('protobase')

const run = Protofy("code", async ({ context, states, board }) => {
await board.execute_action({name: "http_endpoint", params:{action:"skip"}})
board.onChange({
    name: 'current_request',
    changed: value => {
        if(value) {
            board.execute_action({ name: 'reload agents', params: {} });
            board.execute_action({ name: 'reply', params: {} });
        }
    }
});
})

boardConnect(run)