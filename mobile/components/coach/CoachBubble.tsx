import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ChatMessage } from '../../hooks/useCoach';
import { Colors, FontFamily, FontSize, Spacing, Radius, Shadow } from '../../constants/theme';

interface CoachBubbleProps {
  message: ChatMessage;
}

export function CoachBubble({ message }: CoachBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <View style={[styles.container, isUser ? styles.userContainer : styles.coachContainer]}>
      {/* Coach Header */}
      {!isUser && (
        <View style={styles.coachHeader}>
          <Text style={styles.coachTitle}>♔ Grandmaster Coach</Text>
          {message.warningLevel && message.warningLevel !== 'neutral' && (
            <View style={[
              styles.warningBadge, 
              message.warningLevel === 'critical' ? styles.badgeCritical : styles.badgeCaution
            ]}>
              <Text style={styles.badgeText}>{message.warningLevel.toUpperCase()}</Text>
            </View>
          )}
        </View>
      )}

      <Text style={[styles.messageText, isUser ? styles.userText : styles.coachText]}>
        {message.text}
      </Text>

      {/* Key Idea (Only for Coach) */}
      {!isUser && message.keyIdea && (
        <View style={styles.keyIdeaBox}>
          <Text style={styles.keyIdeaLabel}>KEY IDEA</Text>
          <Text style={styles.keyIdeaText}>{message.keyIdea}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    maxWidth: '85%',
    padding: Spacing.md,
    borderRadius: Radius.lg,
    marginBottom: Spacing.md,
    ...Shadow.sm,
  },
  userContainer: {
    alignSelf: 'flex-end',
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 4,
  },
  coachContainer: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.surfaceElevated,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  messageText: {
    fontFamily: FontFamily.interRegular,
    fontSize: FontSize.md,
    lineHeight: FontSize.md * 1.5,
  },
  userText: {
    color: '#FFFFFF',
  },
  coachText: {
    color: Colors.textPrimary,
  },
  coachHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  coachTitle: {
    fontFamily: FontFamily.interSemiBold,
    fontSize: FontSize.sm,
    color: Colors.brilliant,
  },
  warningBadge: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: Radius.pill,
  },
  badgeCritical: {
    backgroundColor: 'rgba(249, 79, 79, 0.2)',
  },
  badgeCaution: {
    backgroundColor: 'rgba(249, 199, 79, 0.2)',
  },
  badgeText: {
    fontFamily: FontFamily.interBold,
    fontSize: 10,
    color: Colors.textPrimary,
  },
  keyIdeaBox: {
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  keyIdeaLabel: {
    fontFamily: FontFamily.interBold,
    fontSize: FontSize.xs,
    color: Colors.accent,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  keyIdeaText: {
    fontFamily: FontFamily.interMedium,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
});
