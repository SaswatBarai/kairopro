import os
import json
from typing import TypeVar, Type
from openai import AsyncOpenAI
from pydantic import BaseModel

from app.llm.provider import LLMProvider

T = TypeVar('T', bound=BaseModel)

class OpenAIProvider(LLMProvider):
    def __init__(self):
        self.client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        self.model = os.getenv("OPENAI_MODEL", "gpt-4o")

    async def complete(self, system: str, user: str, response_model: Type[T] = None) -> T | str:
        if not os.getenv("OPENAI_API_KEY"):
            # Fallback for dev environment without a key
            if response_model:
                # Attempt to return a mock empty instance if it's a list or model
                # This is just a fallback to prevent crashing if no API key is set
                pass
            return "Mock response: Please set OPENAI_API_KEY."

        messages = [
            {"role": "system", "content": system},
            {"role": "user", "content": user}
        ]

        if response_model:
            # Pydantic schema extraction (structured output) using new instructor / tool format or beta parse
            # Since OpenAI added native structured outputs via beta.chat.completions.parse in v1.40.0+
            completion = await self.client.beta.chat.completions.parse(
                model=self.model,
                messages=messages,
                response_format=response_model,
            )
            return completion.choices[0].message.parsed
        else:
            completion = await self.client.chat.completions.create(
                model=self.model,
                messages=messages,
            )
            return completion.choices[0].message.content
