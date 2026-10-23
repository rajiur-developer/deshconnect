declare const Deno: {
  env: {
    get(name: string): string | undefined;
  };
};

declare module "npm:@insforge/sdk" {
  export function createAdminClient(config: {
    baseUrl: string;
    apiKey: string;
  }): {
    database: {
      rpc(
        functionName: string,
        args?: Record<string, unknown>,
      ): Promise<{ data: unknown; error: { message: string } | null }>;
    };
  };
}
