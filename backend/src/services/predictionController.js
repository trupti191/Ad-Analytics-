const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Simple wallet service stub. Replace with your actual wallet/inventory system.
const walletService = {
  async deductRuns(userId, amount) {
    // TODO: Integrate with real wallet. For now, assume success.
    return { success: true, remaining: 0 };
  },
  async creditRuns(userId, amount) {
    return { success: true };
  },
};

function isContestLocked(prediction) {
  const now = new Date();
  return now >= prediction.endTime;
}

exports.createPrediction = async (req, res) => {
  try {
    const { name, startTime, endTime, entryFee, rewardPool, status } = req.body;
    if (!name || !startTime || !endTime || typeof entryFee !== 'number' || typeof rewardPool !== 'number' || !status) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const prediction = await prisma.prediction.create({
      data: { name, startTime: new Date(startTime), endTime: new Date(endTime), entryFee, rewardPool, status },
    });
    return res.status(201).json(prediction);
  } catch (error) {
    console.error('createPrediction error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

exports.addQuestion = async (req, res) => {
  try {
    const { id } = req.params;
    const { question, options } = req.body;
    if (!question || !Array.isArray(options) || options.length < 2) {
      return res.status(400).json({ error: 'question and options[] (>=2) required' });
    }
    const prediction = await prisma.prediction.findUnique({ where: { id } });
    if (!prediction) return res.status(404).json({ error: 'Prediction not found' });
    if (isContestLocked(prediction)) return res.status(400).json({ error: 'Contest locked' });

    const created = await prisma.predictionQuestion.create({
      data: { predictionId: id, question, options },
    });
    return res.status(201).json(created);
  } catch (error) {
    console.error('addQuestion error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getActivePredictions = async (req, res) => {
  try {
    const now = new Date();
    const predictions = await prisma.prediction.findMany({
      where: {
        status: 'active',
        startTime: { lte: now },
        endTime: { gt: now },
      },
      include: {
        questions: true,
      },
      orderBy: { startTime: 'asc' },
    });
    return res.json(predictions);
  } catch (error) {
    console.error('getActivePredictions error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

exports.enterPrediction = async (req, res) => {
  const userId = req.header('x-user-id') || req.body.userId; // simple user source for now
  try {
    const { id } = req.params;
    const { answers } = req.body;
    if (!userId) return res.status(401).json({ error: 'Missing user' });
    if (!answers) return res.status(400).json({ error: 'answers required' });

    const prediction = await prisma.prediction.findUnique({
      where: { id },
      include: { questions: true },
    });
    if (!prediction) return res.status(404).json({ error: 'Prediction not found' });
    const now = new Date();
    if (now < prediction.startTime) return res.status(400).json({ error: 'Contest not started' });
    if (isContestLocked(prediction)) return res.status(400).json({ error: 'Contest ended' });

    // Validate answers shape: keys per question id
    const questionIds = new Set(prediction.questions.map(q => q.id));
    const providedIds = Object.keys(answers);
    for (const qid of providedIds) {
      if (!questionIds.has(qid)) {
        return res.status(400).json({ error: `Invalid question id: ${qid}` });
      }
    }

    // Prevent duplicate entry
    const existing = await prisma.predictionEntry.findUnique({
      where: { userId_predictionId: { userId, predictionId: id } },
    });
    if (existing) return res.status(400).json({ error: 'Already entered' });

    // Deduct runs
    const deduction = await walletService.deductRuns(userId, prediction.entryFee);
    if (!deduction.success) return res.status(402).json({ error: 'Insufficient runs' });

    const entry = await prisma.predictionEntry.create({
      data: {
        userId,
        predictionId: id,
        answers,
        runsStaked: prediction.entryFee,
      },
    });
    return res.status(201).json(entry);
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Already entered' });
    }
    console.error('enterPrediction error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

exports.setCorrectAnswers = async (req, res) => {
  try {
    const { id } = req.params;
    const { correctAnswers } = req.body; // { [questionId]: correctOption }
    if (!correctAnswers || typeof correctAnswers !== 'object') {
      return res.status(400).json({ error: 'correctAnswers object required' });
    }

    const prediction = await prisma.prediction.findUnique({
      where: { id },
      include: { questions: true },
    });
    if (!prediction) return res.status(404).json({ error: 'Prediction not found' });

    // Only allow after endTime or by admin discretion; but enforce lock
    if (!isContestLocked(prediction)) {
      return res.status(400).json({ error: 'Contest must be ended to set answers' });
    }

    const updates = [];
    for (const q of prediction.questions) {
      if (q.id in correctAnswers) {
        const value = correctAnswers[q.id];
        // optional validation: ensure value is one of options
        if (!q.options.includes(value)) {
          return res.status(400).json({ error: `Invalid answer for question ${q.id}` });
        }
        updates.push(
          prisma.predictionQuestion.update({ where: { id: q.id }, data: { correctAnswer: value } })
        );
      }
    }
    await prisma.$transaction(updates);
    return res.json({ ok: true });
  } catch (error) {
    console.error('setCorrectAnswers error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

exports.distributeRewards = async (req, res) => {
  try {
    const { id } = req.params;
    const prediction = await prisma.prediction.findUnique({
      where: { id },
      include: { questions: true },
    });
    if (!prediction) return res.status(404).json({ error: 'Prediction not found' });
    if (!isContestLocked(prediction)) return res.status(400).json({ error: 'Contest not ended yet' });

    // Fetch entries
    const entries = await prisma.predictionEntry.findMany({ where: { predictionId: id } });
    if (entries.length === 0) return res.json({ winners: [], rewardPerWinner: 0 });

    // Build correct answer map
    const correctMap = {};
    for (const q of prediction.questions) {
      if (q.correctAnswer) correctMap[q.id] = q.correctAnswer;
    }
    const allAnswersSet = Object.keys(correctMap).length === prediction.questions.length;
    if (!allAnswersSet) return res.status(400).json({ error: 'Not all answers set' });

    // Determine winners: exact match on all answers
    const winners = entries.filter((e) => {
      const ans = e.answers || {};
      for (const qid of Object.keys(correctMap)) {
        if (ans[qid] !== correctMap[qid]) return false;
      }
      return true;
    });

    if (winners.length === 0) {
      // No winners -> optionally refund? For now, distribute nothing
      return res.json({ winners: [], rewardPerWinner: 0 });
    }

    const rewardPerWinner = Math.floor(prediction.rewardPool / winners.length);

    // Credit winners and update entries
    const tx = [];
    for (const w of winners) {
      tx.push(
        prisma.predictionEntry.update({
          where: { id: w.id },
          data: { rewardWon: rewardPerWinner },
        })
      );
    }
    await prisma.$transaction(tx);

    // Credit wallet out-of-band
    await Promise.all(
      winners.map((w) => walletService.creditRuns(w.userId, rewardPerWinner))
    );

    return res.json({
      winners: winners.map((w) => ({ id: w.id, userId: w.userId, reward: rewardPerWinner })),
      rewardPerWinner,
    });
  } catch (error) {
    console.error('distributeRewards error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

