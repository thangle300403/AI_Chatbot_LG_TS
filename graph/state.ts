import { Annotation, MessagesAnnotation } from "@langchain/langgraph";

export const State = Annotation.Root({
  ...MessagesAnnotation.spec,

  pendingUpdate: Annotation<{
    tool: "update_student_info";
    args: {
      id: number;
      name?: string;
      gender?: string;
      birthday?: string;
    };
  } | null>({
    default: () => null,
    value: (_, next) => next,
  }),

  intent: Annotation<string | null>({
    value: (_, next) => next,
    default: () => null,
  }),

  originalUserQuestion: Annotation<string | null>({
    default: () => null,
    value: (_, next) => next,
  }),

  agents: Annotation<
    {
      agent: "sql" | "consult" | "decision" | "policy";
      query: string;
    }[]
  >({
    default: () => [],
    value: (_, next) => next,
  }),

  consultQuery: Annotation<string | null>({
    default: () => null,
    value: (_, next) => next,
  }),

  finalAnswer: Annotation<string | null>({
    default: () => null,
    value: (_, next) => next,
  }),

  semanticMemories: Annotation<string[]>({
    value: (_, next) => next,
    default: () => [],
  }),

  user: Annotation<{
    id: number;
    email: string;
  } | null>({
    default: () => null,
    value: (_, next) => next,
  }),

  results: Annotation<
    {
      source: "sql" | "consult" | "decision" | "policy";
      result: string;
      products?: {
        id?: number;
        name: string;
        price?: number;
        discount?: number;
        image?: string;
      }[];
    }[]
  >({
    default: () => [],
    value: (prev, next) => (next.length === 0 ? [] : prev.concat(next)),
  }),

  doneAgents: Annotation<string[]>({
    default: () => [],
    value: (prev, next) => (next.length === 0 ? [] : prev.concat(next)),
  }),
  summary: Annotation<string>({
    default: () => "",
    value: (_, next) => next,
  }),
  summarizeOnly: Annotation<boolean>({
    default: () => false,
    value: (_, next) => next,
  }),
});

export type StateType = typeof State.State;
