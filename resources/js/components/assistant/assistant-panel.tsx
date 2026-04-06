import { usePage } from '@inertiajs/react';
import DOMPurify from 'dompurify';
import {
    Bot,
    Brain,
    Bug,
    Check,
    ChevronDown,
    ChevronRight,
    FileText,
    History,
    LoaderCircle,
    Plus,
    RefreshCw,
    Trash2,
    Wrench,
    X,
} from 'lucide-react';
import { marked } from 'marked';
import type { ChangeEvent, KeyboardEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import type { Auth } from '@/types';

marked.setOptions({
    breaks: true,
    gfm: true,
});

type AssistantThread = {
    id: number;
    title: string;
    created_at: string | null;
    updated_at: string | null;
};

type AssistantMessageMeta = {
    status?: string;
    confirmation?: PendingConfirmation | null;
    error?: {
        type?: string | null;
        message?: string | null;
    } | null;
    trace?: {
        started_at?: string | null;
        finished_at?: string | null;
        duration_ms?: number | null;
        available_tools?: string[];
        tool_call_count?: number | null;
        model_runs?: number | null;
        reruns?: number | null;
        model?: string | null;
        provider?: string | null;
        configured_via?: string | null;
        system_prompt_source?: string | null;
        usage?: {
            prompt_tokens?: number | null;
            completion_tokens?: number | null;
            total_tokens?: number | null;
        } | null;
        phases?: Array<{
            key?: string | null;
            title?: string | null;
            status?: string | null;
            started_at?: string | null;
            finished_at?: string | null;
            duration_ms?: number | null;
            summary?: string | null;
        }>;
        writer_pass?: {
            model?: string | null;
            provider?: string | null;
            configured_via?: string | null;
            usage?: {
                prompt_tokens?: number | null;
                completion_tokens?: number | null;
                total_tokens?: number | null;
            } | null;
        } | null;
        tool_trace?: Array<{
            tool_name?: string | null;
            arguments?: Record<string, unknown>;
            status?: string | null;
            result_type?: string | null;
            error?: string | null;
        }>;
    } | null;
};

type AssistantMessage = {
    id: number;
    role: 'user' | 'assistant';
    content: string | null;
    tool_calls?: Array<{
        id?: string | null;
        name?: string | null;
        arguments?: Record<string, unknown>;
    }> | null;
    tool_results?: AssistantToolResult[] | null;
    meta?: AssistantMessageMeta | null;
    created_at?: string | null;
};

type DiscussionComment = {
    id: number;
    body: string;
    parent_id: number | null;
    user?: {
        id: number;
        name: string;
    } | null;
    replies: DiscussionComment[];
};

type PendingConfirmation = {
    id: number;
    thread_id?: number;
    tool_name: string;
    status: string;
    payload?: Record<string, unknown>;
    created_at?: string | null;
};

type AssistantToolResult =
    | {
          type: 'client';
          id: number;
          name: string;
      }
    | {
          type: 'project';
          id: number;
          name: string;
      }
    | {
          type: 'issue';
          id: number;
          title: string;
          status: string;
          priority: string;
          project?: {
              id: number;
              name: string;
          } | null;
      }
    | {
          type: 'issue_comment';
          id: number;
          body: string;
          parent_id: number | null;
          issue?: {
              id: number;
              title: string;
          } | null;
      }
    | {
          type: 'client_list';
          items: Array<{ id: number; name: string }>;
      }
    | {
          type: 'project_list';
          items: Array<{
              id: number;
              name: string;
              client?: { id: number; name: string } | null;
          }>;
      }
    | {
          type: 'issue_list';
          items: Array<{
              id: number;
              title: string;
              status: string;
              priority: string;
              type: string;
              project?: {
                  id: number;
                  name: string;
                  client?: { id: number; name: string } | null;
              } | null;
          }>;
      }
    | {
          type: 'issue_discussion';
          issue: {
              id: number;
              title: string;
              project?: {
                  id: number;
                  name: string;
                  client?: { id: number; name: string } | null;
              } | null;
          };
          comments: DiscussionComment[];
      }
    | {
          type: 'issue_detail';
          issue: {
              id: number;
              title: string;
              description: string | null;
              status: string;
              priority: string;
              type: string;
              assignee?: { id: number; name: string } | null;
              project?: {
                  id: number;
                  name: string;
                  client?: { id: number; name: string } | null;
              } | null;
          };
          comments: DiscussionComment[];
      }
    | {
          type: 'board_context';
          board: {
              id: number;
              name: string;
              project?: {
                  id: number;
                  name: string;
                  client?: { id: number; name: string } | null;
              } | null;
          };
          backlog: Array<{
              id: number;
              title: string;
              status: string;
              priority: string;
              type: string;
          }>;
          columns: Array<{
              id: number;
              name: string;
              issues: Array<{
                  id: number;
                  title: string;
                  status: string;
                  priority: string;
                  type: string;
              }>;
          }>;
      }
    | {
          type: 'board_list';
          items: Array<{
              id: number;
              name: string;
              project?: {
                  id: number;
                  name: string;
                  client?: { id: number; name: string } | null;
              } | null;
          }>;
      }
    | {
          type: 'board_issue_move';
          id: number;
          board?: { id: number; name: string } | null;
          column?: { id: number; name: string } | null;
          issue?: {
              id: number | null;
              title: string | null;
              status: string | null;
              priority: string | null;
              type: string | null;
          } | null;
      }
    | {
          type: 'transaction';
          id: number;
          description: string;
          amount: string;
          project?: { id: number; name: string } | null;
      }
    | {
          type: 'transaction_list';
          items: Array<{
              id: number;
              description: string;
              amount: string;
              project?: {
                  id: number;
                  name: string;
                  client?: { id: number; name: string } | null;
              } | null;
          }>;
      }
    | {
          type: 'invoice';
          id: number;
          reference: string;
          status: string;
          amount: string;
          project?: { id: number; name: string } | null;
      }
    | {
          type: 'invoice_list';
          items: Array<{
              id: number;
              reference: string;
              status: string;
              amount: string;
              project?: {
                  id: number;
                  name: string;
                  client?: { id: number; name: string } | null;
              } | null;
          }>;
      }
    | {
          type: 'error';
          message: string;
      };

type AssistantPageProps = {
    auth: Auth;
};

type PendingRunState = {
    kind: 'message' | 'confirmation';
    userMessage?: string;
    phaseIndex: number;
    progress: number;
};

const ASSISTANT_LOADING_PHASES = [
    {
        title: 'Understanding request',
        description: 'Reading the request and current thread context.',
        icon: Brain,
    },
    {
        title: 'Planning tools',
        description: 'Choosing the smallest useful set of reads or actions.',
        icon: Bot,
    },
    {
        title: 'Running tools',
        description: 'Collecting grounded results from the workspace.',
        icon: Wrench,
    },
    {
        title: 'Writing answer',
        description: 'Preparing the final user-facing response.',
        icon: FileText,
    },
] as const;

export function AssistantPanel() {
    const { auth } = usePage<AssistantPageProps>().props;
    const canDebug = Boolean(auth.user?.assistant_debug);
    const [open, setOpen] = useState(false);
    const [message, setMessage] = useState('');
    const [threads, setThreads] = useState<AssistantThread[]>([]);
    const [messages, setMessages] = useState<AssistantMessage[]>([]);
    const [pendingConfirmation, setPendingConfirmation] =
        useState<PendingConfirmation | null>(null);
    const [threadId, setThreadId] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isHistoryLoading, setIsHistoryLoading] = useState(false);
    const [debugMode, setDebugMode] = useState(false);
    const [pendingRun, setPendingRun] = useState<PendingRunState | null>(null);
    const [expandedDebugMessageId, setExpandedDebugMessageId] = useState<
        number | null
    >(null);
    const [deleteThreadId, setDeleteThreadId] = useState<number | null>(null);

    useEffect(() => {
        const syncHash = () => {
            setOpen(window.location.hash === '#assistant');
        };

        syncHash();
        window.addEventListener('hashchange', syncHash);

        return () => window.removeEventListener('hashchange', syncHash);
    }, []);

    const csrfToken =
        document
            .querySelector<HTMLMetaElement>('meta[name="csrf-token"]')
            ?.getAttribute('content') ?? '';

    const currentThread = useMemo(
        () => threads.find((entry) => entry.id === threadId) ?? null,
        [threadId, threads],
    );

    const displayedMessages = useMemo(() => {
        if (!pendingRun?.userMessage) {
            return messages;
        }

        return [
            ...messages,
            {
                id: -1,
                role: 'user' as const,
                content: pendingRun.userMessage,
                created_at: new Date().toISOString(),
            },
        ];
    }, [messages, pendingRun]);

    useEffect(() => {
        if (!pendingRun) {
            return;
        }

        const interval = window.setInterval(() => {
            setPendingRun((current) => {
                if (!current) {
                    return null;
                }

                const nextProgress = Math.min(current.progress + 8, 92);
                const nextPhaseIndex = Math.min(
                    Math.floor(nextProgress / 25),
                    ASSISTANT_LOADING_PHASES.length - 1,
                );

                return {
                    ...current,
                    progress: nextProgress,
                    phaseIndex: nextPhaseIndex,
                };
            });
        }, 700);

        return () => window.clearInterval(interval);
    }, [pendingRun]);

    async function loadThreads() {
        setIsHistoryLoading(true);
        const response = await fetch('/assistant/threads', {
            headers: {
                Accept: 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
            },
        });
        const payload = await response.json();
        setThreads(payload.data.threads ?? []);
        setIsHistoryLoading(false);
    }

    async function loadThread(nextThreadId: number) {
        setIsLoading(true);
        const response = await fetch(`/assistant/threads/${nextThreadId}`, {
            headers: {
                Accept: 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
            },
        });

        if (response.ok) {
            const payload = await response.json();
            setThreadId(payload.data.thread.id);
            setMessages(payload.data.messages ?? []);
            setPendingConfirmation(payload.data.pending_confirmation ?? null);
            setExpandedDebugMessageId(null);
        }

        setIsLoading(false);
    }

    async function createThread() {
        setIsLoading(true);
        const response = await fetch('/assistant/threads', {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'X-CSRF-TOKEN': csrfToken,
                'X-Requested-With': 'XMLHttpRequest',
            },
        });

        if (response.ok) {
            const payload = await response.json();
            const nextThread = payload.data.thread as AssistantThread;
            setThreadId(nextThread.id);
            setMessages([]);
            setPendingConfirmation(null);
            setMessage('');
            setExpandedDebugMessageId(null);
            setThreads((current) => [
                nextThread,
                ...current.filter((entry) => entry.id !== nextThread.id),
            ]);
        }

        setIsLoading(false);
    }

    async function deleteThread(targetThreadId: number) {
        setIsLoading(true);
        const response = await fetch(`/assistant/threads/${targetThreadId}`, {
            method: 'DELETE',
            headers: {
                Accept: 'application/json',
                'X-CSRF-TOKEN': csrfToken,
                'X-Requested-With': 'XMLHttpRequest',
            },
        });

        if (response.ok) {
            setThreads((current) =>
                current.filter((entry) => entry.id !== targetThreadId),
            );

            if (threadId === targetThreadId) {
                setThreadId(null);
                setMessages([]);
                setPendingConfirmation(null);
                setExpandedDebugMessageId(null);
            }
        }

        setIsLoading(false);
    }

    async function sendMessage() {
        if (!message.trim()) {
            return;
        }

        const outgoingMessage = message;
        setIsLoading(true);
        setPendingRun({
            kind: 'message',
            userMessage: outgoingMessage,
            phaseIndex: 0,
            progress: 12,
        });
        setMessage('');

        const response = await fetch('/assistant/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                'X-CSRF-TOKEN': csrfToken,
                'X-Requested-With': 'XMLHttpRequest',
            },
            body: JSON.stringify({
                message: outgoingMessage,
                thread_id: threadId,
            }),
        });

        if (!response.ok) {
            setPendingRun(null);
            setMessage(outgoingMessage);
            setIsLoading(false);

            return;
        }

        const payload = await response.json();
        setMessages(payload.data.messages ?? []);
        setPendingConfirmation(payload.data.pending_confirmation ?? null);
        setThreadId(payload.data.thread.id);
        setPendingRun(null);
        await loadThreads();
        setIsLoading(false);
    }

    const handleComposerKeyDown = (
        event: KeyboardEvent<HTMLTextAreaElement>,
    ) => {
        if (event.key !== 'Enter' || event.shiftKey) {
            return;
        }

        event.preventDefault();

        if (!isLoading) {
            void sendMessage();
        }
    };

    async function handleConfirmation(action: 'approve' | 'reject') {
        if (!pendingConfirmation) {
            return;
        }

        setIsLoading(true);
        setPendingRun({
            kind: 'confirmation',
            phaseIndex: 2,
            progress: 58,
        });
        const response = await fetch(
            `/assistant/confirmations/${pendingConfirmation.id}/${action}`,
            {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                    'X-Requested-With': 'XMLHttpRequest',
                },
            },
        );

        if (response.ok) {
            const payload = await response.json();
            setMessages(payload.data.messages ?? []);
            setPendingConfirmation(payload.data.pending_confirmation ?? null);
            setPendingRun(null);
            await loadThreads();
        }

        if (!response.ok) {
            setPendingRun(null);
        }

        setIsLoading(false);
    }

    const handleOpenChange = (nextOpen: boolean) => {
        setOpen(nextOpen);

        if (nextOpen) {
            void loadThreads();
        }
    };

    return (
        <Sheet open={open} onOpenChange={handleOpenChange}>
            <SheetTrigger asChild>
                <Button
                    variant="ghost"
                    size="sm"
                    className="gap-2"
                    data-testid="assistant-toggle"
                >
                    <Bot className="size-4" />
                    Assistant
                </Button>
            </SheetTrigger>
            <SheetContent className="flex w-full flex-col gap-4 bg-muted/30 sm:max-w-7xl">
                <SheetHeader>
                    <SheetTitle>Assistant</SheetTitle>
                    <SheetDescription>
                        Reads run directly. Mutations require confirmation.
                        Debug is visible for admins.
                    </SheetDescription>
                </SheetHeader>

                <div className="flex min-h-0 flex-1 flex-col gap-4 lg:flex-row">
                    <Card className="flex w-full flex-col gap-0 overflow-hidden lg:w-72">
                        <CardHeader className="flex-row items-center justify-between space-y-0 border-b bg-background/80 py-4">
                            <div className="flex items-center gap-2 text-sm font-medium">
                                <History className="size-4" />
                                History
                            </div>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => void createThread()}
                                disabled={isLoading}
                            >
                                <Plus className="size-4" />
                                New chat
                            </Button>
                        </CardHeader>
                        <CardContent className="min-h-0 flex-1 overflow-y-auto bg-card p-3">
                            {isHistoryLoading ? (
                                <p className="rounded-lg bg-muted px-3 py-3 text-sm text-muted-foreground">
                                    Loading chats...
                                </p>
                            ) : null}
                            {!isHistoryLoading && threads.length === 0 ? (
                                <div className="rounded-lg bg-muted px-3 py-3 text-sm text-muted-foreground">
                                    No chats yet. Start a new chat.
                                </div>
                            ) : null}
                            <div className="space-y-1">
                                {threads.map((thread) => (
                                    <div
                                        key={thread.id}
                                        className="group flex items-center gap-1"
                                    >
                                        <button
                                            type="button"
                                            onClick={() =>
                                                void loadThread(thread.id)
                                            }
                                            className={`flex-1 rounded-xl border px-3 py-3 text-left text-sm transition ${thread.id === threadId ? 'border-primary/30 bg-primary/5 shadow-sm' : 'border-transparent bg-background hover:border-border hover:bg-muted/40'}`}
                                        >
                                            <p className="truncate font-medium text-foreground">
                                                {thread.title}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {thread.updated_at
                                                    ? new Date(
                                                          thread.updated_at,
                                                      ).toLocaleString()
                                                    : 'No activity yet'}
                                            </p>
                                        </button>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="opacity-0 transition group-hover:opacity-100"
                                            onClick={() =>
                                                setDeleteThreadId(thread.id)
                                            }
                                            disabled={isLoading}
                                        >
                                            <Trash2 className="size-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="flex min-h-0 flex-1 flex-col gap-0 overflow-hidden">
                        <CardHeader className="flex-row items-center justify-between space-y-0 border-b bg-background/80 py-4">
                            <div>
                                <CardTitle className="text-base">
                                    {currentThread?.title ?? 'New chat'}
                                </CardTitle>
                                <CardDescription className="mt-1 text-xs">
                                    {currentThread
                                        ? 'Persistent history and message trace.'
                                        : 'Start a chat to create a thread.'}
                                </CardDescription>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => void loadThreads()}
                                    disabled={isLoading || isHistoryLoading}
                                >
                                    <RefreshCw className="size-4" />
                                    Refresh
                                </Button>
                                {canDebug ? (
                                    <Button
                                        size="sm"
                                        variant={
                                            debugMode ? 'default' : 'outline'
                                        }
                                        onClick={() =>
                                            setDebugMode((current) => !current)
                                        }
                                    >
                                        <Bug className="size-4" />
                                        Debug
                                    </Button>
                                ) : null}
                            </div>
                        </CardHeader>

                        <CardContent className="min-h-0 flex-1 overflow-y-auto bg-card p-5">
                            {displayedMessages.length === 0 ? (
                                <Card className="gap-0 border-dashed bg-muted/30 py-0 shadow-none">
                                    <CardContent className="p-6 text-sm text-muted-foreground">
                                        Ask about clients, projects, boards,
                                        issues, or finance. This panel now keeps
                                        chat history and admin debug traces.
                                    </CardContent>
                                </Card>
                            ) : (
                                <div className="space-y-4">
                                    {displayedMessages.map((entry) => (
                                        <AssistantMessageCard
                                            key={entry.id}
                                            message={entry}
                                            canDebug={canDebug}
                                            debugMode={debugMode}
                                            expanded={
                                                expandedDebugMessageId ===
                                                entry.id
                                            }
                                            onToggleDebug={() =>
                                                setExpandedDebugMessageId(
                                                    (current) =>
                                                        current === entry.id
                                                            ? null
                                                            : entry.id,
                                                )
                                            }
                                        />
                                    ))}
                                    {pendingRun ? (
                                        <AssistantLoadingCard
                                            run={pendingRun}
                                        />
                                    ) : null}
                                </div>
                            )}
                        </CardContent>

                        {pendingConfirmation ? (
                            <div className="border-t bg-background/70 p-4">
                                <Card className="gap-0 border-amber-200/60 bg-amber-50/60 py-0 shadow-none dark:border-amber-900/40 dark:bg-amber-950/20">
                                    <CardHeader className="py-4">
                                        <CardTitle className="text-sm">
                                            Pending confirmation
                                        </CardTitle>
                                        <CardDescription>
                                            {pendingConfirmation.tool_name}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-3 pb-4">
                                        <JsonBlock
                                            data={
                                                pendingConfirmation.payload ??
                                                {}
                                            }
                                        />
                                        <div className="flex gap-2">
                                            <Button
                                                size="sm"
                                                onClick={() =>
                                                    void handleConfirmation(
                                                        'approve',
                                                    )
                                                }
                                                disabled={isLoading}
                                                data-testid="assistant-confirm"
                                            >
                                                <Check className="size-4" />
                                                Confirm
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() =>
                                                    void handleConfirmation(
                                                        'reject',
                                                    )
                                                }
                                                disabled={isLoading}
                                            >
                                                <X className="size-4" />
                                                Reject
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        ) : null}

                        <div className="border-t bg-background/70 p-4">
                            <Card className="gap-0 py-0 shadow-none">
                                <CardContent className="space-y-3 p-4">
                                    <Textarea
                                        name="assistant_message"
                                        value={message}
                                        onChange={(
                                            event: ChangeEvent<HTMLTextAreaElement>,
                                        ) => setMessage(event.target.value)}
                                        onKeyDown={handleComposerKeyDown}
                                        placeholder="Ask the assistant what is happening, inspect context, or perform a confirmed action..."
                                        className="min-h-28 bg-background"
                                    />
                                    <div className="flex items-center justify-between gap-3">
                                        <p className="text-xs leading-5 text-muted-foreground">
                                            New chat, history, and debug now
                                            expose more of the actual assistant
                                            flow.
                                        </p>
                                        <Button
                                            onClick={() => void sendMessage()}
                                            disabled={isLoading}
                                            data-testid="assistant-send"
                                        >
                                            {isLoading ? (
                                                <LoaderCircle className="size-4 animate-spin" />
                                            ) : null}
                                            Send
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </Card>
                </div>

                <Dialog
                    open={deleteThreadId !== null}
                    onOpenChange={(open) => {
                        if (!open) {
                            setDeleteThreadId(null);
                        }
                    }}
                >
                    <DialogContent>
                        <DialogTitle>Delete chat history?</DialogTitle>
                        <DialogDescription>
                            This will permanently delete the selected assistant
                            thread, including its messages and confirmations.
                        </DialogDescription>

                        <DialogFooter className="gap-2">
                            <DialogClose asChild>
                                <Button variant="secondary">Cancel</Button>
                            </DialogClose>

                            <Button
                                variant="destructive"
                                disabled={isLoading || deleteThreadId === null}
                                onClick={() => {
                                    if (deleteThreadId !== null) {
                                        void deleteThread(deleteThreadId);
                                        setDeleteThreadId(null);
                                    }
                                }}
                            >
                                Delete chat
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </SheetContent>
        </Sheet>
    );
}

function AssistantMessageCard({
    message,
    canDebug,
    debugMode,
    expanded,
    onToggleDebug,
}: {
    message: AssistantMessage;
    canDebug: boolean;
    debugMode: boolean;
    expanded: boolean;
    onToggleDebug: () => void;
}) {
    const isAssistant = message.role === 'assistant';
    const renderedContent = renderAssistantMarkdown(
        message.content || 'No content returned.',
    );

    return (
        <div
            className={`flex ${isAssistant ? 'justify-start' : 'justify-end'}`}
        >
            <Card
                className={`w-full max-w-4xl gap-0 py-0 ${isAssistant ? 'bg-card shadow-sm' : 'border-primary/20 bg-primary/5 shadow-sm'}`}
            >
                <CardHeader className="flex-row items-start justify-between space-y-0 border-b py-4">
                    <div>
                        <CardTitle className="text-sm">
                            {isAssistant ? 'Assistant' : 'You'}
                        </CardTitle>
                        <CardDescription>
                            {message.created_at
                                ? new Date(
                                      message.created_at,
                                  ).toLocaleTimeString()
                                : null}
                        </CardDescription>
                    </div>
                </CardHeader>
                <CardContent className="space-y-3 p-4">
                    <div className="space-y-2">
                        {isAssistant ? (
                            <div
                                className="prose prose-sm prose-zinc dark:prose-invert prose-headings:mb-2 prose-headings:mt-4 prose-p:my-2 prose-p:leading-7 prose-ul:my-2 prose-ol:my-2 prose-li:my-1 prose-table:my-3 prose-table:w-full prose-th:border prose-th:px-2 prose-th:py-1 prose-td:border prose-td:px-2 prose-td:py-1 prose-code:rounded prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:text-[0.9em] prose-pre:bg-muted prose-pre:text-foreground max-w-none"
                                dangerouslySetInnerHTML={{
                                    __html: renderedContent,
                                }}
                            />
                        ) : (
                            <p className="text-sm leading-6 whitespace-pre-wrap text-foreground">
                                {message.content}
                            </p>
                        )}
                        {message.tool_results?.length ? (
                            <div className="space-y-2">
                                {message.tool_results.map((result, index) => (
                                    <Card
                                        key={`${message.id}-${index}`}
                                        className="gap-0 border-dashed bg-muted/30 py-0 shadow-none"
                                    >
                                        <CardContent className="p-3 text-sm">
                                            <ToolResultBlock result={result} />
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        ) : null}
                    </div>
                </CardContent>

                {isAssistant && canDebug && debugMode ? (
                    <div className="border-t bg-muted/20 px-4 py-3">
                        <button
                            type="button"
                            onClick={onToggleDebug}
                            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground"
                        >
                            {expanded ? (
                                <ChevronDown className="size-4" />
                            ) : (
                                <ChevronRight className="size-4" />
                            )}
                            <Bug className="size-4" />
                            Debug
                        </button>

                        {expanded ? (
                            <AssistantDebugPanel message={message} />
                        ) : null}
                    </div>
                ) : null}
            </Card>
        </div>
    );
}

function AssistantLoadingCard({ run }: { run: PendingRunState }) {
    const phase =
        ASSISTANT_LOADING_PHASES[run.phaseIndex] ?? ASSISTANT_LOADING_PHASES[0];
    const PhaseIcon = phase.icon;

    return (
        <div className="flex justify-start">
            <Card className="w-full max-w-4xl gap-0 border-dashed bg-muted/30 py-0 shadow-none">
                <CardHeader className="flex-row items-start justify-between space-y-0 border-b py-4">
                    <div>
                        <CardTitle className="flex items-center gap-2 text-sm">
                            <LoaderCircle className="size-4 animate-spin" />
                            Assistant is working
                        </CardTitle>
                        <CardDescription>
                            {run.kind === 'confirmation'
                                ? 'Executing the confirmed action and preparing the final reply.'
                                : 'Your message is queued and visible immediately while the assistant works.'}
                        </CardDescription>
                    </div>
                    <div className="text-xs font-medium text-muted-foreground">
                        {run.progress}%
                    </div>
                </CardHeader>
                <CardContent className="space-y-4 p-4">
                    <div className="space-y-2">
                        <div className="h-2 overflow-hidden rounded-full bg-muted">
                            <div
                                className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
                                style={{ width: `${run.progress}%` }}
                            />
                        </div>
                        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                            <PhaseIcon className="size-4" />
                            {phase.title}
                        </div>
                        <p className="text-sm text-muted-foreground">
                            {phase.description}
                        </p>
                    </div>

                    <div className="grid gap-2 sm:grid-cols-4">
                        {ASSISTANT_LOADING_PHASES.map((item, index) => {
                            const ItemIcon = item.icon;
                            const state =
                                index < run.phaseIndex
                                    ? 'done'
                                    : index === run.phaseIndex
                                      ? 'active'
                                      : 'pending';

                            return (
                                <div
                                    key={item.title}
                                    className={`rounded-lg border px-3 py-3 text-xs ${state === 'done' ? 'border-primary/20 bg-primary/5' : state === 'active' ? 'border-primary/30 bg-background shadow-sm' : 'bg-background/70 text-muted-foreground'}`}
                                >
                                    <div className="flex items-center gap-2 font-medium">
                                        <ItemIcon className="size-4" />
                                        {item.title}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

function renderAssistantMarkdown(content: string): string {
    try {
        const rawHtml = marked.parse(content, { async: false }) as string;

        return DOMPurify.sanitize(rawHtml, {
            ALLOWED_TAGS: [
                'p',
                'br',
                'hr',
                'strong',
                'em',
                'b',
                'i',
                'u',
                'ul',
                'ol',
                'li',
                'h1',
                'h2',
                'h3',
                'h4',
                'h5',
                'h6',
                'blockquote',
                'code',
                'pre',
                'a',
                'span',
                'table',
                'thead',
                'tbody',
                'tr',
                'th',
                'td',
            ],
            ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
        });
    } catch {
        return DOMPurify.sanitize(content);
    }
}

function AssistantDebugPanel({ message }: { message: AssistantMessage }) {
    const trace = message.meta?.trace;
    const [selectedToolIndex, setSelectedToolIndex] = useState<number | null>(
        null,
    );
    const toolInspectorItems = (message.tool_calls ?? []).map(
        (toolCall, index) => {
            const traceEntry = trace?.tool_trace?.[index];
            const result = message.tool_results?.[index] ?? null;

            return {
                title: toolCall.name ?? traceEntry?.tool_name ?? 'Unnamed tool',
                status: traceEntry?.status ?? 'declared',
                resultType:
                    traceEntry?.result_type ??
                    (result && 'type' in result ? result.type : null),
                args: toolCall.arguments ?? traceEntry?.arguments ?? {},
                error:
                    traceEntry?.error ??
                    (result?.type === 'error' ? result.message : null),
                result,
            };
        },
    );
    const selectedTool =
        selectedToolIndex !== null
            ? toolInspectorItems[selectedToolIndex]
            : null;

    return (
        <div className="mt-3 space-y-3 text-xs">
            <DebugSection title="Run summary" defaultOpen>
                <KeyValueGrid
                    items={[
                        ['Status', message.meta?.status ?? 'unknown'],
                        ['Created', formatDateTime(message.created_at)],
                        ['Started', formatDateTime(trace?.started_at)],
                        ['Finished', formatDateTime(trace?.finished_at)],
                        [
                            'Duration',
                            trace?.duration_ms
                                ? `${trace.duration_ms} ms`
                                : 'unknown',
                        ],
                        ['Error type', message.meta?.error?.type ?? 'none'],
                        [
                            'Error message',
                            message.meta?.error?.message ?? 'none',
                        ],
                    ]}
                />
            </DebugSection>

            <DebugSection title="Timeline" defaultOpen>
                {trace?.phases?.length ? (
                    <div className="space-y-3">
                        {trace.phases.map((phase, index) => (
                            <div
                                key={`${phase.key ?? 'phase'}-${index}`}
                                className="relative rounded-lg border bg-muted/30 p-3"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="text-sm font-medium text-foreground">
                                            {phase.title ?? 'Phase'}
                                        </p>
                                        <p className="mt-1 text-xs text-muted-foreground">
                                            {phase.summary ??
                                                'No summary recorded.'}
                                        </p>
                                    </div>
                                    <span className="rounded-full border bg-background px-2 py-1 text-[11px] font-medium tracking-wide text-foreground/80 uppercase">
                                        {phase.status ?? 'unknown'}
                                    </span>
                                </div>

                                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                                    <TimelineStat
                                        label="Started"
                                        value={formatDateTime(phase.started_at)}
                                    />
                                    <TimelineStat
                                        label="Finished"
                                        value={formatDateTime(
                                            phase.finished_at,
                                        )}
                                    />
                                    <TimelineStat
                                        label="Duration"
                                        value={
                                            phase.duration_ms
                                                ? `${phase.duration_ms} ms`
                                                : 'unknown'
                                        }
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <EmptyDebugState text="No phase timeline recorded." />
                )}
            </DebugSection>

            <DebugSection title="Model and prompt" defaultOpen>
                <KeyValueGrid
                    items={[
                        ['Provider', trace?.provider ?? 'unknown'],
                        ['Model', trace?.model ?? 'unknown'],
                        ['Configured via', trace?.configured_via ?? 'unknown'],
                        [
                            'Prompt source',
                            trace?.system_prompt_source ?? 'unknown',
                        ],
                        ['Model runs', trace?.model_runs ?? 1],
                        ['Reruns', trace?.reruns ?? 0],
                        ['Writer model', trace?.writer_pass?.model ?? 'none'],
                    ]}
                />
            </DebugSection>

            <DebugSection title="Cost and usage">
                <KeyValueGrid
                    items={[
                        [
                            'Prompt tokens',
                            trace?.usage?.prompt_tokens ?? 'unavailable',
                        ],
                        [
                            'Completion tokens',
                            trace?.usage?.completion_tokens ?? 'unavailable',
                        ],
                        [
                            'Total tokens',
                            trace?.usage?.total_tokens ?? 'unavailable',
                        ],
                        ['Cost', 'unavailable'],
                    ]}
                />
            </DebugSection>

            <DebugSection title="Tool Calls">
                <div className="space-y-3">
                    <KeyValueGrid
                        items={[
                            [
                                'Declared tool calls',
                                trace?.tool_call_count ?? 0,
                            ],
                            [
                                'Available tools snapshot',
                                trace?.available_tools?.length ?? 0,
                            ],
                        ]}
                    />
                    {toolInspectorItems.length ? (
                        <div className="space-y-2">
                            {toolInspectorItems.map((item, index) => (
                                <button
                                    key={`${item.title}-${index}`}
                                    type="button"
                                    onClick={() => setSelectedToolIndex(index)}
                                    className="flex w-full items-center justify-between rounded-lg border bg-muted/30 px-3 py-3 text-left transition hover:bg-muted/50"
                                >
                                    <div>
                                        <p className="text-sm font-medium text-foreground">
                                            {item.title}
                                        </p>
                                        <p className="mt-1 text-[11px] tracking-wide text-muted-foreground uppercase">
                                            {item.status}
                                        </p>
                                    </div>
                                    <ChevronRight className="size-4 text-muted-foreground" />
                                </button>
                            ))}
                        </div>
                    ) : (
                        <EmptyDebugState text="No tool calls recorded." />
                    )}
                </div>
            </DebugSection>

            <DebugSection title="Execution">
                {trace?.tool_trace?.length ? (
                    <div className="space-y-2">
                        {trace.tool_trace.map((entry, index) => (
                            <MiniTraceCard
                                key={`${entry.tool_name ?? 'trace'}-${index}`}
                                title={entry.tool_name ?? 'Unnamed tool'}
                                rows={[
                                    ['Status', entry.status ?? 'unknown'],
                                    [
                                        'Result type',
                                        entry.result_type ?? 'none',
                                    ],
                                    ['Error', entry.error ?? 'none'],
                                    [
                                        'Arguments',
                                        entry.arguments
                                            ? JSON.stringify(
                                                  entry.arguments,
                                                  null,
                                                  2,
                                              )
                                            : '{}',
                                    ],
                                ]}
                            />
                        ))}
                    </div>
                ) : (
                    <EmptyDebugState text="No execution trace recorded." />
                )}
            </DebugSection>

            <DebugSection title="Tool Results">
                {message.tool_results?.length ? (
                    <JsonBlock data={message.tool_results} />
                ) : (
                    <EmptyDebugState text="No tool results recorded." />
                )}
            </DebugSection>

            <DebugSection title="Available Tools">
                {trace?.available_tools?.length ? (
                    <div className="flex flex-wrap gap-2">
                        {trace.available_tools.map((tool) => (
                            <span
                                key={tool}
                                className="rounded-full border bg-muted px-2 py-1 text-[11px] font-medium text-foreground/80"
                            >
                                {tool}
                            </span>
                        ))}
                    </div>
                ) : (
                    <EmptyDebugState text="No available tool snapshot recorded." />
                )}
            </DebugSection>

            <Sheet
                open={selectedToolIndex !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        setSelectedToolIndex(null);
                    }
                }}
            >
                <SheetContent side="right" className="sm:max-w-2xl">
                    <SheetHeader>
                        <SheetTitle>
                            {selectedTool?.title ?? 'Tool details'}
                        </SheetTitle>
                        <SheetDescription>
                            Inspect the tool arguments, status, result type, and
                            returned payload.
                        </SheetDescription>
                    </SheetHeader>

                    <div className="space-y-4 overflow-y-auto px-4 pb-4 text-xs">
                        <DebugSection title="Summary" defaultOpen>
                            <KeyValueGrid
                                items={[
                                    ['Tool', selectedTool?.title ?? 'unknown'],
                                    [
                                        'Status',
                                        selectedTool?.status ?? 'unknown',
                                    ],
                                    [
                                        'Result type',
                                        selectedTool?.resultType ?? 'none',
                                    ],
                                    ['Error', selectedTool?.error ?? 'none'],
                                ]}
                            />
                        </DebugSection>

                        <DebugSection title="Arguments" defaultOpen>
                            <JsonBlock data={selectedTool?.args ?? {}} />
                        </DebugSection>

                        <DebugSection title="Result payload" defaultOpen>
                            {selectedTool?.result ? (
                                <JsonBlock data={selectedTool.result} />
                            ) : (
                                <EmptyDebugState text="No result payload captured for this tool call." />
                            )}
                        </DebugSection>
                    </div>
                </SheetContent>
            </Sheet>
        </div>
    );
}

function DebugSection({
    title,
    defaultOpen = false,
    children,
}: {
    title: string;
    defaultOpen?: boolean;
    children: React.ReactNode;
}) {
    const [open, setOpen] = useState(defaultOpen);

    return (
        <Card className="gap-0 bg-background/80 py-0 shadow-none">
            <CardHeader className="py-3">
                <button
                    type="button"
                    onClick={() => setOpen((current) => !current)}
                    className="flex w-full items-center justify-between gap-3 text-left"
                >
                    <CardTitle className="text-sm">{title}</CardTitle>
                    {open ? (
                        <ChevronDown className="size-4 text-muted-foreground" />
                    ) : (
                        <ChevronRight className="size-4 text-muted-foreground" />
                    )}
                </button>
            </CardHeader>
            {open ? (
                <CardContent className="pb-3">{children}</CardContent>
            ) : null}
        </Card>
    );
}

function JsonBlock({ data }: { data: unknown }) {
    return (
        <pre className="overflow-x-auto rounded-lg border bg-muted/40 p-3 font-mono text-[11px] leading-5 whitespace-pre-wrap text-foreground/80">
            {JSON.stringify(data, null, 2)}
        </pre>
    );
}

function KeyValueGrid({ items }: { items: Array<[string, React.ReactNode]> }) {
    return (
        <div className="grid gap-2 sm:grid-cols-2">
            {items.map(([label, value]) => (
                <div
                    key={label}
                    className="rounded-lg border bg-muted/30 px-3 py-2"
                >
                    <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                        {label}
                    </p>
                    <p className="mt-1 text-xs break-words whitespace-pre-wrap text-foreground/90">
                        {String(value)}
                    </p>
                </div>
            ))}
        </div>
    );
}

function MiniTraceCard({
    title,
    rows,
}: {
    title: string;
    rows: Array<[string, string]>;
}) {
    return (
        <div className="rounded-lg border bg-muted/30 p-3">
            <p className="mb-2 text-sm font-medium text-foreground">{title}</p>
            <div className="space-y-2">
                {rows.map(([label, value]) => (
                    <div key={`${title}-${label}`}>
                        <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                            {label}
                        </p>
                        <p className="mt-1 font-mono text-[11px] leading-5 break-words whitespace-pre-wrap text-foreground/80">
                            {value}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
}

function EmptyDebugState({ text }: { text: string }) {
    return <p className="text-xs text-muted-foreground">{text}</p>;
}

function TimelineStat({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-lg border bg-background/80 px-3 py-2">
            <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                {label}
            </p>
            <p className="mt-1 text-xs text-foreground/90">{value}</p>
        </div>
    );
}

function formatDateTime(value?: string | null): string {
    return value ? new Date(value).toLocaleString() : 'unknown';
}

function DiscussionThread({ comments }: { comments: DiscussionComment[] }) {
    return (
        <div className="space-y-2">
            {comments.map((comment) => (
                <div key={comment.id} className="border-l pl-3">
                    <p className="font-medium">
                        {comment.user?.name ?? 'Unknown user'}
                    </p>
                    <p className="text-muted-foreground">{comment.body}</p>
                    {comment.replies.length > 0 ? (
                        <DiscussionThread comments={comment.replies} />
                    ) : null}
                </div>
            ))}
        </div>
    );
}

function ToolResultBlock({ result }: { result: AssistantToolResult }) {
    if (result.type === 'error') {
        return <p>{result.message}</p>;
    }

    if (result.type === 'client') {
        return (
            <p>
                Client created:{' '}
                <span className="font-medium">{result.name}</span>
            </p>
        );
    }

    if (result.type === 'project') {
        return (
            <p>
                Project created:{' '}
                <span className="font-medium">{result.name}</span>
            </p>
        );
    }

    if (result.type === 'issue') {
        return (
            <div className="space-y-1">
                <p>
                    Issue created:{' '}
                    <span className="font-medium">{result.title}</span>
                </p>
                <p className="text-muted-foreground">
                    {result.project?.name ?? 'No project'} ({result.status} /{' '}
                    {result.priority})
                </p>
            </div>
        );
    }

    if (result.type === 'issue_comment') {
        return (
            <div className="space-y-1">
                <p>
                    {result.parent_id === null
                        ? 'Comment added:'
                        : 'Reply added:'}{' '}
                    <span className="font-medium">
                        {result.issue?.title ?? 'Issue'}
                    </span>
                </p>
                <p className="text-muted-foreground">{result.body}</p>
            </div>
        );
    }

    if (result.type === 'client_list') {
        return (
            <SimpleList
                title="Accessible clients"
                items={result.items.map((item) => `${item.name}`)}
            />
        );
    }

    if (result.type === 'project_list') {
        return (
            <SimpleList
                title="Accessible projects"
                items={result.items.map(
                    (item) =>
                        `${item.name} - ${item.client?.name ?? 'No client'}`,
                )}
            />
        );
    }

    if (result.type === 'issue_list') {
        return (
            <SimpleList
                title="Accessible issues"
                items={result.items.map(
                    (item) =>
                        `${item.title} - ${item.status} / ${item.priority}`,
                )}
            />
        );
    }

    if (result.type === 'board_list') {
        return (
            <SimpleList
                title="Accessible boards"
                items={result.items.map(
                    (item) =>
                        `${item.name} - ${item.project?.name ?? 'No project'}`,
                )}
            />
        );
    }

    if (result.type === 'issue_discussion') {
        return (
            <div className="space-y-2">
                <p className="font-medium">Issue discussion</p>
                <p className="text-muted-foreground">
                    {result.issue.project?.client?.name ?? 'No client'} /{' '}
                    {result.issue.project?.name ?? 'No project'} /{' '}
                    {result.issue.title}
                </p>
                {result.comments.length === 0 ? (
                    <p className="text-muted-foreground">No comments yet.</p>
                ) : (
                    <DiscussionThread comments={result.comments} />
                )}
            </div>
        );
    }

    if (result.type === 'issue_detail') {
        return (
            <div className="space-y-2">
                <p className="font-medium">{result.issue.title}</p>
                <p className="text-muted-foreground">
                    {result.issue.status} / {result.issue.priority} /{' '}
                    {result.issue.type}
                </p>
                <p className="text-muted-foreground">
                    {result.issue.description ?? 'No description.'}
                </p>
                {result.comments.length === 0 ? (
                    <p className="text-muted-foreground">No comments yet.</p>
                ) : (
                    <DiscussionThread comments={result.comments} />
                )}
            </div>
        );
    }

    if (result.type === 'board_context') {
        return (
            <div className="space-y-2">
                <p className="font-medium">Board context</p>
                <p className="text-muted-foreground">
                    {result.board.project?.client?.name ?? 'No client'} /{' '}
                    {result.board.project?.name ?? 'No project'} /{' '}
                    {result.board.name}
                </p>
                <SimpleList
                    title="Backlog"
                    items={result.backlog.map(
                        (issue) =>
                            `${issue.title} - ${issue.status} / ${issue.priority}`,
                    )}
                />
                <SimpleList
                    title="Columns"
                    items={result.columns.map(
                        (column) =>
                            `${column.name}: ${column.issues.map((issue) => issue.title).join(', ') || 'No issues'}`,
                    )}
                />
            </div>
        );
    }

    if (result.type === 'board_issue_move') {
        return (
            <p>
                Issue moved:{' '}
                <span className="font-medium">
                    {result.issue?.title ?? 'Issue'}
                </span>{' '}
                to {result.board?.name ?? 'Board'} /{' '}
                {result.column?.name ?? 'Column'}
            </p>
        );
    }

    if (result.type === 'transaction') {
        return (
            <p>
                Transaction created:{' '}
                <span className="font-medium">{result.description}</span> (
                {result.amount})
            </p>
        );
    }

    if (result.type === 'transaction_list') {
        return (
            <SimpleList
                title="Accessible transactions"
                items={result.items.map(
                    (item) => `${item.description} - ${item.amount}`,
                )}
            />
        );
    }

    if (result.type === 'invoice') {
        return (
            <p>
                Invoice created:{' '}
                <span className="font-medium">{result.reference}</span> (
                {result.status} / {result.amount})
            </p>
        );
    }

    if (result.type === 'invoice_list') {
        return (
            <SimpleList
                title="Accessible invoices"
                items={result.items.map(
                    (item) =>
                        `${item.reference} - ${item.status} / ${item.amount}`,
                )}
            />
        );
    }

    return null;
}

function SimpleList({ title, items }: { title: string; items: string[] }) {
    return (
        <div className="space-y-2">
            <p className="font-medium">{title}</p>
            {items.length === 0 ? (
                <p className="text-muted-foreground">No items found.</p>
            ) : (
                items.map((item, index) => (
                    <p
                        key={`${title}-${index}`}
                        className="text-muted-foreground"
                    >
                        {item}
                    </p>
                ))
            )}
        </div>
    );
}
