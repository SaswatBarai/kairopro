from abc import ABC, abstractmethod
from typing import TypeVar, Type, Any

T = TypeVar('T')

class LLMProvider(ABC):
    @abstractmethod
    async def complete(self, system: str, user: str, response_model: Type[T] = None) -> T | str:
        """
        Generate completion using LLM.
        If response_model is provided (Pydantic model), returns a structured output of that type.
        """
        pass
