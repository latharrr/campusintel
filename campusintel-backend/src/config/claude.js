const Anthropic = require('@anthropic-ai/sdk');

const apiKey = process.env.ANTHROPIC_API_KEY;

if (!apiKey) {
  console.warn('⚠️ Missing ANTHROPIC_API_KEY in .env file!');
}

const anthropic = new Anthropic({
  apiKey: apiKey || 'dummy_key',
});

module.exports = anthropic;
