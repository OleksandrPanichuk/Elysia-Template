import { getApp } from "./app";

const ORIGIN = "http://localhost:3000";

export interface Response<Body> {
  status: number;
  body: Body;
  headers: Headers;
}

export interface TestClient {
  get<Body = unknown>(path: string): Promise<Response<Body>>;
  post<Body = unknown>(path: string, body?: unknown): Promise<Response<Body>>;
  patch<Body = unknown>(path: string, body?: unknown): Promise<Response<Body>>;
  delete<Body = unknown>(path: string, body?: unknown): Promise<Response<Body>>;
  cookies(): string;
  clearCookies(): void;
}

const parse = async (response: globalThis.Response): Promise<unknown> => {
  const type = response.headers.get("content-type") ?? "";

  if (type.includes("application/json")) {
    return response.json().catch(() => null);
  }

  return response.text().catch(() => null);
};

export const createClient = (): TestClient => {
  const jar = new Map<string, string>();

  const remember = (response: globalThis.Response): void => {
    for (const cookie of response.headers.getSetCookie()) {
      const pair = cookie.split(";")[0] ?? "";
      const index = pair.indexOf("=");

      if (index <= 0) continue;

      const name = pair.slice(0, index);
      const value = pair.slice(index + 1);

      if (value === "") jar.delete(name);
      else jar.set(name, value);
    }
  };

  const send = async <Body>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<Response<Body>> => {
    const cookie = [...jar]
      .map(([name, value]) => `${name}=${value}`)
      .join("; ");

    const response = await getApp().handle(
      new Request(`${ORIGIN}${path}`, {
        method,
        headers: {
          origin: ORIGIN,
          ...(cookie ? { cookie } : {}),
          ...(body === undefined ? {} : { "content-type": "application/json" }),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      }),
    );

    remember(response);

    return {
      status: response.status,
      body: (await parse(response)) as Body,
      headers: response.headers,
    };
  };

  return {
    get: (path) => send("GET", path),
    post: (path, body) => send("POST", path, body),
    patch: (path, body) => send("PATCH", path, body),
    delete: (path, body) => send("DELETE", path, body),
    cookies: () => [...jar].map(([n, v]) => `${n}=${v}`).join("; "),
    clearCookies: () => jar.clear(),
  };
};
