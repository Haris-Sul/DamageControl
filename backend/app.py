import os
import json
import logging
from flask import Flask, request, jsonify
from flask_cors import CORS
from google import genai
from dotenv import load_dotenv

load_dotenv()
logging.basicConfig(level=logging.INFO)

# Setup Client
api_key = os.environ.get("GEMINI_API_KEY")
client = genai.Client(api_key=api_key)

MODEL_NAME = 'gemini-3-flash-preview' 

app = Flask(__name__)
CORS(app)

SYSTEM_PROMPT = """
You are the engine for 'Damage Control', a corporate strategy simulator.
Role: Logical, grounded corporate simulation.

Game State Definitions:
- Share Price: Starts at £100.
- Valuation = Share Price * 1000. Goal: > £100,000.
- Reputation: 0-100%. Goal: > 50%.
- Analyst Rating: Sell / Hold / Buy / Strong Buy.

Action Logic (Apply Strictly):
1. "Monitor Situation": 
   - IF Statement is EMPTY: Treat as "Silence/No Comment". (Neutral impact, or negative if in crisis).
   - IF Statement EXISTS: Treat as "Press Release". Analyze the text content for impact. (Good for announcing positive news).
2. "Advise Buyback": +Price, -Rep (Short term greed).
3. "Advise Dilution": -Price, +Rep (Raising capital).
4. "Deny/Apologize": Standard crisis management.

Forecast Logic:
- The 'market_rumor' should be a RUMOR. It might be true, it might be false.
- Do not make the 'next_event' strictly follow the rumor every time. Surprise the player occasionally.

JSON Structure Required:
{
  "narrative": "Professional situation report (max 2 sentences).",
  "share_price": 105.50,
  "reputation": 55,
  "analyst_rating": "Buy", 
  "headline": "A Professional Business Headline",
  "stakeholder_feed": [
    {"role": "Public", "name": "Name", "text": "...", "sentiment": -5},
    {"role": "Investor", "name": "Name", "text": "...", "sentiment": 2},
    {"role": "Employee", "name": "Name", "text": "...", "sentiment": 0}
  ],
  "market_rumor": "A rumor about what MIGHT happen next...",
  "next_event_logic": "Hidden note on what actually happens next (can differ from rumor)"
}
"""

def call_gemini(prompt):
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
        
        # Generate Personas
        persona_prompt = f"""
        Generate 3 distinct stakeholder personas for a {archetype} company.
        Return strictly JSON: {{ "public": {{ "name": "...", "trait": "..." }}, "investor": {{...}}, "employee": {{...}} }}
        """
        personas = call_gemini(persona_prompt)
        
        # Generate Round 0
        prompt = f"""
        Player manages a {archetype}.
        Personas: {json.dumps(personas)}.
        Generate Round 0 Briefing. 
        - Context: New fiscal year start.
        - Share Price: 100. Rep: 50. Rating: Hold.
        - rumor: "Quiet start expected."
        {SYSTEM_PROMPT}
        """
        
        game_data = call_gemini(prompt)
        game_data['personas'] = personas
        return jsonify(game_data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/turn', methods=['POST'])
def process_turn():
    try:
        data = request.json
        current_state = data.get('current_state', {})
        personas = current_state.get('personas', {})
        
        prompt = f"""
        Current State: {current_state}
        Active Personas: {json.dumps(personas)}
        
        Player Action: {data.get('action_id')}
        Player Statement: "{data.get('statement')}"
        
        Task:
        1. Calculate new Price (Base £100) and Rep (0-100).
        2. Determine Analyst Rating (Sell/Hold/Buy).
        3. Generate Reactions.
        4. Generate NEXT event (use previous rumor as input, but decide if it happens or not).
        {SYSTEM_PROMPT}
        """
        
        game_data = call_gemini(prompt)
        game_data['personas'] = personas
        return jsonify(game_data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(port=5000, debug=True)