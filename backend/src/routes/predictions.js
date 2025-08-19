const express = require('express');
const {
  createPrediction,
  addQuestion,
  getActivePredictions,
  enterPrediction,
  setCorrectAnswers,
  distributeRewards,
} = require('../services/predictionController');

const adminRouter = express.Router();
const publicRouter = express.Router();

// Admin routes
adminRouter.post('/predictions', createPrediction);
adminRouter.post('/predictions/:id/questions', addQuestion);
adminRouter.patch('/predictions/:id/answers', setCorrectAnswers);
adminRouter.post('/predictions/:id/distribute', distributeRewards);

// Public routes
publicRouter.get('/predictions/active', getActivePredictions);
publicRouter.post('/predictions/:id/enter', enterPrediction);

module.exports = {
  adminRouter,
  publicRouter,
};

