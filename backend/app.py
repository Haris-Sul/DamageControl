import os
import json
import re
import logging
from flask import Flask, request, jsonify
from flask_cors import CORS
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()
logging.basicConfig(level=logging.INFO)

# 1. Setup Client (Standard SDK)
api_key = os.environ.get("GEMINI_API_KEY")
if not api_key:
    logging.error("❌ GEMINI_API_KEY not found!")
genai.configure(api_key=api_key)

# 2. MODEL SWITCH: 'gemma-3-27b-it'
# Why: Gemini Flash is capped at 20 requests/day. Gemma 3 is often capped at ~14k/day.
MODEL_NAME = 'models/gemma-3-27b-it'

app = Flask(__name__)
CORS(app)

SYSTEM_PROMPT = """
You are the engine for 'Damage Control', a corporate strategy simulator.
Output strictly in valid JSON format. Do not use Markdown code blocks.

Game Logic:
- Share Price: Starts £100.
- Valuation = Price * Total Shares.
- Goal: Valuation > £100,000.

Action Effects:
1. "Advise Buyback": Reduce 'total_shares' by 50-100. Increase 'share_price'.
2. "Advise Dilution": Increase 'total_shares' by 50-100. Decrease 'share_price'.
3. "Monitor Situation": Neutral impact unless text is provided.

JSON Structure Required:
{
  "narrative": "Short text summary.",
  "share_price": 100.0,
  "total_shares": 1000, 
  "reputation": 50,
  "analyst_rating": "Buy", 
  "headline": "Short Headline",
  "stakeholder_feed": [
    {"role": "Public", "name": "User1", "text": "...", "sentiment": -5},
    {"role": "Investor", "name": "Inv2", "text": "...", "sentiment": 2},
    {"role": "Employee", "name": "Emp3", "text": "...", "sentiment": 0}
  ],
  "market_rumor": "A short rumor..."
}
"""

def clean_json(text):
    """
    Gemma often adds markdown ```json ... ``` blocks. 
    This removes them to prevent crashing.
    """
    # Remove markdown code blocks
    text = re.sub(r'^```json\s*', '', text, flags=re.MULTILINE)
    text = re.sub(r'^```\s*', '', text, flags=re.MULTILINE)
    text = re.sub(r'\s*```$', '', text, flags=re.MULTILINE)
    return text.strip()

def call_ai(prompt):
    try:
        model = genai.GenerativeModel(MODEL_NAME)
        # NOTE: We DO NOT use response_mime_type='application/json' because Gemma doesn't support it.
        # We rely on the prompt + clean_json() instead.
        response = model.generate_content(prompt)
        
        cleaned_text = clean_json(response.text)
        return json.loads(cleaned_text)
    except Exception as e:
        logging.error(f"AI Error: {str(e)}")
        # Return valid fallback data so the game doesn't crash
        return {
            "narrative": "The market data feed is currently unstable due to high volatility.",
            "share_price": 100.0,
            "total_shares": 1000,
            "reputation": 50,
            "analyst_rating": "Hold",
            "headline": "MARKET INTERRUPTION",
            "stakeholder_feed": [],
            "market_rumor": "Data unavailable."
        }

@app.route('/api/start', methods=['POST'])
def start_game():
    try:
        data = request.json
        archetype = data.get('archetype', 'Tech Unicorn')
        
        prompt = f"""
        Start a new game for a {archetype} company.
        Generate 3 distinct personas (Public, Investor, Employee).
        Set initial state: Price £100, Shares 1000, Rep 50.
        {SYSTEM_PROMPT}
        """
        
        game_data = call_ai(prompt)
        # Store personas in the game data to pass back and forth (stateless)
        game_data['archetype'] = archetype
        return jsonify(game_data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/turn', methods=['POST'])
def process_turn():
    try:
        data = request.json
        current_state = data.get('current_state', {})
        
        prompt = f"""
        Current State: {json.dumps(current_state)}
        Player Action: {data.get('action_id')}
        Player Statement: "{data.get('statement')}"
        
        Task:
        1. Update 'share_price' and 'total_shares' based on Action.
        2. Generate reactions.
        3. Ensure valid JSON output.
        {SYSTEM_PROMPT}
        """
        
        game_data = call_ai(prompt)
        return jsonify(game_data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(port=5000, debug=True)