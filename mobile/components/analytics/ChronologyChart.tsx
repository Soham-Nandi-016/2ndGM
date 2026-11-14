import React from 'react';
import { View, Dimensions } from 'react-native';
import Svg, { Rect, Text as SvgText, Line } from 'react-native-svg';
import { Colors, FontFamily, FontSize } from '../../constants/theme';
import { ChronologyPoint } from '../../store/telemetryStore';

interface Props {
  data: ChronologyPoint[];
  width?: number;
  height?: number;
}

export default function ChronologyChart({ data, width = Dimensions.get('window').width - 64, height = 180 }: Props) {
  if (!data || data.length === 0) return null;

  const padding = { top: 20, right: 10, bottom: 25, left: 10 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  
  const barWidth = (chartWidth / data.length) * 0.6;
  const barSpacing = (chartWidth / data.length);

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height}>
        {/* Baseline */}
        <Line 
          x1={padding.left} 
          y1={padding.top + chartHeight} 
          x2={width - padding.right} 
          y2={padding.top + chartHeight} 
          stroke={Colors.border} 
          strokeWidth="2" 
        />

        {data.map((d, i) => {
          // Normalize winRate to height (0.0 to 1.0 -> 0 to chartHeight)
          const barHeight = d.winRate * chartHeight;
          const x = padding.left + (i * barSpacing) + (barSpacing - barWidth) / 2;
          const y = padding.top + chartHeight - barHeight;

          // Color classification: Tilt window (danger), peak window (success), normal (primary)
          let fill: string = Colors.primary;
          if (d.tiltProbability > 0.6) fill = Colors.danger;
          else if (d.winRate > 0.5) fill = Colors.success;

          return (
            <React.Fragment key={`bar-${i}`}>
              <Rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                fill={fill}
                rx={2}
                ry={2}
              />
              {/* Only show label for every 4th hour to prevent crowding */}
              {i % 4 === 0 && (
                <SvgText
                  x={x + barWidth / 2}
                  y={height - 5}
                  fill={Colors.textSecondary}
                  fontSize={FontSize.xs}
                  fontFamily={FontFamily.interMedium}
                  textAnchor="middle"
                >
                  {`${i}h`}
                </SvgText>
              )}
            </React.Fragment>
          );
        })}
      </Svg>
    </View>
  );
}
