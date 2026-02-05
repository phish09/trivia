"use server";

import { getSupabaseClient } from "@/lib/db";
import { generateGameCode } from "@/lib/util";
import type { 
  QuestionInput, 
  Game, 
  CreateGameResult, 
  JoinGameResult,
  ImportQuestionsResult,
  DatabaseQuestion,
  DatabasePlayer,
  DatabasePlayerAnswer,
  DatabaseGame
} from "@/types/game";
import { 
  normalizeError, 
  getUserFriendlyMessage, 
  logError, 
  isNetworkError,
  createError,
  TriviaError
} from "@/lib/errorHandler";
import { 
  GAME_EXPIRY_MS, 
  QUESTION_ORDER_FALLBACK,
  MAX_PLAYERS_PER_GAME
} from "@/lib/constants";

export async function createGame(
  hostName: string, 
  password?: string,
  gameType: 'traditional' | 'wager' = 'traditional'
): Promise<CreateGameResult> {
  try {
    const supabase = getSupabaseClient();
    const code = generateGameCode();
    const { data, error } = await supabase
      .from("games")
      .insert({ 
        code, 
        host_name: hostName, 
        host_password: password || null,
        game_type: gameType,
        wager_amounts: gameType === 'wager' ? [2, 4, 6, 8, 10] : null,
        bonus_max_wager: gameType === 'wager' ? 20 : null
      })
      .select()
      .single();
    
    if (error) {
      logError(error, "createGame");
      throw createError(
        error.message || `Failed to create game: ${JSON.stringify(error)}`,
        "SUPABASE_ERROR"
      );
    }
    
    if (!data) {
      throw createError("Failed to create game: No data returned", "NO_DATA");
    }
    
    return data;
  } catch (error) {
    const normalized = normalizeError(error);
    
    // Check if this is an environment variable error
    if (normalized.message.includes("Missing required environment variable")) {
      throw createError(
        normalized.message,
        "MISSING_ENV_VAR",
        true
      );
    }
    
    // Handle network errors with helpful message
    if (isNetworkError(error)) {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "not configured";
      throw createError(
        `Failed to connect to Supabase database.\n\n` +
        `Attempting to connect to: ${url}\n\n` +
        `Please check:\n` +
        `1. Your Supabase project is active (not paused)\n` +
        `2. Your internet connection is working\n` +
        `3. Your .env.local file has the correct NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY\n` +
        `4. You have restarted your Next.js dev server after updating .env.local\n` +
        `5. Your Node.js version is compatible (try Node.js 18.15+)`,
        "NETWORK_ERROR",
        true
      );
    }
    
    // Re-throw TriviaError as-is
    if (error instanceof TriviaError) {
      throw error;
    }
    
    // Wrap unknown errors
    throw createError(
      normalized.message || "Unknown error occurred",
      "UNKNOWN_ERROR"
    );
  }
}

export async function updateGameSettings(
  gameId: string,
  wagerAmounts: number[],
  bonusMaxWager: number
) {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from("games")
    .update({
      wager_amounts: wagerAmounts,
      bonus_max_wager: bonusMaxWager,
      last_activity: new Date().toISOString()
    })
    .eq("id", gameId);
  
  if (error) throw new Error(error.message);
}

export async function verifyPlayerSession(playerId: string, gameCode: string): Promise<{ id: string; username: string } | null> {
  const supabase = getSupabaseClient();
  const { data: game } = await supabase
    .from("games")
    .select("id")
    .eq("code", gameCode)
    .single();
  
  if (!game) return null;

  const { data: player } = await supabase
    .from("players")
    .select("id, username")
    .eq("id", playerId)
    .eq("game_id", game.id)
    .single();
  
  return player;
}

export async function leaveGame(playerId: string) {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from("players")
    .delete()
    .eq("id", playerId);
  
  if (error) throw new Error(error.message);
}

export async function kickPlayer(playerId: string) {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from("players")
    .delete()
    .eq("id", playerId);
  
  if (error) throw new Error(error.message);
}

export async function kickAllPlayers(gameId: string) {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from("players")
    .delete()
    .eq("game_id", gameId);
  
  if (error) throw new Error(error.message);
  
  // Update game activity when players are kicked
  await supabase
    .from("games")
    .update({ last_activity: new Date().toISOString() })
    .eq("id", gameId);
}

export async function joinGame(code: string, username: string, existingPlayerId?: string | null): Promise<JoinGameResult> {
  const supabase = getSupabaseClient();
  const { data: game, error: gameError } = await supabase
    .from("games")
    .select("id")
    .eq("code", code)
    .single();
  
  if (gameError || !game) throw new Error("Game not found");
  
  // If we have an existing player ID, verify they still exist in this game
  if (existingPlayerId) {
    const { data: existingPlayer } = await supabase
      .from("players")
      .select("id, username")
      .eq("id", existingPlayerId)
      .eq("game_id", game.id)
      .single();
    
    if (existingPlayer) {
      // Player exists, update username if it changed and return
      if (existingPlayer.username !== username) {
        await supabase
          .from("players")
          .update({ username })
          .eq("id", existingPlayerId);
      }
      return { id: existingPlayer.id, username, game_id: game.id };
    }
  }
  
  // Check player count before allowing new player to join
  const { count, error: countError } = await supabase
    .from("players")
    .select("*", { count: "exact", head: true })
    .eq("game_id", game.id);
  
  if (countError) throw new Error(`Failed to check player count: ${countError.message}`);
  
  if (count !== null && count >= MAX_PLAYERS_PER_GAME) {
    throw new Error(`This game has reached the maximum of ${MAX_PLAYERS_PER_GAME} players. Please try another game.`);
  }
  
  // No existing player found, create new one
  const { data, error } = await supabase
    .from("players")
    .insert({ username, game_id: game.id })
    .select()
    .single();
  
  if (error) throw new Error(error.message);
  
  // Update game activity when player joins
  await supabase
    .from("games")
    .update({ last_activity: new Date().toISOString() })
    .eq("id", game.id);
  
  return data;
}

export async function addQuestion(gameId: string, q: QuestionInput) {
  const supabase = getSupabaseClient();
  
  // Get game type to determine if we need auto-round assignment
  const { data: game } = await supabase
    .from("games")
    .select("game_type")
    .eq("id", gameId)
    .single();
  
  // Get the current max question_order for this game to add new question at the end
  const { data: existingQuestions } = await supabase
    .from("questions")
    .select("question_order, round_number, is_bonus")
    .eq("game_id", gameId)
    .order("question_order", { ascending: false });
  
  const nextOrder = existingQuestions && existingQuestions.length > 0 
    ? (existingQuestions[0].question_order || 0) + 1 
    : 0;
  
  // Auto-assign round for wager games if not explicitly provided
  let roundNumber = q.roundNumber;
  let isBonus = q.isBonus || false;
  
  if (game?.game_type === 'wager' && (roundNumber === undefined || roundNumber === null)) {
    // Intelligently determine round/bonus based on actual round state
    if (existingQuestions && existingQuestions.length > 0) {
      // Group questions by round
      const rounds: Record<number, { regular: number, bonus: number }> = {};
      
      for (const question of existingQuestions) {
        const round = question.round_number || 0;
        if (!rounds[round]) {
          rounds[round] = { regular: 0, bonus: 0 };
        }
        if (question.is_bonus) {
          rounds[round].bonus++;
        } else {
          rounds[round].regular++;
        }
      }
      
      // Find the latest round (highest round number)
      const roundNumbers = Object.keys(rounds).map(Number).sort((a, b) => b - a);
      const latestRound = roundNumbers.length > 0 ? roundNumbers[0] : 0;
      
      if (latestRound > 0 && rounds[latestRound]) {
        const latestRoundState = rounds[latestRound];
        
        // If latest round has 5 regular questions but no bonus, next question should be bonus
        if (latestRoundState.regular >= 5 && latestRoundState.bonus === 0) {
          roundNumber = latestRound;
          isBonus = true;
        }
        // If latest round has 5 regular + bonus, start a new round
        else if (latestRoundState.regular >= 5 && latestRoundState.bonus >= 1) {
          roundNumber = latestRound + 1;
          isBonus = false;
        }
        // If latest round has < 5 regular questions, fill the next slot
        else {
          roundNumber = latestRound;
          isBonus = false;
        }
      } else {
        // No rounds exist yet, start round 1
        roundNumber = 1;
        isBonus = false;
      }
    } else {
      // No questions exist yet, start round 1
      roundNumber = 1;
      isBonus = false;
    }
  }
  
  const insertData: Record<string, unknown> = {
    text: q.text,
    choices: q.choices,
    answer: q.answer,
    points: q.points,
    multiplier: q.multiplier,
    is_fill_in_blank: q.isFillInBlank || false,
    is_true_false: q.isTrueFalse || false,
    game_id: gameId,
    question_order: nextOrder,
    has_timer: q.hasTimer || false,
  };
  
  // Only set timer_seconds if timer is enabled
  if (q.hasTimer && q.timerSeconds !== undefined) {
    insertData.timer_seconds = q.timerSeconds;
  }
  
  // Set fill_in_blank_answer if provided
  if (q.isFillInBlank && q.fillInBlankAnswer) {
    insertData.fill_in_blank_answer = q.fillInBlankAnswer;
  }
  
  // Set wagering fields if provided
  if (q.hasWager !== undefined) {
    insertData.has_wager = q.hasWager;
  }
  if (q.hasWager && q.maxWager !== undefined) {
    insertData.max_wager = q.maxWager;
  }
  
  // Set round fields (for wager games - use auto-calculated values if not provided)
  if (roundNumber !== undefined && roundNumber !== null) {
    insertData.round_number = roundNumber;
  }
  if (isBonus !== undefined) {
    insertData.is_bonus = isBonus;
  }
  
  // Set source/attribution if provided
  if (q.source !== undefined) {
    insertData.source = q.source || null;
  }
  
  const { data, error } = await supabase
    .from("questions")
    .insert(insertData)
    .select()
    .single();
  
  if (error) throw new Error(error.message);
  
  // Update game activity when question is added
  await supabase
    .from("games")
    .update({ last_activity: new Date().toISOString() })
    .eq("id", gameId);
  
  return data;
}

export async function updateQuestion(questionId: string, q: QuestionInput) {
  const supabase = getSupabaseClient();
  const updateData: Record<string, unknown> = {
    text: q.text,
    choices: q.choices,
    answer: q.answer,
    points: q.points,
    multiplier: q.multiplier,
    is_fill_in_blank: q.isFillInBlank || false,
    is_true_false: q.isTrueFalse || false,
    has_timer: q.hasTimer || false,
  };
  
  // Only set timer_seconds if timer is enabled
  if (q.hasTimer && q.timerSeconds !== undefined) {
    updateData.timer_seconds = q.timerSeconds;
  } else if (!q.hasTimer) {
    // Clear timer_seconds if timer is disabled
    updateData.timer_seconds = null;
  }
  
  // Set fill_in_blank_answer if fill-in-the-blank question
  if (q.isFillInBlank && q.fillInBlankAnswer !== undefined) {
    updateData.fill_in_blank_answer = q.fillInBlankAnswer || null;
  } else if (!q.isFillInBlank) {
    // Clear fill_in_blank_answer if not a fill-in-the-blank question
    updateData.fill_in_blank_answer = null;
  }
  
  // Set wagering fields
  if (q.hasWager !== undefined) {
    updateData.has_wager = q.hasWager;
  }
  if (q.hasWager && q.maxWager !== undefined) {
    updateData.max_wager = q.maxWager;
  } else if (!q.hasWager) {
    // Clear max_wager if wagering is disabled
    updateData.max_wager = null;
  }
  
  // Set source/attribution if provided
  if (q.source !== undefined) {
    updateData.source = q.source || null;
  }
  
  // Set round fields if provided (for wager games)
  if (q.roundNumber !== undefined) {
    updateData.round_number = q.roundNumber;
  }
  if (q.isBonus !== undefined) {
    updateData.is_bonus = q.isBonus;
  }
  
  const { data, error } = await supabase
    .from("questions")
    .update(updateData)
    .eq("id", questionId)
    .select()
    .single();
  
  if (error) throw new Error(error.message);
  
  // Update game activity when question is updated
  const { data: question } = await supabase
    .from("questions")
    .select("game_id")
    .eq("id", questionId)
    .single();
  
  if (question) {
    await supabase
      .from("games")
      .update({ last_activity: new Date().toISOString() })
      .eq("id", question.game_id);
  }
  
  return data;
}

export async function reorderQuestions(gameId: string, questionIds: string[]) {
  const supabase = getSupabaseClient();
  
  // Update each question's question_order field to reflect the new order
  for (let i = 0; i < questionIds.length; i++) {
    const { error } = await supabase
      .from("questions")
      .update({ question_order: i })
      .eq("id", questionIds[i])
      .eq("game_id", gameId);
    
    if (error) {
      console.error(`Failed to update question ${questionIds[i]}:`, error);
      throw new Error(`Failed to reorder questions: ${error.message}`);
    }
  }
  
  // Update game activity when questions are reordered
  await supabase
    .from("games")
    .update({ last_activity: new Date().toISOString() })
    .eq("id", gameId);
  
  return { success: true };
}

export async function deleteQuestion(questionId: string) {
  const supabase = getSupabaseClient();
  
  // Get game_id before deleting
  const { data: question } = await supabase
    .from("questions")
    .select("game_id")
    .eq("id", questionId)
    .single();
  
  const { error } = await supabase
    .from("questions")
    .delete()
    .eq("id", questionId);
  
  if (error) throw new Error(error.message);
  
  // Update game activity when question is deleted
  if (question) {
    await supabase
      .from("games")
      .update({ last_activity: new Date().toISOString() })
      .eq("id", question.game_id);
  }
  
  return { success: true };
}

export async function verifyHostPassword(code: string, password: string) {
  const supabase = getSupabaseClient();
  const { data: game, error } = await supabase
    .from("games")
    .select("host_password")
    .eq("code", code)
    .single();
  
  if (error || !game) {
    throw new Error("Game not found");
  }
  
  // If no password is set, allow access
  if (!game.host_password) {
    return true;
  }
  
  // Verify password matches
  return game.host_password === password;
}

export async function getGame(code: string) {
  const supabase = getSupabaseClient();

  const { data: game, error: gameError } = await supabase
    .from("games")
    .select(`
      *,
      players (*),
      questions (*)
    `)
    .eq("code", code)
    .single();
  
  if (gameError || !game) throw new Error("Game not found");

  // Check if game should be deleted:
  // 1. Not started AND older than GAME_EXPIRY_DAYS from creation
  // 2. Started BUT inactive for GAME_EXPIRY_DAYS from last_activity
  const gameStarted = game.game_started || false;
  const now = Date.now();
  
  let shouldDelete = false;
  if (!gameStarted) {
    // Not started: check age from creation
    const gameAge = now - new Date(game.created_at).getTime();
    shouldDelete = gameAge > GAME_EXPIRY_MS;
  } else {
    // Started: check inactivity from last_activity
    const lastActivity = game.last_activity || game.created_at;
    const inactivityPeriod = now - new Date(lastActivity).getTime();
    shouldDelete = inactivityPeriod > GAME_EXPIRY_MS;
  }
  
  if (shouldDelete) {
    await supabase
      .from("games")
      .delete()
      .eq("id", game.id);
    throw new Error("Game has expired (inactive for 30 days)");
  }

  // Get player answers and scores
  // Optimization: Only fetch detailed answers when needed (not when answers are revealed and we only need scores)
  // This reduces egress by ~40-50% when viewing results
  const playerIds = (game.players || []).map((p: any) => p.id);
  let playerAnswers = null;
  if (playerIds.length > 0) {
    // When answers are revealed, we still need answers for display, but we can optimize elsewhere
    // For now, keep full fetch but this is where we'd add selective fetching if needed
    const { data, error } = await supabase
      .from("player_answers")
      .select("id, player_id, question_id, answer_index, text_answer, is_correct, points_earned, manually_scored, wager, wager_slot, player_round, created_at")
      .in("player_id", playerIds)
      .order("created_at", { ascending: false });
    
    if (error) {
      console.error("Error fetching player answers:", error);
    } else {
      playerAnswers = data;
    }
  }

  // Get updated player scores
  const { data: playersWithScores } = await supabase
    .from("players")
    .select("*")
    .eq("game_id", game.id)
    .order("score", { ascending: false });

  // Sort questions by question_order first (same as returned to client)
  const sortedQuestions = (game.questions || [])
    .sort((a: any, b: any) => {
      const orderA = a.question_order !== null && a.question_order !== undefined ? a.question_order : 999999;
      const orderB = b.question_order !== null && b.question_order !== undefined ? b.question_order : 999999;
      return orderA - orderB;
    });

  // Calculate time remaining for current question (server-side timer)
  let timeRemaining: number | null = null;
  if (game.current_question_index !== null && game.current_question_index !== undefined) {
    const currentQuestion = sortedQuestions[game.current_question_index];
    if (currentQuestion && currentQuestion.has_timer && currentQuestion.timer_seconds && game.question_start_time) {
      const startTime = new Date(game.question_start_time).getTime();
      const now = Date.now();
      const elapsed = Math.floor((now - startTime) / 1000);
      const remaining = Math.max(0, currentQuestion.timer_seconds - elapsed);
      timeRemaining = remaining;
      
      // Debug: log if timer seems wrong
      if (elapsed < 0) {
        console.warn(`Timer calculation issue: elapsed is negative (${elapsed}s). startTime: ${game.question_start_time}, now: ${new Date(now).toISOString()}`);
      }
      if (remaining === 0 && elapsed < currentQuestion.timer_seconds) {
        console.warn(`Timer calculation issue: remaining is 0 but elapsed (${elapsed}s) < timer_seconds (${currentQuestion.timer_seconds}s)`);
      }
    }
  }

  return {
    id: game.id,
    code: game.code,
    hostName: game.host_name,
    hostPassword: game.host_password || null,
    createdAt: game.created_at,
    lastActivity: game.last_activity || game.created_at,
    gameStarted: game.game_started || false,
    currentQuestionIndex: game.current_question_index,
    answersRevealed: game.answers_revealed || false,
    gameEnded: game.game_ended || false,
    timeRemaining: timeRemaining,
    questionStartTime: game.question_start_time || null, // Include for client-side calculation if needed
    gameType: (game.game_type as 'traditional' | 'wager') || 'traditional',
    wagerAmounts: game.wager_amounts || [2, 4, 6, 8, 10],
    bonusMaxWager: game.bonus_max_wager || 20,
    questions: sortedQuestions
      .map((q: any) => ({
        id: q.id,
        text: q.text,
        // Ensure true/false questions always have choices set
        choices: q.is_true_false ? (q.choices && q.choices.length > 0 ? q.choices : ["True", "False"]) : q.choices,
        answer: q.answer,
        points: q.points,
        multiplier: q.multiplier || 1,
        gameId: q.game_id,
        questionOrder: q.question_order || 0,
        isFillInBlank: q.is_fill_in_blank || false,
        isTrueFalse: q.is_true_false || false,
        hasTimer: q.has_timer || false,
        timerSeconds: q.timer_seconds || null,
        fillInBlankAnswer: q.fill_in_blank_answer || null,
        hasWager: q.has_wager || false,
        maxWager: q.max_wager || null,
        roundNumber: q.round_number || null,
        isBonus: q.is_bonus || false,
        source: q.source || null,
      })),
    players: (playersWithScores || []).map((p: DatabasePlayer) => ({
      id: p.id,
      username: p.username,
      score: p.score || 0,
      gameId: p.game_id,
    })),
    playerAnswers: (playerAnswers || []).map((pa: any) => ({
      playerId: pa.player_id,
      questionId: pa.question_id,
      answerIndex: pa.answer_index,
      textAnswer: pa.text_answer,
      isCorrect: pa.is_correct,
      pointsEarned: pa.points_earned,
      manuallyScored: pa.manually_scored || false,
      wager: pa.wager || null,
      wagerSlot: pa.wager_slot || null,
      playerRound: pa.player_round || null,
    })),
  };
}

export async function activateQuestion(gameId: string, questionIndex: number) {
  const supabase = getSupabaseClient();
  
  // Check if this is first activation
  const { data: currentGame } = await supabase
    .from("games")
    .select("game_started")
    .eq("id", gameId)
    .single();
  
  const now = new Date().toISOString();
  const updateData: Record<string, unknown> = {
    current_question_index: questionIndex,
    answers_revealed: false,
    question_start_time: now,
    last_activity: now,
  };
  
  // Mark game as started if it hasn't been started yet
  if (!currentGame?.game_started) {
    updateData.game_started = true;
  }
  
  const { error } = await supabase
    .from("games")
    .update(updateData)
    .eq("id", gameId);
  
  if (error) throw new Error(error.message);
}

export async function submitAnswer(playerId: string, questionId: string, answerIndex: number | null, textAnswer?: string, wager?: number, wagerSlot?: number | null, playerRound?: number | null) {
  const supabase = getSupabaseClient();
  // Verify player exists
  const { data: player, error: playerError } = await supabase
    .from("players")
    .select("id")
    .eq("id", playerId)
    .single();

  if (playerError || !player) {
    throw new Error("Player not found. Please rejoin the game.");
  }

  // Get question to determine round info for wager games
  const { data: question } = await supabase
    .from("questions")
    .select("round_number, is_bonus, game_id")
    .eq("id", questionId)
    .single();

  // Check if answer already submitted
  const { data: existing } = await supabase
    .from("player_answers")
    .select("*")
    .eq("player_id", playerId)
    .eq("question_id", questionId)
    .single();

  if (existing) {
    // Update existing answer
    const updateData: Record<string, unknown> = {};
    if (answerIndex !== null) updateData.answer_index = answerIndex;
    if (textAnswer !== undefined) updateData.text_answer = textAnswer;
    if (wager !== undefined) updateData.wager = wager;
    if (wagerSlot !== undefined) updateData.wager_slot = wagerSlot;
    if (playerRound !== undefined) updateData.player_round = playerRound;
    
    const { error } = await supabase
      .from("player_answers")
      .update(updateData)
      .eq("id", existing.id);
    
    if (error) throw new Error(error.message);
    
    // Update used slots for wager games
    if (wagerSlot !== null && wagerSlot !== undefined && question && question.round_number) {
      await updatePlayerWagerSlots(playerId, question.game_id, question.round_number, wagerSlot);
    }
    
    return;
  }

  // Insert new answer
  const insertData: Record<string, unknown> = {
    player_id: playerId,
    question_id: questionId,
  };
  if (answerIndex !== null) insertData.answer_index = answerIndex;
  if (textAnswer !== undefined) insertData.text_answer = textAnswer;
  if (wager !== undefined) insertData.wager = wager;
  if (wagerSlot !== undefined) insertData.wager_slot = wagerSlot;
  if (playerRound !== undefined) insertData.player_round = playerRound;
  
  const { error } = await supabase
    .from("player_answers")
    .insert(insertData);
  
  if (error) throw new Error(error.message);
  
  // Update used slots for wager games
  if (wagerSlot !== null && wagerSlot !== undefined && question && question.round_number) {
    await updatePlayerWagerSlots(playerId, question.game_id, question.round_number, wagerSlot);
  }
  
  // Update game activity when player submits answer
  if (question) {
    await supabase
      .from("games")
      .update({ last_activity: new Date().toISOString() })
      .eq("id", question.game_id);
  }
}

async function updatePlayerWagerSlots(playerId: string, gameId: string, roundNumber: number, slot: number) {
  const supabase = getSupabaseClient();
  
  // Get or create player wager slots record
  const { data: existing } = await supabase
    .from("player_wager_slots")
    .select("*")
    .eq("player_id", playerId)
    .eq("game_id", gameId)
    .eq("round_number", roundNumber)
    .single();
  
  if (existing) {
    // Update existing record - add slot to used_slots array if not already present
    const usedSlots = existing.used_slots || [];
    if (!usedSlots.includes(slot)) {
      const { error } = await supabase
        .from("player_wager_slots")
        .update({ used_slots: [...usedSlots, slot] })
        .eq("id", existing.id);
      
      if (error) throw new Error(error.message);
    }
  } else {
    // Create new record
    const { error } = await supabase
      .from("player_wager_slots")
      .insert({
        player_id: playerId,
        game_id: gameId,
        round_number: roundNumber,
        used_slots: [slot]
      });
    
    if (error) throw new Error(error.message);
  }
}

export async function revealAnswers(gameId: string, questionId: string) {
  const supabase = getSupabaseClient();
  // Get the question
  const { data: question } = await supabase
    .from("questions")
    .select("*")
    .eq("id", questionId)
    .single();

  if (!question) throw new Error("Question not found");

  // Get game to check game type
  const { data: game } = await supabase
    .from("games")
    .select("game_type, wager_amounts")
    .eq("id", gameId)
    .single();

  const isWagerGame = game?.game_type === 'wager';

  // Get all player answers for this question
  const { data: answers } = await supabase
    .from("player_answers")
    .select("*")
    .eq("question_id", questionId);

  if (!answers || answers.length === 0) {
    // Mark answers as revealed even if no answers
    const { error } = await supabase
      .from("games")
      .update({ 
        answers_revealed: true,
        last_activity: new Date().toISOString(),
      })
      .eq("id", gameId);
    if (error) throw new Error(error.message);
    return;
  }

  // For fill-in-the-blank questions, don't auto-score - host has already scored manually
  // IMPORTANT: Do NOT update is_correct or points_earned for fill-in-the-blank questions
  // These values were already set by manuallyAwardPoints and must be preserved
  // True/false questions are handled the same as multiple choice (they use answer_index: 0 for True, 1 for False)
  if (question.is_fill_in_blank) {
    // OPTIMIZATION: Batch fetch all player scores at once
    const playerIds = answers.map(a => a.player_id).filter((id, index, self) => self.indexOf(id) === index);
    const { data: players } = await supabase
      .from("players")
      .select("id, score")
      .in("id", playerIds);
    
    const playerScores = new Map((players || []).map(p => [p.id, p.score || 0]));
    
    // For fill-in-the-blank questions, we need to ensure manually scored answers preserve their status
    // We explicitly do NOT update is_correct or points_earned for manually_scored answers
    // Only set defaults for answers that haven't been manually scored yet
    const defaultAnswerUpdates: Array<{ id: string; is_correct: boolean; points_earned: number; manually_scored: boolean }> = [];
    
    for (const answer of answers) {
      if (!answer.manually_scored) {
        // If answer hasn't been manually scored, set default values (0 points, incorrect)
        // This ensures all answers have a status when revealed
        defaultAnswerUpdates.push({
          id: answer.id,
          is_correct: false,
          points_earned: 0,
          manually_scored: false,
        });
      }
      // If manually_scored is true, we explicitly do NOT touch is_correct or points_earned
      // These were set by manuallyAwardPoints and must be preserved exactly as-is
    }
    
    // OPTIMIZATION: Parallel update defaults for unscored answers
    if (defaultAnswerUpdates.length > 0) {
      const updatePromises = defaultAnswerUpdates.map(update =>
        supabase
          .from("player_answers")
          .update({
            is_correct: update.is_correct,
            points_earned: update.points_earned,
            manually_scored: update.manually_scored,
          })
          .eq("id", update.id)
      );
      
      const results = await Promise.all(updatePromises);
      const errors = results.filter(r => r.error != null);
      if (errors.length > 0 && errors[0]?.error) {
        throw new Error(`Failed to update default answers: ${errors[0].error.message}`);
      }
    }
    
    // Now update player scores based on the points_earned values
    // This is when scores should actually change for fill-in-the-blank questions
    const answerUpdates: Array<{ id: string; points_earned: number }> = [];
    const scoreUpdates: Array<{ id: string; score: number }> = [];
    
    for (const answer of answers) {
      const basePointsEarned = answer.points_earned || 0;
      const isCorrect = answer.is_correct || false;
      
      // Calculate final points earned based on game type
      let finalPointsEarned = 0;
      
      if (isWagerGame) {
        // For wager games, use wager_slot for regular questions or wager for bonus questions
        if (question.is_bonus) {
          // Bonus question: use wager amount (negative if incorrect)
          const bonusWager = answer.wager || 0;
          if (isCorrect) {
            finalPointsEarned = bonusWager;
          } else {
            finalPointsEarned = -bonusWager;
          }
        } else {
          // Regular question: use wager_slot value as the points (0 if incorrect, no penalty)
          const slotValue = answer.wager_slot || 0;
          if (isCorrect) {
            finalPointsEarned = slotValue;
          } else {
            finalPointsEarned = 0; // No penalty for incorrect regular questions
          }
        }
      } else {
        // Traditional game scoring
        const wagerAmount = answer.wager || 0;
        if (question.has_wager && wagerAmount > 0) {
          // If wagering is enabled and player wagered
          if (isCorrect) {
            // Player gains the wager amount PLUS the base points awarded by host
            // Note: basePointsEarned already includes multiplier, so we use it directly
            finalPointsEarned = wagerAmount + basePointsEarned;
          } else {
            // Player loses the wager amount (negative)
            finalPointsEarned = -wagerAmount;
          }
        } else {
          // Normal scoring without wagering - use the points awarded by host
          finalPointsEarned = basePointsEarned;
        }
      }
      
      const currentScore = playerScores.get(answer.player_id) || 0;
      // For fill-in-the-blank, we add the final points earned (accounting for wagering)
      // Since this is the first time scores are being applied, we just add the points
      const newScore = currentScore + finalPointsEarned;

      // Collect updates for batch processing
      answerUpdates.push({
        id: answer.id,
        points_earned: finalPointsEarned,
      });
      
      scoreUpdates.push({
        id: answer.player_id,
        score: newScore,
      });
    }
    
    // OPTIMIZATION: Parallel update all player answers
    if (answerUpdates.length > 0) {
      const updatePromises = answerUpdates.map(update =>
        supabase
          .from("player_answers")
          .update({
            points_earned: update.points_earned,
          })
          .eq("id", update.id)
      );
      
      const results = await Promise.all(updatePromises);
      const errors = results.filter(r => r.error != null);
      if (errors.length > 0 && errors[0]?.error) {
        throw new Error(`Failed to update some answers: ${errors[0].error.message}`);
      }
    }
    
    // OPTIMIZATION: Parallel update all player scores
    if (scoreUpdates.length > 0) {
      const updatePromises = scoreUpdates.map(update =>
        supabase
          .from("players")
          .update({ score: update.score })
          .eq("id", update.id)
      );
      
      const results = await Promise.all(updatePromises);
      const errors = results.filter(r => r.error != null);
      if (errors.length > 0 && errors[0]?.error) {
        throw new Error(`Failed to update some scores: ${errors[0].error.message}`);
      }
    }
    
    // Mark answers as revealed - manually scored answers keep their is_correct and points_earned values
    // The is_correct boolean from manuallyAwardPoints is preserved and sent to players
    const { error } = await supabase
      .from("games")
      .update({ 
        answers_revealed: true,
        question_start_time: null, // Clear timer when answers are revealed
        last_activity: new Date().toISOString(),
      })
      .eq("id", gameId);
    if (error) throw new Error(error.message);
    return;
  }

  // Calculate scores and update player answers (for multiple choice and true/false questions)
  // True/false questions use answer_index: 0 for True, 1 for False, same as multiple choice
  
  // OPTIMIZATION: Batch fetch all player scores at once instead of individual queries
  const playerIds = answers.map(a => a.player_id).filter((id, index, self) => self.indexOf(id) === index);
  const { data: players } = await supabase
    .from("players")
    .select("id, score")
    .in("id", playerIds);
  
  const playerScores = new Map((players || []).map(p => [p.id, p.score || 0]));
  
  // Calculate all updates in memory first
  const answerUpdates: Array<{ id: string; is_correct: boolean; points_earned: number }> = [];
  const scoreUpdates: Array<{ id: string; score: number }> = [];
  const basePoints = question.points * (question.multiplier || 1);
  
  for (const answer of answers) {
    // Skip answers that have been manually scored (shouldn't happen for multiple choice or true/false, but just in case)
    if (answer.manually_scored) {
      continue;
    }

    const isCorrect = answer.answer_index === question.answer;
    
    // Calculate points earned based on game type
    let pointsEarned = 0;
    
    if (isWagerGame) {
      // For wager games, use wager_slot for regular questions or wager for bonus questions
      if (question.is_bonus) {
        // Bonus question: use wager amount (negative if incorrect)
        const bonusWager = answer.wager || 0;
        if (isCorrect) {
          pointsEarned = bonusWager;
        } else {
          pointsEarned = -bonusWager;
        }
      } else {
        // Regular question: use wager_slot value as the points (0 if incorrect, no penalty)
        const slotValue = answer.wager_slot || 0;
        if (isCorrect) {
          pointsEarned = slotValue;
        } else {
          pointsEarned = 0; // No penalty for incorrect regular questions
        }
      }
    } else {
      // Traditional game scoring
      const wagerAmount = answer.wager || 0;
      
      if (question.has_wager && wagerAmount > 0) {
        // If wagering is enabled and player wagered
        if (isCorrect) {
          // Player gains the wager amount PLUS the normal points
          pointsEarned = wagerAmount + basePoints;
        } else {
          // Player loses the wager amount (negative)
          pointsEarned = -wagerAmount;
        }
      } else {
        // Normal scoring without wagering
        pointsEarned = isCorrect ? basePoints : 0;
      }
    }

    const currentScore = playerScores.get(answer.player_id) || 0;
    const previousPoints = answer.points_earned || 0;
    const newScore = currentScore - previousPoints + pointsEarned;

    // Collect updates for batch processing
    answerUpdates.push({
      id: answer.id,
      is_correct: isCorrect,
      points_earned: pointsEarned,
    });
    
    scoreUpdates.push({
      id: answer.player_id,
      score: newScore,
    });
  }
  
  // OPTIMIZATION: Parallel update all player answers (much faster than sequential)
  if (answerUpdates.length > 0) {
    const updatePromises = answerUpdates.map(update =>
      supabase
        .from("player_answers")
        .update({
          is_correct: update.is_correct,
          points_earned: update.points_earned,
        })
        .eq("id", update.id)
    );
    
    const results = await Promise.all(updatePromises);
    const errors = results.filter(r => r.error != null);
    if (errors.length > 0 && errors[0]?.error) {
      throw new Error(`Failed to update some answers: ${errors[0].error.message}`);
    }
  }
  
  // OPTIMIZATION: Parallel update all player scores (much faster than sequential)
  if (scoreUpdates.length > 0) {
    const updatePromises = scoreUpdates.map(update =>
      supabase
        .from("players")
        .update({ score: update.score })
        .eq("id", update.id)
    );
    
    const results = await Promise.all(updatePromises);
    const errors = results.filter(r => r.error != null);
    if (errors.length > 0 && errors[0]?.error) {
      throw new Error(`Failed to update some scores: ${errors[0].error.message}`);
    }
  }

  // Mark answers as revealed and clear timer start time
  const { error } = await supabase
    .from("games")
    .update({ 
      answers_revealed: true,
      question_start_time: null, // Clear timer when answers are revealed
      last_activity: new Date().toISOString(),
    })
    .eq("id", gameId);
  
  if (error) throw new Error(error.message);
}

export async function nextQuestion(gameId: string, nextIndex: number) {
  const supabase = getSupabaseClient();
  
  // Get total number of questions to check if we're past the last question
  const { data: game } = await supabase
    .from("games")
    .select("id")
    .eq("id", gameId)
    .single();
  
  const { data: questions } = await supabase
    .from("questions")
    .select("id")
    .eq("game_id", gameId)
    .order("question_order", { ascending: true });
  
  const totalQuestions = questions?.length || 0;
  
  // If nextIndex is beyond the last question, mark game as ended
  if (nextIndex >= totalQuestions) {
    const { error } = await supabase
      .from("games")
      .update({
        game_ended: true,
        current_question_index: null,
        answers_revealed: false,
        last_activity: new Date().toISOString(),
      })
      .eq("id", gameId);
    
    if (error) throw new Error(error.message);
    return;
  }
  
  const { error } = await supabase
    .from("games")
    .update({ 
      current_question_index: nextIndex,
      answers_revealed: false,
      question_start_time: null, // Clear previous timer, will be set when question is activated
      last_activity: new Date().toISOString(),
    })
    .eq("id", gameId);
  
  if (error) throw new Error(error.message);
}

export async function resetQuestion(gameId: string, questionId: string) {
  const supabase = getSupabaseClient();
  // Get all player answers for this question
  const { data: answers } = await supabase
    .from("player_answers")
    .select("*")
    .eq("question_id", questionId);

  if (answers && answers.length > 0) {
    // Subtract points that were earned from this question
    for (const answer of answers) {
      if (answer.points_earned && answer.points_earned > 0) {
        // Get current player score
        const { data: player } = await supabase
          .from("players")
          .select("score")
          .eq("id", answer.player_id)
          .single();

        const currentScore = player?.score || 0;
        const newScore = currentScore - answer.points_earned;
        
        await supabase
          .from("players")
          .update({ score: newScore })
          .eq("id", answer.player_id);
      }
    }

    // Delete all answers for this question
    await supabase
      .from("player_answers")
      .delete()
      .eq("question_id", questionId);
  }

  // Reset game state if this was the current question
  const { data: game } = await supabase
    .from("games")
    .select("current_question_index")
    .eq("id", gameId)
    .single();

  if (game && game.current_question_index !== null) {
    const { data: questions } = await supabase
      .from("questions")
      .select("id")
      .eq("game_id", gameId)
      .order("created_at");

    if (questions && questions[game.current_question_index]?.id === questionId) {
      // Reset game state if resetting current question
      await supabase
        .from("games")
        .update({
          current_question_index: null,
          answers_revealed: false,
          last_activity: new Date().toISOString(),
        })
        .eq("id", gameId);
    } else {
      // Update activity even if not resetting current question
      await supabase
        .from("games")
        .update({ last_activity: new Date().toISOString() })
        .eq("id", gameId);
    }
  } else {
    // Update activity even if no current question
    await supabase
      .from("games")
      .update({ last_activity: new Date().toISOString() })
      .eq("id", gameId);
  }
}

export async function resetGame(gameId: string) {
  const supabase = getSupabaseClient();
  
  // Reset all player scores to 0
  await supabase
    .from("players")
    .update({ score: 0 })
    .eq("game_id", gameId);

  // Delete all player answers for this game
  // We delete by joining through questions since player_answers only has question_id
  const { data: questions } = await supabase
    .from("questions")
    .select("id")
    .eq("game_id", gameId);

  if (questions && questions.length > 0) {
    const questionIds = questions.map((q) => q.id);
    // Delete all player answers for all questions in this game
    const { error: deleteError } = await supabase
      .from("player_answers")
      .delete()
      .in("question_id", questionIds);
    
    if (deleteError) {
      console.error("Error deleting player answers:", deleteError);
      // Continue anyway - game reset should still proceed
    }
  }

  // Delete all player wager slots for this game
  const { error: wagerSlotsError } = await supabase
    .from("player_wager_slots")
    .delete()
    .eq("game_id", gameId);
  
  if (wagerSlotsError) {
    console.error("Error deleting player wager slots:", wagerSlotsError);
    // Continue anyway - game reset should still proceed
  }

  // Reset game state
  await supabase
    .from("games")
    .update({
      current_question_index: null,
      answers_revealed: false,
      game_started: false, // Reset the game_started flag so game can be configured again
      game_ended: false, // Reset the game_ended flag so players can play again
      last_activity: new Date().toISOString(),
    })
    .eq("id", gameId);
}

export async function endGame(gameId: string) {
  const supabase = getSupabaseClient();
  // Mark the game as ended instead of deleting it immediately
  // This allows players to see the final scoreboard
  const { error } = await supabase
    .from("games")
    .update({
      game_ended: true,
      current_question_index: null,
      answers_revealed: false,
      last_activity: new Date().toISOString(),
    })
    .eq("id", gameId);
  
  if (error) throw new Error(error.message);
}

export async function manuallyAwardPoints(playerId: string, questionId: string, points: number, isCorrect: boolean) {
  const supabase = getSupabaseClient();
  
  // Get existing answer
  const { data: answer } = await supabase
    .from("player_answers")
    .select("*")
    .eq("player_id", playerId)
    .eq("question_id", questionId)
    .single();

  if (!answer) throw new Error("Answer not found");

  // Get the question to check if answers are revealed
  const { data: question } = await supabase
    .from("questions")
    .select("game_id, is_fill_in_blank")
    .eq("id", questionId)
    .single();

  if (!question) throw new Error("Question not found");

  // Get game to check if answers are revealed
  const { data: game } = await supabase
    .from("games")
    .select("answers_revealed")
    .eq("id", question.game_id)
    .single();

  // Update player answer with points and correct status
  // IMPORTANT: Explicitly set is_correct as a boolean (true/false), never null
  // If checkbox is unchecked (isCorrect is false), ignore any points and set to 0
  const finalPoints = isCorrect ? points : 0;
  const { error: updateError } = await supabase
    .from("player_answers")
    .update({
      points_earned: finalPoints,
      is_correct: isCorrect === true, // Explicitly convert to boolean
      manually_scored: true,
    })
    .eq("id", answer.id);
  
  if (updateError) throw new Error(`Failed to update answer: ${updateError.message}`);

  // Only update player score if answers are already revealed
  // For fill-in-the-blank questions, scores should only update when answers are revealed
  if (game?.answers_revealed) {
    // Get current player score
    const { data: player } = await supabase
      .from("players")
      .select("score")
      .eq("id", playerId)
      .single();

    const currentScore = player?.score || 0;
    const previousPoints = answer.points_earned || 0;
    const newScore = currentScore - previousPoints + finalPoints;

    // Update player score (allow negative scores for wagering)
    await supabase
      .from("players")
      .update({ score: newScore })
      .eq("id", playerId);
    
    // Update game activity when manually awarding points
    await supabase
      .from("games")
      .update({ last_activity: new Date().toISOString() })
      .eq("id", question.game_id);
  }
}

// Helper to escape CSV fields
function escapeCSVField(field: string): string {
  if (field.includes(",") || field.includes('"') || field.includes("\n")) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}

// Helper function to parse CSV rows (handles quoted values with commas)
function parseCSVRow(row: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  
  for (let i = 0; i < row.length; i++) {
    const char = row[i];
    if (char === '"') {
      if (inQuotes && row[i + 1] === '"') {
        current += '"';
        i++; // Skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

// Export questions to CSV format (Excel-compatible)
export async function exportQuestions(gameId: string) {
  const supabase = getSupabaseClient();
  const { data: questions } = await supabase
    .from("questions")
    .select("*")
    .eq("game_id", gameId)
    .order("question_order", { ascending: true });
  
  if (!questions || questions.length === 0) {
    throw new Error("No questions to export");
  }
  
  // Convert to CSV format (Excel can open CSV files)
  const csvRows = [
    // Header row
    ["question_text", "choice_1", "choice_2", "choice_3", "choice_4", 
     "correct_answer", "points", "multiplier", "question_type", 
     "has_timer", "timer_seconds", "fill_in_blank_answer", 
     "has_wager", "max_wager", "round_number", "is_bonus"].join(","),
    // Data rows
    ...questions.map(q => {
      const type = q.is_fill_in_blank ? "fill_in_blank" 
                 : q.is_true_false ? "true_false" 
                 : "multiple_choice";
      const choices = q.choices || [];
      
      // Determine correct answer format
      let answer: string;
      if (q.is_fill_in_blank) {
        // For fill-in-blank, use fill_in_blank_answer, or empty string if not set
        answer = q.fill_in_blank_answer || "";
        // Warn if fill-in-blank question doesn't have an answer
        if (!answer) {
          console.warn(`Fill-in-blank question "${q.text?.substring(0, 50)}..." is missing fill_in_blank_answer`);
        }
      } else if (q.is_true_false) {
        answer = q.answer === 0 ? "True" : "False";
      } else {
        answer = String(q.answer); // Index of correct choice (0-based)
      }
      
      return [
        escapeCSVField(q.text || ""),
        escapeCSVField(choices[0] || ""),
        escapeCSVField(choices[1] || ""),
        escapeCSVField(choices[2] || ""),
        escapeCSVField(choices[3] || ""),
        escapeCSVField(answer),
        q.points || 10,
        q.multiplier || 1,
        type,
        q.has_timer ? "true" : "false",
        q.timer_seconds || "",
        escapeCSVField(q.fill_in_blank_answer || ""),
        q.has_wager ? "true" : "false",
        q.max_wager || "",
        q.round_number || "",
        q.is_bonus ? "true" : "false"
      ].join(",");
    })
  ];
  
  return csvRows.join("\n");
}

// Import questions from CSV/Excel (appends to existing questions by default)
export async function importQuestions(gameId: string, csvContent: string) {
  const supabase = getSupabaseClient();
  
  const lines = csvContent.split("\n").filter(line => line.trim());
  if (lines.length < 2) {
    throw new Error("CSV file must have at least a header and one data row");
  }
  
  const headers = parseCSVRow(lines[0]).map(h => h.trim().replace(/^"|"$/g, ""));
  const dataRows = lines.slice(1);
  
  // Validate that we have the expected headers
  const expectedHeaders = ["question_text", "correct_answer", "question_type"];
  const hasRequiredHeaders = expectedHeaders.every(h => headers.includes(h));
  if (!hasRequiredHeaders) {
    throw new Error(`CSV file is missing required headers. Expected headers: ${expectedHeaders.join(", ")}. Found: ${headers.join(", ")}`);
  }
  
  const results = [];
  const errors: string[] = [];
  
  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    if (!row.trim()) continue; // Skip empty rows
    
    try {
      // Parse CSV row (handling quoted values)
      const values = parseCSVRow(row);
      
      if (values.length < headers.length) {
        errors.push(`Row ${i + 2}: Not enough columns (expected ${headers.length}, got ${values.length})`);
        continue;
      }
      
      const rowData: Record<string, string> = {};
      headers.forEach((header, index) => {
        const value = values[index] || "";
        // Remove surrounding quotes and trim whitespace
        rowData[header] = value.replace(/^"|"$/g, "").trim();
      });
      
      // Validate required fields
      if (!rowData.question_text) {
        errors.push(`Row ${i + 2}: Missing question_text`);
        continue;
      }
      
      // Convert to question format
      const questionType = rowData.question_type || "multiple_choice";
      const isFillInBlank = questionType === "fill_in_blank";
      const isTrueFalse = questionType === "true_false";
      
      const choices = isFillInBlank ? [] 
                    : isTrueFalse ? ["True", "False"]
                    : [
                        rowData.choice_1,
                        rowData.choice_2,
                        rowData.choice_3,
                        rowData.choice_4
                      ].filter(c => c && c.trim());
      
      // Validate choices for multiple choice
      if (!isFillInBlank && !isTrueFalse && choices.length < 2) {
        errors.push(`Row ${i + 2}: Multiple choice questions need at least 2 choices`);
        continue;
      }
      
      // Parse answer
      let answer: number = 0;
      let fillInBlankAnswer: string | undefined = undefined;
      
      if (isFillInBlank) {
        answer = -1; // Special value
        // For fill-in-blank, the answer is stored in correct_answer column (primary)
        // fill_in_blank_answer column is also populated but correct_answer takes precedence
        const correctAnswerValue = (rowData.correct_answer || "").trim();
        const fillInBlankValue = (rowData.fill_in_blank_answer || "").trim();
        fillInBlankAnswer = correctAnswerValue || fillInBlankValue;
        
        if (!fillInBlankAnswer || fillInBlankAnswer === "") {
          // Skip fill-in-blank questions without answers - they can't be used without a correct answer
          errors.push(`Row ${i + 2}: Skipped fill-in-blank question "${rowData.question_text.substring(0, 50)}..." - missing required answer. Please add the answer in the correct_answer or fill_in_blank_answer column.`);
          continue;
        }
      } else if (isTrueFalse) {
        const answerText = (rowData.correct_answer || "").trim();
        answer = answerText.toLowerCase() === "true" ? 0 : 1;
      } else {
        // Multiple choice - answer can be index (0-based) or answer text
        const correctAnswerText = (rowData.correct_answer || "").trim();
        
        // First try to parse as an integer index (for backward compatibility)
        let answerIndex = parseInt(correctAnswerText);
        
        // If not a valid integer, try to find matching choice text
        if (isNaN(answerIndex) || answerIndex < 0 || answerIndex >= choices.length) {
          // Search for matching choice text (case-insensitive, trimmed)
          answerIndex = choices.findIndex(choice => 
            choice && choice.trim().toLowerCase() === correctAnswerText.toLowerCase()
          );
          
          if (answerIndex === -1) {
            errors.push(`Row ${i + 2}: Invalid answer. "${correctAnswerText}" does not match any choice. Available choices: ${choices.map((c, idx) => `${idx}: "${c}"`).join(", ")}`);
            continue;
          }
        }
        
        answer = answerIndex;
      }
      
      // Parse boolean fields (handle both "TRUE"/"FALSE" and "true"/"false")
      const hasTimerValue = rowData.has_timer?.trim().toLowerCase();
      const hasTimer: boolean | undefined = hasTimerValue ? hasTimerValue === "true" : undefined;
      const hasWagerValue = rowData.has_wager?.trim().toLowerCase();
      const hasWager: boolean | undefined = hasWagerValue ? hasWagerValue === "true" : undefined;
      
      // Parse timer seconds (only if hasTimer is true and value is valid)
      let timerSeconds: number | undefined = undefined;
      if (hasTimer && rowData.timer_seconds) {
        const parsed = parseInt(rowData.timer_seconds.trim());
        if (!isNaN(parsed) && parsed > 0) {
          timerSeconds = parsed;
        }
      }
      
      // Parse max wager (only if hasWager is true and value is valid)
      let maxWager: number | undefined = undefined;
      if (hasWager && rowData.max_wager) {
        const parsed = parseInt(rowData.max_wager.trim());
        if (!isNaN(parsed) && parsed > 0) {
          maxWager = parsed;
        }
      }
      
      // Parse round_number and is_bonus for wager games
      let roundNumber: number | null | undefined = undefined;
      if (rowData.round_number !== undefined && rowData.round_number !== null && rowData.round_number.trim() !== "") {
        const parsed = parseInt(rowData.round_number.trim());
        if (!isNaN(parsed) && parsed > 0) {
          roundNumber = parsed;
        }
      }
      
      let isBonus: boolean | undefined = undefined;
      if (rowData.is_bonus !== undefined && rowData.is_bonus !== null && rowData.is_bonus.trim() !== "") {
        const isBonusValue = rowData.is_bonus.trim().toLowerCase();
        isBonus = isBonusValue === "true";
      }
      
      // Create question - addQuestion automatically handles ordering by appending to the end
      const questionInput: QuestionInput = {
        text: rowData.question_text,
        choices,
        answer,
        points: parseInt(rowData.points) || 10,
        multiplier: parseInt(rowData.multiplier) || 1,
        isFillInBlank,
        isTrueFalse,
        timerSeconds,
        fillInBlankAnswer,
        maxWager,
      };
      
      // Only include boolean fields if they are explicitly set
      if (hasTimer !== undefined) {
        questionInput.hasTimer = hasTimer;
      }
      if (hasWager !== undefined) {
        questionInput.hasWager = hasWager;
      }
      // Include round/bonus fields if provided (for wager games)
      if (roundNumber !== undefined) {
        questionInput.roundNumber = roundNumber;
      }
      if (isBonus !== undefined) {
        questionInput.isBonus = isBonus;
      }
      
      const question = await addQuestion(gameId, questionInput);
      
      results.push(question);
    } catch (error) {
      const normalized = normalizeError(error);
      errors.push(`Row ${i + 2}: ${normalized.message || "Unknown error"}`);
    }
  }
  
  if (errors.length > 0 && results.length === 0) {
    throw new Error(`Import failed:\n${errors.join("\n")}`);
  }
  
  if (errors.length > 0) {
    // Return partial success with warnings
    return {
      success: true,
      imported: results.length,
      errors: errors,
      warnings: `Imported ${results.length} questions with ${errors.length} errors`
    };
  }
  
  return {
    success: true,
    imported: results.length,
    errors: []
  };
}

