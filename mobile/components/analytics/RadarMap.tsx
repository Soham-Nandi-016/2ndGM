import React from 'react';
import { View, Dimensions } from 'react-native';
import Svg, { Polygon, Line, Text as SvgText, Circle } from 'react-native-svg';
import { Colors, FontFamily, FontSize } from '../../constants/theme';
import { RadarPoint } from '../../store/telemetryStore';

interface Props {
  data: RadarPoint[];
  size?: number;
}

export default function RadarMap({ data, size = Dimensions.get('window').width - 64 }: Props) {
  if (!data || data.length === 0) return null;

  const center = size / 2;
  const radius = (size / 2) - 40; // reserve padding for external motif labels
  const angleStep = (Math.PI * 2) / data.length;

  // Calculates Cartesian coordinate given a polar point
  const getCoordinates = (value: number, angle: number) => {
    const r = (value / 100) * radius;
    return {
      x: center + r * Math.sin(angle), // Top-centered layout
      y: center - r * Math.cos(angle),
    };
  };

  // Compile full shape string for polygon
  const pointsD = data.map((d, i) => {
    const { x, y } = getCoordinates(d.score, i * angleStep);
    return `${x},${y}`;
  }).join(' ');

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        {/* Background concentric webs (20%, 40%, 60%, 80%, 100%) */}
        {[0.2, 0.4, 0.6, 0.8, 1].map(level => {
          const webPoints = data.map((_, i) => {
            const { x, y } = getCoordinates(level * 100, i * angleStep);
            return `${x},${y}`;
          }).join(' ');
          return (
            <Polygon 
              key={`web-${level}`} 
              points={webPoints} 
              fill="none" 
              stroke={Colors.border} 
              strokeWidth="1" 
            />
          );
        })}

        {/* Diagonal axes connecting origin to 100% outer rim */}
        {data.map((_, i) => {
          const { x, y } = getCoordinates(100, i * angleStep);
          return (
            <Line 
              key={`axis-${i}`} 
              x1={center} 
              y1={center} 
              x2={x} 
              y2={y} 
              stroke={Colors.border} 
              strokeWidth="1" 
            />
          );
        })}

        {/* Primary Data Polygon overlay mapping player accuracy */}
        <Polygon 
          points={pointsD} 
          fill={Colors.accent} 
          fillOpacity="0.35" 
          stroke={Colors.accent} 
          strokeWidth="2" 
          strokeLinejoin="round" 
        />

        {/* Peripheral labels drawing motifs & scores */}
        {data.map((d, i) => {
          const labelDist = radius + 20;
          const labelAngle = i * angleStep;
          const x = center + labelDist * Math.sin(labelAngle);
          const y = center - labelDist * Math.cos(labelAngle);
          
          let textAnchor: "middle" | "start" | "end" = "middle";
          if (Math.sin(labelAngle) > 0.1) textAnchor = "start";
          if (Math.sin(labelAngle) < -0.1) textAnchor = "end";

          return (
            <React.Fragment key={`label-${i}`}>
                <SvgText
                  x={x}
                  y={y}
                  fill={Colors.textPrimary}
                  fontSize={FontSize.xs}
                  fontFamily={FontFamily.interMedium}
                  textAnchor={textAnchor}
                  alignmentBaseline="middle"
                >
                  {d.motif}
                </SvgText>
                 <SvgText
                  x={x}
                  y={y + 16}
                  fill={Colors.success}
                  fontSize={FontSize.xs}
                  fontFamily={FontFamily.monoBold}
                  textAnchor={textAnchor}
                  alignmentBaseline="middle"
                >
                  {Math.round(d.score)}
                </SvgText>
            </React.Fragment>
          );
        })}
        
        {/* Core center dot origin */}
        <Circle cx={center} cy={center} r="3" fill={Colors.accent} />
      </Svg>
    </View>
  );
}
