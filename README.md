# QLSV Chatbot (Multi-Agent AI Chatbot)

## Overview

This project is a **multi-agent AI chatbot** built for a **badminton e-commerce/store system**, designed to handle multiple types of user requests within a single conversation flow, such as:

- Product consultation (rackets, shoes, accessories, etc.)
- Structured data lookup from the system (prices, orders, inventory, etc.)
- Policy Q&A (returns, warranty, shipping, payment, etc.)
- Operational actions (e.g., **order cancellation** with confirmation)

The system is built with **LangGraph + LangChain + OpenAI**, combining:
- **TypeScript/Node.js** for chatbot orchestration and response streaming
- **Python/FastAPI** for the SQL Agent (read-only database querying)
- **Vector Search (ChromaDB)** for semantic retrieval in product consultation and policy answering
- **Postgres/MySQL** for checkpoints, business data, and chat history

---

## Key Features

- **Multi-agent routing**: A supervisor automatically classifies user intent and routes requests to the right agents (`consult`, `sql`, `policy`, `decision`)
- **SSE streaming**: Real-time responses via `/chat/stream`
- **Hybrid AI architecture**:
  - RAG/vector search for consultation and policy retrieval
  - Dedicated SQL Agent for structured database queries
- **Conversation memory**:
  - Chat history persistence
  - Automatic conversation summarization to reduce token usage while preserving context
- **Human-in-the-loop**:
  - Sensitive operations (such as order status updates/cancellation) require confirmation before execution
- **Clear modular structure**:
  - `nodes/` (agent logic)
  - `tools/` (DB/business tools)
  - `vector/` (retrievers/search)
  - `memory/` (history + summarization)
  - `sql/` (Python SQL microservice)

---

## High-Level Architecture

1. The user sends a question to the `Node.js server` through the streaming endpoint.
2. The `Supervisor Agent` analyzes intent and selects one or more agents.
3. Specialized agents run independently / in parallel by role:
   - `consult`: product consultation using vector search
   - `policy`: policy retrieval from indexed documents
   - `sql`: calls the Python SQL Agent to query MySQL (read-only `SELECT`)
   - `decision`: handles order cancellation flow (with confirmation)
4. The `Synthesize Agent` merges results from multiple agents into the final response (Markdown).
5. The system stores chat history and summarizes long conversations when needed.

---

## Tech Stack

- **TypeScript / Node.js**
- **LangChain**
- **LangGraph**
- **OpenAI (LLM)**
- **FastAPI (Python)**
- **SQLAlchemy**
- **MySQL**
- **PostgreSQL** (LangGraph checkpointing)
- **ChromaDB** (vector store)
- **JWT** (user identification via cookie/token)

---

## Suitable Use Cases

- Intelligent e-commerce sales chatbot
- Customer support assistant that can handle both FAQ/policies and order data
- AI systems that need to combine:
  - document knowledge (RAG),
  - SQL-backed structured data,
  - business actions with explicit confirmation

---

## Notes

- Based on the current codebase, the project is tailored to the **badminton store domain**.
- It can be adapted to other domains by replacing:
  - routing/agent prompts
  - vector collections
  - business tools
  - policy documents / SQL schema
