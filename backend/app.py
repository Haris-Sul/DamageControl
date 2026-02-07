import os
import json
import logging
from flask import Flask, request, jsonify
from flask_cors import CORS
from google import genai
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)

api_key = os.environ.get("GEMINI_API_KEY")
client = genai.Client(api_key=api_key)

MODEL_NAME = 'gemini-3-flash-preview'

app = Flask(__name__)
CORS(app)

SYSTEM_PROMPT = """
You are the 'Damage Control' game engine. You simulate a corporate PR disaster.
Output strictly in JSON format.

Archetypes:
1. Tech Unicorn: High growth, fragile reputation.
2. Pharma Corp: High ethics stakes, extreme volatility.
3. FinTech Bro: High-risk, aggressive, regulatory-heavy.
4. Industrial Titan: High stability, huge cash, low starting trust.

Required JSON Structure:
{
"narrative": "Description...",
"stock_val": 100000,
"rep_val": 50,
"headline": "PUNCHY 5-WORD HEADLINE",
"comments": [
{"role": "Public", "text": "...", "sentiment": -5},
{"role": "Investors", "text": "...", "sentiment": 2},
{"role": "Employees", "text": "...", "sentiment": 0}
],
"next_crisis": "Next specific crisis description..."
}
"""

def call_gemini(prompt):
    """Safe wrapper for Gemini 3 API calls"""
    try:
        response = client.models.generate_content(
            model=MODEL_NAME,
            contents=prompt,
            config={'response_mime_type': 'application/json'}
        )
        return json.loads(response.text)
    except Exception as e:
        logging.error(f"Gemini Error: {str(e)}")
        raise e

@app.route('/api/start', methods=['POST'])
def start_game():
    try:
        data = request.json
        archetype = data.get('archetype', 'Tech Unicorn')
        
        # Initial context for Day 1
        prompt = f"The player chose {archetype}. Generate the Day 1 crisis. {SYSTEM_PROMPT}"
        
        game_data = call_gemini(prompt)
        return jsonify(game_data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/turn', methods=['POST'])
def process_turn():
    try:
        data = request.json
        prompt = f"""
        Current State: {data.get('current_state')}
        Action: {data.get('action_id')}
        Statement: "{data.get('statement')}"
        Calculate the impact on stock and reputation.
        {SYSTEM_PROMPT}
        """
        
        game_data = call_gemini(prompt)
        return jsonify(game_data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(port=5000, debug=True)