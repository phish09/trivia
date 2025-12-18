"use server";

import { getSupabaseClient } from "@/lib/db";
import { generateGameCode } from "@/lib/util";

export async function createGame(hostName: string, password?: string) {
  try {
    const supabase = getSupabaseClient();
    const code = generateGameCode();
    const { data, error } = await supabase
      .from("games")
      .insert({ code, host_name: hostName, host_password: password || null })
      .select()
      .single();
    
    if (error) {
      console.error("Supabase error:", error);
      throw new Error(error.message || `Failed to create game: ${JSON.stringify(error)}`);
    }
    return data;
  } catch (error: any) {
    console.error("createGame error:", error);
    console.error("Error details:", {
      name: error?.name,
      message: error?.message,
      cause: error?.cause,
      stack: error?.stack,
    });
    
    // Handle fetch errors specifically - check for TypeError or fetch failed message
    const errorMessage = error?.message || error?.toString() || "";
    const isFetchError = error instanceof TypeError || 
                        errorMessage.includes("fetch failed") ||
                        errorMessage.includes("Failed to fetch") ||
                        error?.name === "TypeError";
    
    if (isFetchError) {
      const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const actualUrl = envUrl || "https://lfmqhoijffrbmvadzamg.supabase.co";
      const envStatus = envUrl ? "✅ Using URL from .env.local" : "⚠️ Using hardcoded default (env vars not loaded)";
      
      throw new Error(
        `Failed to connect to Supabase database.\n\n` +
        `${envStatus}\n` +
        `Attempting to connect to: ${actualUrl}\n\n` +
        `Please check:\n` +
        `1. Your Supabase project is active (not paused) at ${actualUrl}\n` +
        `2. Your internet connection is working\n` +
        `3. Your .env.local file has the correct NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY\n` +
        `4. You have restarted your Next.js dev server after updating .env.local\n` +
        `5. Your Node.js version is compatible (try Node.js 18.15+)`
      );
    }
    
    // If it's already an Error with a message, re-throw it
    if (error instanceof Error && error.message) {
      throw error;
    }
    
    // Otherwise, create a new error with the message or string representation
    throw new Error(error?.message || error?.toString() || "Unknown error occurred");
  }
}

export async function verifyPlayerSession(playerId: string, gameCode: string) {
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

export async function joinGame(code: string, username: string, existingPlayerId?: string | null) {
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

export async function addQuestion(gameId: string, q: {
  text: string;
  choices: string[];
  answer: number;
  points: number;
  multiplier: number;
  isFillInBlank?: boolean;
  isTrueFalse?: boolean;
  hasTimer?: boolean;
  timerSeconds?: number;
  fillInBlankAnswer?: string;
  hasWager?: boolean;
  maxWager?: number;
}) {
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
  
  const insertData: any = {
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

export async function updateQuestion(questionId: string, q: {
  text: string;
  choices: string[];
  answer: number;
  points: number;
  multiplier: number;
  isFillInBlank?: boolean;
  isTrueFalse?: boolean;
  hasTimer?: boolean;
  timerSeconds?: number;
  fillInBlankAnswer?: string;
  hasWager?: boolean;
  maxWager?: number;
}) {
  const supabase = getSupabaseClient();
  const updateData: any = {
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
  // 1. Not started AND older than 30 days from creation
  // 2. Started BUT inactive for 30 days from last_activity
  const gameStarted = game.game_started || false;
  const thirtyDays = 30 * 24 * 60 * 60 * 1000;
  const now = Date.now();
  
  let shouldDelete = false;
  if (!gameStarted) {
    // Not started: check age from creation
    const gameAge = now - new Date(game.created_at).getTime();
    shouldDelete = gameAge > thirtyDays;
  } else {
    // Started: check inactivity from last_activity
    const lastActivity = game.last_activity || game.created_at;
    const inactivityPeriod = now - new Date(lastActivity).getTime();
    shouldDelete = inactivityPeriod > thirtyDays;
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
    players: (playersWithScores || []).map((p: any) => ({
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
  const updateData: any = {
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
    const updateData: any = {};
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
  const insertData: any = {
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
      const pointsEarned = answer.points_earned || 0;
      
      // Get current player score
      const { data: player } = await supabase
        .from("players")
        .select("score")
        .eq("id", answer.player_id)
        .single();

      const currentScore = player?.score || 0;
      // For fill-in-the-blank, we add the points_earned (which was set by manuallyAwardPoints)
      // Since this is the first time scores are being applied, we just add the points
      const newScore = currentScore + pointsEarned;

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

  // Delete all player answers
  const { data: questions } = await supabase
    .from("questions")
    .select("id")
    .eq("game_id", gameId);

  if (questions && questions.length > 0) {
    const questionIds = questions.map((q: any) => q.id);
    await supabase
      .from("player_answers")
      .delete()
      .in("question_id", questionIds);
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

