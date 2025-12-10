"use server";

import supabase from "@/lib/db";
import { generateGameCode } from "@/lib/util";

export async function createGame(hostName: string) {
  const code = generateGameCode();
  const { data, error } = await supabase
    .from("games")
    .insert({ code, host_name: hostName })
    .select()
    .single();
  
  if (error) throw new Error(error.message);
  return data;
}

export async function verifyPlayerSession(playerId: string, gameCode: string) {
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
  const { error } = await supabase
    .from("players")
    .delete()
    .eq("id", playerId);
  
  if (error) throw new Error(error.message);
}

export async function joinGame(code: string, username: string) {
  const { data: game, error: gameError } = await supabase
    .from("games")
    .select("id")
    .eq("code", code)
    .single();
  
  if (gameError || !game) throw new Error("Game not found");
  
  const { data, error } = await supabase
    .from("players")
    .insert({ username, game_id: game.id })
    .select()
    .single();
  
  if (error) throw new Error(error.message);
  return data;
}

export async function addQuestion(gameId: string, q: {
  text: string;
  choices: string[];
  answer: number;
  points: number;
  multiplier: number;
}) {
  const { data, error } = await supabase
    .from("questions")
    .insert({
      text: q.text,
      choices: q.choices,
      answer: q.answer,
      points: q.points,
      multiplier: q.multiplier,
      game_id: gameId,
    })
    .select()
    .single();
  
  if (error) throw new Error(error.message);
  return data;
}

export async function getGame(code: string) {
  // Cleanup old games before fetching (runs occasionally)
  // Only cleanup 1% of the time to avoid overhead
  if (Math.random() < 0.01) {
    await cleanupOldGames();
  }

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

  // Check if game is older than 8 hours and delete it
  const gameAge = Date.now() - new Date(game.created_at).getTime();
  const eightHours = 8 * 60 * 60 * 1000;
  
  if (gameAge > eightHours) {
    // Game is too old, delete it
    await supabase
      .from("games")
      .delete()
      .eq("id", game.id);
    throw new Error("Game has expired (older than 8 hours)");
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

  return {
    id: game.id,
    code: game.code,
    hostName: game.host_name,
    createdAt: game.created_at,
    currentQuestionIndex: game.current_question_index,
    answersRevealed: game.answers_revealed || false,
    questions: (game.questions || []).map((q: any) => ({
      id: q.id,
      text: q.text,
      choices: q.choices,
      answer: q.answer,
      points: q.points,
      multiplier: q.multiplier || 1,
      gameId: q.game_id,
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
      isCorrect: pa.is_correct,
      pointsEarned: pa.points_earned,
    })),
  };
}

export async function activateQuestion(gameId: string, questionIndex: number) {
  const { error } = await supabase
    .from("games")
    .update({ 
      current_question_index: questionIndex,
      answers_revealed: false,
    })
    .eq("id", gameId);
  
  if (error) throw new Error(error.message);
}

export async function submitAnswer(playerId: string, questionId: string, answerIndex: number) {
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
    const { error } = await supabase
      .from("player_answers")
      .update({ answer_index: answerIndex })
      .eq("id", existing.id);
    
    if (error) throw new Error(error.message);
    return;
  }

  // Insert new answer
  const { error } = await supabase
    .from("player_answers")
    .insert({
      player_id: playerId,
      question_id: questionId,
      answer_index: answerIndex,
    });
  
  if (error) throw new Error(error.message);
}

export async function revealAnswers(gameId: string, questionId: string) {
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
      .update({ answers_revealed: true })
      .eq("id", gameId);
    if (error) throw new Error(error.message);
    return;
  }

  // Calculate scores and update player answers
  for (const answer of answers) {
    const isCorrect = answer.answer_index === question.answer;
    const pointsEarned = isCorrect 
      ? question.points * (question.multiplier || 1) 
      : 0;

    // Update player answer
    await supabase
      .from("player_answers")
      .update({
        is_correct: isCorrect,
        points_earned: pointsEarned,
      })
      .eq("id", answer.id);

    // Get current player score
    const { data: player } = await supabase
      .from("players")
      .select("score")
      .eq("id", answer.player_id)
      .single();

    const currentScore = player?.score || 0;
    
    // Update player score
    await supabase
      .from("players")
      .update({ score: currentScore + pointsEarned })
      .eq("id", answer.player_id);
  }

  // Mark answers as revealed
  const { error } = await supabase
    .from("games")
    .update({ answers_revealed: true })
    .eq("id", gameId);
  
  if (error) throw new Error(error.message);
}

export async function nextQuestion(gameId: string, nextIndex: number) {
  const { error } = await supabase
    .from("games")
    .update({
      current_question_index: nextIndex,
      answers_revealed: false,
    })
    .eq("id", gameId);
  
  if (error) throw new Error(error.message);
}

export async function resetQuestion(gameId: string, questionId: string) {
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
        const newScore = Math.max(0, currentScore - answer.points_earned);
        
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
        })
        .eq("id", gameId);
    }
  }
}

export async function resetGame(gameId: string) {
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
    })
    .eq("id", gameId);
}

export async function endGame(gameId: string) {
  // Delete the game - CASCADE will automatically delete players, questions, and player_answers
  const { error } = await supabase
    .from("games")
    .delete()
    .eq("id", gameId);
  
  if (error) throw new Error(error.message);
}

export async function cleanupOldGames() {
  // Delete games older than 8 hours
  const eightHoursAgo = new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString();
  
  const { error } = await supabase
    .from("games")
    .delete()
    .lt("created_at", eightHoursAgo);
  
  if (error) {
    console.error("Failed to cleanup old games:", error);
  }
}
