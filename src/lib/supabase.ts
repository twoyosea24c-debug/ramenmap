const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured =
  Boolean(supabaseUrl) && Boolean(supabaseAnonKey);

type QueryResult<T> = {
  data: T[] | null;
  error: { message: string } | null;
};

type OrderOptions = {
  ascending?: boolean;
};

type QueryBuilder<T> = {
  order(column: string, options?: OrderOptions): Promise<QueryResult<T>>;
};

type TableBuilder<T> = {
  select(columns: string): QueryBuilder<T>;
};

export type SupabaseClient = {
  from<T>(table: string): TableBuilder<T>;
};

const createQueryString = (
  columns: string,
  orderBy?: { column: string; ascending: boolean },
) => {
  const params = new URLSearchParams();
  params.set('select', columns);

  if (orderBy) {
    params.set('order', `${orderBy.column}.${orderBy.ascending ? 'asc' : 'desc'}`);
  }

  return params.toString();
};

const buildSupabaseClient = (): SupabaseClient | null => {
  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  return {
    from<T>(table: string): TableBuilder<T> {
      return {
        select(columns: string): QueryBuilder<T> {
          return {
            async order(column: string, options?: OrderOptions) {
              const query = createQueryString(columns, {
                column,
                ascending: options?.ascending ?? true,
              });

              const response = await fetch(`${supabaseUrl}/rest/v1/${table}?${query}`, {
                headers: {
                  apikey: supabaseAnonKey,
                  Authorization: `Bearer ${supabaseAnonKey}`,
                },
              });

              if (!response.ok) {
                const message = `HTTP ${response.status}`;
                return { data: null, error: { message } };
              }

              const data = (await response.json()) as T[];
              return { data, error: null };
            },
          };
        },
      };
    },
  };
};

export const supabase = buildSupabaseClient();
