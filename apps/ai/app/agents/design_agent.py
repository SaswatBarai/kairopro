import json
import uuid
from typing import Any, Dict
from app.agents.base_agent import BaseAgent, AgentContext, AgentResult

DESIGN_PROMPT = """
You are a World-Class UI/UX Designer.
Based on the following PRD, generate a structured design system specification.
The style must be: {style}

Output JSON matching this exact structure:
{
  "name": "{style}",
  "colors": {
    "primary": "#...",
    "secondary": "#...",
    "background": "#...",
    "surface": "#...",
    "text": "#...",
    "dark": { "background": "#...", "surface": "#..." }
  },
  "typography": {
    "fontFamily": "Inter (or similar)",
    "headingScale": { "h1": "2.25rem", "h2": "1.875rem" },
    "bodyScale": { "base": "1rem" }
  },
  "spacing": { "unit": "0.25rem", "scale": [0,1,2,3,4,6,8,12,16] },
  "borderRadius": { "sm": "0.25rem", "md": "0.5rem", "lg": "0.75rem" },
  "components": {
    "button": { "paddingX": "1rem", "paddingY": "0.5rem", "borderRadius": "md" },
    "card": { "padding": "1.5rem", "borderRadius": "lg", "shadow": "md" }
  },
  "layout": {
    "sidebarWidth": "16rem",
    "headerHeight": "4rem",
    "maxContentWidth": "80rem"
  }
}
"""

class DesignAgent(BaseAgent):
    async def run(self, context: AgentContext) -> AgentResult:
        prd_data = context.inputs.get("prd", "No PRD provided")
        
        styles = [
            ("Modern SaaS", "Clean, vibrant, high-contrast, rounded corners, lots of whitespace, slight glassmorphism."),
            ("Minimal Enterprise", "Monochrome, strict grid, highly legible, sharp edges, serious tone."),
            ("Dark Premium", "Deep dark backgrounds, neon accents, sleek glow effects, luxury feel.")
        ]
        
        designs = []
        for i, (name, style_desc) in enumerate(styles):
            await self.emit_event(
                context.run_id, 
                "agent.thinking", 
                {"step": f"Generating design option {i+1}: {name}"}
            )
            
            prompt = DESIGN_PROMPT.replace("{style}", name)
            user_msg = f"PRD Context:\n{json.dumps(prd_data)}\n\nStyle Description:\n{style_desc}\n\nGenerate the JSON spec:"
            
            # Use JSON mode or generic completion (assuming structured output from provider)
            raw_response = await self.llm.complete(system=prompt, user=user_msg)
            
            # Simple fallback if raw_response is a string (assuming GPT returns valid JSON)
            if isinstance(raw_response, str):
                try:
                    # strip markdown backticks if present
                    clean_str = raw_response.replace("```json", "").replace("```", "").strip()
                    design_spec = json.loads(clean_str)
                except Exception:
                    design_spec = {"name": name, "error": "Failed to parse JSON"}
            else:
                design_spec = raw_response

            designs.append({
                "designOption": i + 1,
                "name": name,
                "description": style_desc,
                "designSpec": design_spec
            })

        await self.emit_event(
            context.run_id, 
            "agent.completed", 
            {"designs": designs}
        )

        return AgentResult(
            status="completed",
            output={"designs": designs},
            stateTransition="design_ready"
        )
