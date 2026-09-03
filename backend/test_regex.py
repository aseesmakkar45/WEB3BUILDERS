import re

queries = [
    "What do you think about the latest OpenAI model released yesterday?",
    "Tell me about the new SpaceX rocket",
    "What is there to say about Newton's third law?",
    "what are your thoughts on settling Mars?"
]

for q in queries:
    objective = q.lower()
    objective = re.sub(r'\b(what do you think about|what are your thoughts on|can you explain|tell me about|what is|who is|the|latest|new)\b', '', objective)
    objective = re.sub(r'[?!]', '', objective)
    search_query = " ".join(objective.split()).strip()
    print(f"Original: {q}\nExtracted: {search_query}\n")

    has_current_signals = bool(re.search(r'\b(latest|new|news|yesterday|today|recent|current|this week)\b', q.lower()))
    print(f"Current Signals: {has_current_signals}\n---")
