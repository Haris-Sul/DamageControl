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

# Use the model that works for you
MODEL_NAME = 'gemini-3-flash-preview' 

app = Flask(__name__)
CORS(app)

SYSTEM_PROMPT = """
You are the engine for 'Damage Control', a corporate events simulator.
Role: Realistic, logical, and grounded corporate simulation. NOT overly dramatic.

Game State Definitions:
- Share Price: Starts at £100.
- Total Shares: Fixed at 1000 (unless Dilution/Buyback occurs, but for simplicity, keep fixed and just adjust Price to reflect value).
- Valuation = Share Price * 1000. Goal: > £100,000.
- Reputation: 0-100%. Goal: > 50%.

Financial Logic (Apply these strictly):
1. Action "Advise Buyback": IMMEDIATE Stock Price BOOST (+), Reputation DROP (-) (seen as greedy).
2. Action "Advise Dilution": IMMEDIATE Stock Price DROP (-), Reputation BOOST (+) (seen as raising capital to fix issues).
3. "No Comment": Neutral/Slight Rep Drop (uncertainty).

Persona Logic:
- You will be given a list of 'Active Personas' in the prompt.
- You MUST use these specific personas for the stakeholder comments.
- They should have consistent personalities (e.g., if 'Marcus' is cynical, he stays cynical).

JSON Structure Required:
{
  "narrative": "Professional situation report (max 2 sentences).",
  "share_price": 105.50,
  "reputation": 55,
  "headline": "A Professional Business Headline",
  "stakeholder_feed": [
    {"role": "Public", "name": "NameFromList", "text": "...", "sentiment": -5},
    {"role": "Investor", "name": "NameFromList", "text": "...", "sentiment": 2},
    {"role": "Employee", "name": "NameFromList", "text": "...", "sentiment": 0}
  ],
  "next_event": "Description of the next event (can be minor, neutral, or positive)..."
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
        
        # STEP 1: Generate Dynamic Personas for this session
        persona_prompt = f"""
        Generate 3 distinct stakeholder personas for a {archetype} company.
        Return strictly JSON:
        {{
            "public": {{"name": "Firstname", "trait": "Cynical/Loyal/etc"}},
            "investor": {{"name": "Firstname", "trait": "Risk-averse/Aggressive"}},
            "employee": {{"name": "Firstname", "trait": "Burned-out/Motivated"}}
        }}
        """
        personas = call_gemini(persona_prompt)
        
        # STEP 2: Generate Round 0 (The Briefing)
        prompt = f"""
        The player manages a {archetype}.
        Personas to use: {json.dumps(personas)}.
        
        Generate a 'Round 0' Business Briefing.
        - No crisis yet. Just a standard operational update.
        - Share Price starts at 100. Reputation at 50.
        - 'next_event' should be a minor operational hiccup or market rumor.
        {SYSTEM_PROMPT}
        """
        
        game_data = call_gemini(prompt)
        game_data['personas'] = personas # Store personas in state to pass back later
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
        1. Calculate impact on Share Price (Base £100) and Reputation (0-100).
        2. Apply Financial Logic (Buyback = +Price/-Rep, Dilution = -Price/+Rep).
        3. Generate reactions using the Active Personas.
        4. Generate next event (Keep it realistic, not always a disaster).
        {SYSTEM_PROMPT}
        """
        
        game_data = call_gemini(prompt)
        game_data['personas'] = personas # Persist personas
        return jsonify(game_data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(port=5000, debug=True)