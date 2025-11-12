//@card/react
function countLeaves(obj, { debug = false } = {}, seen = new WeakSet(), _path = '', leaves = []) {
  if (obj === null || typeof obj !== 'object') {
    leaves.push(_path || '(root)');
    return leaves;
  }
  if (seen.has(obj)) return leaves;
  seen.add(obj);

  for (const k in obj) {
    const val = obj[k];
    const newPath = _path ? _path + '.' + k : k;
    if (val && typeof val === 'object') {
      countLeaves(val, { debug }, seen, newPath, leaves);
    } else {
      leaves.push(newPath);
    }
  }

  return debug ? leaves : leaves.length;
}

function Widget(card) {
  const value = card.value;
  return (
      <Tinted>
        <ProtoThemeProvider forcedTheme={window.TamaguiTheme}>
            <YStack f={1} height="100%" ai="center" jc="center" width="100%">
                {card.icon && card.displayIcon !== false && (
                    <Icon name={card.icon} size={48} color={card.color}/>
                )}
                {card.displayResponse !== false && (
                    <CardValue JSONViewProps={{collapsed: 1}} mode={card.markdownDisplay ? 'markdown' : card.htmlDisplay ? 'html' : 'normal'} value={value ?? "N/A"} />
                )}
            </YStack>
        </ProtoThemeProvider>
      </Tinted>
  );
}