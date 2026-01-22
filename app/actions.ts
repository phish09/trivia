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
  QUESTION_ORDER_FALLBACK 
} from "@/lib/constants";

export async function createGame(hostName: string, password?: string): Promise<CreateGameResult> {
  try {
    const supabase = getSupabaseClient();
    const code = generateGameCode();
    const { data, error } = await supabase
      .from("games")
      .insert({ code, host_name: hostName, host_password: password || null })
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
  // Get the current max question_order for this game to add new question at the end
  const { data: existingQuestions } = await supabase
    .from("questions")
    .select("question_order")
    .eq("game_id", gameId)
    .order("question_order", { ascending: false })
    .limit(1);
  
  const nextOrder = existingQuestions && existingQuestions.length > 0 
    ? (existingQuestions[0].question_order || 0) + 1 
    : 0;
  
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
  const { data: playerAnswers } = await supabase
    .from("player_answers")
    .select("*")
    .in("player_id", (game.players || []).map((p: any) => p.id));

  // Get updated player scores
  const { data: playersWithScores } = await supabase
    .from("players")
    .select("*")
    .eq("game_id", game.id)
    .order("score", { ascending: false });

  // Calculate time remaining for current question (server-side timer)
  let timeRemaining: number | null = null;
  if (game.current_question_index !== null && game.current_question_index !== undefined) {
    const currentQuestion = (game.questions || [])[game.current_question_index];
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
    questions: (game.questions || [])
      .sort((a: any, b: any) => {
        // Sort by question_order field if available, otherwise by id as fallback
        const orderA = a.question_order !== null && a.question_order !== undefined ? a.question_order : 999999;
        const orderB = b.question_order !== null && b.question_order !== undefined ? b.question_order : 999999;
        return orderA - orderB;
      })
      .map((q: any) => ({
        id: q.id,
        text: q.text,
        choices: q.choices,
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

export async function submitAnswer(playerId: string, questionId: string, answerIndex: number | null, textAnswer?: string, wager?: number) {
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
    
    const { error } = await supabase
      .from("player_answers")
      .update(updateData)
      .eq("id", existing.id);
    
    if (error) throw new Error(error.message);
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
  
  const { error } = await supabase
    .from("player_answers")
    .insert(insertData);
  
  if (error) throw new Error(error.message);
  
  // Update game activity when player submits answer
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
  if (question.is_fill_in_blank) {
    // For fill-in-the-blank questions, we need to ensure manually scored answers preserve their status
    // We explicitly do NOT update is_correct or points_earned for manually_scored answers
    // Only set defaults for answers that haven't been manually scored yet
    for (const answer of answers) {
      if (!answer.manually_scored) {
        // If answer hasn't been manually scored, set default values (0 points, incorrect)
        // This ensures all answers have a status when revealed
        await supabase
          .from("player_answers")
          .update({
            is_correct: false,
            points_earned: 0,
            manually_scored: false,
          })
          .eq("id", answer.id);
      }
      // If manually_scored is true, we explicitly do NOT touch is_correct or points_earned
      // These were set by manuallyAwardPoints and must be preserved exactly as-is
    }
    
    // Now update player scores based on the points_earned values
    // This is when scores should actually change for fill-in-the-blank questions
    for (const answer of answers) {
      const basePointsEarned = answer.points_earned || 0;
      const isCorrect = answer.is_correct || false;
      const wagerAmount = answer.wager || 0;
      const basePoints = question.points * (question.multiplier || 1);
      
      // Calculate final points earned based on wagering
      let finalPointsEarned = 0;
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
      
      // Get current player score
      const { data: player } = await supabase
        .from("players")
        .select("score")
        .eq("id", answer.player_id)
        .single();

      const currentScore = player?.score || 0;
      // For fill-in-the-blank, we add the final points earned (accounting for wagering)
      // Since this is the first time scores are being applied, we just add the points
      const newScore = currentScore + finalPointsEarned;

      // Update player answer with final points earned (for display purposes)
      await supabase
        .from("player_answers")
        .update({
          points_earned: finalPointsEarned,
        })
        .eq("id", answer.id);

      // Update player score (allow negative scores for wagering)
      await supabase
        .from("players")
        .update({ score: newScore })
        .eq("id", answer.player_id);
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

  // Calculate scores and update player answers (for multiple choice)
  for (const answer of answers) {
    // Skip answers that have been manually scored (shouldn't happen for multiple choice, but just in case)
    if (answer.manually_scored) {
      continue;
    }

    const isCorrect = answer.answer_index === question.answer;
    const wagerAmount = answer.wager || 0;
    const basePoints = question.points * (question.multiplier || 1);
    
    // Calculate points earned based on wagering
    let pointsEarned = 0;
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

    // Get current player score
    const { data: player } = await supabase
      .from("players")
      .select("score")
      .eq("id", answer.player_id)
      .single();

    const currentScore = player?.score || 0;
    const previousPoints = answer.points_earned || 0;
    const newScore = currentScore - previousPoints + pointsEarned;

    // Update player answer
    await supabase
      .from("player_answers")
      .update({
        is_correct: isCorrect,
        points_earned: pointsEarned,
      })
      .eq("id", answer.id);

    // Update player score (allow negative scores)
    await supabase
      .from("players")
      .update({ score: newScore })
      .eq("id", answer.player_id);
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

  // Reset game state
  await supabase
    .from("games")
    .update({
      current_question_index: null,
      answers_revealed: false,
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
     "has_wager", "max_wager"].join(","),
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
        q.max_wager || ""
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

