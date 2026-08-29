import os
import json
from typing import TypeVar, Type
from openai import AsyncOpenAI
from pydantic import BaseModel

from app.llm.provider import LLMProvider
from app.config import settings

T = TypeVar('T', bound=BaseModel)

class OpenAIProvider(LLMProvider):
    def __init__(self):
        api_key = settings.OPENAI_API_KEY or os.getenv("OPENAI_API_KEY") or "dummy-key-for-dev"
        base_url = settings.OPENAI_BASE_URL or os.getenv("OPENAI_BASE_URL") or None
        
        self.client = AsyncOpenAI(
            api_key=api_key,
            base_url=base_url
        )
        self.model = settings.OPENAI_MODEL or os.getenv("OPENAI_MODEL", "deepseek-chat")
        self.is_custom_provider = bool(base_url and "openai.com" not in base_url)

    async def complete(self, system: str, user: str, response_model: Type[T] = None) -> T | str:
        api_key = settings.OPENAI_API_KEY or os.getenv("OPENAI_API_KEY")
        
        # Dev fallback if no key set
        if not api_key or api_key == "dummy-key-for-dev":
            if response_model:
                try:
                    return response_model.model_validate({})
                except Exception:
                    return response_model.model_validate({"requirements": [
                        {
                            "title": "Core System Setup",
                            "description": "Initialize database schema and authentication system.",
                            "category": "functional",
                            "priority": "critical",
                            "confidence": 0.95
                        }
                    ]})
            return "Mock response: Please set OPENAI_API_KEY."

        messages = [
            {"role": "system", "content": system},
            {"role": "user", "content": user}
        ]

        if response_model:
            # If standard OpenAI, try native beta parse
            if not self.is_custom_provider:
                try:
                    completion = await self.client.beta.chat.completions.parse(
                        model=self.model,
                        messages=messages,
                        response_format=response_model,
                    )
                    if completion.choices[0].message.parsed:
                        return completion.choices[0].message.parsed
                except Exception as parse_err:
                    print(f"Beta parse failed: {parse_err}")

            # Fallback / Custom Provider (e.g. DeepSeek): Prompt for clean JSON string
            schema_json = json.dumps(response_model.model_json_schema())
            json_sys = f"{system}\n\nYou MUST reply ONLY with a valid JSON object matching this JSON Schema:\n{schema_json}\nDo NOT wrap in markdown or backticks."
            
            completion = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": json_sys},
                    {"role": "user", "content": user}
                ]
            )
            content = completion.choices[0].message.content or "{}"
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0].strip()
            elif "```" in content:
                content = content.split("```")[1].split("```")[0].strip()
            
            return response_model.model_validate_json(content.strip())
        else:
            completion = await self.client.chat.completions.create(
                model=self.model,
                messages=messages,
            )
            return completion.choices[0].message.content or ""
