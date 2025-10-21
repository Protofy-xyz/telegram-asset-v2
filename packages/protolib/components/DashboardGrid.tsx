import { useCallback, useRef } from "react";
import { Responsive, WidthProvider } from "react-grid-layout";
import { Stack } from "@my/ui";
import { Tinted } from './Tinted';
import { gridSizes } from '../lib/gridConfig';

const ResponsiveGridLayout = WidthProvider(Responsive);

export { gridSizes }; // re-export for existing imports

export const breakpoints = { lg: 1500, md: 800, sm: 400, xs: 0 }
export const getCurrentBreakPoint = (w, bps?) => {
    if (!bps) {
        bps = breakpoints
    }
    return w >= bps.lg ? "lg" :
        w >= bps.md ? "md" :
            w >= bps.sm ? "sm" : "xs";
}

export const DashboardGrid = ({
    items = [],
    layouts = {},
    borderRadius = 10,
    padding = 10,
    settings = {},
    extraScrollSpace = 0,
    ...props
}) => {

    const mergedWrapperStyle = extraScrollSpace ? {
        height: '100%',
        overflow: 'auto',
        flex: 1,
        minHeight: 0,
        paddingBottom: extraScrollSpace,
        boxSizing: 'border-box' as const,
    } : {};

    return (
        <Tinted>
            <Stack style={mergedWrapperStyle}>
                <ResponsiveGridLayout
                    {...props}
                    className="layout"
                    layouts={layouts}
                    margin={[6, 6]}
                    breakpoints={breakpoints}
                    rowHeight={30}
                    draggableCancel=".no-drag"
                    {...settings}
                    style={{
                        ...props['style'],
                        ...settings['style'],
                    }}
                    cols={{ lg: gridSizes.lg.totalCols, md: gridSizes.md.totalCols, sm: gridSizes.sm.totalCols, xs: gridSizes.xs.totalCols }}
                >
                    {items.map((item) => (
                        <Stack flex={1} key={item.key}>{item.content}</Stack>
                    ))}
                </ResponsiveGridLayout>
            </Stack>
        </Tinted>
    );
};
