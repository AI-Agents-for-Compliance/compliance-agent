from anthropic import AsyncAnthropic

from app.config import settings

client = AsyncAnthropic(api_key=settings.anthropic_api_key)


async def complete(system: str, prompt: str, max_tokens: int = 4096) -> str:
    message = await client.messages.create(
        model=settings.anthropic_model,
        max_tokens=max_tokens,
        system=system,
        messages=[{"role": "user", "content": prompt}],
    )
    return message.content[0].text
