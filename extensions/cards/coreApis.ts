export default (app, context) => {
    app.get('/api/core/v1/cards', async (req, res) => {
        const cards = await context.state.getStateTree({ chunk: 'cards' });
        res.send(cards);
    });

    app.post('/api/core/v1/cards/:group/:tag', async (req, res) => {
        const info = req.body;
        context.cards.add({
            group: req.params.group,
            tag: req.params.tag,
            ...info,
            emitEvent: true
        });
        res.send({ success: true });
    });

    app.post('/api/core/v1/cards/:group/:tag/:name/delete', async (req, res) => {
        const { group, tag, name } = req.params;
        context.cards.delete({
            group,
            tag,
            name,
            emitEvent: true,
        });
        res.send({ success: true });
    });
}
