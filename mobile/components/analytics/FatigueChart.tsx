import React from 'react';
import { View, Dimensions } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop, Line, Text as SvgText } from 'react-native-svg';
import { Colors, FontFamily, FontSize } from '../../constants/theme';
import { FatiguePoint } from '../../store/telemetryStore';

interface Props {
  data: FatiguePoint[];
  width?: number;
  height?: number;
}

export default function FatigueChart({ data, width = Dimensions.get('window').width - 64, height = 200 }: Props) {
  if (!data || data.length === 0) return null;

  const padding = { top: 20, right: 20, bottom: 30, left: 40 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const minMove = Math.min(...data.map(d => d.moveCount));
  const maxMove = Math.max(...data.map(d => d.moveCount));
  const minAcc = 40; // baseline for chart visualization
  const maxAcc = 100;

  const getX = (move: number) => padding.left + ((move - minMove) / (maxMove - minMove)) * chartWidth;
  const getY = (acc: number) => padding.top + chartHeight - ((acc - minAcc) / (maxAcc - minAcc)) * chartHeight;

  // Generate SVG Path using a simple bezier smoothing strategy
  const pathD = data.map((d, i) => {
    const x = getX(d.moveCount);
    const y = getY(d.accuracy);
    if (i === 0) return `M ${x} ${y}`;
    
    const prev = data[i - 1];
    const prevX = getX(prev.moveCount);
    const prevY = getY(prev.accuracy);
    const cpX = (prevX + x) / 2;
    
    return `C ${cpX} ${prevY}, ${cpX} ${y}, ${x} ${y}`;
  }).join(' ');

  // Gradient fill area
  const areaD = `${pathD} L ${getX(maxMove)} ${padding.top + chartHeight} L ${getX(minMove)} ${padding.top + chartHeight} Z`;

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="fatigueGradient" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={Colors.primary} stopOpacity="0.4" />
            <Stop offset="1" stopColor={Colors.primary} stopOpacity="0.0" />
          </LinearGradient>
        </Defs>

        {/* Grid lines and Y axis labels */}
        {[40, 60, 80, 100].map(val => (
          <React.Fragment key={`grid-${val}`}>
            <Line 
              x1={padding.left} 
              y1={getY(val)} 
              x2={width - padding.right} 
              y2={getY(val)} 
              stroke={Colors.border} 
              strokeWidth="1" 
              strokeDasharray="4,4"
            />
            <SvgText
              x={padding.left - 10}
              y={getY(val) + 4}
              fill={Colors.textSecondary}
              fontSize={FontSize.xs}
              fontFamily={FontFamily.interMedium}
              textAnchor="end"
            >
              {val}%
            </SvgText>
          </React.Fragment>
        ))}

        {/* X axis labels */}
        {[0, 20, 40, 60].map(val => {
            if (val < minMove || val > maxMove) return null;
            return (
              <SvgText
                key={`x-${val}`}
                x={getX(val)}
                y={height - 5}
                fill={Colors.textSecondary}
                fontSize={FontSize.xs}
                fontFamily={FontFamily.interMedium}
                textAnchor="middle"
              >
                M{val}
              </SvgText>
            );
        })}

        {/* Area and Line */}
        <Path d={areaD} fill="url(#fatigueGradient)" />
        <Path d={pathD} fill="none" stroke={Colors.primary} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    </View>
  );
}
