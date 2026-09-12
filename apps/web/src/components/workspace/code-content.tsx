import type { ReactNode } from "react";

const K = (t: string) => (
  <span className="font-medium text-brand-purple-light">{t}</span>
);
const F = (t: string) => (
  <span className="font-semibold text-brand-cyan">{t}</span>
);
const Fn = (t: string) => <span className="text-brand-cyan/90">{t}</span>;
const S = (t: string) => <span className="text-brand-green">{t}</span>;
const T = (t: string) => <span className="text-amber-300">{t}</span>;
const N = (t: string | number) => <span className="text-rose-400">{t}</span>;
const A = (t: string) => <span className="text-brand-cyan/80">{t}</span>;
const Cm = (t: string) => <span className="italic text-zinc-500">{t}</span>;

export interface TreeNode {
  name: string;
  path: string;
  kind: "folder" | "file";
  children?: TreeNode[];
}

const file = (name: string, path: string): TreeNode => ({
  name,
  path,
  kind: "file",
});
const dir = (name: string, path: string, children: TreeNode[]): TreeNode => ({
  name,
  path,
  kind: "folder",
  children,
});

export const ROOT = dir("taskflow", "taskflow", [
  dir("app", "app", [
    dir("api", "app/api", [
      dir("tasks", "app/api/tasks", [
        file("route.ts", "app/api/tasks/route.ts"),
      ]),
    ]),
    dir("dashboard", "app/dashboard", [
      file("page.tsx", "app/dashboard/page.tsx"),
    ]),
    dir("login", "app/login", [file("page.tsx", "app/login/page.tsx")]),
  ]),
  dir("components", "components", [
    file("task-card.tsx", "components/task-card.tsx"),
    file("task-list.tsx", "components/task-list.tsx"),
    file("navbar.tsx", "components/navbar.tsx"),
  ]),
  dir("lib", "lib", [
    file("auth.ts", "lib/auth.ts"),
    file("db.ts", "lib/db.ts"),
  ]),
  dir("prisma", "prisma", [file("schema.prisma", "prisma/schema.prisma")]),
  dir("tests", "tests", [file("tasks.test.ts", "tests/tasks.test.ts")]),
  file("package.json", "package.json"),
  file("README.md", "README.md"),
]);

export const DEFAULT_TABS = [
  "app/api/tasks/route.ts",
  "prisma/schema.prisma",
  "app/dashboard/page.tsx",
  "tests/tasks.test.ts",
];

export const ACTIVE_TAB = "app/api/tasks/route.ts";
export const MODIFIED_TAB = "app/api/tasks/route.ts";
export const ACTIVE_LINE = 12;

const ROUTE_LINES: ReactNode[] = [
  <>
    {K("import")} {"{ NextResponse }"} {K("from")} {S('"next/server"')};
  </>,
  <>
    {K("import")} {"{ getServerSession }"} {K("from")} {S('"next-auth"')};
  </>,
  <>
    {K("import")} {"{ authOptions }"} {K("from")} {S('"@/lib/auth"')};
  </>,
  <>
    {K("import")} {"{ prisma }"} {K("from")} {S('"@/lib/db"')};
  </>,
  "",
  <>
    {K("export")} {K("async")} {K("function")} {F("GET")}(request:{" "}
    {T("Request")}) {"{"}
  </>,
  <>
    {"  "}
    {K("const")} session = {K("await")} getServerSession(authOptions);
  </>,
  <>
    {"  "}
    {K("if")} (!session) {"{"}
  </>,
  <>
    {"    "}
    {K("return")} NextResponse.json({"{ error: "}
    {S('"Unauthorized"')}
    {", status: "}
    {N(401)}
    {" }"});
  </>,
  "  }",
  "",
  <>
    {"  "}
    {K("const")} tasks = {K("await")} prisma.task.{Fn("findMany")}({"{"});
  </>,
  <>{"    where: { teamId: session.user.teamId },"}</>,
  <>
    {"    take: "}
    {N(50)}
    {","}
  </>,
  <>
    {"    orderBy: { createdAt: "}
    {S('"desc"')}
    {" },"}
  </>,
  "  });",
  <>
    {"  "}
    {K("return")} NextResponse.json(tasks);
  </>,
  "}",
  "",
  <>
    {K("export")} {K("async")} {K("function")} {F("PATCH")}(request:{" "}
    {T("Request")}) {"{"}
  </>,
  <>
    {"  "}
    {K("const")} session = {K("await")} getServerSession(authOptions);
  </>,
  <>
    {"  "}
    {K("if")} (!session) {K("return")} NextResponse.json({"{ error: "}
    {S('"Unauthorized"')}
    {", status: "}
    {N(401)}
    {" }"});
  </>,
  "",
  <>
    {"  "}
    {K("const")} {"{ id, dueDate, status }"} = {K("await")} request.json();
  </>,
  <>
    {"  "}
    {K("const")} updated = {K("await")} prisma.task.{Fn("update")}(
    {"{ where: { id }, data: { dueDate, status } }"});
  </>,
  <>
    {"  "}
    {K("return")} NextResponse.json(updated);
  </>,
  "}",
];

const SCHEMA_LINES: ReactNode[] = [
  <>
    {K("generator")} client {"{"}
  </>,
  <>
    {"  provider = "}
    {S('"prisma-client-js"')}
  </>,
  "}",
  "",
  <>
    {K("datasource")} db {"{"}
  </>,
  <>
    {"  provider = "}
    {S('"postgresql"')}
  </>,
  <>
    {"  url      = "}
    {Fn("env")}
    {S('"DATABASE_URL"')}
  </>,
  "}",
  "",
  <>
    {K("model")} {T("Task")} {"{"}
  </>,
  <>
    {"  id        "}
    {T("String")}
    {"     "}
    {A("@id @default(uuid())")}
  </>,
  <>
    {"  title     "}
    {T("String")}
  </>,
  <>
    {"  status    "}
    {T("TaskStatus")} {A("@default(TODO)")}
  </>,
  <>
    {"  dueDate   "}
    {T("DateTime?")}
  </>,
  <>
    {"  createdAt "}
    {T("DateTime")}
    {"   "}
    {A("@default(now())")}
  </>,
  <>
    {"  subtasks  "}
    {T("Subtask[]")}
  </>,
  "}",
  "",
  <>
    {K("model")} {T("Subtask")} {"{"}
  </>,
  <>
    {"  id       "}
    {T("String")}
    {"  "}
    {A("@id @default(uuid())")}
  </>,
  <>
    {"  title    "}
    {T("String")}
  </>,
  <>
    {"  taskId   "}
    {T("String")}
  </>,
  <>
    {"  task     "}
    {T("Task")}
    {"    "}
    {A("@relation(fields: [taskId], references: [id])")}
  </>,
  "}",
  "",
  <>
    {K("enum")} {T("TaskStatus")} {"{"}
  </>,
  "  TODO",
  "  IN_PROGRESS",
  "  DONE",
  "}",
];

const DASHBOARD_LINES: ReactNode[] = [
  <>
    {K("import")} {"{ prisma }"} {K("from")} {S('"@/lib/db"')};
  </>,
  <>
    {K("import")} {"{ TaskCard }"} {K("from")} {S('"@/components/task-card"')};
  </>,
  "",
  <>
    {K("export")} {K("default")} {K("async")} {K("function")}{" "}
    {F("DashboardPage")}()
    {" {"}
  </>,
  <>
    {"  "}
    {K("const")} tasks = {K("await")} prisma.task.{Fn("findMany")}({"{"});
  </>,
  <>
    {"    orderBy: { createdAt: "}
    {S('"desc"')}
    {" },"}
  </>,
  "    include: { subtasks: true },",
  "  });",
  "",
  <>
    {"  "}
    {K("return")} (
  </>,
  <>
    {"    <"}
    {Fn("main")}
    {" className="}
    {S('"mx-auto max-w-3xl p-6"')}
    {">"}
  </>,
  <>
    {"      <"}
    {Fn("h1")}
    {" className="}
    {S('"text-lg font-semibold"')}
    {">"}
    {S("Tasks")}
    {"</"}
    {Fn("h1")}
    {">"}
  </>,
  <>
    {"      <"}
    {Fn("div")}
    {" className="}
    {S('"mt-4 flex flex-col gap-3"')}
    {">"}
  </>,
  "        {tasks.map((task) => (",
  <>
    {"          <"}
    {Fn("TaskCard")}
    {" key={task.id} task={task} />"}
  </>,
  "        ))}",
  "      </div>",
  "    </main>",
  "  );",
  "}",
];

const LOGIN_LINES: ReactNode[] = [
  <>{S('"use client"')};</>,
  "",
  <>
    {K("import")} {"{ signIn }"} {K("from")} {S('"next-auth/react"')};
  </>,
  "",
  <>
    {K("export")} {K("default")} {K("function")} {F("LoginPage")}()
    {" {"}
  </>,
  <>
    {"  "}
    {K("return")} (
  </>,
  <>
    {"    <"}
    {Fn("form")}
    {" action={() => "}
    {Fn("signIn")}
    {S('"github"')}
    {", { callbackUrl: "}
    {S('"/dashboard"')}
    {" })}>"}
  </>,
  <>
    {"      <"}
    {Fn("button")}
    {" type="}
    {S('"submit"')}
    {">"}
    {S("Continue with GitHub")}
    {"</"}
    {Fn("button")}
    {">"}
  </>,
  "    </form>",
  "  );",
  "}",
];

const TASK_CARD_LINES: ReactNode[] = [
  <>
    {K("import")} {K("type")} {"{ Task }"} {K("from")} {S('"@/lib/db"')};
  </>,
  "",
  <>
    {K("interface")} {T("TaskCardProps")} {"{"}
  </>,
  <>
    {"  task: "}
    {T("Task")}
    {";"}
  </>,
  "}",
  "",
  <>
    {K("export")} {K("function")} {F("TaskCard")}({"{ task }: TaskCardProps"}){" "}
    {"{"}
  </>,
  <>
    {"  "}
    {K("return")} (
  </>,
  <>
    {"    <"}
    {Fn("article")}
    {" className="}
    {S('"rounded-md border p-4"')}
    {">"}
  </>,
  <>
    {"      <"}
    {Fn("h3")}
    {" className="}
    {S('"font-medium"')}
    {">"}
    {"{task.title}"}
    {"</"}
    {Fn("h3")}
    {">"}
  </>,
  <>
    {"      <"}
    {Fn("p")}
    {" className="}
    {S('"text-sm text-zinc-500"')}
    {">"}
    {"{task.dueDate?.toDateString()}"}
    {"</"}
    {Fn("p")}
    {">"}
  </>,
  "    </article>",
  "  );",
  "}",
];

const TASK_LIST_LINES: ReactNode[] = [
  <>
    {K("import")} {"{ TaskCard }"} {K("from")} {S('"@/components/task-card"')};
  </>,
  "",
  <>
    {K("export")} {K("function")} {F("TaskList")}(
    {"{ tasks }: { tasks: Task[] }"}) {"{"}
  </>,
  <>
    {"  "}
    {K("return")} (
  </>,
  <>
    {"    <"}
    {Fn("ul")}
    {" className="}
    {S('"flex flex-col gap-3"')}
    {">"}
  </>,
  "      {tasks.map((task) => (",
  <>
    {"        <"}
    {Fn("TaskCard")}
    {" key={task.id} task={task} />"}
  </>,
  "      ))}",
  "    </ul>",
  "  );",
  "}",
];

const NAVBAR_LINES: ReactNode[] = [
  <>
    {K("import")} Link {K("from")} {S('"next/link"')};
  </>,
  "",
  <>
    {K("export")} {K("function")} {F("Navbar")}()
    {" {"}
  </>,
  <>
    {"  "}
    {K("return")} (
  </>,
  <>
    {"    <"}
    {Fn("header")}
    {" className="}
    {S('"border-b px-6 py-3"')}
    {">"}
  </>,
  <>
    {"      <"}
    {Fn("Link")}
    {" href="}
    {S('"/dashboard"')}
    {">"}
    {S("TaskFlow")}
    {"</"}
    {Fn("Link")}
    {">"}
  </>,
  "    </header>",
  "  );",
  "}",
];

const AUTH_LINES: ReactNode[] = [
  <>
    {K("import")} {"{ PrismaAdapter }"} {K("from")}{" "}
    {S('"@auth/prisma-adapter"')};
  </>,
  <>
    {K("import")} GitHub {K("from")} {S('"next-auth/providers/github"')};
  </>,
  <>
    {K("import")} {"{ prisma }"} {K("from")} {S('"@/lib/db"')};
  </>,
  "",
  <>
    {K("export")} {K("const")} {Fn("authOptions")} = {"{"}
  </>,
  <>
    {"  adapter: "}
    {T("PrismaAdapter")}
    {"(prisma),"}
  </>,
  "  providers: [GitHub, Email],",
  <>
    {"  session: { strategy: "}
    {S('"database"')}
    {" },"}
  </>,
  <>
    {"{"}
    {K(" satisfies ")}
    {T("NextAuthOptions")}
    {";"}
  </>,
];

const DB_LINES: ReactNode[] = [
  <>
    {K("import")} {"{ PrismaClient }"} {K("from")} {S('"@prisma/client"')};
  </>,
  "",
  <>
    {K("export")} {K("const")} {Fn("prisma")} = {K("new")} {T("PrismaClient")}(
    {"{"})
  </>,
  <>
    {"  log: process.env.NODE_ENV === "}
    {S('"development"')}
    {" ? ["}
    {S('"query"')}
    {"] : [],"}
  </>,
  "});",
];

const TEST_LINES: ReactNode[] = [
  <>
    {K("import")} {"{ describe, expect, it }"} {K("from")} {S('"vitest"')};
  </>,
  <>
    {K("import")} {"{ GET, PATCH }"} {K("from")} {S('"@/app/api/tasks/route"')};
  </>,
  "",
  <>
    {Fn("describe")}
    {S('"/api/tasks"')}
    {", () => {"}
  </>,
  <>
    {"  "}
    {Fn("it")}
    {S('"rejects unauthenticated requests"')}
    {", async () => {"}
  </>,
  <>
    {"    "}
    {K("const")} res = {K("await")} GET({K("new")} {T("Request")}
    {S('"http://localhost/api/tasks"')});{"}"}
  </>,
  <>
    {"    "}
    {Fn("expect")}
    {"(res.status)."}
    {Fn("toBe")}
    {N("(401);")}
  </>,
  "  });",
  "",
  <>
    {"  "}
    {Fn("it")}
    {S('"returns tasks for the session team"')}
    {", async () => {"}
  </>,
  "    const res = await GET(authenticatedRequest());",
  "    const body = await res.json();",
  "    expect(Array.isArray(body)).toBe(true);",
  "  });",
  "",
  <>
    {"  "}
    {Fn("it")}
    {S('"patches due date and status"')}
    {", async () => {"}
  </>,
  "    const res = await PATCH(updateRequest({ id, dueDate, status }));",
  <>
    {"    "}
    {Fn("expect")}
    {"(res.status)."}
    {Fn("toBe")}
    {N("(200);")}
  </>,
  "  });",
  "});",
];

const PACKAGE_LINES: ReactNode[] = [
  "{",
  <>
    {"  "}
    {Fn('"name"')}
    {": "}
    {S('"taskflow"')}
    {","}
  </>,
  <>
    {"  "}
    {Fn('"private"')}
    {": true,"}
  </>,
  '  "scripts": {',
  <>
    {"    "}
    {Fn('"dev"')}
    {": "}
    {S('"next dev"')}
    {","}
  </>,
  <>
    {"    "}
    {Fn('"build"')}
    {": "}
    {S('"next build"')}
    {","}
  </>,
  <>
    {"    "}
    {Fn('"test"')}
    {": "}
    {S('"vitest run"')}
  </>,
  "  },",
  '  "dependencies": {',
  <>
    {"    "}
    {Fn('"next"')}
    {": "}
    {S('"15.1.0"')}
    {","}
  </>,
  <>
    {"    "}
    {Fn('"react"')}
    {": "}
    {S('"19.0.0"')}
    {","}
  </>,
  <>
    {"    "}
    {Fn('"zod"')}
    {": "}
    {S('"3.24.1"')}
  </>,
  "  }",
  "}",
];

const README_LINES: ReactNode[] = [
  <span className="font-semibold text-brand-purple-light"># TaskFlow</span>,
  "",
  "Lightweight task tracking with subtasks and due dates.",
  "",
  <span className="font-semibold text-brand-purple-light">
    ## Getting started
  </span>,
  "",
  <span className="text-brand-green"> pnpm install && pnpm dev</span>,
];

export const FILES: Record<string, ReactNode[]> = {
  "app/api/tasks/route.ts": ROUTE_LINES,
  "prisma/schema.prisma": SCHEMA_LINES,
  "app/dashboard/page.tsx": DASHBOARD_LINES,
  "app/login/page.tsx": LOGIN_LINES,
  "components/task-card.tsx": TASK_CARD_LINES,
  "components/task-list.tsx": TASK_LIST_LINES,
  "components/navbar.tsx": NAVBAR_LINES,
  "lib/auth.ts": AUTH_LINES,
  "lib/db.ts": DB_LINES,
  "tests/tasks.test.ts": TEST_LINES,
  "package.json": PACKAGE_LINES,
  "README.md": README_LINES,
};

export const NEW_FILE_LINES: ReactNode[] = [Cm("// new file"), ""];

const DIFF_BEFORE: ReactNode[] = [
  <>
    {K("export")} {K("async")} {K("function")} {F("GET")}(request:{" "}
    {T("Request")}) {"{"}
  </>,
  <>
    {"  "}
    {K("const")} session = {K("await")} getServerSession(authOptions);
  </>,
  <>
    {"  "}
    {K("if")} (!session) {"{"}
  </>,
  <>
    {"    "}
    {K("return")} NextResponse.json({"{ error: "}
    {S('"Unauthorized"')}
    {", status: "}
    {N(401)}
    {" }"});
  </>,
  "  }",
  "",
  <>
    {"  "}
    {K("const")} tasks = {K("await")} prisma.task.{Fn("findMany")}({"{"});
  </>,
  "    where: { teamId: session.user.teamId },",
  <>
    {"    take: "}
    {N(50)}
    {","}
  </>,
  <>
    {"    orderBy: { createdAt: "}
    {S('"desc"')}
    {" },"}
  </>,
  "  });",
  <>
    {"  "}
    {K("return")} NextResponse.json(tasks);
  </>,
  "}",
];

const DIFF_AFTER: ReactNode[] = [
  <>
    {K("export")} {K("async")} {K("function")} {F("GET")}(request:{" "}
    {T("Request")}) {"{"}
  </>,
  <>
    {"  "}
    {K("const")} session = {K("await")} getServerSession(authOptions);
  </>,
  <>
    {"  "}
    {K("if")} (!session) {"{"}
  </>,
  <>
    {"    "}
    {K("return")} NextResponse.json({"{ error: "}
    {S('"Unauthorized"')}
    {", status: "}
    {N(401)}
    {" }"});
  </>,
  "  }",
  "",
  <>
    {"  "}
    {K("const")} tasks = {K("await")} prisma.task.{Fn("findMany")}({"{"});
  </>,
  "    where: { teamId: session.user.teamId },",
  <>
    {"    orderBy: { createdAt: "}
    {S('"desc"')}
    {" },"}
  </>,
  <>
    {"    include: { subtasks: "}
    {S("true")}
    {" },"}
  </>,
  "  });",
  <>
    {"  "}
    {K("return")} NextResponse.json(tasks);
  </>,
  "}",
];

export const DIFF = {
  before: { lines: DIFF_BEFORE, marks: [8] },
  after: { lines: DIFF_AFTER, marks: [9] },
};

export const TARGET_MARKS: Record<number, "target" | "candidate"> = {
  24: "target",
  25: "candidate",
};

export function basename(path: string) {
  return path.split("/").pop() ?? path;
}

export function dirname(path: string) {
  const parts = path.split("/");
  parts.pop();
  return parts.join("/");
}

export function fileTone(path: string) {
  if (path.includes("/api/")) return "bg-brand-cyan";
  if (path.startsWith("lib/")) return "bg-brand-cyan";
  if (path.startsWith("tests/")) return "bg-brand-green";
  if (path.endsWith(".tsx")) return "bg-brand-purple-light";
  if (path.endsWith(".prisma")) return "bg-amber-400";
  return "bg-zinc-500";
}

export function fileBadge(path: string) {
  if (path === "app/api/tasks/route.ts") return "API";
  if (path === "prisma/schema.prisma") return "M";
  return null;
}
