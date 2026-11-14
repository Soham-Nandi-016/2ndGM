import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  FlatList,
  ActivityIndicator,
  Modal,
  SafeAreaView
} from 'react-native';
import { Colors, FontFamily, FontSize, Spacing, Radius, Shadow } from '../../constants/theme';
import { useCoach, ChatMessage, CoachRequest } from '../../hooks/useCoach';
import { CoachBubble } from './CoachBubble';

interface CoachSheetProps {
  visible: boolean;
  onClose: () => void;
  context: Omit<CoachRequest, 'userMessage'>;
}

export function CoachSheet({ visible, onClose, context }: CoachSheetProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const flatListRef = useRef<FlatList>(null);
  const coachMutation = useCoach();

  // Reset messages when sheet opens for a new position
  useEffect(() => {
    if (visible && messages.length === 0) {
      handleSend("What do you think of this position?");
    }
  }, [visible, context.fen]);

  const handleSend = (textOverride?: string) => {
    const textToSend = textOverride || inputText.trim();
    if (!textToSend) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: textToSend,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');

    coachMutation.mutate(
      {
        ...context,
        userMessage: textToSend,
      },
      {
        onSuccess: (data) => {
          const coachMsg: ChatMessage = {
            id: (Date.now() + 1).toString(),
            role: 'coach',
            text: data.advice,
            keyIdea: data.keyIdea,
            warningLevel: data.warningLevel,
            timestamp: Date.now(),
          };
          setMessages(prev => [...prev, coachMsg]);
        },
        onError: (error) => {
          const errorMsg: ChatMessage = {
            id: (Date.now() + 1).toString(),
            role: 'coach',
            text: "I'm sorry, I couldn't process that right now. Please check your connection.",
            timestamp: Date.now(),
          };
          setMessages(prev => [...prev, errorMsg]);
        }
      }
    );
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        
        <KeyboardAvoidingView
          style={styles.sheetContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <SafeAreaView style={styles.safeArea}>
            <View style={styles.header}>
              <View style={styles.dragHandle} />
              <Text style={styles.title}>AI Coach</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Text style={styles.closeText}>Close</Text>
              </TouchableOpacity>
            </View>

            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={item => item.id}
              renderItem={({ item }) => <CoachBubble message={item} />}
              contentContainerStyle={styles.chatList}
              onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            />

            {coachMutation.isPending && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={Colors.primary} />
                <Text style={styles.loadingText}>Coach is thinking...</Text>
              </View>
            )}

            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Ask about a plan, move, or idea..."
                placeholderTextColor={Colors.textSecondary}
                value={inputText}
                onChangeText={setInputText}
                onSubmitEditing={() => handleSend()}
                returnKeyType="send"
              />
              <TouchableOpacity
                style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]}
                onPress={() => handleSend()}
                disabled={!inputText.trim() || coachMutation.isPending}
              >
                <Text style={styles.sendBtnText}>Send</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  sheetContainer: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '80%',
    ...Shadow.lg,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    marginBottom: Spacing.sm,
  },
  title: {
    fontFamily: FontFamily.interBold,
    fontSize: FontSize.lg,
    color: Colors.textPrimary,
  },
  closeBtn: {
    position: 'absolute',
    right: Spacing.md,
    top: Spacing.md,
    padding: Spacing.sm,
  },
  closeText: {
    fontFamily: FontFamily.interSemiBold,
    fontSize: FontSize.sm,
    color: Colors.primary,
  },
  chatList: {
    padding: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    alignItems: 'center',
    backgroundColor: Colors.surfaceElevated,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.md,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    fontFamily: FontFamily.interRegular,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sendBtn: {
    marginLeft: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
  },
  sendBtnDisabled: {
    opacity: 0.5,
  },
  sendBtnText: {
    fontFamily: FontFamily.interSemiBold,
    fontSize: FontSize.sm,
    color: '#FFFFFF',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
  },
  loadingText: {
    marginLeft: Spacing.sm,
    fontFamily: FontFamily.interMedium,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  }
});
