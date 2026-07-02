#!/usr/bin/env node

/**
 * Probix AI - Unified Orchestrator Engine
 */

const readline = require('readline');
const { ProbixTranslator } = require('./translatorModel');

// ============================================================================
// CLI INTERFACE
// ============================================================================

// Predictor/prediction interactive mode removed — translator-only engine

async function runInteractive(translator) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: '\nPROBIX> '
  });

  console.log('\n🌟 Probix AI Interactive Mode');
  console.log('---');
  console.log('1. Type any English text and press Enter to translate.');
  console.log('2. Type "/lang <name/code>" to change language (e.g., /lang French or /lang fra_Latn).');
  console.log('3. Type "/quit" to exit.');
  console.log('---');
  
  let targetLang = 'yor_Latn';
  console.log(`Current Language: Yoruba (yor_Latn)`);
  rl.prompt();

  rl.on('line', async (line) => {
    const input = line.trim();
    if (!input) { rl.prompt(); return; }

    const command = input.split(' ')[0];

    if (command === '/quit') {
      rl.close();
      return;
    }

    if (command === '/lang') {
      const parts = input.split(' ');
      if (parts.length < 2) {
        console.log('❌ Please provide a language name or code. Example: /lang Igbo');
      } else {
        const langSearch = parts.slice(1).join(' ');
        const newCode = translator.getCodeByName(langSearch);
        if (newCode) {
          targetLang = newCode;
          console.log(`🌍 Target language changed to: ${targetLang}`);
        } else {
          console.log(`❌ Could not find language: "${langSearch}". Check LANGUAGES.md for valid codes.`);
        }
      }
      rl.prompt();
      return;
    }

    // If the input appears to contain math or STEM keywords, run translation with verification
    const isMathLike = /\$.*\$|\bsolve\b|\bintegral\b|\bderivative\b|[0-9]+\s*[+\-*/=^]\s*[0-9]+/i.test(input);
    process.stdout.write('🔄 Translating...');
    try {
      if (isMathLike && typeof translator.translateAndVerify === 'function') {
        const result = await translator.translateAndVerify(input, 'eng_Latn', targetLang);
        process.stdout.clearLine(0);
        process.stdout.cursorTo(0);
        console.log(`✅ Result [${targetLang}]: ${result.translation}`);
        if (result.math_checks && result.math_checks.length) {
          console.log('🔬 Math verification:');
          result.math_checks.forEach((c) => {
            if (c.result) {
              console.log(` - ${c.expression} -> ok=${c.result.ok} ${c.result.reason ? '(' + c.result.reason + ')' : ''}`);
            } else if (c.error) {
              console.log(` - ${c.expression} -> error: ${c.error}`);
            }
          });
        }
      } else {
        const result = await translator.translate(input, 'eng_Latn', targetLang);
        process.stdout.clearLine(0);
        process.stdout.cursorTo(0);
        console.log(`✅ Result [${targetLang}]: ${result}`);
      }
    } catch (err) {
      console.error(`\n❌ Error: ${err.message}`);
    }
    rl.prompt();
  }).on('close', () => {
    console.log('\n👋 Goodbye!');
    process.exit(0);
  });
}

async function runDemo(translator) {
  const testText = "God is good and everyone should have access to education.";
  const targets = [
    { code: 'yor_Latn', name: 'Yoruba' },
    { code: 'ibo_Latn', name: 'Igbo' },
    { code: 'hau_Latn', name: 'Hausa' },
    { code: 'pcm_Latn', name: 'Pidgin' },
    { code: 'fra_Latn', name: 'French' }
  ];

  console.log(`\n📝 Global Demo: "${testText}"`);
  for (const target of targets) {
    const result = await translator.translate(testText, 'eng_Latn', target.code);
    console.log(`✅ ${target.name.padEnd(10)}: ${result}`);
  }
}

// ============================================================================
// MAIN ENTRY POINT
// ============================================================================

if (require.main === module) {
  (async () => {
    const args = process.argv.slice(2);
    const mode = args.find(arg => arg.startsWith('--mode='))?.split('=')[1] || 'translation';

    // Help flag for both modes
    if (args.includes('--help') || args.includes('-h')) {
      console.log('\n📖 Probix AI Backend - Usage Guide\n');
      console.log('Usage: node inference.js [--mode=<mode>] [options]\n');
      console.log('Modes:');
      console.log('  translation (default) - NLLB-200 language translation');
      console.log('Translation Mode Options:');
      console.log('  --text="..."          - Translate specific text');
      console.log('  --lang=<code>         - Target language (default: yor_Latn)');
      console.log('  --source=<code>       - Source language (default: eng_Latn)');
      console.log('  --demo                - Run demo across multiple languages');
      console.log('  --interactive         - Interactive translation console');
      console.log('  --list-langs          - Show all supported languages\n');
      console.log('Examples:');
      console.log('  node inference.js --text="Hello" --lang=yor_Latn');
      console.log('\n');
      process.exit(0);
    }
    if (mode === 'predict') {
      console.error('❌ Predict mode removed — this build is translator-only.');
      process.exit(1);
    } else {
      // Translation mode (default)
      const translator = new ProbixTranslator();

      try {
        await translator.loadModel();

        if (args.includes('--list-langs')) {
          console.log('\n📚 Supported NLLB-200 languages:');
          listSupportedLanguages().forEach((line) => console.log(`   ${line}`));
          process.exit(0);
        }

        if (args.includes('--demo')) {
          await runDemo(translator);
        } else if (args.includes('--interactive')) {
          await runInteractive(translator);
        } else if (args.includes('--text')) {
          const textIdx = args.indexOf('--text') + 1;
          const langIdx = args.indexOf('--lang') + 1;
          const sourceIdx = args.indexOf('--source') + 1;
          const text = args[textIdx];
          const lang = langIdx > 0 ? args[langIdx] : 'yor_Latn';
          const source = sourceIdx > 0 ? args[sourceIdx] : 'eng_Latn';

          if (!text) {
            console.error('❌ Error: --text requires a string value.');
            process.exit(1);
          }

          const result = await translator.translate(text, source, lang);
          console.log(`\n✅ Result [${source} -> ${lang}]: ${result}`);
        } else {
          // Default to interactive if no args
          await runInteractive(translator);
        }
      } catch (error) {
        console.error('💥 Fatal Error:', error.message);
        process.exit(1);
      }
    }
  })();
}

module.exports = { ProbixTranslator };
