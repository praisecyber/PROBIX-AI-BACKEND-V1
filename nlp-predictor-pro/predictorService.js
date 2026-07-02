#!/usr/bin/env node
const readline = require('readline');
const { ProbixPredictor } = require('./predictorModel');

function generateGamification(prediction, sample = {}) {
  const tasks = [];
  let xp = 0;
  let coaching = '';

  if (prediction < 3.2) {
    coaching = `💡 Tip: Increase traditional study hours (currently ${sample.Traditional_Study_Hours || 'N/A'}h). Aim for 15 hrs.`;
    xp = 50;
    tasks.push('Study without AI for 2 hours');
    tasks.push(`Translate 3 English phrases to ${sample.Native_Language || 'your language'}`);
  } else {
    coaching = '🔥 Great work — you are on track for a good outcome! Keep the routine.';
    xp = 100;
    tasks.push('Teach someone a concept you learned this week');
    tasks.push('Translate 1 technical paragraph to your language');
  }

  if ((sample.Weekly_GenAI_Hours || 0) > 15) {
    tasks.push('Take a 30-minute manual review of notes (no AI)');
  }

  return { prediction, coaching, xp, tasks };
}

async function runInteractive(predictor) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, prompt: '\nPREDICTOR> ' });

  console.log('\n🎯 Probix Predictor Interactive');
  console.log('Commands: /help, /info, /predict <json>, /gamify <json>, /quit');
  rl.prompt();

  rl.on('line', async (line) => {
    const input = line.trim();
    if (!input) { rl.prompt(); return; }

    const command = input.split(' ')[0];

    if (command === '/quit') { rl.close(); return; }

    if (command === '/help') {
      console.log('  /info                 - show model info');
      console.log('  /predict <json>       - predict from JSON sample');
      console.log('  /gamify <json>        - predict + get gamification payload');
      console.log('  /quit                 - exit');
      rl.prompt();
      return;
    }

    if (command === '/info') {
      const info = predictor.getModelInfo();
      console.log(JSON.stringify(info, null, 2));
      rl.prompt();
      return;
    }

    if (command === '/predict' || command === '/gamify') {
      const rest = input.substring(command.length).trim();
      let sample = null;
      try {
        sample = JSON.parse(rest);
      } catch (err) {
        console.error('❌ Expecting a JSON object after command');
        rl.prompt();
        return;
      }

      try {
        const pred = predictor.predict(sample);
        console.log(`\n✅ Prediction: ${pred.toFixed(4)}`);
        if (command === '/gamify') {
          const gamified = generateGamification(pred, sample);
          console.log('\n🎮 Gamification Payload:');
          console.log(JSON.stringify(gamified, null, 2));
        }
      } catch (err) {
        console.error('❌ Error during prediction:', err.message);
      }

      rl.prompt();
      return;
    }

    console.log('Unknown command. Type /help');
    rl.prompt();
  }).on('close', () => {
    console.log('\n👋 Goodbye!');
    process.exit(0);
  });
}

// CLI entry
if (require.main === module) {
  (async () => {
    const args = process.argv.slice(2);
    const predictor = new ProbixPredictor();

    // allow custom model path via --model=path
    const customModelPath = args.find(a => a.startsWith('--model='))?.split('=')[1];
    if (customModelPath) predictor.modelPath = customModelPath;

    if (!predictor.loadModel()) process.exit(1);

    if (args.includes('--help') || args.includes('-h')) {
      console.log('\nProbix Predictor Service - Usage');
      console.log('  --interactive            - run interactive predictor');
      console.log('  --predict "<json>"       - make a single prediction');
      console.log('  --gamify "<json>"        - predict + return gamification payload');
      console.log('  --model=<path>           - custom model file');
      process.exit(0);
    }

    if (args.includes('--interactive')) {
      await runInteractive(predictor);
      return;
    }

    if (args.find(a => a.startsWith('--predict'))) {
      const idx = args.findIndex(a => a.startsWith('--predict'));
      const jsonStr = args[idx].split('=')[1] || args[idx + 1];
      if (!jsonStr) { console.error('❌ --predict requires JSON'); process.exit(1); }
      try {
        const sample = JSON.parse(jsonStr);
        const result = predictor.predict(sample);
        console.log(`\n✅ Prediction: ${result.toFixed(4)}`);
      } catch (err) { console.error('❌', err.message); process.exit(1); }
      return;
    }

    if (args.find(a => a.startsWith('--gamify'))) {
      const idx = args.findIndex(a => a.startsWith('--gamify'));
      const jsonStr = args[idx].split('=')[1] || args[idx + 1];
      if (!jsonStr) { console.error('❌ --gamify requires JSON'); process.exit(1); }
      try {
        const sample = JSON.parse(jsonStr);
        const result = predictor.predict(sample);
        const gamified = generateGamification(result, sample);
        console.log(JSON.stringify(gamified, null, 2));
      } catch (err) { console.error('❌', err.message); process.exit(1); }
      return;
    }

    // default: show help
    console.log('No command given. Use --help for usage.');
    process.exit(0);
  })();
}

module.exports = { ProbixPredictor, generateGamification };
