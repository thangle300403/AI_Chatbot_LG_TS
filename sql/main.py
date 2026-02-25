from fastapi import FastAPI
from pydantic import BaseModel
import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from langchain_openai import ChatOpenAI
from langchain_community.utilities.sql_database import SQLDatabase
from langchain_community.agent_toolkits.sql.toolkit import SQLDatabaseToolkit
from langgraph.prebuilt import create_react_agent
from langchain import hub
# uvicorn main:app --host 0.0.0.0 --port 5068 --reload
# ENV + DB
load_dotenv()

engine = create_engine(
    f"mysql+pymysql://{os.getenv('DB_USERNAME')}:{os.getenv('DB_PASSWORD')}@{os.getenv('DB_HOST')}/{os.getenv('DB_NAME')}",
    pool_pre_ping=True
)

allowed_tables = [
    "order",
    "order_item",
    "product",
    "category",
    "comment",
    "brand",
    "status",
    "ward",
    "province",
    "transport",
    "image_item",
]

db = SQLDatabase(
    engine,
    include_tables=allowed_tables,
    sample_rows_in_table_info=3
)

# LLM
llm = ChatOpenAI(
    model="gpt-4o-mini",
    temperature=0
)

# TOOLKIT
toolkit = SQLDatabaseToolkit(db=db, llm=llm)

# SYSTEM PROMPT
prompt_template = hub.pull("langchain-ai/sql-agent-system-prompt")

system_message = (
    prompt_template.format(dialect="MySQL", top_k=5)
    + "\n\nIMPORTANT RULES:\n"
      "You are a SQL agent with  access to a SQL database of a badminton store.\n"
      "1. You are ONLY allowed to execute SELECT queries.\n"
      "2. For UPDATE/DELETE/INSERT/ALTER/DROP/CREATE or any DML/DDL queries, "
      "you must refuse and explain that only read-only access is permitted.\n"
      "3. Never attempt to change the database state.\n"
      "4. If the user asks for modifications, respond with a polite refusal."
      "5. Answers must be in Vietnamese."
      "6. If there is no relevant request like consult, policy, respond with ''"
)


# AGENT
agent_executor = create_react_agent(
    llm, toolkit.get_tools(), prompt=system_message)
# FASTAPI

app = FastAPI()


class QueryRequest(BaseModel):
    query: str


@app.post("/sql")
async def run_sql_agent(req: QueryRequest):
    user_query = req.query
    print("🎓 SQL Query:", user_query)

    events = agent_executor.stream(
        {"messages": [("user", user_query)]},
        stream_mode="values",
    )

    final_answer = None
    for event in events:
        final_answer = event["messages"][-1].content
        print("🤖", final_answer)

    return {"answer": final_answer}
