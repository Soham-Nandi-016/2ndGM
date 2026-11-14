import React, { useState, useCallback, useMemo } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ChessBoard } from '../../components/board/ChessBoard';
import { useChessGame } from '../../hooks/useChessGame';
import { useEngine } from '../../hooks/useEngine';
import { MoveList, MoveItem } from '../../components/analysis/MoveList';
import { EvalBar } from '../../components/analysis/EvalBar';
import { EngineLines } from '../../components/analysis/EngineLines';
import { CoachSheet } from '../../components/coach/CoachSheet';
import { CoachRequest } from '../../hooks/useCoach';
import {
  Colors,
  FontFamily,
  FontSize,
  Spacing,
  Radius,
  Shadow,
} from '../../constants/theme';

export default function AnalyzeScreen(): React.ReactElement {
  const game = useChessGame();
  const engine = useEngine();

  const [pgnInput, setPgnInput] = useState('');
  const [pgnError, setPgnError] = useState<string | null>(null);
  
  // activePly represents the 0-based index in the move history.
  // null means no move is actively selected (e.g. starting position or latest position).
  const [activePly, setActivePly] = useState<number | null>(null);
  const [isCoachVisible, setIsCoachVisible] = useState(false);

  // Derive move items for the MoveList
  const moveItems: MoveItem[] = useMemo(() => {
    return game.history.map((san, idx) => {
      const moveNumber = Math.floor(idx / 2) + 1;
      // Backend plies are typically 1-indexed
      const analysisData = engine.data?.moves?.find(m => m.ply === idx + 1);

      return {
        index: idx,
        moveNumber,
        san,
        isWhite: idx % 2 === 0,
        analysis: analysisData,
      };
    });
  }, [game.history, engine.data]);

  // Determine the current evaluation to show
  const currentAnalysis = useMemo(() => {
    if (!engine.data?.moves) return null;
    
    // If a specific ply is selected, show its evaluation
    if (activePly !== null) {
      return engine.data.moves.find(m => m.ply === activePly + 1);
    }
    
    // Otherwise show the latest evaluation
    const movesLength = game.history.length;
    if (movesLength > 0) {
      return engine.data.moves.find(m => m.ply === movesLength);
    }
    
    return null;
  }, [engine.data, activePly, game.history.length]);

  const coachContext = useMemo((): Omit<CoachRequest, 'userMessage'> => {
    return {
      fen: game.fen(),
      last5Moves: game.history().slice(-5),
      stockfishTop3: currentAnalysis?.topLines?.map(l => ({
        move: l.move,
        eval: l.eval_cp ?? (l.mate_in ? `M${l.mate_in}` : 0),
        line: l.line
      })) || [],
      themes: [],
    };
  }, [game, currentAnalysis]);

  // ── Load PGN & Trigger Analysis ──
  const handleLoadPgn = useCallback(() => {
    Keyboard.dismiss();
    const cleanPgn = pgnInput.trim();
    if (!cleanPgn) {
      setPgnError('Please paste a PGN string first.');
      return;
    }

    const success = game.loadPgn(cleanPgn);
    if (success) {
      setPgnError(null);
      setActivePly(null);
      
      // Fire off analysis
      engine.mutate({ pgn: cleanPgn, depth: 18 });
    } else {
      setPgnError('Invalid PGN — check the format and try again.');
    }
  }, [pgnInput, game, engine]);

  // ── Clear board ──
  const handleReset = useCallback(() => {
    game.reset();
    setPgnInput('');
    setPgnError(null);
    setActivePly(null);
    engine.reset();
  }, [game, engine]);

  // ── Move chip press ──
  const handleMoveTap = useCallback((ply: number) => {
    setActivePly(ply);
    // In Phase 1.3, we just highlight and show eval. 
    // Jumping board state via FEN replay will be in Phase 1.4/1.5
  }, []);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.screenTitle}>PGN Analyzer</Text>
            <TouchableOpacity
              onPress={handleReset}
              accessibilityLabel="Reset board"
              style={styles.resetBtn}
            >
              <Text style={styles.resetBtnText}>Reset</Text>
            </TouchableOpacity>
          </View>

          {/* Board Area */}
          <View style={styles.boardContainer}>
            <EvalBar 
              scoreCp={currentAnalysis?.eval ?? 0} 
              // Assuming mate scores could be returned in future API adjustments,
              // or handle standard centipawn mate representations like 10000
              mateScore={currentAnalysis?.eval && Math.abs(currentAnalysis.eval) >= 10000 ? Math.sign(currentAnalysis.eval) : undefined} 
            />
            <View style={styles.boardWrapper}>
              <ChessBoard externalGame={game} showCoordinates />
            </View>
          </View>

          {/* Move List */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Move History</Text>
            {moveItems.length > 0 ? (
              <MoveList moves={moveItems} activePly={activePly} onMoveTap={handleMoveTap} />
            ) : (
              <Text style={styles.emptyMoves}>No moves yet — paste a PGN or play on the board above.</Text>
            )}
          </View>

          {/* Engine Lines */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Engine Lines</Text>
            {engine.isPending ? (
              <View style={styles.enginePlaceholder}>
                <ActivityIndicator size="small" color={Colors.primary} />
                <Text style={styles.enginePlaceholderSub}>Analyzing position...</Text>
              </View>
            ) : engine.isError ? (
              <View style={styles.enginePlaceholder}>
                <Text style={styles.enginePlaceholderIcon}>❌</Text>
                <Text style={styles.enginePlaceholderTitle}>Analysis Failed</Text>
                <Text style={styles.enginePlaceholderSub}>Check your connection or API configuration.</Text>
              </View>
            ) : currentAnalysis?.topLines ? (
              <EngineLines lines={currentAnalysis.topLines} />
            ) : (
              <View style={styles.enginePlaceholder}>
                <Text style={styles.enginePlaceholderIcon}>⚡</Text>
                <Text style={styles.enginePlaceholderTitle}>Engine Analysis</Text>
                <Text style={styles.enginePlaceholderSub}>
                  Paste a game to generate Stockfish evaluation
                </Text>
              </View>
            )}
          </View>

          {/* PGN Input */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Paste PGN</Text>
            <TextInput
              value={pgnInput}
              onChangeText={(t) => {
                setPgnInput(t);
                if (pgnError) setPgnError(null);
              }}
              placeholder={'1. e4 e5 2. Nf3 Nc6 3. Bb5 ...'}
              placeholderTextColor={Colors.textSecondary}
              multiline
              numberOfLines={5}
              style={styles.pgnInput}
              autoCorrect={false}
              autoCapitalize="none"
              returnKeyType="done"
              textAlignVertical="top"
              accessibilityLabel="PGN input"
            />
            {pgnError && (
              <Text style={styles.errorText}>{pgnError}</Text>
            )}
            <TouchableOpacity
              onPress={handleLoadPgn}
              activeOpacity={0.8}
              accessibilityLabel="Analyze PGN"
              style={[styles.analyzeBtn, engine.isPending && styles.analyzeBtnDisabled]}
              disabled={engine.isPending}
            >
              <Text style={styles.analyzeBtnText}>
                {engine.isPending ? '⚡  Analyzing...' : '⚡  Analyze Game'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: Spacing.xxxl }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Coach FAB */}
      {game.history().length > 0 && (
        <TouchableOpacity
          style={styles.coachFab}
          onPress={() => setIsCoachVisible(true)}
          activeOpacity={0.9}
        >
          <Text style={styles.coachFabText}>♔ Ask Coach</Text>
        </TouchableOpacity>
      )}

      {/* AI Coach Bottom Sheet */}
      <CoachSheet
        visible={isCoachVisible}
        onClose={() => setIsCoachVisible(false)}
        context={coachContext}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: Spacing.xxl },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.base,
  },
  screenTitle: {
    fontFamily: FontFamily.interBold,
    fontSize: FontSize.xl,
    color: Colors.textPrimary,
  },
  resetBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  resetBtnText: {
    fontFamily: FontFamily.interMedium,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },

  boardContainer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.base,
    alignItems: 'center',
  },
  boardWrapper: {
    flex: 1,
  },

  section: {
    paddingHorizontal: Spacing.base,
    marginTop: Spacing.lg,
  },
  sectionLabel: {
    fontFamily: FontFamily.interSemiBold,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: Spacing.sm,
  },

  emptyMoves: {
    fontFamily: FontFamily.interRegular,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },

  // Engine placeholder
  enginePlaceholder: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.base,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    ...Shadow.sm,
  },
  enginePlaceholderIcon: { fontSize: 28, marginBottom: Spacing.xs },
  enginePlaceholderTitle: {
    fontFamily: FontFamily.interSemiBold,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
  },
  enginePlaceholderSub: {
    fontFamily: FontFamily.interRegular,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },

  // PGN input
  pgnInput: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    fontFamily: FontFamily.monoRegular,
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
    minHeight: 110,
    lineHeight: FontSize.sm * 1.6,
  },
  errorText: {
    fontFamily: FontFamily.interRegular,
    fontSize: FontSize.sm,
    color: Colors.danger,
    marginTop: Spacing.xs,
  },
  analyzeBtn: {
    marginTop: Spacing.md,
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    ...Shadow.md,
  },
  analyzeBtnDisabled: {
    opacity: 0.6,
  },
  analyzeBtnText: {
    fontFamily: FontFamily.interSemiBold,
    fontSize: FontSize.md,
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  coachFab: {
    position: 'absolute',
    bottom: Spacing.xl,
    right: Spacing.lg,
    backgroundColor: Colors.brilliant,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: Radius.pill,
    ...Shadow.lg,
  },
  coachFabText: {
    fontFamily: FontFamily.interBold,
    fontSize: FontSize.md,
    color: '#FFFFFF',
  },
});
