export type IssueAssignee = {
    id: number;
    name: string;
    avatar_path: string | null;
    is_main_owner?: boolean;
};

export type AssigneeOption = {
    id: number;
    name: string;
    avatar_path: string | null;
    is_main_owner?: boolean;
    label: string;
    value: string;
};
