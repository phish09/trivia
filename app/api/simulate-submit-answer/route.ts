import { NextRequest, NextResponse } from 'next/server';
import { submitAnswer } from '@/app/actions';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { playerId, questionId, answerIndex, textAnswer, wager, wagerSlot, playerRound } = body;

    if (!playerId || !questionId) {
      return NextResponse.json(
        { error: 'Missing playerId or questionId' },
        { status: 400, headers: corsHeaders }
      );
    }

    await submitAnswer(
      playerId,
      questionId,
      answerIndex ?? null,
      textAnswer,
      wager,
      wagerSlot ?? null,
      playerRound ?? null
    );
    
    return NextResponse.json({ success: true }, { headers: corsHeaders });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to submit answer' },
      { status: 400, headers: corsHeaders }
    );
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}
