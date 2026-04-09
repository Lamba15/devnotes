export type User = {
    id: number;
    name: string;
    email: string;
    avatar?: string;
    avatar_path?: string | null;
    job_title?: string | null;
    timezone?: string | null;
    ai_credits?: number;
    ai_credits_used?: number;
    capabilities?: {
        platform?: boolean;
        assistant_debug?: boolean;
        create_clients?: boolean;
        manage_client_tags?: boolean;
        manage_finance?: boolean;
        manage_tracking?: boolean;
        manage_cms?: boolean;
    };
    portal_context?: {
        client_id?: number | null;
        client_name?: string | null;
    } | null;
    email_verified_at: string | null;
    two_factor_enabled?: boolean;
    created_at: string;
    updated_at: string;
    [key: string]: unknown;
};

export type Auth = {
    user: User;
};

export type TwoFactorSetupData = {
    svg: string;
    url: string;
};

export type TwoFactorSecretKey = {
    secretKey: string;
};
